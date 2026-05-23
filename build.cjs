// Schema build script — run with: node build.cjs
// ESM project, so this must be .cjs. Generated output is ESM (esm: true).
const Hyperschema = require('hyperschema')
const HyperDB = require('hyperdb/builder')
const path = require('path')
const fs = require('fs')

const SCHEMA_DIR = path.join(__dirname, 'spec', 'hyperschema')
const DB_DIR = path.join(__dirname, 'spec', 'hyperdb')

// 1. Struct definitions
const schema = Hyperschema.from(SCHEMA_DIR)
const ns = schema.namespace('holebooks')

ns.register({
  name: 'book',
  fields: [
    { name: 'id',         type: 'string', required: true },
    { name: 'title',      type: 'string', required: true },
    { name: 'author',     type: 'string', required: true },
    { name: 'status',     type: 'string', required: true }, // 'reading' | 'read' | 'planned'
    { name: 'progress',   type: 'uint',   required: true }, // 0-100
    { name: 'pagesRead',  type: 'uint'                   }, // optional
    { name: 'totalPages', type: 'uint'                   }, // optional
    { name: 'dateAdded',  type: 'string', required: true },
    { name: 'dateRead',   type: 'string'                 }, // optional
    { name: 'genre',      type: 'string'                 }, // optional
    { name: 'rating',     type: 'uint'                   }, // optional, 1-5
    { name: 'notes',      type: 'string'                 }, // optional
    { name: 'isbn',        type: 'string'                 }, // optional
    { name: 'coverUrl',   type: 'string'                 }, // optional, OL cover URL
    { name: 'dateStarted', type: 'string'                }  // optional, ISO date when started
  ]
})

Hyperschema.toDisk(schema, { esm: true })

// 2. Collection definitions
const db = HyperDB.from(SCHEMA_DIR, DB_DIR)
const dbns = db.namespace('holebooks')

dbns.collections.register({
  name: 'books',
  schema: '@holebooks/book',
  key: ['id']
})

HyperDB.toDisk(db, { esm: true })

// Prepend @ts-nocheck to every generated JS file so TypeScript skips them.
// Without this, checkJs:true traverses imported spec files and reports implicit-any errors.
for (const dir of [SCHEMA_DIR, DB_DIR]) {
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js')) continue
    const p = path.join(dir, file)
    const src = fs.readFileSync(p, 'utf8')
    if (!src.startsWith('// @ts-nocheck')) {
      fs.writeFileSync(p, '// @ts-nocheck\n' + src)
    }
  }
}

console.log('spec generated →', DB_DIR)
