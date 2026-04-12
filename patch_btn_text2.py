import re

with open('js/core/loop.js', 'r') as f:
    content = f.read()

content = content.replace("ui.btn.innerText = pendingCoins > 0 ? `BANK ${pendingCoins} + PLAY AGAIN` : 'PLAY AGAIN';", "ui.btn.innerText = pendingCoins > 0 ? `🪙 BANK ${pendingCoins} & RESTART WORLD` : 'RESTART WORLD';")

with open('js/core/loop.js', 'w') as f:
    f.write(content)
