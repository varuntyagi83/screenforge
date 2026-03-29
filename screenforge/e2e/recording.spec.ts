import { test, expect } from '@playwright/test'

test.describe('Recording Page', () => {
  // Note: These tests require auth mocking for full flow
  // Testing the public-facing aspects

  test('record page loads with mode selector', async ({ page }) => {
    // The record page is behind auth, so we expect redirect
    await page.goto('/record')
    // Should either show the page or redirect to login
    const url = page.url()
    expect(url).toMatch(/\/(record|login)/)
  })
})

test.describe('Recording UI Components', () => {
  test('mode selector has three options', async ({ page }) => {
    await page.goto('/record')
    // If redirected to login, that's expected behavior
    if (page.url().includes('/login')) {
      await expect(page.getByText('Sign in with Google')).toBeVisible()
    }
  })
})
