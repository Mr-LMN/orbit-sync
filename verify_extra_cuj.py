from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Mobile viewport for AAA mobile game
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()

        page.goto("http://localhost:3000")
        page.wait_for_selector("#mainMenu")

        # Click Profile
        page.click(".nav-item:has-text('PROFILE')")
        page.wait_for_timeout(500)
        page.screenshot(path="profile2.png")

        # Click Workshop
        page.click(".nav-item:has-text('WORKSHOP')")
        page.wait_for_timeout(500)
        page.screenshot(path="workshop2.png")

        # Click Home
        page.click(".nav-item:has-text('HOME')")
        page.wait_for_timeout(500)
        page.screenshot(path="home_return2.png")

        browser.close()

if __name__ == "__main__":
    run()
