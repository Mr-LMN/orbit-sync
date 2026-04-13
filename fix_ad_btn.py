import re

with open('js/core/loop.js', 'r') as f:
    content = f.read()

# Add a declaration for adReviveBtn at the top of handleFail if not present
# Actually let's just make sure adReviveBtn is declared before it's used at line 4170.

content = content.replace("    if (_isHighStakes && adReviveBtn && !isPremium && !adReviveUsedThisStage) {",
                          "    let adReviveBtn = document.getElementById('adReviveBtn');\n    if (_isHighStakes && adReviveBtn && !isPremium && !adReviveUsedThisStage) {")

content = content.replace("let adReviveBtn = document.getElementById('adReviveBtn');", "", 1) # remove the second one that was down below

with open('js/core/loop.js', 'w') as f:
    f.write(content)
