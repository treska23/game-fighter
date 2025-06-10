import Phaser from 'phaser';
import RoundManager from '../game/RoundManager';

export default class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create() {
    this.sound.stopAll();
    this.sound.play('coin_sound');
    this.cameras.main.setBackgroundColor('#222');
    this.add
      .text(400, 300, 'Puedes seguir leyendo', {
        color: '#ffffff',
        fontSize: '16px',
      })
      .setOrigin(0.5);
    this.add
      .text(
        400,
        340,
        `Rounds: ${RoundManager.playerWins}-${RoundManager.enemyWins}`,
        {
          color: '#ffffff',
          fontSize: '14px',
        }
      )
      .setOrigin(0.5);
  }
}
