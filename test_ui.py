from playwright.sync_api import sync_playwright
import os
import shutil

def run_cuj(page):
    page.goto("http://localhost:3000")
    page.wait_for_timeout(1000)

    # 1. Check if the overlap is gone
    page.screenshot(path="screenshots/home_view_fixed.png")
    page.wait_for_timeout(500)

    # 2. Click the new daily challenges button
    page.click("#dailyChallengesBtn")
    page.wait_for_timeout(1000)

    # 3. Check if the modal is open
    page.screenshot(path="screenshots/challenges_modal.png")
    page.wait_for_timeout(500)

    # 4. Close the modal
    page.click("text=CLOSE")
    page.wait_for_timeout(1000)

    # 5. Check if we can navigate to campaign
    page.click("#nav-campaign")
    page.wait_for_timeout(1000)
    page.screenshot(path="screenshots/campaign_view.png")
    page.wait_for_timeout(500)


if __name__ == "__main__":
    os.makedirs("videos", exist_ok=True)
    os.makedirs("screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # Test 1: Existing player (with some coins to bypass new player check)
        context = browser.new_context(record_video_dir="videos")
        page = context.new_page()
        page.goto('http://localhost:3000')
        page.evaluate('''() => {
            window.localStorage.setItem('orbitSync_coins', '100');
        }''')
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
