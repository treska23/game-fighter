// ==== src/game/Enemy.ts ====

import Phaser from "phaser";
import type { HitData } from "./HitBox";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private speed = 100; // por si luego quieres movimiento
  public health: number;
  public maxHealth: number;
  private isAttacking = false; // para control interno
  private onHitOverlap?: () => void; // callback opcional
  private target!: Phaser.Physics.Arcade.Sprite;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number = 0,
    maxHealth = 100,
    target?: Phaser.Physics.Arcade.Sprite // ← añadimos parámetro opcional
  ) {
    super(scene, x, y, texture, frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setFlipX(true);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body)
      .setAllowGravity(true)
      .setGravityY(980)
      .setBounce(0.2, 0)
      .setDrag(200, 0);

    this.maxHealth = maxHealth;
    this.health = maxHealth;

    if (target) {
      this.target = target;
    }
  }

  public setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  /** Lógica de daño y hit-stun */
  public takeDamage(amount: number, stun = 180) {
    this.health = Phaser.Math.Clamp(this.health - amount, 0, this.maxHealth);

    this.play("enemy_hit_high", true);

    this.scene.time.delayedCall(stun, () => {
      if (this.health > 0) {
        this.play("enemy_idle", true);
      } else {
        this.play("enemy_ko", true);
      }
    });

    this.emit("healthChanged", this.health);
  }

  /** En caso de querer reacción extra al impactar */
  public onHit(callback: () => void) {
    this.onHitOverlap = callback;
  }

  /** Dejar aquí otras funciones específicas: ataques, IA, movimiento... */

  public update(time: number, delta: number) {
    const current = this.anims.currentAnim?.key;
    if (current?.startsWith("enemy_hit") || current === "enemy_ko") return;
    if (!this.target) return; // sin objetivo, no hacemos nada
    if (this.isAttacking) return; // si ataca, no movemos

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.target.x - this.x;
    const dist = Math.abs(dx);
    const dir = Math.sign(dx);

    const attackRange = 100; // distancia a la que empezará ataque
    const walkSpeed = this.speed;

    if (dist > attackRange) {
      // —— Persigue al jugador
      body.setVelocityX(dir * walkSpeed);
      this.play("enemy_walk", true);
      this.setFlipX(dir < 0); // gira según hacia dónde vaya
    } else {
      // —— Está lo bastante cerca: cambia a idle (o podría atacar aquí)
      body.setVelocityX(0);
      this.play("enemy_idle", true);
      this.setFlipX(dir < 0);
      // → más adelante: aquí podremos lanzar un ataque con probabilidad
    }
  }

  /** Genera todas las animaciones del enemigo */
  public static createAnimations(anims: Phaser.Animations.AnimationManager) {
    anims.create({
      key: "enemy_idle",
      frames: anims.generateFrameNumbers("detective_idle", {
        start: 0,
        end: 0,
      }),
      frameRate: 6,
      repeat: -1,
    });
    // …repite con punch, kick_light, kick_strong, hit_high, etc.
  }
}
