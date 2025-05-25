import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    // aquí puedes cargar imágenes pequeñas de carga
    this.load.image('logo', 'assets/logo.png');
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
