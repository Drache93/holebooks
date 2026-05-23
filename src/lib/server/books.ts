import type { Book, BookStatus, YearStats } from '$lib/types'
import type { DB } from '$lib/server/app'

const SEED_BOOKS: Book[] = [
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

function toBook(raw: Record<string, unknown>): Book {
	return {
		id: raw.id as string,
		title: raw.title as string,
		author: raw.author as string,
		status: raw.status as BookStatus,
		progress: raw.progress as number,
		pagesRead: (raw.pagesRead as number) ?? undefined,
		totalPages: (raw.totalPages as number) ?? undefined,
		dateAdded: raw.dateAdded as string,
		dateRead: (raw.dateRead as string) ?? undefined,
		genre: (raw.genre as string) ?? undefined,
		rating: (raw.rating as number) || undefined,
		notes: (raw.notes as string) ?? undefined,
		isbn: (raw.isbn as string) ?? undefined,
		coverUrl: (raw.coverUrl as string) ?? undefined,
		dateStarted: (raw.dateStarted as string) ?? undefined
	}
}

export async function seedIfEmpty(db: DB): Promise<void> {
	const existing = await db.find('@holebooks/books', { gte: {}, lte: {} }).toArray()
	if (existing.length > 0) return
	for (const book of SEED_BOOKS) {
		await db.insert('@holebooks/books', book)
	}
	await db.flush()
}

export async function getAllBooks(db: DB): Promise<Book[]> {
	const raws = await db.find('@holebooks/books', { gte: {}, lte: {} }).toArray()
	return raws.map(toBook)
}

export async function getBook(db: DB, id: string): Promise<Book | null> {
	const raw = await db.get('@holebooks/books', { id })
	return raw ? toBook(raw) : null
}

export async function createBook(db: DB, data: Omit<Book, 'id' | 'dateAdded'>): Promise<Book> {
	const id = crypto.randomUUID()
	const book: Book = { ...data, id, dateAdded: new Date().toISOString().slice(0, 10) }
	await db.insert('@holebooks/books', book)
	await db.flush()
	return book
}

export async function updateBook(db: DB, id: string, patch: Partial<Book>): Promise<Book | null> {
	const existing = await db.get('@holebooks/books', { id })
	if (!existing) return null
	// HyperDB has no update() — use insert() which acts as upsert.
	// Strip undefined values and merge with existing to preserve all required fields.
	const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
	await db.insert('@holebooks/books', { ...existing, ...clean })
	await db.flush()
	return toBook({ ...existing, ...clean })
}

export async function deleteBook(db: DB, id: string): Promise<boolean> {
	const existing = await db.get('@holebooks/books', { id })
	if (!existing) return false
	await db.delete('@holebooks/books', { id })
	await db.flush()
	return true
}

export function computeYearStats(books: Book[], year = new Date().getFullYear()): YearStats {
	const readThisYear = books.filter(
		(b) => b.status === 'read' && b.dateRead?.startsWith(String(year))
	)
	return {
		year,
		read: readThisYear.length,
		reading: books.filter((b) => b.status === 'reading').length,
		planned: books.filter((b) => b.status === 'planned').length,
		pagesRead: readThisYear.reduce((sum, b) => sum + (b.pagesRead ?? b.totalPages ?? 0), 0),
		goal: 20
	}
}
