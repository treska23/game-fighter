// ==== src/game/Enemy.ts ====

import Phaser from "phaser";
import { HitBox } from "./HitBox"; // ① Importa HitBox
import type { HitData } from "./HitBox";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private speed = 100; // por si luego quieres movimiento
  public health: number;
  public maxHealth: number;

  private aiState: "chase" | "attack" = "chase"; // ① Estado interno
  private attackCooldown = false; // ③ Evita spamear ataques
  private hitGroup: Phaser.Physics.Arcade.Group; // ④ Grupo donde crearemos HitBoxes

  private isAttacking = false; // para control interno
  private _onHitOverlap?: () => void; // callback opcional
  private target!: Phaser.Physics.Arcade.Sprite;

  private groundAttackRange = 60; // antes eran 100 px
  private airAttackRange = 100; // distancia horizontal máxima para saltar y golpear
  private jumpCooldown = false; // evita que salte cada frame

  /** Probabilidad de bloquear un golpe entrante (0-100)              */
  private guardChance = 100;
  /** true mientras esté en anim “guard” o “crouch”                   */
  private isGuarding = false;
  public guardState: "none" | "high" | "low" = "none";
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
    if (amount <= 0) return;
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
    this.guardState = "none";
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
    if (this.jumpCooldown || this.isAttacking) return;

    this.jumpCooldown = true;
    this.isAttacking = true;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dir = this.flipX ? -1 : 1;

    // impulso inicial
    body.setVelocity(dir * 80, -300);
    this.play("enemy_jump_kick", true);

    /* hit-box en el aire --------------------------------------------------- */
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

    /* ── detector de aterrizaje: sólo se ejecuta UNA vez ─────────────────── */
    const landingEvt = this.scene.time.addEvent({
      delay: 16,
      loop: true,

      callback: (_ev: Phaser.Time.TimerEvent) => {

        if (body.blocked.down) {
          landingEvt.remove(false); // detener el bucle
          this.isAttacking = false;
          this.aiState = "chase";
          this.play("enemy_idle", true); // vuelve a idle UNA vez
          // 1 s de cooldown antes del siguiente salto
          this.scene.time.delayedCall(1000, () => (this.jumpCooldown = false));
        }
      },
    });
  }

  /** En caso de querer reacción extra al impactar */
  public onHit(callback: () => void) {
    this._onHitOverlap = callback;
  }

  /** Ejecuta la callback registrada al impactar */
  public triggerHit() {
    this._onHitOverlap?.();
  }

  /** Devuelve la altura (“high”, “mid”, “low”) del último hit del player,
   *  o null si el jugador no está atacando en este momento. */
  private getIncomingHitHeight(): "high" | "mid" | "low" | null {
    const plyr = this.target as any;
    if (!plyr?.isAttacking) return null;
    // El Player ya genera su HitBox con la altura en hitData.height,
    // así que miramos el grupo compartido:
    for (const child of this.hitGroup.getChildren()) {
      const hb = child as HitBox;
      if (hb.active && hb.hitData.owner === "player") {
        return hb.hitData.height;
      }
    }
    return null;
  }

  public update(_time: number, _delta: number) {
    const current = this.anims.currentAnim?.key;
    if (current?.startsWith("enemy_hit") || current === "enemy_ko") return;

    if (!this.target) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
      this.play("enemy_idle", true);
      return;
    }

    /* 1.  datos básicos ---------------------------------------------------- */
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.target.x - this.x;
    const dist = Math.abs(dx);
    const dir = Math.sign(dx);

    const incoming = this.getIncomingHitHeight();
    if (
      incoming &&
      body.blocked.down &&
      !this.isAttacking &&
      !this.isGuarding
    ) {
      console.log("Decido cubrir", incoming);
      if (Phaser.Math.Between(0, 100) < this.guardChance) {
        // decidimos cubrir
        this.isGuarding = true;
        body.setVelocityX(0);

        if (incoming === "low") {
          this.play("enemy_guard_low", true);
          this.guardState = "low";
        } else {
          this.play("enemy_guard_high", true);
          this.guardState = "high";
        }

        // salir de guardia tras 300 ms
        this.scene.time.delayedCall(300, () => {
          this.isGuarding = false;
          this.play("enemy_idle", true);
        });
        return; // nada más este frame
      } else if (incoming === "high") {
        // si no va a cubrir pero es alto…
        // …agáchate para esquivar
        this.isGuarding = true;
        body.setVelocityX(0);
        this.play("enemy_down", true); // usa tu anim. de agacharse

        this.scene.time.delayedCall(300, () => {
          this.isGuarding = false;
          this.guardState = "none";
          this.play("enemy_idle", true);
        });
        return;
      }
    }

    if (this.isGuarding) return;

    /* 2.  Máquina de estados sencilla ------------------------------------- */
    switch (this.aiState) {
      /* -- persecución ----------------------------------------------------- */
      case "chase": {
        /* 2-A   andar hacia el jugador si estamos en suelo */
        if (body.blocked.down && !this.isAttacking && !this.attackCooldown) {
          body.setVelocityX(dir * this.speed);

          /* reproducir walk SOLO si aún no está sonando */
          if (this.anims.currentAnim?.key !== "enemy_walk") {
            this.play("enemy_walk", true);
          }
          this.setFlipX(dir < 0);
        }

        /* 2-B   decidir atacar o saltar                                    */
        if (dist <= this.groundAttackRange && body.blocked.down) {
          body.setVelocityX(0);
          this.aiState = "attack";
        } else if (
          dist < this.airAttackRange &&
          !this.jumpCooldown &&
          Phaser.Math.Between(0, 100) < 15
        ) {
          this.startJumpAttack();
        }
        break;
      }

      /* -- ataque cuerpo a cuerpo ----------------------------------------- */
      case "attack": {
        if (!this.isAttacking) {
          if (this.attackCooldown) {
            this.aiState = "chase";
          } else {
            this.startAttack();
          }
        }
        break;
      }
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
        end: 1,
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
      frames: anims.generateFrameNumbers("detective_ko", {
        start: 0,
        end: 0,
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
    anims.create({
      key: "enemy_guard_high",
      frames: anims.generateFrameNumbers("detective_defense", {
        start: 0,
        end: 0,
      }),
      frameRate: 2,
      repeat: 0,
    });
    anims.create({
      key: "enemy_guard_low",
      frames: anims.generateFrameNumbers("detective_defense", {
        start: 1,
        end: 1,
      }),
      frameRate: 2,
      repeat: 0,
    });
    anims.create({
      key: "enemy_down",
      frames: anims.generateFrameNumbers("detective_down", {
        start: 0,
        end: 0,
      }),
      frameRate: 2,
      repeat: 0, // solo un frame de “duck”
    });
  }
}
