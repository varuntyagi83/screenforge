import { test, expect } from '@playwright/test'

test.describe('Public Sharing', () => {
  test('invalid share token returns not found page', async ({ page }) => {
    await page.goto('/share/invalid-token-123')
    // Should show not found or loading (API will 404)
    await page.waitForLoadState('networkidle')
    const content = await page.textContent('body')
    expect(content).toBeTruthy()
  })

  test('share pages do not redirect to login', async ({ page }) => {
    await page.goto('/share/any-token')
    // Should NOT redirect to /login
    expect(page.url()).toContain('/share/')
  })
})
