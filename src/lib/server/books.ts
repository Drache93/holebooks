import type { Book, YearStats } from '$lib/types'

// MVP: in-memory mock — replace body of each function with HyperDB calls later

const store: Book[] = [
	{
		id: '1',
		title: 'The Remains of the Day',
		author: 'Kazuo Ishiguro',
		status: 'reading',
		progress: 65,
		pagesRead: 195,
		totalPages: 258,
		dateAdded: '2026-01-10',
		genre: 'Literary Fiction'
	},
	{
		id: '2',
		title: 'Piranesi',
		author: 'Susanna Clarke',
		status: 'reading',
		progress: 30,
		pagesRead: 60,
		totalPages: 272,
		dateAdded: '2026-02-14',
		genre: 'Fantasy'
	},
	{
		id: '3',
		title: 'The Master and Margarita',
		author: 'Mikhail Bulgakov',
		status: 'read',
		progress: 100,
		pagesRead: 412,
		totalPages: 412,
		dateAdded: '2026-01-01',
		dateRead: '2026-01-28',
		genre: 'Satire',
		rating: 5,
		notes: 'Utterly original. The Moscow sequences are absurdist gold.'
	},
	{
		id: '4',
		title: 'Educated',
		author: 'Tara Westover',
		status: 'read',
		progress: 100,
		pagesRead: 334,
		totalPages: 334,
		dateAdded: '2025-12-15',
		dateRead: '2026-02-03',
		genre: 'Memoir',
		rating: 4
	},
	{
		id: '5',
		title: 'The Name of the Rose',
		author: 'Umberto Eco',
		status: 'read',
		progress: 100,
		pagesRead: 502,
		totalPages: 502,
		dateAdded: '2025-11-20',
		dateRead: '2026-03-12',
		genre: 'Historical Mystery',
		rating: 4,
		notes: 'Dense but rewarding. The monastery setting is incredible.'
	},
	{
		id: '6',
		title: 'The Wind-Up Bird Chronicle',
		author: 'Haruki Murakami',
		status: 'planned',
		progress: 0,
		totalPages: 607,
		dateAdded: '2026-01-05',
		genre: 'Literary Fiction'
	},
	{
		id: '7',
		title: 'Dune',
		author: 'Frank Herbert',
		status: 'planned',
		progress: 0,
		totalPages: 688,
		dateAdded: '2026-03-01',
		genre: 'Science Fiction'
	},
	{
		id: '8',
		title: 'Never Let Me Go',
		author: 'Kazuo Ishiguro',
		status: 'planned',
		progress: 0,
		totalPages: 288,
		dateAdded: '2026-02-20',
		genre: 'Dystopian'
	},
	{
		id: '9',
		title: 'A Gentleman in Moscow',
		author: 'Amor Towles',
		status: 'planned',
		progress: 0,
		totalPages: 462,
		dateAdded: '2026-04-02',
		genre: 'Historical Fiction'
	}
]

export async function getAllBooks(): Promise<Book[]> {
	return store.map((b) => ({ ...b }))
}

export async function getBook(id: string): Promise<Book | null> {
	return store.find((b) => b.id === id) ?? null
}

export async function updateBook(id: string, patch: Partial<Book>): Promise<Book | null> {
	const idx = store.findIndex((b) => b.id === id)
	if (idx === -1) return null
	store[idx] = { ...store[idx], ...patch }
	return { ...store[idx] }
}

export function computeYearStats(books: Book[], year = 2026): YearStats {
	return {
		year,
		read: books.filter((b) => b.status === 'read').length,
		reading: books.filter((b) => b.status === 'reading').length,
		planned: books.filter((b) => b.status === 'planned').length,
		pagesRead: books
			.filter((b) => b.status === 'read')
			.reduce((sum, b) => sum + (b.pagesRead ?? b.totalPages ?? 0), 0),
		goal: 20
	}
}
