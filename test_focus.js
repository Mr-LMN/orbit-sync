const fs = require('fs');

let css = fs.readFileSync('css/styles.css', 'utf8');
if (!css.includes(':focus-visible')) {
  css += `\n/* Keyboard Accessibility Focus Styles */\nbutton:focus-visible,\ninput:focus-visible,\na:focus-visible,\n[tabindex]:focus-visible {\n  outline: 2px solid #00e5ff;\n  outline-offset: 2px;\n  border-radius: 4px;\n}\n`;
  fs.writeFileSync('css/styles.css', css);
}

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<div id="nextGoalPanel" role="button"/, '<div id="nextGoalPanel" role="button" tabindex="0"');
html = html.replace(/<div id="liveEventPanel" onclick="([^"]+)" role="button"/, '<div id="liveEventPanel" onclick="$1" role="button" tabindex="0"');
fs.writeFileSync('index.html', html);

let js = fs.readFileSync('js/core/input.js', 'utf8');
if (!js.includes('keydown')) {
  const replacement = `  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      const active = document.activeElement;
      const isInteractive = active && (
        active.tagName === 'BUTTON' ||
        active.tagName === 'A' ||
        active.tagName === 'INPUT' ||
        active.hasAttribute('tabindex')
      );

      if (isInteractive) {
        if (active.tagName !== 'BUTTON' && active.tagName !== 'INPUT' && active.tagName !== 'A') {
          e.preventDefault();
          active.click();
        }
        return;
      }

      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      e.preventDefault();
      if (typeof tap === 'function') tap();
    }
  }

  function bind() {
    if (listenersBound) return;
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    listenersBound = true;
  }`;
  js = js.replace(/  function bind\(\) \{[\s\S]*?listenersBound = true;\n  \}/, replacement);
  fs.writeFileSync('js/core/input.js', js);
}
