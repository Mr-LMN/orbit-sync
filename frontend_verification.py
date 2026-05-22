import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the local server
        await page.goto("http://localhost:3000/")

        # Wait for elements to be visible
        await page.wait_for_selector('.top-bar-left')

        # Take screenshot of the top bar to verify visually
        await page.locator('#topBar').screenshot(path="screenshot.png")

        # Verify the aria labels exist (this will throw if they don't)
        # Note: aria-label="Open shop to get crystals" is for the add-currency-btn
        # aria-label="Settings" is for the menuSettingsBtn
        currency_btn = page.locator('button[aria-label="Open shop to get crystals"]')
        settings_btn = page.locator('button[aria-label="Settings"]')

        await expect(currency_btn).to_be_attached()
        await expect(settings_btn).to_be_attached()

        await browser.close()

asyncio.run(main())
