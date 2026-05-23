import type { Actions } from './$types'
import { createBook } from '$lib/server/books'
import { fail, redirect } from '@sveltejs/kit'

export const actions: Actions = {
	default: async ({ request, locals }) => {
		await locals.app?.ready()
		const db = locals.app!.db!
		const data = await request.formData()

		const title = String(data.get('title') ?? '').trim()
		const author = String(data.get('author') ?? '').trim()
		const status = String(data.get('status') ?? 'planned')

		if (!title) return fail(400, { error: 'Title is required' })
		if (!author) return fail(400, { error: 'Author is required' })
		if (!['reading', 'read', 'planned'].includes(status))
			return fail(400, { error: 'Invalid status' })

		const totalPages = Number(data.get('totalPages')) || undefined
		const genre = String(data.get('genre') ?? '').trim() || undefined
		const isbn = String(data.get('isbn') ?? '').trim() || undefined
		const coverUrl = String(data.get('coverUrl') ?? '').trim() || undefined

		const book = await createBook(db, {
			title,
			author,
			status: status as 'reading' | 'read' | 'planned',
			progress: status === 'read' ? 100 : 0,
			totalPages,
			genre,
			isbn,
			coverUrl
		})

		redirect(303, `/book/${book.id}`)
	}
}
