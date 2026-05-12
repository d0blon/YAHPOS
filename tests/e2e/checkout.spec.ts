import { test, expect } from '@playwright/test';

test.describe('Checkout Flow Security', () => {
  test('should redirect unauthenticated users from /checkout to /login', async ({ page }) => {
    // Intentar acceder directamente al checkout sin estar logueado
    await page.goto('/checkout');
    
    // Debería redirigir a /login
    await expect(page).toHaveURL(/\/login/);
    
    // El parámetro redirect debería estar presente
    const url = new URL(page.url());
    expect(url.searchParams.get('redirect')).toBe('/checkout');
  });

  test('should redirect unauthenticated users from /carrito to /login', async ({ page }) => {
    await page.goto('/carrito');
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get('redirect')).toBe('/carrito');
  });
});
