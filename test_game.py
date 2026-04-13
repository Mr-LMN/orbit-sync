from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    time.sleep(2)

    print("Checking UI for Tutorial state...")
    try:
        # Check if tutorial prompt or UI exists
        tutorial_el = page.query_selector('.tutorial-container, #tutorialView, .tutorial-text')
        if tutorial_el:
            print("Tutorial element found:", tutorial_el.inner_text()[:50])
        else:
            print("Tutorial element not found immediately.")
    except Exception as e:
        print("Error checking tutorial:", e)

    print("Checking Fail Screen...")
    # Trigger fail state manually
    page.evaluate("if (window.setOverlayState) { window.setOverlayState('gameOver'); }")
    time.sleep(1)
    try:
        fail_title = page.evaluate("document.getElementById('overlayTitle').innerText")
        print("Fail screen title:", fail_title)
        revive_btn = page.evaluate("document.getElementById('reviveBtn').style.display")
        print("Revive btn display:", revive_btn)
    except Exception as e:
        print("Error checking fail screen:", e)

    browser.close()
