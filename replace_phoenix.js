const fs = require('fs');
let content = fs.readFileSync('js/systems/phoenix-boss.js', 'utf8');

content = content.replace(
  /if \(typeof stopLastLifeDrone === 'function'\) stopLastLifeDrone\(\);/g,
  "if (OrbitGame && OrbitGame.audio && OrbitGame.audio.stopLastLifeDrone) OrbitGame.audio.stopLastLifeDrone();"
);

fs.writeFileSync('js/systems/phoenix-boss.js', content);
