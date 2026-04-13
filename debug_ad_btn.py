from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    time.sleep(1)

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
            console.log("Before handle fail");
            window.handleFail('miss');
            console.log("After handle fail");

            let stack = document.getElementById('overlayActionStack');
            let adBtn = document.getElementById('adReviveBtn');
            let coinBtn = document.getElementById('coinReviveBtn');
            let btn = document.getElementById('actionBtn');

            console.log("Ad display:", adBtn ? adBtn.style.display : "null");
            console.log("Coin display:", coinBtn ? coinBtn.style.display : "null");
            console.log("Action display:", btn ? btn.style.display : "null");
        }, 500);
    """)
    time.sleep(2)

    browser.close()
