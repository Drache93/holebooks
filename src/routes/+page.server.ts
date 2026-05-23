import type { PageServerLoad } from './$types'
import { getAllBooks, computeYearStats } from '$lib/server/books'

export const load: PageServerLoad = async ({ locals, url }) => {
	await locals.app?.ready()
	const books = await getAllBooks(locals.app!.db!)

	const currentYear = new Date().getFullYear()
	const yearParam = Number(url.searchParams.get('year')) || currentYear
	const stats = computeYearStats(books, yearParam)

	// Years that have at least one read book, plus current year
	const yearsWithReads = [
		...new Set(
			books
				.filter((b) => b.status === 'read' && b.dateRead)
				.map((b) => Number(b.dateRead!.slice(0, 4)))
				.filter(Boolean)
		)
	].sort()
	if (!yearsWithReads.includes(currentYear)) yearsWithReads.push(currentYear)

	const readThisYear = books.filter(
		(b) => b.status === 'read' && b.dateRead?.startsWith(String(yearParam))
	)

	return {
		reading: books.filter((b) => b.status === 'reading'),
		read: readThisYear,
		planned: books.filter((b) => b.status === 'planned'),
		stats,
		year: yearParam,
		years: yearsWithReads
	}
}
