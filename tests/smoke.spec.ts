import { test, expect } from '@playwright/test';

/**
 * Smoke Test - Deployment Safety Gate
 *
 * This test serves as a deployment safety gate to ensure the built application
 * can successfully load and render critical UI elements before deployment.
 *
 * If this test fails, the deployment workflow will be halted.
 */

test.describe('Deployment Smoke Test', () => {
  test('homepage loads and displays main title', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for the main heading to be visible
    // This ensures the React app has mounted and rendered
    const heading = page.getByRole('heading', { name: /Upload Your Flips/i });

    // Assert that the heading is visible
    await expect(heading).toBeVisible();

    // Additional check: ensure the page title is correct
    await expect(page).toHaveTitle(/OSRS Flip Dashboard/i);
  });

  test('page renders without critical errors', async ({ page }) => {
    const errors: string[] = [];

    // Collect any console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to the homepage
    await page.goto('/');

    // Wait for the app to be interactive
    await page.waitForLoadState('networkidle');

    // Check that no critical errors occurred
    // Note: We filter out known warnings/non-critical errors if needed
    const criticalErrors = errors.filter(error =>
      !error.includes('service worker') &&
      !error.includes('favicon')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('root element exists', async ({ page }) => {
    await page.goto('/');

    // Verify the root React element exists and has content
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    await expect(root).not.toBeEmpty();
  });
});
