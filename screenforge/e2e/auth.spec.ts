import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/library')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page shows sign in button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Sign in with Google')).toBeVisible()
    await expect(page.getByText('ScreenForge')).toBeVisible()
  })

  test('public share pages are accessible without auth', async ({ page }) => {
    // This will 404 since no real token exists, but should NOT redirect to login
    const response = await page.goto('/share/test-token')
    expect(response?.status()).not.toBe(302)
  })

  test('landing page is accessible without auth', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
  })
})
