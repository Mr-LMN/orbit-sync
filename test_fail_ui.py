from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    time.sleep(2)

    print("Triggering game fail state...")
    # Emulate being in game then fail
    page.evaluate("""
        window.lives = 0;
        window.currentLevelIdx = 0;
        window.activeAugment = '';
        window.reviveCount = 1;
        window.globalCoins = 100;
        window.isPremium = false;
        window.adReviveUsedThisStage = false;

        if (typeof window.ui !== 'undefined') {
            window.ui.overlay.style.display = 'flex';
            window.setOverlayState('gameOver');
        }
    """)
    time.sleep(1)

    try:
        fail_title = page.evaluate("document.getElementById('screenTitle').innerText")
        print("Title:", fail_title)

        ad_btn = page.evaluate("document.getElementById('adReviveBtn').style.display")
        print("Ad Revive Display:", ad_btn)
        ad_btn_text = page.evaluate("document.getElementById('adReviveBtn').innerText")
        print("Ad Revive Text:", ad_btn_text)

        coin_btn = page.evaluate("document.getElementById('coinReviveBtn').style.display")
        print("Coin Revive Display:", coin_btn)
        coin_btn_text = page.evaluate("document.getElementById('coinReviveBtn').innerText")
        print("Coin Revive Text:", coin_btn_text)

        action_btn = page.evaluate("document.getElementById('actionBtn').style.display")
        print("Action Btn Display:", action_btn)
        action_btn_text = page.evaluate("document.getElementById('actionBtn').innerText")
        print("Action Btn Text:", action_btn_text)
    except Exception as e:
        print("Error checking element:", e)

    browser.close()
