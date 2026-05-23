import { test, expect } from '@playwright/test'

test.describe('Shelf', () => {
	test('shows stats bar with counts', async ({ page }) => {
		await page.goto('/')
		await expect(page.locator('.stats-bar')).toBeVisible()
		await expect(page.locator('.stat-n').first()).toBeVisible()
	})

	test('shows goal progress bar', async ({ page }) => {
		await page.goto('/')
		await expect(page.locator('.goal-track')).toBeVisible()
		await expect(page.locator('.goal-pct')).toBeVisible()
	})

	test('shows currently reading section', async ({ page }) => {
		await page.goto('/')
		await expect(page.locator('.reading-grid')).toBeVisible()
	})

	test('shows read-this-year section with year nav arrows', async ({ page }) => {
		await page.goto('/')
		const arrows = page.locator('.yr-arrow')
		await expect(arrows).toHaveCount(2)
	})

	test('search filters books', async ({ page }) => {
		await page.goto('/')
		const input = page.locator('.search-input')
		await input.fill('Piranesi')
		await expect(page.locator('.rc-title', { hasText: 'Piranesi' })).toBeVisible()
	})

	test('search shows empty state for no match', async ({ page }) => {
		await page.goto('/')
		await page.locator('.search-input').fill('xyznotabook')
		await expect(page.locator('.empty')).toBeVisible()
	})

	test('add book link navigates to /add', async ({ page }) => {
		await page.goto('/')
		await page.locator('.add-btn').click()
		await expect(page).toHaveURL('/add')
	})
})
