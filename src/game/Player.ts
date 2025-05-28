// ==== src/game/Player.ts ====

import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private speed = 200;
  private jumpSpeed = 400;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number = 0
  ) {
    super(scene, x, y, texture, frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setGravityY(980);

    this.cursors = scene.input.keyboard!.createCursorKeys();
  }

 update(): void {
  const body = this.body as Phaser.Physics.Arcade.Body;

  /* 0 ── ORIENTACIÓN HACIA EL ENEMIGO ─────────────────────────── */
  const enemy = (this.scene as any).enemy;
  if (enemy) this.setFlipX(enemy.x < this.x);   // mira al rival

  /* 1 ── INPUT BÁSICO ─────────────────────────────────────────── */
  const left   = this.cursors.left.isDown;
  const right  = this.cursors.right.isDown;
  const down   = this.cursors.down.isDown;
  const jump   = Phaser.Input.Keyboard.JustDown(this.cursors.up);

  const facingLeft      = this.flipX;           // ya actualizado
  const backPressed     = facingLeft ? right : left;
  const forwardPressed  = facingLeft ? left  : right;

  /* 2 ── SALTO (vertical o diagonal) ──────────────────────────── */
  if (jump && (body.blocked as any).down) {
    // velocidad horizontal según la dirección pulsada
    let vx = 0;
    if (left)  vx = -this.speed;
    if (right) vx =  this.speed;

    this.setVelocityX(vx);
    this.setVelocityY(-this.jumpSpeed);
    this.anims.play('player_jump', true);
    return;
  }

  /* 3 ── LÓGICA EN EL AIRE (ya saltando) ───────────────────────── */
  if (!(body.blocked as any).down) {
    this.anims.play('player_jump', true);
    return;
  }

  /* 4 ── GUARDIA ALTA (atrás + enemigo atacando) ──────────────── */
  const enemyIsAttacking = enemy?.isAttacking;
    if (backPressed && enemyIsAttacking) {
    this.setVelocityX(0);
    if (down)  this.anims.play('player_guard_low',  true);
    else       this.anims.play('player_guard_high', true);
    return;
  }

   /* 5 ── RETROCESO (caminar hacia atrás) ───────────────────────── */
  if (backPressed && !down) {
    this.setVelocityX(facingLeft ?  this.speed : -this.speed);
    this.anims.play('player_locomotion', true);
    return;
  }
  
  /* 5-bis ── AVANCE (caminar hacia el rival) ───────────────────── */
  if (forwardPressed && !down) {
    this.setVelocityX(facingLeft ? -this.speed :  this.speed);
    this.anims.play('player_locomotion', true);
    return;
  }

  /* 6 ── AGACHARSE (↓ o ↓+atrás sin ataque rival) ─────────────── */
    if (down) {
      this.setVelocityX(0);
      this.anims.play('player_down', true);
      return;
    }

  /* 7 ── IDLE ─────────────────────────────────────────────────── */
    this.setVelocityX(0);
    this.anims.play('player_idle', true);
  }
}
