from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000")
    page.wait_for_timeout(1000)

    # We evaluate script to directly show the fail overlay and set the stats
    page.evaluate("""
        window.lives = 0;
        window.world1FreeRestartUsed = true;
        window.tutorialComplete = true;
        document.getElementById("screenOverlay").style.display = "flex";
        document.getElementById("screenOverlay").style.opacity = "1";
        document.getElementById("screenOverlay").style.pointerEvents = "auto";
        document.getElementById("screenTitle").innerText = "OUT OF SYNC";
        document.getElementById("screenSubtitle").innerText = "INTENTIONAL FAIL";
        document.getElementById("summaryCard").style.display = "block";
        document.getElementById("overlaySecondaryActions").style.display = "flex";
        document.getElementById("shareBtn").style.display = "inline-block";

        // Show coin and ad buttons just to verify layout
        document.getElementById("adReviveBtn").style.display = "inline-block";
        document.getElementById("coinReviveBtn").style.display = "inline-block";
    """)
    page.wait_for_timeout(1000)

    # Take screenshot of the new fail menu
    page.screenshot(path="fail_menu_redesign.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir=".")
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
