import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }

  preload() {
    this.cameras.main.setBackgroundColor('#333');
    this.add
      .text(400, 240, 'Gana el combate para seguir leyendo', {
        color: '#ffffff',
        fontSize: '16px',
      })
      .setOrigin(0.5);

    // barra de progreso
    const bar = this.add.graphics();
    this.load.on('progress', (p: number) => {
      bar.clear()
         .fillStyle(0xffffff, 1)
         .fillRect(100, 280, 600 * p, 40);
    });

    // cSpell: ignore spritesheet
    this.load.spritesheet('young',     'assets/young/young.png',     { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('detective', 'assets/detective/detective.png', { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_idle','assets/detective/detective_idle.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_locomotion','assets/detective/detective_locomotion.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_punch_right','assets/detective/detective_punch.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_kicks_light','assets/detective/detective_kicks_light.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_kicks_tight','assets/detective/detective_kicks_tight.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_defense','assets/detective/detective_defense.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_damage','assets/detective/detective_damage.png',{ frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_specials','assets/detective/detective_specials.png',{ frameWidth: 48, frameHeight: 64 });
  }

  create() {
    this.scene.start('FightScene');
  }
}
