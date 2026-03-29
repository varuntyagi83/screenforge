import { test, expect } from '@playwright/test'

test.describe('Library Page', () => {
  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/library')
    await expect(page).toHaveURL(/\/login/)
  })
})
