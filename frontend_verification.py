from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000/")
    page.wait_for_timeout(500)

    # We want to show the aria-labels exist on the buttons in the DOM.
    # While we can't 'see' the aria-label visually, we can locate elements by it
    # to prove it exists.

    settings_btn = page.locator('button[aria-label="Settings"]')
    settings_btn.wait_for(state="visible")
    settings_btn.click()
    page.wait_for_timeout(500)

    page.screenshot(path="/home/jules/verification/screenshots/verification1.png")
    page.wait_for_timeout(500)

    close_btn = page.locator('button[aria-label="Close settings"]')
    close_btn.wait_for(state="visible")
    close_btn.click()
    page.wait_for_timeout(500)

    add_crystals_btn = page.locator('button[aria-label="Add crystals"]')
    add_crystals_btn.wait_for(state="visible")
    add_crystals_btn.click()
    page.wait_for_timeout(500)

    page.screenshot(path="/home/jules/verification/screenshots/verification2.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    import os
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
