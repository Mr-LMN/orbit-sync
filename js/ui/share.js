(function initShare(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.share = OG.ui.share || {};

  function generateShareCard() {
    const card = document.createElement('canvas');
    card.width = 800;
    card.height = 450;
    const c = card.getContext('2d');
    const palette = getWorldPalette();

    c.fillStyle = '#07070a';
    c.fillRect(0, 0, 800, 450);

    c.strokeStyle = palette.primary;
    c.lineWidth = 3;
    c.shadowBlur = 20;
    c.shadowColor = palette.primary;
    c.strokeRect(12, 12, 776, 426);
    c.shadowBlur = 0;

    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.font = '600 14px Orbitron, sans-serif';
    c.letterSpacing = '6px';
    c.textAlign = 'left';
    c.fillText('ORBIT SYNC', 40, 50);

    const title = generateTitle(score, personalBest.world, personalBest.streak, reviveCount);
    c.fillStyle = palette.primary;
    c.font = '900 52px Orbitron, sans-serif';
    c.letterSpacing = '2px';
    c.textAlign = 'left';
    c.shadowBlur = 25;
    c.shadowColor = palette.primary;
    c.fillText(title, 40, 130);
    c.shadowBlur = 0;

    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(40, 155);
    c.lineTo(760, 155);
    c.stroke();

    const stats = [
      { label: 'SCORE', value: score },
      { label: 'BEST STREAK', value: personalBest.streak },
      { label: 'WORLD', value: personalBest.world },
      { label: 'REVIVES USED', value: reviveCount }
    ];

    stats.forEach((stat, i) => {
      const x = 40 + (i * 180);
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.font = '400 11px Orbitron, sans-serif';
      c.letterSpacing = '3px';
      c.textAlign = 'left';
      c.fillText(stat.label, x, 195);

      c.fillStyle = '#ffffff';
      c.font = '400 72px Bebas Neue, sans-serif';
      c.letterSpacing = '2px';
      c.fillText(stat.value, x, 280);
    });

    if (reviveCount === 0) {
      c.fillStyle = 'rgba(0, 229, 255, 0.12)';
      c.beginPath();
      c.roundRect(40, 300, 160, 32, 6);
      c.fill();
      c.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = '#00e5ff';
      c.font = '400 11px Orbitron, sans-serif';
      c.letterSpacing = '3px';
      c.textAlign = 'left';
      c.fillText('✦ CLEAN RUN', 55, 321);
    }

    c.fillStyle = palette.primary;
    c.globalAlpha = 0.15;
    c.fillRect(0, 370, 800, 80);
    c.globalAlpha = 1.0;

    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.font = '400 12px Orbitron, sans-serif';
    c.letterSpacing = '4px';
    c.textAlign = 'right';
    c.fillText('CAN YOU BEAT THIS?', 760, 415);

    card.toBlob(blob => {
      const file = new File([blob], 'orbitsync.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        const reviveText = reviveCount === 0
          ? 'No revives used — clean run!'
          : `Used ${reviveCount} revive${reviveCount > 1 ? 's' : ''}.`;
        navigator.share({
          title: 'Orbit Sync',
          text: `I got "${title}" with a score of ${score}. ${reviveText} Can you beat it?`,
          files: [file]
        }).catch(() => downloadCard(card));
      } else {
        downloadCard(card);
      }
    });
  }

  function downloadCard(card) {
    const link = document.createElement('a');
    link.download = 'orbitsync-score.png';
    link.href = card.toDataURL();
    link.click();
  }

  OG.ui.share.generateShareCard = generateShareCard;
  OG.ui.share.downloadCard = downloadCard;
})(window);
