// src/scenes/FightScene.ts
import Phaser from 'phaser';

export default class FightScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private enemy!: Phaser.GameObjects.Sprite;

  constructor() {
    super({ key: 'FightScene' });
  }

  create() {
    // --- Jugador: chico joven ---
    this.player = this.add.sprite(150, 500, 'young');
    this.createAnimations('young', 'player');
    this.player.play('player-idle');

    // --- Enemigo: detective ---
    this.enemy = this.add.sprite(650, 500, 'detective');
    this.createAnimations('detective', 'enemy');
    this.enemy.play('enemy-idle');

    // El detective mira hacia la izquierda (hacia el jugador)
    this.enemy.setFlipX(true);
  }

  update(time: number, delta: number) {
    // aquí tu lógica de input y AI
  }

  private createAnimations(sheetKey: string, prefix: string) {
    this.anims.create({
      key: `${prefix}-idle`,
      frames: this.anims.generateFrameNumbers(sheetKey, { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });
    this.anims.create({
    key: 'enemy-walk',
    frames: this.anims.generateFrameNumbers('detective', { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1
    });
    this.anims.create({
      key: `${prefix}-punch`,
      frames: this.anims.generateFrameNumbers(sheetKey, { start: 0, end: 1 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy-kick-light',
      frames: this.anims.generateFrameNumbers('detective_kicks', { start: 1, end: 1 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy-kick-strong',
      frames: this.anims.generateFrameNumbers('detective_kicks', { start: 2, end: 2 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy-sweep',
      frames: this.anims.generateFrameNumbers('detective_kicks', { start: 3, end: 3 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy-kick-flying',
      frames: this.anims.generateFrameNumbers('detective_kicks', { start: 4, end: 4 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy-kick-down',
      frames: this.anims.generateFrameNumbers('detective_kicks', { start: 5, end: 5 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy-guard-high',
      frames: this.anims.generateFrameNumbers('detective_defense', { start: 0, end: 0 }),
      frameRate: 1,
      repeat: -1
    });
    this.anims.create({
      key: 'enemy-guard-low',
      frames: this.anims.generateFrameNumbers('detective_defense', { start: 1, end: 1 }),
      frameRate: 1,
      repeat: -1
    });
    this.anims.create({
      key: 'enemy-hit-high',
      frames: this.anims.generateFrameNumbers('detective_damage', { start: 0, end: 0 }),
      frameRate: 1,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy-hit-low',
      frames: this.anims.generateFrameNumbers('detective_damage', { start: 1, end: 1 }),
      frameRate: 1,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy-launch',
      frames: this.anims.generateFrameNumbers('detective_damage', { start: 2, end: 2 }),
      frameRate: 1,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy-ko',
      frames: this.anims.generateFrameNumbers('detective_damage', { start: 3, end: 3 }),
      frameRate: 1,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy-get-up',
      frames: this.anims.generateFrameNumbers('detective_damage', { start: 4, end: 4 }),
      frameRate: 1,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy-dizzy',
      frames: this.anims.generateFrameNumbers('detective_damage', { start: 5, end: 5 }),
      frameRate: 1,
      repeat: 0
    });

    // Soplar tierra (2 frames)
    this.anims.create({
      key: 'enemy-blow',
      frames: this.anims.generateFrameNumbers('detective_specials', { start: 0, end: 1 }),
      frameRate: 6,
      repeat: 0
    });

    // Taunt / carga de energía (2 frames)
    this.anims.create({
      key: 'enemy-taunt',
      frames: this.anims.generateFrameNumbers('detective_specials', { start: 2, end: 3 }),
      frameRate: 6,
      repeat: 0
    });

    // Victoria (1 frame)
    this.anims.create({
      key: 'enemy-victory',
      frames: [{ key: 'detective_specials', frame: 4 }],
      frameRate: 1,
      repeat: 0
    });

    // Derrota / KO (1 frame)
    this.anims.create({
      key: 'enemy-defeat',
      frames: [{ key: 'detective_specials', frame: 5 }],
      frameRate: 1,
      repeat: 0
    });
  }
}
