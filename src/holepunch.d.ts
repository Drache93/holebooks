// Ambient stubs for Holepunch / Bare packages that ship no TypeScript types.
// This file must NOT have import/export so it stays ambient (global scope).

declare module 'bare-storage' {
	const storage: { persistent(): string }
	export = storage
}

declare module 'ready-resource' {
	abstract class ReadyResource {
		ready(): Promise<void>
		close(): Promise<void>
		protected abstract _open(): Promise<void>
		protected abstract _close(): Promise<void>
	}
	export = ReadyResource
}

declare module 'corestore' {
	class Corestore {
		constructor(path: string)
		ready(): Promise<void>
		close(): Promise<void>
	}
	export = Corestore
}

declare module 'hyperbee2' {
	class Hyperbee {
		constructor(store: unknown, opts: { name: string })
	}
	export = Hyperbee
}

declare module 'hyperdb' {
	interface HyperDBInstance {
		ready(): Promise<void>
		close(): Promise<void>
		flush(): Promise<void>
		insert(collection: string, record: object): Promise<void>
		update(collection: string, patch: object): Promise<void>
		delete(collection: string, key: object): Promise<void>
		get(
			collection: string,
			key: Record<string, unknown>
		): Promise<Record<string, unknown> | null>
		find(
			collection: string,
			bounds: {
				gte?: Record<string, unknown>
				lte?: Record<string, unknown>
				gt?: Record<string, unknown>
				lt?: Record<string, unknown>
				reverse?: boolean
				limit?: number
			}
		): AsyncIterable<Record<string, unknown>> & {
			toArray(): Promise<Record<string, unknown>[]>
		}
	}

	const HyperDB: {
		bee2(bee: unknown, def: unknown): HyperDBInstance
	}
	export = HyperDB
}
