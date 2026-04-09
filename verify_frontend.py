from playwright.sync_api import sync_playwright
import time

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(
            viewport={'width': 375, 'height': 812},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True
        )
        page.goto('http://localhost:3000')
        page.wait_for_timeout(2000)

        # Take a screenshot of the main hub
        page.screenshot(path='hub_screenshot.png')

        # Click campaign tab
        page.click('#nav-campaign')
        page.wait_for_timeout(1000)
        page.screenshot(path='campaign_screenshot.png')

        # Click profile tab
        page.click('#nav-profile')
        page.wait_for_timeout(1000)
        page.screenshot(path='profile_screenshot.png')

        # Start game from campaign
        page.click('#nav-campaign')
        page.wait_for_timeout(500)
        page.click('#menuPlayBtn')
        page.wait_for_timeout(2000)
        page.screenshot(path='gameplay_screenshot.png')

        browser.close()

if __name__ == '__main__':
    verify()
