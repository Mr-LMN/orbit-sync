from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000")
    page.wait_for_timeout(2000)

    # Hover/focus on the bottom nav to see the explicit labels (though aria labels won't be visibly rendered,
    # the screenshot will capture the bottom nav to show it looks visually identical to before).
    nav = page.query_selector("#bottomNavBar")

    if nav:
        nav.screenshot(path="/home/jules/verification/screenshots/verification.png")
    else:
        page.screenshot(path="/home/jules/verification/screenshots/verification.png")

    page.wait_for_timeout(1000)

if __name__ == "__main__":
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
