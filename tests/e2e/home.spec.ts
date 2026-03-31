import { expect, test } from "@playwright/test";

test("homepage loads with key content", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByText("Victor Grossman", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /post tribute|beitrag schreiben/i }),
  ).toBeVisible();
});
