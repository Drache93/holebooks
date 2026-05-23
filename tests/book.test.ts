import { test, expect } from '@playwright/test'

test.describe('Book detail — navigation', () => {
	test('navigates from shelf to book page', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		await expect(page).toHaveURL(/\/book\//)
		await expect(page.locator('.hero-title')).toBeVisible()
	})

	test('title in hero matches the card clicked', async ({ page }) => {
		await page.goto('/')
		const title = await page.locator('.rc-title').first().textContent()
		await page.locator('.rc').first().click()
		await expect(page.locator('.hero-title')).toHaveText(title!.trim())
	})

	test('back link returns to shelf', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		await page.locator('.back').click()
		await expect(page).toHaveURL('/')
	})

	test('status pill shows Reading for a current book', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		await expect(page.locator('.status-pill.reading')).toBeVisible()
	})
})

test.describe('Book detail — progress stepper', () => {
	test('shows progress bar and page count', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		await expect(page.locator('.prog-bar-big')).toBeVisible()
		await expect(page.locator('.prog-n')).toBeVisible()
		await expect(page.locator('.prog-pct-big')).toBeVisible()
	})

	test('shows quick-add buttons', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		const buttons = page.locator('.qa-btn')
		await expect(buttons).toHaveCount(5)
		for (const label of ['+1', '+5', '+10', '+25', '+50']) {
			await expect(buttons.filter({ hasText: new RegExp(`^\\${label}$`) })).toBeVisible()
		}
	})

	test('+10 quick-add increments page count and persists', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()

		const countEl = page.locator('.prog-n')
		const before = Number(await countEl.textContent())

		await page.locator('.qa-btn').filter({ hasText: /^\+10$/ }).click()
		await expect(countEl).not.toHaveText(String(before), { timeout: 3000 })

		const after = Number(await countEl.textContent())
		expect(after).toBe(before + 10)

		// Reload to verify persistence
		await page.reload()
		await expect(page.locator('.prog-n')).toHaveText(String(before + 10))
	})

	test('+1 quick-add increments page count and persists', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()

		const countEl = page.locator('.prog-n')
		const before = Number(await countEl.textContent())

		await page.locator('.qa-btn').filter({ hasText: /^\+1$/ }).click()
		await expect(countEl).not.toHaveText(String(before), { timeout: 3000 })

		const after = Number(await countEl.textContent())
		expect(after).toBe(before + 1)

		// Reload to verify persistence
		await page.reload()
		await expect(page.locator('.prog-n')).toHaveText(String(before + 1))
	})
})

test.describe('Book detail — mark as finished', () => {
	test('shows mark as finished card', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		await expect(page.locator('.btn-green')).toBeVisible()
	})

	test('can set a star rating before finishing', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		const stars = page.locator('.stars-row .star')
		await stars.nth(3).click() // 4 stars
		await expect(stars.nth(3)).toHaveClass(/on/)
	})

	test('marking as finished changes status pill and persists', async ({ page }) => {
		await page.goto('/')
		const cards = page.locator('.rc')
		const count = await cards.count()
		if (count < 2) test.skip()
		await cards.last().click()
		await page.waitForURL(/\/book\//)

		const url = page.url()
		await page.locator('.btn-green').click()
		await expect(page.locator('.status-pill.read')).toBeVisible({ timeout: 5000 })

		// Reload to verify persistence
		await page.goto(url)
		await expect(page.locator('.status-pill.read')).toBeVisible()
	})
})

test.describe('Book detail — notes', () => {
	test('shows notes textarea', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		await expect(page.locator('.notes-ta')).toBeVisible()
	})

	test('saves notes and persists after reload', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		await page.waitForURL(/\/book\//)
		const url = page.url()

		const ta = page.locator('.notes-ta')
		await ta.fill('A really good book.')
		await page.locator('button:has-text("Save notes")').click()
		await expect(page.locator('button:has-text("Saved")')).toBeVisible({ timeout: 5000 })

		// Reload and verify notes persisted
		await page.goto(url)
		await expect(page.locator('.notes-ta')).toHaveValue('A really good book.')
	})
})

test.describe('Book detail — planned book', () => {
	test('planned book shows Start reading button', async ({ page }) => {
		await page.goto('/')
		await page.locator('.tile.planned').first().click()
		await expect(page.locator('button:has-text("Start reading")')).toBeVisible()
	})

	test('start reading changes status to Reading and persists', async ({ page }) => {
		await page.goto('/')
		await page.locator('.tile.planned').first().click()
		await page.waitForURL(/\/book\//)
		const url = page.url()

		await page.locator('button:has-text("Start reading")').click()
		await expect(page.locator('.status-pill.reading')).toBeVisible({ timeout: 5000 })

		// Reload to verify persistence
		await page.goto(url)
		await expect(page.locator('.status-pill.reading')).toBeVisible()
	})
})

test.describe('Book detail — edit and delete', () => {
	test('book details panel expands', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		await page.locator('.expand-toggle').click()
		await expect(page.locator('#ed-title')).toBeVisible()
	})

	test('can edit book title and persists after reload', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		await page.waitForURL(/\/book\//)
		const url = page.url()
		await page.locator('.expand-toggle').click()

		const input = page.locator('#ed-title')
		await input.fill('Updated Title')
		await page.locator('button:has-text("Save changes")').click()
		await expect(page.locator('.hero-title')).toHaveText('Updated Title', { timeout: 5000 })

		// Reload to verify persistence
		await page.goto(url)
		await expect(page.locator('.hero-title')).toHaveText('Updated Title')
	})

	test('delete confirmation appears before removing', async ({ page }) => {
		await page.goto('/')
		await page.locator('.rc').first().click()
		await page.locator('.del-trigger').click()
		await expect(page.locator('.del-confirm-box')).toBeVisible()
		// Cancel — don't actually delete
		await page.locator('button:has-text("Cancel")').click()
		await expect(page.locator('.del-confirm-box')).not.toBeVisible()
	})
})
