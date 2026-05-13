export type BookStatus = 'reading' | 'read' | 'planned'

export interface Book {
	id: string
	title: string
	author: string
	status: BookStatus
	progress: number // 0–100
	pagesRead?: number
	totalPages?: number
	dateAdded: string
	dateRead?: string
	genre?: string
	rating?: number // 1–5
	notes?: string
}

export interface YearStats {
	year: number
	read: number
	reading: number
	planned: number
	pagesRead: number
	goal: number
}
