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
    """)
    time.sleep(1)
    page.evaluate("""
        window.handleFail('miss');
    """)
    time.sleep(1)

    try:
        ad = page.evaluate("document.getElementById('adReviveBtn').style.display")
        coin = page.evaluate("document.getElementById('coinReviveBtn').style.display")
        action = page.evaluate("document.getElementById('actionBtn').style.display")
        title = page.evaluate("document.getElementById('screenTitle').innerText")
        stack = page.evaluate("document.getElementById('overlayActionStack').style.display")
        overlay = page.evaluate("document.getElementById('screenOverlay').style.display")

        print("Ad display inline style:", ad)
        print("Coin display inline style:", coin)
        print("Action display inline style:", action)
        print("Title text:", title)
        print("Stack inline style:", stack)
        print("Overlay inline style:", overlay)

    except Exception as e:
        print("Error checking element:", e)

    browser.close()
