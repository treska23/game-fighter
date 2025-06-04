import Phaser from 'phaser';

export default class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#222');
    this.add
      .text(400, 300, 'Puedes seguir leyendo', {
        color: '#ffffff',
        fontSize: '16px',
      })
      .setOrigin(0.5);
  }
}
