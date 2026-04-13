from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    time.sleep(1)

    print("Checking specific CSS styles...")
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
        styles = page.evaluate("""(() => {
            var ad = document.getElementById('adReviveBtn');
            var coin = document.getElementById('coinReviveBtn');
            var action = document.getElementById('actionBtn');
            var stack = document.getElementById('overlayActionStack');
            var overlay = document.getElementById('screenOverlay');
            return {
                ad: ad ? window.getComputedStyle(ad).display : 'null',
                coin: coin ? window.getComputedStyle(coin).display : 'null',
                action: action ? window.getComputedStyle(action).display : 'null',
                stack: stack ? window.getComputedStyle(stack).display : 'null',
                overlay: overlay ? window.getComputedStyle(overlay).display : 'null',
            };
        })()""")
        print("Styles:", styles)
    except Exception as e:
        print("Error checking element:", e)

    browser.close()
