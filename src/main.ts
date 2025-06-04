import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import PreloadScene from './scenes/PreloadScene';
import FightScene from './scenes/FightScene';
import GameOverScene from './scenes/GameOverScene';
import VictoryScene from './scenes/VictoryScene';

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
  scene: [BootScene, PreloadScene, FightScene, GameOverScene, VictoryScene]
};

new Phaser.Game(config);
