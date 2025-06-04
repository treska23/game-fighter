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

    // === JUGADOR (young) ===
    this.load.spritesheet('player', 'assets/young/young.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('player_idle', 'assets/young/young_idle.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('player_locomotion', 'assets/young/young_locomotion.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('player_jump', 'assets/young/young_jump.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('player_punch', 'assets/young/young_punch.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('player_kick_soft', 'assets/young/young_kick_soft.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('player_kick_tight', 'assets/young/young_kick_tight.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('player_damage', 'assets/young/young_damage.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('player_guard_low', 'assets/young/young_guard_low.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('player_guard_high', 'assets/young/young_guard_high.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('player_specials', 'assets/young/young_specials.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('player_ko', 'assets/young/young_ko.png', {
      frameWidth: 64,
      frameHeight: 48,
    });
    this.load.spritesheet('player_down', 'assets/young/young_down.png', {
      frameWidth: 48,
      frameHeight: 48,
    });

    // === ENEMIGO (detective) ===
    this.load.spritesheet('detective_idle', 'assets/detective/detective_idle.png', {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet('detective_locomotion', 'assets/detective/detective_locomotion.png', {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet('detective_punch', 'assets/detective/detective_punch.png', {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet('detective_punch_right', 'assets/detective/detective_punch_right.png', {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet('detective_kicks_light', 'assets/detective/detective_kicks_light.png', {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet('detective_kicks_tight', 'assets/detective/detective_kicks_tight.png', {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet('detective_damage', 'assets/detective/detective_damage.png', {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet('detective_ko', 'assets/detective/detective_ko.png', {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet('detective_defense', 'assets/detective/detective_defense.png', {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet('detective_specials', 'assets/detective/detective_specials.png', {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet('detective_down', 'assets/detective/detective_down.png', {
      frameWidth: 48,
      frameHeight: 64,
    });

    // Opcionales: fondo y suelo
    this.load.image('room_bg', 'assets/ground/room_background.png');
    this.load.image('ground', 'assets/ground/dirty_floor.png');

  }

  create() {
    this.time.delayedCall(1000, () => {
      this.scene.start('FightScene');
    });
  }
}
