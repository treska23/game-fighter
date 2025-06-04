import Phaser from "phaser";
import { Player } from "../game/Player";
import { HitBox } from "../game/HitBox"; // ⬅️ nuevo import
import { Enemy } from "../game/Enemy";

//import type { HitData } from '../game/HitBox';

export default class FightScene extends Phaser.Scene {
  private player!: Player; // ← tu clase Player             ★
  private enemy!: Enemy; // ← alias recién creado

  private hitGroup!: Phaser.Physics.Arcade.Group;

  // Música de fondo provisional
  private bgm!: Phaser.Sound.BaseSound;

  // Gráficos para las barras
  private playerHealthBar!: Phaser.GameObjects.Graphics;
  private enemyHealthBar!: Phaser.GameObjects.Graphics;
  private playerHealthText!: Phaser.GameObjects.Text;
  private enemyHealthText!: Phaser.GameObjects.Text;
  private ended = false;

  // Le decimos a TS que enemy tendrá también health, maxHealth y takeDamage()

  constructor() {
    super({ key: "FightScene" });
  }

  preload(): void {
    // Assets cargados en PreloadScene
  }

  create(): void {
    // 0️⃣ — Carga animaciones (solo una vez)
    Enemy.createAnimations(this.anims);
    this.createPlayerAnimations();

    // Inicia la banda sonora 8‑bit en bucle
    this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
    this.bgm.play();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.bgm.stop());

    // 1️⃣ — Fondo y plataformas
    this.add
      .image(400, 300, "room_bg")
      .setDisplaySize(800, 600)
      .setScrollFactor(0);

    const platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, "ground").setDisplaySize(800, 64).refreshBody();

    // 3️⃣ — Grupo de hit‐boxes
    this.hitGroup = this.physics.add.group({
      classType: HitBox,
      allowGravity: false,
      runChildUpdate: true, // importante: para que las HitBox actualicen su lógica
    });

    // 4️⃣ — Crear jugador
    this.player = new Player(this, 100, 515, "player_idle", 0, this.hitGroup);
    this.player.setCollideWorldBounds(true);
    (this.player.body as Phaser.Physics.Arcade.Body).setBounce(0, 0);
    this.physics.add.collider(this.player, platforms);

    // 5️⃣ — Crear enemigo
    this.enemy = new Enemy(
      this,
      650,
      500,
      "detective_idle", // textura inicial
      0, // frame por defecto
      100, // maxHealth (puedes ajustar este número)
      this.player, // → target: el jugador
      this.hitGroup // → hitGroup: grupo compartido de HitBoxes
    );
    this.enemy.setFlipX(true);

    this.physics.add.collider(this.enemy, platforms);

    this.enemy.onHit(() => {
      // Aquí pones la reacción extra al impactar:
      // — Sonido de golpe —
      this.sound.play('hit_sound');

      // — Partículas de efecto —
      /* const p = this.add.particles("sangre");
  p.createEmitter({
    x: this.player.x,
    y: this.player.y - 20,
    speed: { min: -100, max: 100 },
    lifespan: 300,
    quantity: 5,
    scale: { start: 1, end: 0 },
    blendMode: "ADD"
  }).explode(10, this.player.x, this.player.y - 20); */

      // — Cámara tiembla un poquito —
      this.cameras.main.shake(100, 0.01);
    });

    this.time.addEvent({
      delay: 500, // esperar medio segundo tras crear enemy
      callback: () => {
        // Le decimos al Enemy que *no* esté atacando ni en cooldown:
        (this.enemy as any).isAttacking = false;
        (this.enemy as any).attackCooldown = false;
        // Forzamos que `getIncomingHitHeight()` devuelva “high”:
        // Para ello, simulamos que hay una HitBox de player activa con height "high".
        // La forma más sencilla es inyectar directamente el valor en el Enemy:
        // (La función getIncomingHitHeight() recorre el grupo, pero ahora mismo
        // lo ignoramos y forzamos la variable interna _guard_).
        // Así que le asignamos directamente:
        (this.enemy as any).guardState = "high";
        (this.enemy as any).isGuarding = true; // le indicamos que ya está cubriéndose

        // Tras 300 ms, volvemos a “idle”:
        this.time.delayedCall(300, () => {
          (this.enemy as any).isGuarding = false;
          (this.enemy as any).guardState = "none";
          this.enemy.play("enemy_idle", true);
        });
      },
    });

    // 6️⃣ — Overlap: cualquier HitBox del grupo golpea al enemigo
    this.physics.add.overlap(this.hitGroup, this.enemy, (objA, objB) => {
      const hit = objA instanceof HitBox ? (objA as HitBox) : (objB as HitBox);
      const enem = objA === hit ? (objB as Enemy) : (objA as Enemy);

      if (hit.hitData.owner !== "player") return; // ← filtro
      hit.applyTo(enem);
    });

    // 7️⃣ — Overlap: cualquier HitBox del grupo golpea al jugador
    this.physics.add.overlap(this.hitGroup, this.player, (objA, objB) => {
      const hit = objA instanceof HitBox ? (objA as HitBox) : (objB as HitBox);
      const plyr = objA === hit ? (objB as Player) : (objA as Player);

      if (hit.hitData.owner !== "enemy") return;
      hit.applyTo(plyr);
      this.enemy.triggerHit();
    });

    // 7️⃣ — HUD de vida
    this.playerHealthBar = this.add.graphics();
    this.enemyHealthBar = this.add.graphics();
    this.playerHealthText = this.add.text(20, 20, `${this.player.health}`, {
      fontSize: "14px",
      color: "#ffffff",
    });
    this.enemyHealthText = this.add.text(580, 20, `${this.enemy.health}`, {
      fontSize: "14px",
      color: "#ffffff",
    });

    this.drawHealthBar(
      this.playerHealthBar,
      20,
      20,
      this.player.health,
      this.player.maxHealth
    );
    this.drawHealthBar(
      this.enemyHealthBar,
      580,
      20,
      this.enemy.health,
      this.enemy.maxHealth
    );

    this.player.on("healthChanged", (hp: number) => {
      this.drawHealthBar(
        this.playerHealthBar,
        20,
        20,
        hp,
        this.player.maxHealth
      );
      this.playerHealthText.setText(`${hp}`);
      if (hp <= 0 && !this.ended) {
        this.ended = true;
        this.time.delayedCall(2000, () => {
          this.scene.start('GameOverScene');
        });
      }
    });
    this.enemy.on("healthChanged", (hp: number) => {
      this.drawHealthBar(
        this.enemyHealthBar,
        580,
        20,
        hp,
        this.enemy.maxHealth
      );
      this.enemyHealthText.setText(`${hp}`);
      if (hp <= 0 && !this.ended) {
        this.ended = true;
        this.time.delayedCall(2000, () => {
          this.scene.start('VictoryScene');
        });
      }
    });

    // 8️⃣ — Teclas de prueba para el enemigo
    const ATTACK_ANIMS = [
      "enemy_punch",
      "enemy_kick_light",
      "enemy_kick_strong",
    ];

    const keyMap: Record<string, string> = {
      P: "enemy_idle",
      K: "enemy_walk",
      V: "enemy_jump",
      L: "enemy_punch",
      O: "enemy_kick_light",
      I: "enemy_kick_strong",
      H: "enemy_guard_high",
      J: "enemy_guard_low",
      U: "enemy_hit_high",
      Y: "enemy_hit_low",
      W: "enemy_ko",
      B: "enemy_blow",
    };

    this.input.keyboard!.on("keydown", (evt: KeyboardEvent) => {
      const anim = keyMap[evt.key.toUpperCase()];
      if (!anim) return;

      this.enemy.play(anim, true);

      // ── sólo dentro del callback existe “anim” ──
      const isAtk = ATTACK_ANIMS.includes(anim);
      (this.enemy as any).isAttacking = isAtk;

      if (isAtk) {
        this.enemy.once(
          Phaser.Animations.Events.ANIMATION_COMPLETE,
          () => ((this.enemy as any).isAttacking = false)
        );
      }
    });
  }

  private drawHealthBar(
    bar: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    health: number,
    maxHealth: number
  ) {
    const width = 200;
    const height = 20;
    const pct = Phaser.Math.Clamp(health / maxHealth, 0, 1);

    const color = pct > 0.6 ? 0x00ff00 : pct > 0.3 ? 0xffff00 : 0xff0000;

    bar.clear();
    // fondo
    bar.fillStyle(0x000000);
    bar.fillRect(x - 2, y - 2, width + 4, height + 4);
    // barra color
    bar.fillStyle(color);
    bar.fillRect(x, y, pct * width, height);
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta);
    (this.enemy as Enemy).update(time, delta);
  }

  private createPlayerAnimations(): void {
    this.anims.create({
      key: "player_idle",
      frames: this.anims.generateFrameNumbers("player_idle", {
        start: 0,
        end: 1,
      }),
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: "player_guard_high",
      frames: this.anims.generateFrameNumbers("player_guard_high", {
        start: 0,
        end: 0,
      }),
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: "player_guard_low",
      frames: this.anims.generateFrameNumbers("player_guard_low", {
        start: 0,
        end: 0,
      }),
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: "player_locomotion",
      frames: this.anims.generateFrameNumbers("player_locomotion", {
        start: 0,
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "player_jump",
      frames: this.anims.generateFrameNumbers("player_jump", {
        start: 0,
        end: 2,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: "player_punch",
      frames: this.anims.generateFrameNumbers("player_punch", {
        start: 0,
        end: 1,
      }),
      frameRate: 8,
      repeat: 0,
    });
    console.log(
      "Player punch animation exists?",
      this.anims.exists("player_punch")
    );
    this.anims.create({
      key: "player_kick_light",
      frames: this.anims.generateFrameNumbers("player_kick_soft", {
        start: 0,
        end: 1,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: "player_kick_tight",
      frames: this.anims.generateFrameNumbers("player_kick_tight", {
        start: 0,
        end: 1,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: "player_damage",
      frames: this.anims.generateFrameNumbers("player_damage", {
        start: 0,
        end: 1,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: "player_ko",
      frames: this.anims.generateFrameNumbers("player_ko", {
        start: 0,
        end: 0,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: "player_down",
      frames: this.anims.generateFrameNumbers("player_down", {
        start: 0,
        end: 0,
      }),
      frameRate: 8,
      repeat: 0,
    });
  }
}
