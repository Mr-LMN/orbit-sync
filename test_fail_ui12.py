from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    time.sleep(2)

    page.evaluate("""
        window.lives = 0;
        window.currentLevelIdx = 0;
        window.activeAugment = '';
        window.reviveCount = 0;
        window.usedLastChance = true;
        window.globalCoins = 100;
        window.isPremium = false;
        window.adReviveUsedThisStage = false;

        window.startCampaign();
        setTimeout(() => {
            window.handleFail('miss');
        }, 500);
    """)
    time.sleep(2)

    try:
        ad = page.evaluate("document.getElementById('adReviveBtn').style.display")
        coin = page.evaluate("document.getElementById('coinReviveBtn').style.display")
        action = page.evaluate("document.getElementById('actionBtn').style.display")

        print("Ad display:", ad)
        print("Coin display:", coin)
        print("Action display:", action)

    except Exception as e:
        print("Error checking element:", e)

    browser.close()
