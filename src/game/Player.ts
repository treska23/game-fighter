// ==== src/game/Player.ts ====

import Phaser from 'phaser';
import { HitBox } from './HitBox';   // ⬅️ nuevo import
import type { HitData } from './HitBox';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private speed = 200;
  private jumpSpeed = 400;
  private attackKeys!: { punch: Phaser.Input.Keyboard.Key;
                       kickL: Phaser.Input.Keyboard.Key;
                       kickH: Phaser.Input.Keyboard.Key; };
  private hitGroup: Phaser.Physics.Arcade.Group;
  private attackState: 'idle' | 'attack' = 'idle';
  public health: number = 100;
  public maxHealth: number = 100;

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

    public takeDamage(amount: number, stun = 180) {
      this.health = Phaser.Math.Clamp(this.health - amount, 0, this.maxHealth);
      this.anims.play('player_damage', true);

      this.scene.time.delayedCall(stun, () => {if (this.health > 0) this.play('enemy_idle', true);});

      // Si llega a cero, KO
      if (this.health === 0) {
        this.anims.play('player_ko', true);
        this.setVelocity(0, 0);
        // aquí podrías deshabilitar controles o disparar "game over"
      }

      // Emitimos un evento para que la escena actualice el HUD
      this.emit('healthChanged', this.health);
    }

  private startAttack(anim: string,hitboxWidth: number,duration = 120,hitData: Partial<HitData> = {}) {
      this.attackState = 'attack';
      const playerBody = this.body as Phaser.Physics.Arcade.Body;

      if (playerBody.blocked.down) {
        this.setVelocityX(0);
      }
    
      this.anims.play(anim, true);
    
      //  ► Creamos la HitBox con datos mezclados
      const dir = this.flipX ? -1 : 1;

      const defaultHit: HitData = {
        damage:   8,
        knockBack: new Phaser.Math.Vector2(dir * 20, 0),
        hitStun:  180,
        guardStun: 6,
        height:  'high',
        owner:   'player'
      };
      
      const hb = new HitBox(
        this.scene,
        this.x + dir * 24,
        this.y - 16,
        hitboxWidth,
        24,
        { ...defaultHit, ...hitData }
      );
      // hb.setFillStyle(0xff0000, 0.3); // semitransparente (removed, not available on HitBox)
      hb.setDepth(10);
      this.hitGroup.add(hb);

      this.scene.physics.add.overlap(
        hb,
        (this.scene as any).enemy as Phaser.Physics.Arcade.Sprite,
        (_zone, enemySprite) => {
          const hit = _zone as HitBox;
          if ((hit as any).hasHit) return;
          (hit as any).hasHit = true;
          hit.destroy();                // ya no hará solapamientos extra
          console.log('Golpe! daño =', hit.hitData.damage);
          hit.applyTo(enemySprite as any);
        },
        undefined,
        this
      );

      this.scene.time.delayedCall(duration, () => hb.destroy());
    
      //  ► Cuando termine la animación, volvemos a idle
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
  if (this.attackState !== 'idle') return false;

  const dir = this.flipX ? -1 : 1;

  if (Phaser.Input.Keyboard.JustDown(this.attackKeys.punch)) {
      this.startAttack('player_punch',      26, 120, { damage: 6, hitStun:  120});
      return true;
  }
  if (Phaser.Input.Keyboard.JustDown(this.attackKeys.kickL)) {
      this.startAttack('player_kick_light', 32, 120, { damage: 10, hitStun:  180});
      return true;
  }
  if (Phaser.Input.Keyboard.JustDown(this.attackKeys.kickH)) {
    this.startAttack(
      'player_kick_tight',
      36,
      120,
      { damage: 14, knockBack: new Phaser.Math.Vector2(dir * 30, 0),hitStun:  260 }
    );
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
