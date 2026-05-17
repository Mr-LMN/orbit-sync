from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000")
    page.wait_for_timeout(1000)

    # Focus on nextGoalPanel
    page.evaluate("document.getElementById('nextGoalPanel').focus()")
    page.wait_for_timeout(1000)
    page.screenshot(path="next_goal_focus.png")

    # Focus on liveEventPanel
    page.evaluate("document.getElementById('liveEventPanel').focus()")
    page.wait_for_timeout(1000)
    page.screenshot(path="live_event_focus.png")

    # Show shop to reveal vipBadge (it's hidden by default, or we can just make it visible)
    page.evaluate("document.getElementById('vipBadge').style.display = 'block'")
    page.wait_for_timeout(500)

    # Focus on vipBadge
    page.evaluate("document.getElementById('vipBadge').focus()")
    page.wait_for_timeout(1000)
    page.screenshot(path="vip_badge_focus.png")

    # Simulate Space key press on focused vipBadge
    page.keyboard.press("Space")
    page.wait_for_timeout(1000)
    # This should open the shop modal/view, let's take a screenshot to verify
    page.screenshot(path="shop_opened.png")

    print("Screenshots taken successfully.")

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
