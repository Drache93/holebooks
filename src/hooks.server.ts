import type { Handle } from '@sveltejs/kit'

// When P2P storage lands: import { getStore } from '$lib/server/store'
// const storePromise = getStore()
// export const handle: Handle = async ({ event, resolve }) => {
//   event.locals.store = await storePromise
//   return resolve(event)
// }

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event)
}
