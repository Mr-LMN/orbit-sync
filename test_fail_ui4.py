from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    time.sleep(1)

    print("Triggering game fail state...")
    page.evaluate("""
        window.lives = 0;
        window.currentLevelIdx = 0;
        window.activeAugment = '';
        window.reviveCount = 0;
        window.usedLastChance = false;
        window.globalCoins = 100;
        window.isPremium = false;
        window.adReviveUsedThisStage = false;

        window.startCampaign();
        setTimeout(() => {
            window.lives = 0;
            window.handleFail();
        }, 500);
    """)
    time.sleep(2)

    try:
        ad_btn = page.evaluate("document.getElementById('adReviveBtn').style.display")
        print("Ad Revive Display:", ad_btn)
        coin_btn = page.evaluate("document.getElementById('coinReviveBtn').style.display")
        print("Coin Revive Display:", coin_btn)
        action_btn = page.evaluate("document.getElementById('actionBtn').style.display")
        print("Action Btn Display:", action_btn)
    except Exception as e:
        print("Error checking element:", e)

    browser.close()
