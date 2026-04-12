import re

with open('js/core/loop.js', 'r') as f:
    content = f.read()

content = content.replace("ui.btn.innerText = `BANK ${newPending} + PLAY AGAIN`;", "ui.btn.innerText = `🪙 BANK ${newPending} & RESTART WORLD`;")

with open('js/core/loop.js', 'w') as f:
    f.write(content)
