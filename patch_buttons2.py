import re

with open('index.html', 'r') as f:
    content = f.read()

# Make sure index.html accurately reflects the action button text we need
content = content.replace(
    '<button id="actionBtn" class="btn btn-play primary" onclick="if(audioCtx) soundUIClick();">RESTART STAGE</button>',
    '<button id="actionBtn" class="btn btn-play primary" onclick="if(audioCtx) soundUIClick();">🪙 BANK COINS & RESTART WORLD</button>'
)

content = content.replace(
    '<button id="bankCoinsBtn" class="btn primary" onclick="if(audioCtx) soundUIClick(); bankRunCoins();" style="display: none;">🪙 BANK COINS</button>',
    ''
)

with open('index.html', 'w') as f:
    f.write(content)
