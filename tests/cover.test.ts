import { test, expect } from '@playwright/test'

const TEST_COVER_URL = 'https://covers.openlibrary.org/b/id/240726-M.jpg'
const TAG = `[cover-test]`

async function addBook(page: any, title: string, coverUrl?: string): Promise<string> {
	await page.goto('/add')
	await page.locator('#f-title').fill(title)
	await page.locator('#f-author').fill('Test Author')
	if (coverUrl) {
		await page.locator('input[name="coverUrl"]').evaluate(
			(el: HTMLInputElement, url: string) => { el.value = url },
			coverUrl
		)
	}
	await page.locator('button[type="submit"]').click()
	await page.waitForURL(/\/book\//)
	return page.url().split('/book/')[1]
}

async function deleteBook(page: any, bookId: string) {
	await page.goto(`/book/${bookId}`)
	await page.locator('.del-trigger').click()
	await page.locator('.del-confirm-box button.btn-danger').click()
	await page.waitForURL('/')
}

// Clean up leftover test books from previous runs (books whose title starts with our TAG)
async function cleanupLeftovers(page: any) {
	await page.goto('/')
	while (true) {
		// Look for any card (reading or tile) whose title contains our tag
		const stale = page.locator(`.rc-title, .tile-title`).filter({ hasText: TAG }).first()
		if (!(await stale.isVisible().catch(() => false))) break
		await stale.click()
		await page.waitForURL(/\/book\//)
		const bookId = page.url().split('/book/')[1]
		await deleteBook(page, bookId)
	}
}

test.describe.serial('Cover image caching', () => {
	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage()
		await cleanupLeftovers(page)
		await page.close()
	})

	test('book added without coverUrl: cover API returns 404, BookCover shows initials', async ({ page }) => {
		const title = `${TAG} No Cover`
		const bookId = await addBook(page, title)
		try {
			const res = await page.request.get(`/api/books/${bookId}/cover`)
			expect(res.status()).toBe(404)
			await expect(page.locator('.cover-initials')).toBeVisible()
		} finally {
			await deleteBook(page, bookId)
		}
	})

	test('book added with coverUrl: cover API returns image, BookCover uses API endpoint', async ({ page }) => {
		const title = `${TAG} With Cover`
		const bookId = await addBook(page, title, TEST_COVER_URL)
		try {
			const res = await page.request.get(`/api/books/${bookId}/cover`)
			expect(res.status()).toBe(200)
			expect(res.headers()['content-type']).toMatch(/^image\//)

			const body = await res.body()
			expect(body.byteLength).toBeGreaterThan(1000)

			const img = page.locator('.cover-photo')
			await expect(img).toBeVisible()
			const src = await img.getAttribute('src')
			expect(src).toBe(`/api/books/${bookId}/cover`)
		} finally {
			await deleteBook(page, bookId)
		}
	})

	test('cover img src is local, not an external URL', async ({ page }) => {
		const title = `${TAG} Cached`
		const bookId = await addBook(page, title, TEST_COVER_URL)
		try {
			const img = page.locator('.cover-photo')
			await expect(img).toBeVisible()
			const src = await img.getAttribute('src')
			expect(src).not.toContain('openlibrary.org')
			expect(src).toBe(`/api/books/${bookId}/cover`)

			// Check shelf page uses the local src too
			await page.goto('/')
			const shelfImg = page.locator(`img[src="/api/books/${bookId}/cover"]`)
			await expect(shelfImg).toBeVisible()
		} finally {
			await deleteBook(page, bookId)
		}
	})
})
