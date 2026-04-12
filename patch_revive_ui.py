import re

with open('js/core/loop.js', 'r') as f:
    content = f.read()

# Make sure attemptCoinRevive is only defined in overlay.js or loop.js, not both
content = re.sub(
    r'(function attemptCoinRevive\(\) \{\n\s*const reviveCost = currentReviveCost \|\| 50;\n\s*if \(globalCoins >= reviveCost\) \{\n\s*globalCoins -= reviveCost;\n\s*saveData\(\);\n\s*currentReviveCost = reviveCost \* 2;\n\s*reviveCount\+\+;\n\s*restartCurrentStageAfterRevive\(\);\n\s*\} else \{\n\s*createPopup\(centerObj\.x, centerObj\.y, "NOT ENOUGH COINS", "#ff3366"\);\n\s*\}\n\})',
    r'function attemptCoinRevive() { return OrbitGame.ui.overlay.attemptCoinRevive(); }',
    content
)

with open('js/core/loop.js', 'w') as f:
    f.write(content)
