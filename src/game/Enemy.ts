// ==== src/game/Enemy.ts ====

import Phaser from "phaser";
import { HitBox } from "./HitBox"; // ① Importa HitBox
import type { HitData } from "./HitBox";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private speed = 100; // por si luego quieres movimiento
  public health: number;
  public maxHealth: number;
  private inAirAttack = false;

  private aiState: "chase" | "attack" = "chase"; // ① Estado interno
  private attackCooldown = false; // ③ Evita spamear ataques
  private hitGroup: Phaser.Physics.Arcade.Group; // ④ Grupo donde crearemos HitBoxes

  private isAttacking = false; // para control interno
  private _onHitOverlap?: () => void; // callback opcional
  private target!: Phaser.Physics.Arcade.Sprite;

  private groundAttackRange = 60; // antes eran 100 px
  private airAttackRange = 100; // distancia horizontal máxima para saltar y golpear
  private jumpCooldown = false; // evita que salte cada frame

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number = 0,
    maxHealth = 100,
    target?: Phaser.Physics.Arcade.Sprite, // ← añadimos parámetro opcional
    hitGroup?: Phaser.Physics.Arcade.Group
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
      .setDrag(0, 0);

    this.maxHealth = maxHealth;
    this.health = maxHealth;

    if (target) {
      this.target = target;
    }

    if (hitGroup) {
      this.hitGroup = hitGroup;
    } else {
      // Si no viene grupo, creamos uno vacío (no recomendado; mejor siempre pasarlo desde la escena)
      this.hitGroup = scene.physics.add.group({ runChildUpdate: true });
    }
  }

  public setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  /** Lógica de daño y hit-stun */
  public takeDamage(amount: number, stun = 180) {
    this.health = Phaser.Math.Clamp(this.health - amount, 0, this.maxHealth);

    this.play("enemy_hit_high", true);

    // ① Interrumpir completamente el ataque actual
    this.isAttacking = false;
    this.attackCooldown = true; // evita re-atacar durante el hit-stun
    // ② Opcional: detener la animación de ataque que estuviera en curso
    this.anims.stop(); // corta cualquier frame residual
    // this.setFrame(0);           // (si quieres forzar frame base)

    this.scene.time.delayedCall(stun, () => {
      this.attackCooldown = false; // ③ ya puede volver a atacar
      if (this.health > 0) {
        this.aiState = "chase";
        this.play("enemy_idle", true);
      } else {
        this.play("enemy_ko", true);
      }
    });

    this.emit("healthChanged", this.health);
  }

  /** ========================================
   *  ② Método que inicia el ataque
   *  ========================================
   */
  private startAttack() {
    // Si ya estamos atacando o en cooldown, no hacemos nada
    if (this.attackCooldown || this.isAttacking) {
      return;
    }
    this.isAttacking = true;
    this.attackCooldown = true;

    // Paramos el movimiento horizontal
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);

    // ── ① Elegir un ataque aleatorio ────────────────────────────
    // Lista de tipos de ataque que hemos definido en createAnimations:
    const posiblesAtaques: Array<"punch" | "kick_light" | "kick_tight"> = [
      "punch",
      "kick_light",
      "kick_tight",
    ];

    // Elegir un índice al azar entre 0 y 2:
    const idx = Phaser.Math.Between(0, posiblesAtaques.length - 1);
    const tipoSeleccionado = posiblesAtaques[idx];

    let animKey: string;
    switch (tipoSeleccionado) {
      case "punch":
        animKey = "enemy_punch";
        break;
      case "kick_light":
        animKey = "enemy_kick_light";
        break;
      case "kick_tight":
        animKey = "enemy_kick_strong";
        break;
      default:
        animKey = "enemy_punch"; // Valor por defecto para evitar uso antes de asignar
        break;
    }

    console.log("Animación de ataque:", animKey);
    // Reproducimos animación de ataque (asegúrate de tenerla creada en createAnimations)
    this.play(animKey, true);

    // ↓ Creamos la HitBox justo delante del enemigo ↓
    const dir = this.flipX ? -1 : 1;
    const defaultHit: HitData = {
      damage: 10,
      knockBack: new Phaser.Math.Vector2(dir * 50, -100),
      hitStun: 200,
      guardStun: 8,
      height: "mid",
      owner: "enemy",
    };

    const hb = new HitBox(
      this.scene,
      this.x + dir * 30, // ③ Posición X: un poco delante según flipX
      this.y - 10, // ④ Posición Y: centrado verticalmente o ajustar según sprite
      30, // ⑤ Ancho de hitbox
      20, // ⑥ Alto de hitbox
      defaultHit
    );
    hb.setDepth(10);
    this.hitGroup.add(hb);

    // Destruimos la HitBox tras 150 ms si aún existe
    this.scene.time.delayedCall(150, () => {
      if (hb.active) hb.destroy();
    });

    this.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      (anim: Phaser.Animations.Animation) => {
        // Si la animación que acaba coincide con la que acabamos de reproducir:
        if (anim.key === animKey) {
          this.isAttacking = false;
          this.scene.time.delayedCall(500, () => {
            this.attackCooldown = false;
          });
          this.aiState = "chase";
        }
      }
    );
  }

  /** Salta y, a mitad de trayecto, crea una hit-box aérea */
  private startJumpAttack() {
    // no hagas nada si aún está en cooldown
    if (this.jumpCooldown || this.isAttacking) return;

    this.jumpCooldown = true;
    this.isAttacking = true;
    const body = this.body as Phaser.Physics.Arcade.Body;
    // ① salto vertical ligero hacia el jugador
    const dir = this.flipX ? -1 : 1;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(dir * 80, -300);

    body.setVelocity(dir * 80, -300);
    // ② reproduce animación de patada aérea (añádela en createAnimations)
    this.play("enemy_jump_kick", true);

    // ③ crea la hit-box justo cuando está en el punto más alto (~300 ms)
    this.scene.time.delayedCall(300, () => {
      const airHit: HitData = {
        damage: 12,
        knockBack: new Phaser.Math.Vector2(dir * 60, 100),
        hitStun: 260,
        guardStun: 10,
        height: "mid",
        owner: "enemy",
      };
      const hb = new HitBox(
        this.scene,
        this.x + dir * 24,
        this.y - 16,
        28,
        24,
        airHit
      );
      this.hitGroup.add(hb);
      this.scene.time.delayedCall(150, () => hb.destroy());
    });

    const landingCheck = this.scene.time.addEvent({
      delay: 16, // se evalúa cada frame
      loop: true,
      callback: (_ev: Phaser.Time.TimerEvent) => {
        if (body.blocked.down) {
          // ya tocó suelo
          this.isAttacking = false;
          this.aiState = "chase";
          this.play("enemy_idle", true);
          landingCheck.remove(false);
        }
      },
    });

    // ④ al caer, vuelve a estado «chase»
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isAttacking = false;
      this.aiState = "chase";
    });

    // cooldown de 1 s antes de volver a saltar
    this.scene.time.delayedCall(1000, () => (this.jumpCooldown = false));
  }

  /** En caso de querer reacción extra al impactar */
  public onHit(callback: () => void) {
    this._onHitOverlap = callback;
  }

  /** Ejecuta la callback registrada al impactar */
  public triggerHit() {
    this._onHitOverlap?.();
  }

  /** Dejar aquí otras funciones específicas: ataques, IA, movimiento... */

  public update(_time: number, _delta: number) {
    const current = this.anims.currentAnim?.key;
    if (current?.startsWith("enemy_hit") || current === "enemy_ko") return;
    if (!this.target) {
      // Si no hay objetivo, nos quedamos idle
      (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
      this.play("enemy_idle", true);
      return;
    }

    const dx = this.target.x - this.x;
    const dist = Math.abs(dx);
    const dir = Math.sign(dx);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const justLanded =
      body.blocked.down && body.velocity.y === 0 && this.aiState === "chase";

    // evita quedarte colgado con anim walk
    if (justLanded && !this.isAttacking) {
      body.setVelocityX(0); // frena del todo
      this.play("enemy_idle", true);
    }
    switch (this.aiState) {
      case "chase":
        /* ── A) Movimiento básico cuando está en el suelo ────────── */
        if (body.blocked.down && !this.isAttacking && !this.attackCooldown) {
          body.setVelocityX(dir * this.speed);
          this.play("enemy_walk", true);
          this.setFlipX(dir < 0);
        }

        /* ── B) Ataque a distancia corta o salto ─────────────────── */
        if (dist <= this.groundAttackRange && body.blocked.down) {
          body.setVelocityX(0);
          this.aiState = "attack";
        } else if (
          dist < this.airAttackRange &&
          !this.jumpCooldown &&
          Phaser.Math.Between(0, 100) < 15
        ) {
          this.startJumpAttack();
          this.inAirAttack = true;
        }
        break;

      case "attack":
        if (!this.isAttacking) {
          // ¿Todavía en cooldown? -> volver a perseguir
          if (this.attackCooldown) {
            this.aiState = "chase";
            break;
          }
        }
        this.startAttack();
        break;
    }

    if (this.inAirAttack && body.blocked.down) {
      this.inAirAttack = false;
      this.isAttacking = false;
      this.aiState = "chase";
      this.play("enemy_idle", true);
    }
  }

  /** ========================================
   *  ③ Método estático para crear animaciones
   *  ========================================
   */
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

    anims.create({
      key: "enemy_walk",
      frames: anims.generateFrameNumbers("detective_locomotion", {
        start: 0,
        end: 2,
      }),
      frameRate: 6,
      repeat: -1,
    });

    anims.create({
      key: "enemy_punch",
      frames: anims.generateFrameNumbers("detective_punch_right", {
        start: 0,
        end: 0,
      }),
      frameRate: 10,
      repeat: 0,
    });

    anims.create({
      key: "enemy_hit_high",
      frames: anims.generateFrameNumbers("detective_damage", {
        start: 0,
        end: 0,
      }),
      frameRate: 8,
      repeat: 0,
    });

    anims.create({
      key: "enemy_ko",
      frames: anims.generateFrameNumbers("detective_damage", {
        start: 3,
        end: 3,
      }),
      frameRate: 4,
      repeat: 0,
    });
    anims.create({
      key: "enemy_kick_strong",
      frames: anims.generateFrameNumbers("detective_kicks_tight", {
        start: 0,
        end: 2,
      }),
      frameRate: 8,
      repeat: 0,
    });
    anims.create({
      key: "enemy_kick_light",
      frames: anims.generateFrameNumbers("detective_kicks_light", {
        start: 0,
        end: 2,
      }),
      frameRate: 8,
      repeat: 0,
    });
    anims.create({
      key: "enemy_jump_kick",
      frames: anims.generateFrameNumbers("detective_kicks_tight", {
        start: 0,
        end: 2,
      }),
      frameRate: 12,
      repeat: 0,
    });
  }
}
