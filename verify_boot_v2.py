from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Increased timeout and added more logging
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        errors = []
        logs = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else logs.append(msg.text))
        page.on("pageerror", lambda err: errors.append(err.message))

        try:
            print("Navigating to http://localhost:3000...")
            # Use domcontentloaded instead of networkidle for faster check
            page.goto("http://localhost:3000", wait_until="domcontentloaded", timeout=30000)
            print("Page loaded (DOM content loaded)")

            # Wait for some elements to appear
            time.sleep(5)

            page.screenshot(path="boot_check_v2.png")
            print("Screenshot saved as boot_check_v2.png")

            if logs:
                print("Console logs:")
                for log in logs[:20]: # Show first 20 logs
                    print(f"  [LOG] {log}")

            if errors:
                print("Detected console errors:")
                for err in errors:
                    print(f"  [ERR] {err}")
            else:
                print("No console errors detected.")

            # Check if global OG is present
            og_present = page.evaluate("typeof window.OG !== 'undefined'")
            print(f"window.OG present: {og_present}")
            if og_present:
                systems_present = page.evaluate("typeof window.OG.systems !== 'undefined'")
                print(f"window.OG.systems present: {systems_present}")

        except Exception as e:
            print(f"Failed to load page: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
