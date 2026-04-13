from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    time.sleep(1)

    print("Checking Fail Screen logic...")
    # Emulate game state correctly
    page.evaluate("""
        window.lives = 0;
        window.currentLevelIdx = 0;
        window.activeAugment = '';
        window.reviveCount = 0;
        window.usedLastChance = true; // Use up regular revive to show ad/coin
        window.globalCoins = 100;
        window.isPremium = false;
        window.adReviveUsedThisStage = false;

        window.handleFail('miss', 10);
    """)
    time.sleep(1)

    try:
        title = page.evaluate("document.getElementById('screenTitle').innerText")
        print("Title:", title)

        ad_btn = page.evaluate("""
            var el = document.getElementById('adReviveBtn');
            el ? el.style.display : 'Not Found'
        """)
        print("Ad Revive Display:", ad_btn)

        coin_btn = page.evaluate("""
            var el = document.getElementById('coinReviveBtn');
            el ? el.style.display : 'Not Found'
        """)
        print("Coin Revive Display:", coin_btn)

    except Exception as e:
        print("Error checking element:", e)

    browser.close()
