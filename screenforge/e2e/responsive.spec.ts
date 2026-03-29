import { test, expect } from '@playwright/test'

test.describe('Responsive Design', () => {
  test('login page renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await expect(page.getByText('Sign in with Google')).toBeVisible()
  })

  test('login page renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/login')
    await expect(page.getByText('Sign in with Google')).toBeVisible()
  })

  test('login page renders on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/login')
    await expect(page.getByText('Sign in with Google')).toBeVisible()
  })
})
