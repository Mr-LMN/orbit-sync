from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000")
    page.wait_for_timeout(1000)

    # Start the game
    page.click("#menuPlayBtn")
    page.wait_for_timeout(1000)

    # Intentionally fail by waiting and then executing a bad tap, or just let it fail if it auto fails.
    # Alternatively we can simulate a fail via console evaluation to be faster and reliable.
    page.evaluate("if (window.handleFail) { window.handleFail('INTENTIONAL FAIL'); } else { window.OrbitGame.core.loop.handleFail('INTENTIONAL FAIL'); }")
    page.wait_for_timeout(2000)

    # Take screenshot of the new fail menu
    page.screenshot(path="fail_menu_redesign.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir=".")
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
