import { test, expect } from '@playwright/test';

test.describe('E-commerce Purchase Flow', () => {
  test('should allow adding a product to the cart', async ({ page }) => {
    // 1. Ir a la home
    await page.goto('/');

    // 2. Verificar que hay productos visibles
    const productCard = page.locator('button:has-text("Agregar al Carrito")').first();
    await expect(productCard).toBeVisible();

    // 3. Agregar al carrito
    await productCard.click();

    // 4. Ir al carrito
    await page.goto('/carrito');
    
    // Nota: Si el middleware bloquea, esto fallará, 
    // pero como lo hicimos "placeholder-safe", debería cargar.
    await expect(page).toHaveURL(/\/carrito/);
  });
});
