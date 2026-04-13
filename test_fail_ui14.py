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

        // Let's hook the set display property to see who sets it to none
        const adBtn = document.getElementById('adReviveBtn');
        let _display = adBtn.style.display;
        Object.defineProperty(adBtn.style, 'display', {
            get: function() { return _display; },
            set: function(val) {
                console.log("Setting adReviveBtn.style.display to:", val);
                console.log(new Error().stack);
                _display = val;
            }
        });

        window.startCampaign();
        setTimeout(() => {
            console.log("Triggering handleFail");
            window.handleFail('miss');
            console.log("ad display after:", document.getElementById('adReviveBtn').style.display);
        }, 500);
    """)
    time.sleep(2)

    browser.close()
