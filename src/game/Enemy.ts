// ==== src/game/Enemy.ts ====

import Phaser from "phaser";
import { HitBox } from "./HitBox"; // ① Importa HitBox
import type { HitData } from "./HitBox";
import { requestEnemyAction, type EnemyDecision } from "./EnemyAI";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private speed = 200; // estilo M. Bison, mucho más rápido
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
  public isCrouching = false;
  private isKO = false;
  private pendingDecision: EnemyDecision | null = null;
  private lastDecisionTime = 0;
  private damageMultiplier = 2;
  private attackChance = 50;
  private jumpChance = 15;
  private pattern: "aggressive" | "defensive" | "balanced" | "bison" = "balanced";
  private patternWeakness: "high" | "low" | null = null;
  private intelligence = 3; // IA aún más rápida (Bison)
  private decisionInterval = 1000;

  private nextPatternSwitch = 0;
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

    this.decisionInterval = 1000 / this.intelligence;
    this.choosePattern();
  }

  public setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  private choosePattern() {
    // Bison tiene un peso mayor en la selección de patrones
    const rnd = Phaser.Math.Between(0, 100);
    if (rnd < 80) {
      this.pattern = "bison";
    } else {
      const options = ["aggressive", "defensive", "balanced"] as const;
      this.pattern = options[Phaser.Math.Between(0, options.length - 1)];
    }

    switch (this.pattern) {
      case "aggressive":
        this.guardChance = 25;
        this.attackChance = 80;
        this.jumpChance = 40;
        this.patternWeakness = "high";
        break;
      case "defensive":
        this.guardChance = 90;
        this.attackChance = 30;
        this.jumpChance = 10;
        this.patternWeakness = "low";
        break;
      case "bison":
        // Patrón inspirado en M. Bison: presión constante y gran defensa
        this.guardChance = 95;
        this.attackChance = 95;
        this.jumpChance = 60;
        this.patternWeakness = "low";
        break;

      default:
        this.guardChance = 60;
        this.attackChance = 50;
        this.jumpChance = 20;
        this.patternWeakness = null;
        break;
    }
    // escalar por inteligencia y limitar al 100%
    this.guardChance = Math.min(100, Math.round(this.guardChance * this.intelligence));
    this.attackChance = Math.min(100, Math.round(this.attackChance * this.intelligence));
    this.jumpChance = Math.min(100, Math.round(this.jumpChance * this.intelligence));
    this.nextPatternSwitch = this.scene.time.now + Phaser.Math.Between(4000, 7000);
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
        this.setVelocity(0, 0);
        this.isKO = true;
      }
    });

    this.emit("healthChanged", this.health);
    this.guardState = "none";
    this.isGuarding = false;
    this.isCrouching = false;
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

    // Nos aseguramos de capturar el fin de la animación antes de reproducirla
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

    // Reproducimos animación de ataque (asegúrate de tenerla creada en createAnimations)
    this.play(animKey, true);

    // ↓ Creamos la HitBox justo delante del enemigo ↓
    const dir = this.flipX ? -1 : 1;
    let baseDamage = 10;
    if (tipoSeleccionado === "punch") baseDamage = 8;
    if (tipoSeleccionado === "kick_tight") baseDamage = 14;

    const defaultHit: HitData = {
      damage: Math.round(baseDamage * this.damageMultiplier),
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

    // Fallback por si la animación se interrumpe
    this.scene.time.delayedCall(150, () => {
      if (this.aiState === "attack") {
        this.aiState = "chase";
        this.isAttacking = false;
      }
    });
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
        damage: Math.round(12 * this.damageMultiplier),
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

    // Salvaguarda por si la animación se corta y no aterriza
    this.scene.time.delayedCall(1000, () => {
      if (this.isAttacking) {
        this.isAttacking = false;
        this.aiState = "chase";
      }
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
    if (this.isKO) return;
    // no reiniciamos isCrouching aquí para que los hitboxes puedan detectar
    // correctamente si el enemigo sigue agachado durante este frame

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

    if (_time > this.nextPatternSwitch) {
      this.choosePattern();
    }

    // Periodically query OpenAI for a suggested action
    if (_time - this.lastDecisionTime > this.decisionInterval && !this.pendingDecision) {
      this.lastDecisionTime = _time;
      requestEnemyAction({ distance: dist }).then((act) => {
        if (act) this.pendingDecision = act;
      });
    }

    // Orientación hacia el jugador cada frame, pero evita girar en mitad de un
    // ataque o de una guardia para que no se corten las animaciones
    if (!this.isAttacking && !this.isGuarding) {
      this.setFlipX(dx < 0);
    }

    const incoming = this.getIncomingHitHeight();
    if (
      incoming &&
      body.blocked.down &&
      !this.isAttacking &&
      !this.isGuarding
    ) {
      console.log("Decido cubrir", incoming);
      const shouldGuard =
        Phaser.Math.Between(0, 100) < this.guardChance &&
        incoming !== this.patternWeakness;
      if (shouldGuard) {
        // decidimos cubrir
        this.isGuarding = true;
        body.setVelocityX(0);

        if (incoming === "low") {
          this.play("enemy_guard_low", true);
          this.guardState = "low";
          this.isCrouching = true;
        } else {
          this.play("enemy_guard_high", true);
          this.guardState = "high";
        }

        // salir de guardia tras 300 ms
        this.scene.time.delayedCall(300, () => {
          this.isGuarding = false;
          this.guardState = "none";
          this.isCrouching = false;
          this.play("enemy_idle", true);
        });
        return; // nada más este frame
      } else if (incoming === "high") {
        // si no va a cubrir pero es alto…
        // …agáchate para esquivar
        this.isGuarding = true;
        this.isCrouching = true;
        body.setVelocityX(0);
        this.play("enemy_down", true); // usa tu anim. de agacharse

        this.scene.time.delayedCall(300, () => {
          this.isGuarding = false;
          this.guardState = "none";
          this.isCrouching = false;
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
        }

        /* 2-B   decidir atacar o saltar                                    */
        if (this.pendingDecision) {
          const action = this.pendingDecision;
          this.pendingDecision = null;
          if (
            action === "attack" &&
            dist <= this.groundAttackRange &&
            body.blocked.down
          ) {
            body.setVelocityX(0);
            this.aiState = "attack";
          } else if (
            action === "jump" &&
            dist < this.airAttackRange &&
            !this.jumpCooldown
          ) {
            this.startJumpAttack();
          }
        } else if (
          dist <= this.groundAttackRange &&
          body.blocked.down &&
          Phaser.Math.Between(0, 100) < this.attackChance
        ) {
          body.setVelocityX(0);
          this.aiState = "attack";
        } else if (
          dist < this.airAttackRange &&
          !this.jumpCooldown &&
          Phaser.Math.Between(0, 100) < this.jumpChance
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
