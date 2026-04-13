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
            console.log("adReviveBtn in scope? ", !!document.getElementById('adReviveBtn'));
            console.log("isPremium?", window.isPremium);
            console.log("adReviveUsedThisStage?", window.adReviveUsedThisStage);

            // Replicate the logic explicitly
            let adReviveBtn = document.getElementById('adReviveBtn');
            if (adReviveBtn && !window.isPremium && !window.adReviveUsedThisStage) {
                console.log("Condition met, setting block");
                adReviveBtn.style.display = 'block';
            } else {
                console.log("Condition failed!");
            }
            console.log("ad display manually set to:", adReviveBtn.style.display);

            window.handleFail('miss');
            console.log("ad display after handleFail:", adReviveBtn.style.display);
        }, 500);
    """)
    time.sleep(2)

    browser.close()
