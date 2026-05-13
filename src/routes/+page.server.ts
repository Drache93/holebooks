import type { PageServerLoad } from './$types'
import { getAllBooks, computeYearStats } from '$lib/server/books'

export const load: PageServerLoad = async () => {
	const books = await getAllBooks()
	const stats = computeYearStats(books)
	return {
		reading: books.filter((b) => b.status === 'reading'),
		read: books.filter((b) => b.status === 'read'),
		planned: books.filter((b) => b.status === 'planned'),
		stats
	}
}
