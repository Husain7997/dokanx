import { test, expect } from "@playwright/test";

const merchantUrl = process.env.E2E_MERCHANT_URL || "http://127.0.0.1:4101";
const apiUrl = process.env.E2E_API_URL || "http://127.0.0.1:5101/api";

test.describe("merchant invite and settings", () => {
  test("owner can log in and issue a staff invite", async ({ page, request }) => {
    const bootstrap = await request.post(`${apiUrl}/dev/e2e/bootstrap`);
    expect(bootstrap.ok()).toBeTruthy();
    const seeded = await bootstrap.json();

    await page.goto(`${merchantUrl}/sign-in`);
    await page.getByLabel("Email").fill(seeded.owner.email);
    await page.getByLabel("Password").fill(seeded.owner.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/settings/);
    await expect(page).toHaveURL(/\/settings/);

    await page.getByRole("button", { name: "Add Or Update Team Member" }).click();
    await expect(page.getByText(/Team member saved|Latest invite/).first()).toBeVisible();
  });
});
