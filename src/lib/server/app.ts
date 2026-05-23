import ReadyResource from 'ready-resource'
import HyperDB from 'hyperdb'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee2'
import def from '../../../spec/hyperdb/index.js'
import storage from 'bare-storage'
import path from 'path'
import { seedIfEmpty, migrateCoverImages } from '$lib/server/books'

export type DB = ReturnType<typeof HyperDB.bee2>

export default class HolebooksApp extends ReadyResource {
	store: Corestore | null = null
	bee: Hyperbee | null = null
	db: DB | null = null

	constructor(readonly dir: string) {
		super()
	}

	protected async _open(): Promise<void> {
		this.store = new Corestore(path.join(this.dir, 'corestore'))
		await this.store.ready()
		this.bee = new Hyperbee(this.store, { name: 'holebooks-db' })
		this.db = HyperDB.bee2(this.bee, def)
		await this.db.ready()
		await seedIfEmpty(this.db)
		migrateCoverImages(this.db).catch(console.error)
	}

	protected async _close(): Promise<void> {
		if (this.db) await this.db.close()
		if (this.store) await this.store.close()
	}
}

export function createApp(): HolebooksApp {
	const dir = path.join(storage.persistent(), 'holebooks')
	return new HolebooksApp(dir)
}
