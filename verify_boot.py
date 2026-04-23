from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: errors.append(err.message))

        try:
            print("Navigating to http://localhost:3000...")
            page.goto("http://localhost:3000", wait_until="networkidle", timeout=10000)
            time.sleep(2)
            page.screenshot(path="boot_check.png")
            print("Screenshot saved as boot_check.png")

            if errors:
                print("Detected console errors:")
                for err in errors:
                    print(f"  - {err}")
            else:
                print("No console errors detected.")

        except Exception as e:
            print(f"Failed to load page: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
