import type { Handle } from '@sveltejs/kit'
import { building } from '$app/environment'
import { createApp } from '$lib/server/app'
import type HolebooksApp from '$lib/server/app'
import process from 'process'

// Pin on globalThis so Vite HMR reloads of this file don't open a second
// Corestore handle against the same data dir.
const g = globalThis as unknown as { __holebooks_app?: HolebooksApp }

if (!building && !g.__holebooks_app) {
	g.__holebooks_app = createApp()
	g.__holebooks_app
		.ready()
		.then(() => console.log('holebooks ready'))
		.catch((err: Error) => console.error('holebooks boot failed:', err))

	process.on('sveltekit:close', async () => {
		try {
			await g.__holebooks_app?.close()
		} catch {}
	})
}

export const handle: Handle = ({ event, resolve }) => {
	event.locals.app = g.__holebooks_app ?? null
	return resolve(event)
}
