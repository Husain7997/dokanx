import { test, expect } from "@playwright/test";

const storefrontUrl = process.env.E2E_STOREFRONT_URL || "http://127.0.0.1:4100";
const apiUrl = process.env.E2E_API_URL || "http://127.0.0.1:5101/api";

test.describe("storefront checkout", () => {
  test("customer can authenticate, checkout, and land on payment callback", async ({ page, request }) => {
    test.setTimeout(150_000);
    const bootstrap = await request.post(`${apiUrl}/dev/e2e/bootstrap`);
    expect(bootstrap.ok()).toBeTruthy();
    const seeded = await bootstrap.json();

    const safeGoto = async (url: string) => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await page.goto(url, { waitUntil: "domcontentloaded" });
          return;
        } catch (error) {
          if (attempt === 1) throw error;
          await page.waitForTimeout(1000);
        }
      }
    };

    await page.goto(`${storefrontUrl}/account`);
    await page.getByLabel("Email").fill(seeded.customer.email);
    await page.getByLabel("Password").fill(seeded.customer.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Customer session is active.")).toBeVisible();

    const customerLogin = await request.post(`${apiUrl}/auth/login`, {
      data: { email: seeded.customer.email, password: seeded.customer.password },
    });
    expect(customerLogin.ok()).toBeTruthy();
    const customerAuth = await customerLogin.json();
    const accessToken = customerAuth.accessToken || customerAuth.token;
    expect(accessToken).toBeTruthy();

    await request.put(`${apiUrl}/cart`, {
      data: {
        shopId: seeded.product.shopId,
        items: [{ productId: seeded.product.id, quantity: 1 }],
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    await safeGoto(`${storefrontUrl}/cart`);
    await page.getByRole("link", { name: "Proceed To Checkout" }).click();
    await expect(page.getByTestId("checkout-hydrated")).toHaveAttribute("data-ready", "true");
    await page.getByLabel("Delivery note").fill("Leave at gate");
    await expect(page.getByLabel("Delivery note")).toHaveValue("Leave at gate");
    await page.getByRole("button", { name: "Create Order And Prepare Payment" }).click();
    await expect(page.getByText("Payment handoff ready")).toBeVisible({ timeout: 60_000 });

    await Promise.all([
      page.waitForNavigation(),
      page.getByRole("link", { name: /Launch/i }).click(),
    ]);

    await expect(page).toHaveURL(/\/payment\/callback/);
    await expect(page.getByText(/Payment confirmed|Payment not completed/)).toBeVisible();
  });
});
