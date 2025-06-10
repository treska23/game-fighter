// ==== src/game/Player.ts ====

import Phaser from "phaser";
import { HitBox } from "./HitBox"; // ⬅️ nuevo import
import type { HitData } from "./HitBox";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private speed = 200;
  private jumpSpeed = 400;
  private attackKeys!: {
    punch: Phaser.Input.Keyboard.Key;
    kickL: Phaser.Input.Keyboard.Key;
    kickH: Phaser.Input.Keyboard.Key;
  };
  public isAttacking: boolean = false;
  private hitGroup: Phaser.Physics.Arcade.Group;
  private attackState: "idle" | "attack" = "idle";
  public health: number = 100;
  public maxHealth: number = 100;
  public guardState: "none" | "high" | "low" = "none";
  public isGuarding = false;
  public isCrouching = false;
  private damageMultiplier = 0.5; // daño reducido
  private isKO = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number = 0,
    hitGroup: Phaser.Physics.Arcade.Group
  ) {
    super(scene, x, y, texture, frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setGravityY(980);

    this.cursors = scene.input.keyboard!.createCursorKeys();

    this.hitGroup = hitGroup;

    this.attackKeys = {
      punch: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)!,
      kickL: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)!,
      kickH: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)!,
    };
  }

  public takeDamage(amount: number, stun = 180) {
    if (amount <= 0) return;
    this.health = Phaser.Math.Clamp(this.health - amount, 0, this.maxHealth);
    this.anims.play("player_damage", true);

    this.isGuarding = false;
    this.guardState = "none";
    this.isCrouching = false;

    // ← ① Cancelamos cualquier ataque en curso
    this.attackState = "idle";
    this.isAttacking = false;

    this.scene.time.delayedCall(stun, () => {
      if (this.health > 0) this.play("player_idle", true);
    });

    // Si llega a cero, KO
    if (this.health === 0) {
      this.anims.play("player_ko", true);
      this.setVelocity(0, 0);
      this.isKO = true;
    }

    // Emitimos un evento para que la escena actualice el HUD
    this.emit("healthChanged", this.health);
  }

  private startAttack(
    anim: string,
    hitboxWidth: number,
    duration = 120,
    hitData: Partial<HitData> = {}
  ) {
    this.attackState = "attack";
    this.isAttacking = true;

    const animDuration = this.anims.get(anim)?.duration ?? duration;

    const playerBody = this.body as Phaser.Physics.Arcade.Body;

    if (playerBody.blocked.down) {
      this.setVelocityX(0);
    }

    //  ► Cuando termine la animación, volvemos a idle
    this.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      (animation: Phaser.Animations.Animation) => {
        if (animation.key === anim) {
          this.attackState = "idle";
          this.isAttacking = false;
        }
      }
    );

    this.anims.play(anim, true);

    //  ► Creamos la HitBox con datos mezclados
    const dir = this.flipX ? -1 : 1;
    const inAir = !(this.body as Phaser.Physics.Arcade.Body).blocked.down;

    const defaultHit: HitData = {
      damage: 8,
      knockBack: new Phaser.Math.Vector2(dir * 20, 0),
      hitStun: 180,
      guardStun: 6,
      height: "high",
      owner: "player",
    };

    const yOffset = inAir ? -32 /* más alto */ : -16; /* suelo */

    const finalHit = { ...defaultHit, ...hitData } as HitData;
    finalHit.damage = Math.round(finalHit.damage * this.damageMultiplier);

    const hb = new HitBox(
      this.scene,
      this.x + dir * 24,
      this.y - yOffset,
      hitboxWidth,
      24,
      finalHit
    );
    // hb.setFillStyle(0xff0000, 0.3); // semitransparente (removed, not available on HitBox)
    hb.setDepth(10);
    this.hitGroup.add(hb);

    this.scene.physics.add.overlap(
      hb,
      (this.scene as any).enemy as Phaser.Physics.Arcade.Sprite,
      (_zone, enemySprite) => {
        const hit = _zone as HitBox;
        hit.applyTo(enemySprite as any);
      },
      undefined,
      this
    );

    this.scene.time.delayedCall(animDuration, () => {
      if (hb.active) hb.destroy();
    });

    // Fallback por si la animación se interrumpe
    this.scene.time.delayedCall(animDuration + 50, () => {
      if (this.attackState === "attack") {
        this.attackState = "idle";
        this.isAttacking = false;
      }
    });
  }

  private tryAttack(): boolean {
    if (this.attackState !== "idle") return false;

    const dir = this.flipX ? -1 : 1;
    const inAir = !(this.body as Phaser.Physics.Arcade.Body).blocked.down;

    if (Phaser.Input.Keyboard.JustDown(this.attackKeys.punch)) {
      this.startAttack("player_punch", 26, 120, {
        damage: 6,
        hitStun: 120,
        knockBack: new Phaser.Math.Vector2(dir * 40, 0),
      });
      return true;
    }

    if (Phaser.Input.Keyboard.JustDown(this.attackKeys.kickL)) {
      this.startAttack("player_kick_light", 32, 120, {
        damage: 10,
        hitStun: 180,
        knockBack: new Phaser.Math.Vector2(dir * 40, 0),
      });
      return true;
    }

    if (Phaser.Input.Keyboard.JustDown(this.attackKeys.kickH)) {
      // if inAir, use a vertical knockback and longer stun
      if (inAir) {
        this.startAttack("player_kick_tight", 36, 150, {
          damage: 12,
          knockBack: new Phaser.Math.Vector2(dir * 10, -200),
          hitStun: 300,
          height: "mid",
        });
        return true;
      } else {
        // grounded heavy kick
        this.startAttack("player_kick_tight", 36, 120, {
          damage: 14,
          knockBack: new Phaser.Math.Vector2(dir * 30, 0),
          hitStun: 260,
        });
        return true;
      }
    }
    return false;
  }

  public update(_time: number, _delta: number): void {
    if (this.isKO) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    // El estado de guardia/crouch se actualizará más abajo según la entrada
    // para evitar ventanas en las que la detección de golpes no refleje la
    // postura real del jugador.

    if (this.attackState === "attack") {
      return;
    }

    if (this.tryAttack()) return;

    /* 0 ── ORIENTACIÓN HACIA EL ENEMIGO ─────────────────────────── */
    const enemy = (this.scene as any).enemy;
    if (enemy) this.setFlipX(enemy.x < this.x); // mira al rival

    /* 1 ── INPUT BÁSICO ─────────────────────────────────────────── */
    const left = this.cursors.left.isDown;
    const right = this.cursors.right.isDown;
    const down = this.cursors.down.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up);

    const facingLeft = this.flipX; // ya actualizado
    const backPressed = facingLeft ? right : left;
    const forwardPressed = facingLeft ? left : right;

    /* 2 ── SALTO (vertical o diagonal) ──────────────────────────── */
    if (jump && (body.blocked as any).down) {
      // velocidad horizontal según la dirección pulsada
      let vx = 0;
      if (left) vx = -this.speed;
      if (right) vx = this.speed;

      this.setVelocityX(vx);
      this.setVelocityY(-this.jumpSpeed);
      this.anims.play("player_jump", true);
      return;
    }

    /* 3 ── LÓGICA EN EL AIRE (ya saltando) ───────────────────────── */
    if (!(body.blocked as any).down) {
      this.anims.play("player_jump", true);
      return;
    }

    /* 4 ── GUARDIA (atrás + enemigo atacando) ───────────────────── */
    const enemyIsAttacking = enemy?.isAttacking;
    if (backPressed && enemyIsAttacking) {
      this.setVelocityX(0);
      this.isGuarding = true;

      if (down) {
        this.guardState = "low";
        this.isCrouching = true;
        this.anims.play("player_guard_low", true);
      } else {
        this.guardState = "high";
        this.isCrouching = false;
        this.anims.play("player_guard_high", true);
      }

      return;
    }

    /* 5 ── RETROCESO (caminar hacia atrás) ───────────────────────── */
    if (backPressed && !down) {
      this.setVelocityX(facingLeft ? this.speed : -this.speed);
      this.anims.play("player_locomotion", true);
      return;
    }

    /* 5-bis ── AVANCE (caminar hacia el rival) ───────────────────── */
    if (forwardPressed && !down) {
      this.setVelocityX(facingLeft ? -this.speed : this.speed);
      this.anims.play("player_locomotion", true);
      return;
    }

    /* 6 ── AGACHARSE (↓ o ↓+atrás sin ataque rival) ─────────────── */
    if (down) {
      this.setVelocityX(0);
      this.isCrouching = true;
      this.isGuarding = false;
      this.guardState = "none";
      this.anims.play("player_down", true);
      return;
    }

    /* 7 ── IDLE ─────────────────────────────────────────────────── */
    this.setVelocityX(0);
    this.isCrouching = false;
    this.isGuarding = false;
    this.guardState = "none";
    this.anims.play("player_idle", true);
  }
}
