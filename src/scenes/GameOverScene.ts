import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#222');
    this.add
      .text(400, 300, 'Game Over', {
        color: '#ffffff',
        fontSize: '16px',
      })
      .setOrigin(0.5);
  }
}
