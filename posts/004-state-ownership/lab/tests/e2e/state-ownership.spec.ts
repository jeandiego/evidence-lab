import { expect, test } from "@playwright/test"

test("A1 diverge e A2 converge após a mesma troca de PET", async ({ page }) => {
  await page.goto("/?variant=a1")
  await expect(page.getByTestId("summary-pet")).toHaveText("Luna")
  await expect(page.getByTestId("summary-total")).toHaveText("Grátis")

  await page.getByTestId("switch-pet").click()

  await expect(page.getByTestId("summary-pet")).toHaveText("Thor")
  await expect(page.getByTestId("summary-total")).toHaveText("Grátis")
  await expect(page.getByTestId("overall-status")).toContainText("Divergiu")
  await expect(page.getByTestId("diff-total").first()).toContainText("R$ 120,00")
  await expect(page.getByTestId("diff-total").first()).toContainText("Grátis")
  await page.getByRole("button", { name: "Por baixo dos panos" }).click()
  await expect(page.getByTestId("inspector-panel")).toBeVisible()
  await expect(page.getByTestId("diff-total")).toContainText("R$ 120,00")
  await expect(page.getByTestId("diff-total")).toContainText("R$ 0,00")
  await expect(page.getByTestId("diff-revision")).toContainText("2")
  await expect(page.getByTestId("diff-revision")).toContainText("1")

  await page.getByTestId("variant-a2").click()
  await expect(page.getByTestId("summary-pet")).toHaveText("Luna")
  await page.getByTestId("switch-pet").click()

  await expect(page.getByTestId("summary-pet")).toHaveText("Thor")
  await expect(page.getByTestId("summary-total")).toHaveText("R$ 120,00")
  await expect(page.getByTestId("overall-status")).toContainText("Sincronizado")
  await expect(page.getByTestId("diff-total").first()).toContainText("A tela recebeu o snapshot completo")
})
