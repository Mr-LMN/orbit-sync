with open('index.html', 'r') as f:
    content = f.read()

# Make sure buttons default to display: none inline style is stripped because loop.js controls it? No loop.js explicitly sets them.
# The user wants these buttons visible on the fail screen. Let's make sure our loop.js patch actually works.

with open('js/core/loop.js', 'r') as f:
    loop_content = f.read()

loop_content = loop_content.replace("    if (adReviveBtn) adReviveBtn.style.display = 'none';", "    // if (adReviveBtn) adReviveBtn.style.display = 'none';")

with open('js/core/loop.js', 'w') as f:
    f.write(loop_content)
