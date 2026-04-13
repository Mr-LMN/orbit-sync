from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    time.sleep(1)

    page.evaluate("""
        console.log("ad display start:", document.getElementById('adReviveBtn').style.display);
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
            console.log("ad display before fail:", document.getElementById('adReviveBtn').style.display);
            window.handleFail('miss');
            console.log("ad display after fail:", document.getElementById('adReviveBtn').style.display);
        }, 500);
    """)
    time.sleep(2)

    browser.close()
