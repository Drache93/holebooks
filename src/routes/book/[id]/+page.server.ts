import type { PageServerLoad, Actions } from './$types'
import { getBook, updateBook, deleteBook } from '$lib/server/books'
import { error, fail } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ params, locals }) => {
	await locals.app?.ready()
	const book = await getBook(locals.app!.db!, params.id)
	if (!book) error(404, 'Book not found')
	return { book }
}

function today() {
	return new Date().toISOString().slice(0, 10)
}


export const actions: Actions = {
	updateProgress: async ({ params, request, locals }) => {
		try {
			const data = await request.formData()
			const db = locals.app!.db!
			const book = await getBook(db, params.id)
			if (!book) return fail(404, { message: 'Not found' })

			const raw = data.get('pagesRead')
			const pct = data.get('progressPct')

			let pagesRead: number | undefined
			let progress: number

			if (raw !== null && raw !== '') {
				pagesRead = Number(raw)
				if (isNaN(pagesRead) || pagesRead < 0) return fail(400, { message: 'Invalid pages' })
				const total = book.totalPages ?? 0
				progress = total > 0 ? Math.min(100, Math.round((pagesRead / total) * 100)) : 0
			} else {
				progress = Math.min(100, Math.max(0, Number(pct) || 0))
			}

			await updateBook(db, params.id, { pagesRead, progress })
			return { ok: true }
		} catch (err: unknown) {
			console.error('[updateProgress]', err)
			return fail(500, { message: err instanceof Error ? err.message : 'Server error' })
		}
	},

	startReading: async ({ params, locals }) => {
		try {
			await updateBook(locals.app!.db!, params.id, {
				status: 'reading',
				progress: 0,
				pagesRead: 0,
				dateStarted: today()
			})
			return { ok: true }
		} catch (err: unknown) {
			console.error('[startReading]', err)
			return fail(500, { message: err instanceof Error ? err.message : 'Server error' })
		}
	},

	stopReading: async ({ params, locals }) => {
		try {
			await updateBook(locals.app!.db!, params.id, {
				status: 'planned',
				progress: 0,
				pagesRead: 0
			})
			return { ok: true }
		} catch (err: unknown) {
			console.error('[stopReading]', err)
			return fail(500, { message: err instanceof Error ? err.message : 'Server error' })
		}
	},

	markRead: async ({ params, request, locals }) => {
		try {
			const data = await request.formData()
			const rating = Number(data.get('rating')) || undefined
			const dateRead = String(data.get('dateRead') || '').trim() || today()
			await updateBook(locals.app!.db!, params.id, {
				status: 'read',
				progress: 100,
				dateRead,
				rating
			})
			return { ok: true }
		} catch (err: unknown) {
			console.error('[markRead]', err)
			return fail(500, { message: err instanceof Error ? err.message : 'Server error' })
		}
	},

	saveNotes: async ({ params, request, locals }) => {
		try {
			const data = await request.formData()
			const notes = String(data.get('notes') ?? '')
			await updateBook(locals.app!.db!, params.id, { notes: notes || undefined })
			return { ok: true }
		} catch (err: unknown) {
			console.error('[saveNotes]', err)
			return fail(500, { message: err instanceof Error ? err.message : 'Server error' })
		}
	},

	setRating: async ({ params, request, locals }) => {
		try {
			const data = await request.formData()
			const rating = Number(data.get('rating'))
			if (rating < 1 || rating > 5) return fail(400, { message: 'Invalid rating' })
			await updateBook(locals.app!.db!, params.id, { rating })
			return { ok: true }
		} catch (err: unknown) {
			console.error('[setRating]', err)
			return fail(500, { message: err instanceof Error ? err.message : 'Server error' })
		}
	},

	editDetails: async ({ params, request, locals }) => {
		try {
			const data = await request.formData()
			const title = String(data.get('title') ?? '').trim()
			const author = String(data.get('author') ?? '').trim()
			if (!title || !author) return fail(400, { message: 'Title and author are required' })

			const patch: Record<string, unknown> = { title, author }
			const genre = String(data.get('genre') ?? '').trim()
			if (genre) patch.genre = genre
			const totalPages = Number(data.get('totalPages'))
			if (totalPages > 0) patch.totalPages = totalPages

			await updateBook(locals.app!.db!, params.id, patch as Parameters<typeof updateBook>[2])
			return { ok: true }
		} catch (err: unknown) {
			console.error('[editDetails]', err)
			return fail(500, { message: err instanceof Error ? err.message : 'Server error' })
		}
	},

	delete: async ({ params, locals }) => {
		try {
			await deleteBook(locals.app!.db!, params.id)
		} catch (err: unknown) {
			console.error('[delete]', err)
			return fail(500, { message: err instanceof Error ? err.message : 'Server error' })
		}
		return { deleted: true }
	}
}
