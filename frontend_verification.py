from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:3000/")

    try:
        page.evaluate("if (window.ui && window.ui.playBtn) window.ui.playBtn.click()")
        page.wait_for_timeout(1000)

        # Take a screenshot to verify UI doesn't crash on start
        page.screenshot(path="screenshot.png")
        print("Screenshot taken!")
    except Exception as e:
        print("Error:", e)

    browser.close()
