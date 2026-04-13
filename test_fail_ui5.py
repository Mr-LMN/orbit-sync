from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    time.sleep(1)

    print("Checking Fail Screen rendering...")
    page.evaluate("""
        window.lives = 0;
        window.currentLevelIdx = 0;
        window.activeAugment = '';
        window.reviveCount = 0;
        window.usedLastChance = false;
        window.globalCoins = 100;
        window.isPremium = false;
        window.adReviveUsedThisStage = false;

        // Start the game to set up context
        window.startCampaign();
    """)
    time.sleep(1)
    page.evaluate("""
        // Trigger handle fail directly in the loop
        window.lives = 0;
        window.handleFail();
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

        revive_btn = page.evaluate("""
            var el = document.getElementById('reviveBtn') || window.ui.reviveBtn;
            el ? el.style.display : 'Not Found'
        """)
        print("Revive Display:", revive_btn)

        action_btn = page.evaluate("""
            var el = document.getElementById('actionBtn');
            el ? el.style.display : 'Not Found'
        """)
        print("Action Btn Display:", action_btn)
    except Exception as e:
        print("Error checking element:", e)

    browser.close()
