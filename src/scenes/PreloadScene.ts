import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }

  preload() {
    // barra de progreso
    const bar = this.add.graphics();
    this.load.on('progress', (p: number) => {
      bar.clear()
         .fillStyle(0xffffff, 1)
         .fillRect(100, 280, 600 * p, 40);
    });

    // cSpell: ignore spritesheet
    this.load.spritesheet('young',     'assets/young.png',     { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('detective', 'assets/detective/detective.png', { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective','assets/detective/detective_idle.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective','assets/detective/detective_locomotion.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective-punch','assets/detective/detective_punch.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective-kicks','assets/detective/detective_kicks.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_defense','assets/detective/detective_defense.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_damage','assets/detective/detective_damage.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_specials','assets/detective/detective_specials.png',{ frameWidth: 48, frameHeight: 64 });
  }

  create() {
    this.scene.start('FightScene');
  }
}
