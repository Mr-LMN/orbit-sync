import re

with open('js/ui/overlay.js', 'r') as f:
    content = f.read()

# Make sure attemptCoinRevive actually doubles currentReviveCost on use and resets count
content = re.sub(
    r'(currentReviveCost = reviveCost \* 2;\n\s*saveData\(\);\n\s*ui\.coins\.innerText = Math\.floor\(globalCoins\);)',
    r'\1\n      if (window.reviveCount !== undefined) window.reviveCount++;',
    content
)

with open('js/ui/overlay.js', 'w') as f:
    f.write(content)
