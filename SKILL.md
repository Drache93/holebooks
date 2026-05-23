---
name: hyperdb-hyperschema
description: Use this skill when designing, building, or evolving a database with `hyperdb` and `hyperschema` from the Holepunch / Pear stack. Triggers on requests mentioning "hyperdb", "hyperschema", "hyperdb collection", "hyperdb index", "hyperdb builder", "build.js for hyperdb", "schema migration", "compact-encoding struct", "hyperbee-backed db with schema", or any task that involves writing a `build.js`, registering structs/collections/indexes, choosing between `HyperDB.rocks()` and `HyperDB.bee()`, designing primary keys, evolving an existing schema without breaking on-disk data, or debugging encoding mismatches in a generated db spec. Also covers the `pear-hyperdb` Model pattern. Does NOT cover Hyperbee-only usage (no schema), Autobase, or generic compact-encoding outside the schema generator.
---

# HyperDB + Hyperschema

`hyperschema` is a code generator for compact-encoded structs. `hyperdb` is a code generator for indexed, schema-typed collections that sit on top of either RocksDB (`HyperDB.rocks`) or Hyperbee (`HyperDB.bee`). Together they're the typed-record layer of the Holepunch stack.

The mental model: you don't write runtime schema definitions. You write a `build.js` script that emits a generated module to disk (`spec/hyperschema/`, `spec/hyperdb/`). Your app then `require`s that generated module. Schema changes mean re-running the build and shipping the new generated code.

If you only remember three things:

1. **Compact-encoding is positional, not tagged.** New fields go at the END of a struct. Fields cannot be removed, reordered, or have their type changed. Plan your schemas like you're carving them in stone — because for any data already on disk or already replicated to a peer, you are.
2. **`build.js` is the source of truth, not the generated code.** Treat `spec/hyperschema/` and `spec/hyperdb/` as build artifacts. Edit `build.js`, run it, commit the result.
3. **Writes buffer, finds stream, and queries take bounds.** `await db.flush()` to persist. `for await` to consume `db.find()`. And `db.find` / `db.findOne` take their query data inside `gte` / `gt` / `lte` / `lt` — passing fields directly silently returns nothing.

## ESM projects: use `build.cjs`

If your project has `"type": "module"` in `package.json`, the build script must be CommonJS (it uses `require()`). Name it `build.cjs` — not `build.js`:

```sh
node build.cjs
```

The generated output can still be ESM — pass `{ esm: true }` to both `toDisk` calls:

```js
Hyperschema.toDisk(schema, { esm: true })
HyperDB.toDisk(db, { esm: true })
```

ESM output means your app imports the spec with `import def from './spec/hyperdb/index.js'` rather than `require`.

## The build flow

```
       build.js
         │
         ├──► Hyperschema ──► spec/hyperschema/  (struct codecs)
         │                         ▲
         │                         │ references (@ns/name)
         │                         │
         └──► HyperDB    ──► spec/hyperdb/       (collections, indexes)
                                   │
                                   ▼
                       require('./spec/hyperdb')
                                   │
                                   ▼
                    HyperDB.rocks(path, def)  // or .bee(bee, def)
```

Two builders, run in order, in one script. Hyperschema first (it owns the type definitions), HyperDB second (it references those types by `@namespace/name`).

### Minimal `build.js`

```js
// build.js
const Hyperschema = require('hyperschema')
const HyperDB = require('hyperdb/builder')
const path = require('path')

const SCHEMA_DIR = path.join(__dirname, 'spec', 'hyperschema')
const DB_DIR = path.join(__dirname, 'spec', 'hyperdb')

// 1. Hyperschema — define structs
const schema = Hyperschema.from(SCHEMA_DIR)
const ns = schema.namespace('app')

ns.register({
  name: 'user',
  fields: [
    { name: 'id',    type: 'string', required: true },
    { name: 'name',  type: 'string', required: true },
    { name: 'email', type: 'string' }                 // optional
  ]
})

ns.register({
  name: 'post',
  fields: [
    { name: 'id',       type: 'string', required: true },
    { name: 'authorId', type: 'string', required: true },
    { name: 'title',    type: 'string', required: true },
    { name: 'body',     type: 'string', required: true },
    { name: 'created',  type: 'uint',   required: true } // ms epoch
  ]
})

Hyperschema.toDisk(schema)

// 2. HyperDB — define collections + indexes over those structs
const db = HyperDB.from(SCHEMA_DIR, DB_DIR)
const dbns = db.namespace('app')

dbns.collections.register({
  name: 'users',
  schema: '@app/user',
  key: ['id']
})

dbns.collections.register({
  name: 'posts',
  schema: '@app/post',
  key: ['id']
})

// Secondary index: posts by author (non-unique — many posts per author)
dbns.require('./helpers.js')
dbns.indexes.register({
  name: 'posts-by-author',
  collection: '@app/posts',
  unique: false,
  key: ['authorId']
})

HyperDB.toDisk(db)
```

```js
// helpers.js — referenced by name in indexes via dbns.require()
exports.tagsMap = (post) => post.tags.map((tag) => ({ tag }))  // example fan-out helper, used later
```

Wire it up in `package.json`:

```json
{
  "scripts": {
    "build": "node build.cjs"
  }
}
```

Run `npm run build` after every schema change.

### Generated code is committed

`spec/hyperschema/` and `spec/hyperdb/` should be checked into git. Treat them like generated lockfile output: don't hand-edit, but do commit. Reasons:

- Apps require them at runtime. If they aren't on disk when the app starts, nothing works.
- Diffs in the generated code are a useful signal during code review — a well-meaning field reorder shows up as a noisy diff in `messages.js` and you catch the back-compat break before it ships.

If you really don't want them in git, run `node build.js` as part of your `prepare` or `postinstall` hook — but committing is the path of least surprise.

## Hyperschema field types

The primitive types `hyperschema` accepts (these map to `compact-encoding` codecs):

| Type     | Notes                                                      |
| -------- | ---------------------------------------------------------- |
| `string` | UTF-8, length-prefixed                                     |
| `bool`   |                                                            |
| `uint`   | varint, unsigned. Default for ms timestamps, counts, sizes |
| `int`    | varint, signed                                             |
| `fixed32`/`fixed64` | exact-byte buffers — useful for hashes/keys     |
| `buffer` | length-prefixed bytes                                      |
| `float64`| use sparingly; integer math is friendlier on the wire      |

Compound forms:

- **Array of T**: add `array: true` to any field — `{ name: 'tags', type: 'string', array: true }`. Works for primitives and for nested struct refs.
- **Optional field**: omit `required: true`. The decoder writes/reads a flag byte for the field's presence.
- **Nested struct**: `type: '@namespace/struct-name'` — must already be registered earlier in this build.
- **Map / `Record<K, V>`**: register a struct with `key`, `value`, and `record: true`, then reference it as a field type. The struct itself acts as a typed map:

  ```js
  ns.register({
    name: 'string-counts',
    key: 'string',
    value: 'uint',
    record: true
  })

  ns.register({
    name: 'page-stats',
    fields: [
      { name: 'url',    type: 'string', required: true },
      { name: 'visits', type: '@app/string-counts' }   // Record<string, uint>
    ]
  })
  ```

`required: true` matters more than it looks. A required field can never be made optional later (the wire shape changes), and an optional field can never be made required (existing records lack the byte). Decide before you ship.

### `compact: true` — pick once, regret never

```js
ns.register({
  name: 'point',
  compact: true,
  fields: [
    { name: 'x', type: 'int', required: true },
    { name: 'y', type: 'int', required: true }
  ]
})
```

`compact: true` strips the version preamble — smaller bytes on disk, but you lose the ability to add fields later in any back-compat way. Use only for genuinely fixed shapes (coordinates, fixed-size headers, hash pairs). For anything that might grow, leave it off.

### Append-only law

The one rule that breaks more apps than any other: **once a struct is shipped, you may only ADD fields, and only at the end, and only as optional.**

```js
// v1
ns.register({
  name: 'user',
  fields: [
    { name: 'id',   type: 'string', required: true },
    { name: 'name', type: 'string', required: true }
  ]
})

// v2 — OK: append, optional
ns.register({
  name: 'user',
  fields: [
    { name: 'id',    type: 'string', required: true },
    { name: 'name',  type: 'string', required: true },
    { name: 'email', type: 'string' }                  // appended, optional
  ]
})

// v2 — NOT OK: any of these silently corrupt existing data
fields: [
  { name: 'name', type: 'string' },                    // reordered
  { name: 'id',   type: 'string', required: true }
]
fields: [
  { name: 'id',    type: 'string', required: true },
  { name: 'email', type: 'string', required: true }    // type+name change at index 1
]
fields: [
  { name: 'id',    type: 'string', required: true },
  { name: 'name',  type: 'buffer', required: true }    // type change
]
```

Hyperschema's generated output keeps a numeric version per struct. Adding a field bumps it. Old readers see the new version, decode the prefix they understand, and skip the rest. New readers reading old records get the missing field as `null`/`undefined`. That's the whole back-compat story — it only works if you stick to append-only.

If you genuinely need to break shape: **register a new struct under a new name** (`user` → `user-v2`), migrate records over via a one-shot script, and leave the old struct registered for as long as old records exist on disk anywhere.

## Collections and primary keys

A collection is a struct + a primary key derived from one or more of its fields. The key is **always** an array — `key: ['id']` is just a length-1 composite, not a different shape. Keys are sorted lexicographically by the order you list them, and that ordering is queryable; there's no special "single-field" case.

```js
dbns.collections.register({
  name: 'posts',
  schema: '@app/post',
  key: ['id']                       // length-1 composite, ordered by `id`
})

dbns.collections.register({
  name: 'memberships',
  schema: '@app/membership',
  key: ['orgId', 'userId']          // length-2 composite
})

dbns.collections.register({
  name: 'nested-foo',
  schema: '@app/nested',
  key: ['foo.id']                   // dotted path into nested struct
})
```

Lexicographic ordering on the key array is a query-design tool: with `key: ['orgId', 'userId']`, every membership for one org is a contiguous keyspace, and a range query bounded on `orgId` walks it efficiently (see "Runtime: reads and writes" below for the syntax). Order keys least-specific to most-specific: the field you want to do equality matches on goes first, the field you want to range-scan goes last.

You only need a secondary index when you want to ask a question whose answer is NOT a contiguous prefix of the primary key — e.g., "all memberships for one user across orgs" with `key: ['orgId', 'userId']`. Prefix questions ("all memberships in org X") are answerable directly off the primary key.

Pick keys you'll never want to mutate. Changing a primary-key field requires delete + insert, which is two ops, two index updates, and an opportunity for races.

### Derived collections

A collection registered with `derived: true` is treated as recomputable from other state and is not versioned. Useful for materialized views and caches where the source of truth is somewhere else and the collection can be rebuilt at will:

```js
dbns.collections.register({
  name: 'post-counts-by-author',
  schema: '@app/post-count',
  key: ['authorId'],
  derived: true
})
```

Don't use `derived: true` for anything you couldn't reconstruct from authoritative records — it opts out of the migration safety the version preamble gives you.

## "Children by parent" pattern

The most common real-world schema shape: one parent record with many child records. Use a composite primary key on the child, and a secondary index keyed by just the parent ID for prefix scans.

```js
// build.cjs — parent: session, children: registrations, invites, joins
dbns.collections.register({
  name: 'sessions',
  schema: '@app/session',
  key: ['id']
})

// Composite PK ensures uniqueness per (sessionId, target) pair
dbns.collections.register({
  name: 'registrations',
  schema: '@app/registration',
  key: ['sessionId', 'target']
})

// Secondary index named {collection}-by-{parent-field} by convention
dbns.indexes.register({
  name: 'registrations-by-session',
  collection: '@app/registrations',
  unique: false,
  key: ['sessionId']
})
```

At runtime, listing all children for a parent is a prefix scan on the index:

```js
// All registrations for session s1
const regs = await db.find('@app/registrations-by-session', {
  gte: { sessionId: 's1' },
  lte: { sessionId: 's1' }
}).toArray()

// Get or delete a specific child by full composite key
const reg = await db.get('@app/registrations', { sessionId: 's1', target: '/path' })
await db.delete('@app/registrations', { sessionId: 's1', target: '/path' })
await db.flush()
```

Naming convention: `{collection}-by-{parent-field}`. Consistent naming makes it clear at a glance which indexes are "children of" lookups vs range queries.

## Indexes

Two flavors:

### Field-derived index

```js
dbns.indexes.register({
  name: 'users-by-email',
  collection: '@app/users',
  unique: true,
  key: ['email']
})
```

The index key is taken straight off the record. With `unique: true`, the index promises one document per key — duplicates throw on insert. With `unique: false`, the document's primary key is appended to the index key automatically (otherwise you'd lose all but one match).

### Mapped index

For non-trivial keys — synthetic combinations, lowercased values, denormalized fan-out — pass a `map` callback registered through `db.require()`:

```js
// helpers.js
exports.tagsMap = (post) => post.tags.map((tag) => ({ tag }))   // fan-out: one row per tag

exports.lowerEmailMap = (user) => [{ email: user.email.toLowerCase() }]
```

```js
// build.js
dbns.require('./helpers.js')

dbns.indexes.register({
  name: 'posts-by-tag',
  collection: '@app/posts',
  unique: false,
  key: { type: 'string', map: 'tagsMap' }       // one document per (tag, postId)
})

dbns.indexes.register({
  name: 'users-by-lowercase-email',
  collection: '@app/users',
  unique: true,
  key: {
    type: { fields: [{ name: 'email', type: 'string' }] },
    map: 'lowerEmailMap'
  }
})
```

The map callback returns an **array** — return `[]` to skip indexing this record, return one entry for a 1:1 index, return many for fan-out. The shape of each returned entry must match the index's `key.type`.

The map function is referenced by name (string), not by value. The name resolves through `db.require()`'d files. Inline arrows don't generate — they have to be exported from a required file.

### Newest-first via inverted timestamps

There's no per-index "default sort order" knob — sort order IS the lexicographic order of the encoded key. To make ascending order also be newest-first (so a `reverse: true` isn't needed and a forward scan with `limit: 20` returns the latest 20), store `Number.MAX_SAFE_INTEGER - timestamp` in the index key:

```js
exports.postsByAuthorMap = (post) => [{
  authorId: post.authorId,
  invCreated: Number.MAX_SAFE_INTEGER - post.created
}]
```

Now `gte: { authorId: 'u1' }, lte: { authorId: 'u1' }, limit: 20` returns the 20 newest posts for `u1` in a forward scan. You can still pass `reverse: true` to walk the underlying order — but if you can avoid needing it, you save the cost of allocating a reverse iterator.

## Runtime: choosing an engine

```js
const HyperDB = require('hyperdb')
const def = require('./spec/hyperdb')

// Local, fast, NOT replicable. Single-writer.
const db = HyperDB.rocks('./data/app.db', def)

// Hyperbee-backed. P2P-replicable, append-only Hypercore underneath.
// Use the `hyperbee2` package (not `hyperbee`) and `HyperDB.bee2` (not `HyperDB.bee`).
// Pass a Corestore (or Corestore session) — not a raw Hypercore.
const Hyperbee = require('hyperbee2')
const bee = new Hyperbee(store, { name: 'my-db' })   // store is a Corestore
const db = HyperDB.bee2(bee, def)
await db.ready()
```

Pick on what the data is for:

- **Rocks** for app-local indexes, caches, settings, anything that doesn't need to leave the device. Fast, mutable, no replication overhead.
- **Bee2** for state that needs to replicate over Hyperswarm — shared collaborative state, append-only event logs viewed through a schema, anything peers should see.

**`HyperDB.bee` vs `HyperDB.bee2`** — `bee2` is the current API. It takes a `hyperbee2` instance backed by a Corestore, not a raw `hyperbee` backed by a Hypercore. Use `HyperDB.bee2` + `hyperbee2` in all new code.

`writable: false` opens read-only — useful for follower views, e.g. peer-replicated Hyperbees you don't own.

### `pear-hyperdb` shorthand

If your app is targeting Pear and you want the spec scaffolding done for you, `pear-hyperdb` exports a `{ spec, Model }` you can drop in. It's a thin convenience wrapper — same underlying API.

```js
const { spec, Model } = require('pear-hyperdb')
const HyperDB = require('hyperdb')
const rocks = HyperDB.rocks('./my.db', spec)
const model = new Model(rocks)
await model.db.ready()
```

## Runtime: reads and writes

```js
// Insert — buffered until flush
await db.insert('@app/users', { id: 'u1', name: 'Maf' })
await db.insert('@app/users', { id: 'u2', name: 'Sean', email: 'sean@example.com' })
await db.flush()                                  // <-- persist

// Partial update — merges only the provided fields into the existing record
// You do NOT need to supply all fields; unmentioned fields are left unchanged
await db.update('@app/users', { id: 'u1', lastSeen: Date.now() })
await db.flush()

// Full replace — use insert() when you have the full record (or are creating)
await db.insert('@app/users', { ...existingUser, name: 'New Name' })
await db.flush()

// Get one by primary key (all key fields required, exact match)
const user = await db.get('@app/users', { id: 'u1' })

// Get many in parallel
const [a, b] = await db.getAll('@app/users', [{ id: 'u1' }, { id: 'u2' }])

// Delete — also buffered, also needs flush
await db.delete('@app/posts', { id: 'p1' })
await db.flush()
```

### Querying via `find` / `findOne`

This is the part that bites — it's not the same shape as `db.get`. **All query data goes inside `gte` / `gt` / `lte` / `lt`.** You never pass key fields directly to `find` or `findOne`. The bounds object is partial-key-friendly: any field you omit is unbounded on that side.

```js
// Exact lookup against a unique index — bound both sides to the same key
const u = await db.findOne('@app/users-by-email', {
  gte: { email: 'sean@example.com' },
  lte: { email: 'sean@example.com' }
})

// Prefix scan: every post by author u1, via a `posts-by-author` index keyed (authorId, created)
for await (const post of db.find('@app/posts-by-author', {
  gte: { authorId: 'u1' },
  lte: { authorId: 'u1' }
})) {
  // any key starting with authorId='u1', any created
}

// Same prefix scan but directly off a primary key — works the same way
for await (const m of db.find('@app/memberships', {
  gte: { orgId: 'X' },
  lte: { orgId: 'X' }
})) {
  // every membership in org X
}

// Bounded range: u1's posts created on/after cutoff
for await (const post of db.find('@app/posts-by-author', {
  gte: { authorId: 'u1', created: cutoff },
  lte: { authorId: 'u1' }
})) { /* ... */ }

// Page through with limit + reverse for newest-first
for await (const post of db.find('@app/posts-by-author', {
  gte: { authorId: 'u1' },
  lte: { authorId: 'u1' },
  reverse: true,
  limit: 20
})) { /* ... */ }

// Stream helpers — avoid for await when you just need all results
const all  = await db.find('@app/posts-by-tag', {
  gte: { tag: 'p2p' }, lte: { tag: 'p2p' }
}).toArray()
const last = await db.find('@app/posts-by-tag', {
  gte: { tag: 'p2p' }, lte: { tag: 'p2p' }
}).one()

// Full collection scan — empty bounds fetch every record
const everyone = await db.find('@app/users', { gte: {}, lte: {} }).toArray()
```

The pattern that catches people: passing the matching fields as a flat object (`{ authorId: 'u1' }`) the way you would to `db.get`. That doesn't error loudly — it just doesn't match anything because the bound encoder doesn't know what to do with the unwrapped fields. Always wrap.

If `gte` and `lte` are equal you've expressed an exact lookup; if only one side is bounded you've expressed an open range; if both sides are bounded with progressively-fewer fields you've expressed a prefix scan. Same shape, three queries.

### `flush` is not optional

`db.insert()` and `db.delete()` write to an in-memory batch. Without `db.flush()`, the data is in memory only — a crash drops it, and a second process won't see it. Flush after each logical group of writes:

```js
async function publishPost(post) {
  await db.insert('@app/posts', post)
  await db.insert('@app/audit-log', { kind: 'post.publish', postId: post.id, ts: Date.now() })
  await db.flush()                                // commit both atomically
}
```

Two inserts before one flush get committed together. Use this for atomicity — if your app needs "post + audit-row or neither", they share a flush.

### Snapshots and transactions

```js
// Read snapshot — frozen view, immune to in-flight writes
const snap = db.snapshot()
try {
  for await (const p of snap.find('@app/posts')) { /* stable iteration */ }
} finally {
  await snap.close()                              // MUST close, or you leak
}

// Transaction — read-modify-write batch
const tx = db.transaction()
const u = await tx.get('@app/users', { id: 'u1' })
u.name = 'New Name'
await tx.insert('@app/users', u)
await tx.flush()

// Locked transaction — serializes against concurrent ones
await db.lockedTransaction(async (tx) => {
  const u = await tx.get('@app/users', { id: 'u1' })
  await tx.insert('@app/users', { ...u, version: u.version + 1 })
})
```

Snapshots leak handles if you forget to close them — wrap in try/finally. `lockedTransaction` is what you want any time two concurrent code paths might both read-modify-write the same key.

## Schema migrations

The append-only law (above) is the easy case. The hard case is when the change can't be expressed as an appended optional field — splitting a field, changing a type, restructuring a key.

The pattern: **dual-write, backfill, switch reads, retire.**

1. Register a `user-v2` struct alongside `user`. Add a `users-v2` collection.
2. Change writes to insert into both `users` and `users-v2`. Reads still come from `users`.
3. Run a one-shot backfill: for each existing `user`, derive a `user-v2` and insert it.
4. Switch reads to `users-v2`.
5. Stop writing to `users`.
6. After enough time / version skew has elapsed, retire `users` (leave the schema entry in place; just drop the collection from `build.js`).

Don't try to delete a struct from Hyperschema while old data on disk references it. The decoder needs to be able to read those bytes even if the app no longer creates new ones.

For Hyperbee-backed (replicated) databases this is more delicate — peers may have old records you can't see locally, and you can't backfill what isn't yours. Keep old schemas decodable for at least the lifetime of the oldest peer you care about.

## Common gotchas

- **TypeScript: exclude `spec/` from type-checking.** The generated files use implicit `any` throughout and will fail `strict: true`. Add `"exclude": ["spec"]` to your `tsconfig.json`.
- **TypeScript: `ReturnType<typeof HyperDB.bee2>`** is the correct type for a bee2-backed db field. There are no shipped types for `hyperdb` — declare `declare module 'hyperdb' { ... }` in an ambient `.d.ts`.
- **`HyperDB.bee` / `hyperbee` are the old API.** Use `HyperDB.bee2` + `hyperbee2` in all new code.
- **`db.find()` is an async iterator.** Always `for await`. A bare `db.find(...)` returns a stream you haven't drained — silent no-op.
- **`db.insert()` without `await db.flush()` is a write to RAM, not disk.** Loses on crash, invisible to other processes.
- **Empty buffers round-trip as `null`.** `obj.data || Buffer.alloc(0)` defensively when reading bytes you intend to write.
- **Struct order matters in `build.js`.** Register a struct before any other struct or collection that references it via `@ns/name`.
- **`Hyperschema.toDisk(schema)` before `HyperDB.from(...)`.** The DB builder reads the schema definitions off disk that the schema builder just wrote. Reverse the order and the references won't resolve.
- **Mapped index callbacks are referenced by name, not by reference.** Inline arrows don't generate. Register the helpers file with `db.require()` and use the export name.
- **Index map callbacks must return an array.** Returning `undefined` to skip a record breaks the generator. Return `[]`.
- **All keys are composite.** Even `key: ['id']` is a length-1 array, not a special case. Lexicographic ordering applies universally. Picking key order = picking your range-scan story. The field you want to do equality matches on goes first; the field you want to range-scan goes last. `['orgId', 'userId']` is good for "all members of org X". `['userId', 'orgId']` is good for "all orgs user X is in". For both directions, add a secondary index.
- **`find` and `findOne` take bounds, not flat fields.** Wrap query data in `gte` / `gt` / `lte` / `lt`. `db.find('@app/posts-by-tag', { tag: 'p2p' })` matches nothing — `db.find('@app/posts-by-tag', { gte: { tag: 'p2p' }, lte: { tag: 'p2p' } })` works. `db.get` is the only call that takes key fields directly, and that's because it's strictly an exact-match-on-full-PK lookup.
- **`compact: true` is permanent.** No version preamble means no future fields. Only use for shapes that genuinely cannot grow.
- **Renaming a field is a breaking change.** The encoder doesn't care about names — but your code does, and old records were inserted under the old name. A rename is a v2 struct, not an edit.
- **`db.snapshot()` leaks if not closed.** RocksDB pins memory; Hyperbee pins core blocks. Always `try { ... } finally { snap.close() }`.
- **`db.close()` requires all snapshots to be closed first.** Otherwise hangs or throws.
- **`autoUpdate: false` (the default for bee) means appends from peers are invisible** until you call `db.update()`. Either flip `autoUpdate: true` or hook `bee.core.on('append', () => db.update())` yourself.

## Testing

Use `brittle` and a temp dir. For Hyperbee-backed dbs, pair with `hyperdht/testnet`:

```js
const test = require('brittle')
const tmp = require('test-tmp')
const HyperDB = require('hyperdb')
const def = require('../spec/hyperdb')

test('users insert + get', async (t) => {
  const dir = await tmp(t)
  const db = HyperDB.rocks(dir + '/db', def)
  t.teardown(() => db.close())

  await db.insert('@app/users', { id: 'u1', name: 'Maf' })
  await db.flush()

  const u = await db.get('@app/users', { id: 'u1' })
  t.is(u.name, 'Maf')
})

test('mapped index fan-out', async (t) => {
  const dir = await tmp(t)
  const db = HyperDB.rocks(dir + '/db', def)
  t.teardown(() => db.close())

  // assumes @app/post has `tags: { type: 'string', array: true }`
  // and an index `posts-by-tag` with `tagsMap` as the helper
  await db.insert('@app/posts', {
    id: 'p1', authorId: 'u1', title: 'hi', body: '...',
    created: Date.now(), tags: ['p2p', 'pear']
  })
  await db.flush()

  const byTag = await db.find('@app/posts-by-tag', {
    gte: { tag: 'p2p' },
    lte: { tag: 'p2p' }
  }).toArray()
  t.is(byTag.length, 1)
  t.is(byTag[0].id, 'p1')
})
```

`test-tmp` cleans up on `t.teardown` so a flaky test doesn't leave RocksDB locks around.

For schema-evolution tests, write a fixture v1 db on disk in a `before`, then load it under the v2 spec and assert old records still decode. This is the only way to catch a back-compat break in CI before it ships to users.

## Quick checklist when adding a new collection

1. Register the struct in Hyperschema first. Required vs optional decided NOW, not later.
2. Pick the primary key. Order fields least-specific to most-specific based on the prefix scans you want.
3. Run `npm run build`. Check the diff in `spec/`. If a struct you didn't touch shows up in the diff, you broke append-only somewhere.
4. Write a test that inserts and reads back before wiring the collection into app code.
5. Adding a secondary index? Decide unique vs not, write the map function, register the helpers file.
6. Plan the migration story BEFORE the first write hits production. The append-only law starts the moment one peer has a record on disk.

## Related skills

For wiring this into a SvelteKit-on-Bare app (singletons, hooks.server.ts boundaries, the `$lib/server` discipline), see the `svelte-bare-app` skill — it covers the integration layer and assumes the schema work in this skill is already done.
