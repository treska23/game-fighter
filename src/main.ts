import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import PreloadScene from './scenes/PreloadScene';
import FightScene from './scenes/FightScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: document.body,
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // gravedad global (0 porque cada sprite pone la suya)
      debug: false
    }
  },
  scene: [BootScene, PreloadScene, FightScene]
};

new Phaser.Game(config);
