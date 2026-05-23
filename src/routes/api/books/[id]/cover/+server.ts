import type { RequestHandler } from './$types'
import { getCoverImage } from '$lib/server/books'
import { error } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ params, locals }) => {
	await locals.app?.ready()
	const cover = await getCoverImage(locals.app!.db!, params.id)
	if (!cover) error(404, 'No cached cover')
	return new Response(new Uint8Array(cover.data), {
		headers: {
			'content-type': cover.contentType,
			'cache-control': 'public, max-age=31536000, immutable'
		}
	})
}
