// ==== src/game/Player.ts ====

import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private speed = 200;
  private jumpSpeed = 400;
  private attackKeys!: { punch: Phaser.Input.Keyboard.Key;
                       kickL: Phaser.Input.Keyboard.Key;
                       kickH: Phaser.Input.Keyboard.Key; };
  private hitGroup: Phaser.Physics.Arcade.Group;
  private attackState: 'idle' | 'attack' = 'idle';
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number = 0,
    hitGroup: Phaser.Physics.Arcade.Group) 
    {
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

  private startAttack(anim: string, hitboxWidth: number, duration = 120) {
      this.attackState = 'attack';
      const playerBody = this.body as Phaser.Physics.Arcade.Body;
      if (playerBody.blocked.down) {
        this.setVelocityX(0);
      }
    
      this.anims.play(anim, true);

      /* hit-box: aparece justo delante */
      const dir = this.flipX ? -1 : 1;
      const zone = this.scene.add.zone(
       this.x + dir * 24,
       this.y - 16,
       hitboxWidth,
       24);

      this.scene.physics.add.existing(zone);
      
       const zoneBody = zone.body as Phaser.Physics.Arcade.Body;
       zoneBody.setAllowGravity(false);
       zoneBody.setEnable(true);

      // 6) Lo añado a tu grupo de ataques
      this.hitGroup.add(zone);

      // 7) Lo destruyo tras la duración
      this.scene.time.delayedCall(duration, () => zone.destroy());

      // 8) Cuando termine la animación exacta, vuelvo a “idle”
      this.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      (animation: Phaser.Animations.Animation) => {
        if (animation.key === anim) {
          this.attackState = 'idle';
        }
      }
    );
  }

  private tryAttack(): boolean {
   if (this.attackState  !== 'idle') return false;

   if (Phaser.Input.Keyboard.JustDown(this.attackKeys.punch)) {
    console.log('=== PUNCH PRESSED ===');
     this.startAttack('player_punch', 26);
     return true;
   }
   if (Phaser.Input.Keyboard.JustDown(this.attackKeys.kickL)) {
     this.startAttack('player_kick_light', 32);
     return true;
   }
   if (Phaser.Input.Keyboard.JustDown(this.attackKeys.kickH)) {
     this.startAttack('player_kick_tight', 36);
     return true;
   }
   return false;
  }


 update(): void {
  // si estamos atacando, no tocar nada hasta que termine
  if (this.attackState === 'attack') {
    return;
  }
  // Ataque cancela todo lo demás
  if (this.tryAttack()) return;
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
