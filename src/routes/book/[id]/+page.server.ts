import type { PageServerLoad, Actions } from './$types'
import { getBook, updateBook } from '$lib/server/books'
import { error, fail } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ params }) => {
	const book = await getBook(params.id)
	if (!book) error(404, 'Book not found')
	return { book }
}

export const actions: Actions = {
	updateProgress: async ({ params, request }) => {
		const data = await request.formData()
		const pagesRead = Number(data.get('pagesRead'))
		const book = await getBook(params.id)
		if (!book) return fail(404, { message: 'Not found' })
		if (isNaN(pagesRead) || pagesRead < 0) return fail(400, { message: 'Invalid pages' })

		const total = book.totalPages ?? 0
		const progress = total > 0 ? Math.min(100, Math.round((pagesRead / total) * 100)) : 0
		await updateBook(params.id, { pagesRead, progress })
		return { ok: true }
	},

	markRead: async ({ params, request }) => {
		const data = await request.formData()
		const rating = Number(data.get('rating')) || undefined
		await updateBook(params.id, {
			status: 'read',
			progress: 100,
			dateRead: new Date().toISOString().slice(0, 10),
			rating
		})
		return { ok: true }
	},

	startReading: async ({ params }) => {
		await updateBook(params.id, { status: 'reading', progress: 0, pagesRead: 0 })
		return { ok: true }
	},

	saveNotes: async ({ params, request }) => {
		const data = await request.formData()
		const notes = String(data.get('notes') ?? '')
		await updateBook(params.id, { notes })
		return { ok: true }
	},

	setRating: async ({ params, request }) => {
		const data = await request.formData()
		const rating = Number(data.get('rating'))
		if (rating < 1 || rating > 5) return fail(400, { message: 'Invalid rating' })
		await updateBook(params.id, { rating })
		return { ok: true }
	}
}
