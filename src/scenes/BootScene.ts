import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    // aquí puedes cargar imágenes pequeñas de carga
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
