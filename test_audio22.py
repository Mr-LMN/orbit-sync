from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.on("console", lambda msg: print("BROWSER CONSOLE:", msg.text))
    page.goto("http://localhost:3000/")

    try:
        page.evaluate("if (window.ui && window.ui.playBtn) window.ui.playBtn.click()")
        page.wait_for_timeout(1000)

        # force initialize audio for playwright
        page.evaluate("""
            OrbitGame.audio.initAudio();
        """)

        page.wait_for_timeout(500)

        res = page.evaluate("""
            () => {
                // Keep calling loseLife until it's the last life to create the interval

                // Now check if playSynth is actually called by _playAlarmPulse
                window.playSynthCalls = 0;
                const oldPlaySynth = OrbitGame.audio.playSynth;
                OrbitGame.audio.playSynth = function(...args) {
                    window.playSynthCalls++;
                    if (oldPlaySynth) return oldPlaySynth.apply(this, args);
                }

                let count = 0;
                while (document.body.classList.contains('last-life') === false && count < 10) {
                    loseLife('test');
                    count++;
                }

                return {
                    isLastLifeClass: document.body.classList.contains('last-life'),
                };
            }
        """)

        print("Wait for interval to trigger...")
        page.wait_for_timeout(3000)

        calls = page.evaluate("window.playSynthCalls")
        print("Play synth calls:", calls)

    except Exception as e:
        print(e)

    browser.close()
