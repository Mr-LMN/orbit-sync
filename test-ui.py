from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')

    # Wait for the game to load
    page.wait_for_selector('#nav-workshop', state='visible')

    # Add a sphere to our storage so we have a level > 1 to unlock perk slots
    page.evaluate('''() => {
        let storage = window.OrbitGame.storage.getJSON() || {};
        storage.sphereProgression = {
            'classic': { level: 5, xp: 0, perks: [] }
        };
        storage.unlockedPerks = ['lives_1', 'coin_bonus_1'];
        storage.selectedSphere = 'classic';
        window.OrbitGame.storage.setJSON(storage);
    }''')

    # Reload so workshop updates with these details
    page.reload()
    page.wait_for_selector('#nav-workshop', state='visible')

    # Click workshop button
    page.click('#nav-workshop')
    page.wait_for_selector('#workshopView', state='visible')

    # Wait a moment for animations
    page.wait_for_timeout(1000)

    # Take screenshot of workshop view
    page.screenshot(path='workshop_view.png')

    # Find and click an empty perk slot to open the modal
    page.click('.perk-slot.empty')
    page.wait_for_selector('#perkSelectionModal', state='visible')

    # Wait a moment for animations
    page.wait_for_timeout(1000)

    # Take screenshot of perk modal
    page.screenshot(path='perk_modal.png')

    browser.close()