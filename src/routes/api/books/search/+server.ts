import type { RequestHandler } from './$types'
import { json, error } from '@sveltejs/kit'

interface OLDoc {
	title?: string
	author_name?: string[]
	isbn?: string[]
	number_of_pages_median?: number
	subject?: string[]
	cover_i?: number
}

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim()
	if (!q) error(400, 'Missing query')

	const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=title,author_name,isbn,number_of_pages_median,subject,cover_i`

	let res: Response
	try {
		res = await fetch(olUrl, { headers: { 'User-Agent': 'Holebooks/1.0' } })
	} catch {
		error(502, 'Open Library unreachable')
	}

	if (!res.ok) error(502, 'Open Library error')

	const data = (await res.json()) as { docs: OLDoc[] }

	const results = (data.docs ?? []).map((doc) => {
		const isbn = doc.isbn?.[0]
		const coverUrl = doc.cover_i
			? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
			: isbn
				? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
				: undefined
		return {
			title: doc.title ?? '',
			author: doc.author_name?.[0] ?? '',
			isbn,
			totalPages: doc.number_of_pages_median,
			genre: doc.subject?.[0],
			coverUrl
		}
	})

	return json(results)
}
