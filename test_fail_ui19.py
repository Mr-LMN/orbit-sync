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
            let adBtn = document.getElementById('adReviveBtn');
            let _d = adBtn.style.display;
            Object.defineProperty(adBtn.style, 'display', {
                get: function() { return _d; },
                set: function(val) {
                    console.log("adBtn display changed to:", val);
                    _d = val;
                }
            });
            window.handleFail('miss');
        }, 500);
    """)
    time.sleep(2)

    browser.close()
