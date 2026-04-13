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
            window.handleFail('miss');
            let adBtn = document.getElementById('adReviveBtn');
            let coinBtn = document.getElementById('coinReviveBtn');
            let btnGroup = document.getElementById('overlayButtonGroup');
            console.log("ad display", adBtn.style.display, window.getComputedStyle(adBtn).display);
            console.log("coin display", coinBtn.style.display, window.getComputedStyle(coinBtn).display);
            console.log("btnGroup display", window.getComputedStyle(btnGroup).display);
            console.log("actionStack display", window.getComputedStyle(document.getElementById('overlayActionStack')).display);
        }, 500);
    """)
    time.sleep(2)

    browser.close()
