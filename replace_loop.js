const fs = require('fs');
let content = fs.readFileSync('js/core/loop.js', 'utf8');

// Refactor typeof startLastLifeDrone === 'function' && audioCtx
content = content.replace(
  /if \(typeof startLastLifeDrone === 'function' && audioCtx\) startLastLifeDrone\(\);/g,
  "if (OrbitGame.audio.audioCtx) startLastLifeDrone();"
);

// Refactor typeof stopLastLifeDrone === 'function'
content = content.replace(
  /if \(typeof stopLastLifeDrone === 'function'\) stopLastLifeDrone\(\);/g,
  "stopLastLifeDrone();"
);

fs.writeFileSync('js/core/loop.js', content);
