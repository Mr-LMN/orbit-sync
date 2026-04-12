import re

with open('index.html', 'r') as f:
    content = f.read()

# Make sure index.html accurately has shareBtn next to Menu as requested
if 'shareBtn' not in content:
    content = content.replace(
        '<button id="menuBtn" onclick="if(audioCtx) soundUIClick();">MENU</button>',
        '<button id="menuBtn" onclick="if(audioCtx) soundUIClick();">MENU</button>\n          <button id="shareBtn" style="display:none;" onclick="if(audioCtx) soundUIClick(); shareScore();">SHARE</button>'
    )

with open('index.html', 'w') as f:
    f.write(content)
