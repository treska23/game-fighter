import Phaser from 'phaser';
import { Player } from '../game/Player';
import { HitBox } from '../game/HitBox';   // ⬅️ nuevo import
//import type { HitData } from '../game/HitBox';

type AttackGroup = Phaser.Physics.Arcade.Group;

type DamageableSprite = Phaser.Physics.Arcade.Sprite & {
  health: number;
  maxHealth: number;
  takeDamage: (amount: number) => void;
};

export default class FightScene extends Phaser.Scene {
  private player!: Player;              // ← tu clase Player             ★
  private enemy!: DamageableSprite;     // ← alias recién creado       

  private playerHits!: AttackGroup;

  // Gráficos para las barras
  private playerHealthBar!: Phaser.GameObjects.Graphics;
  private enemyHealthBar!: Phaser.GameObjects.Graphics;

  // Le decimos a TS que enemy tendrá también health, maxHealth y takeDamage()
  
  constructor() {
    super({ key: 'FightScene' });
  }

  preload(): void {
    // === JUGADOR (young) ===
    this.load.spritesheet('player',        '/assets/young/young.png',        { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_idle',        '/assets/young/young_idle.png',        { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_locomotion',  '/assets/young/young_locomotion.png',  { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_jump',        '/assets/young/young_jump.png',        { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_punch',       '/assets/young/young_punch.png',       { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_kick_soft',   '/assets/young/young_kick_soft.png',   { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_kick_tight',  '/assets/young/young_kick_tight.png',  { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_damage',      '/assets/young/young_damage.png',      { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_guard_low',     '/assets/young/young_guard_low.png',     { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_guard_high',     '/assets/young/young_guard_high.png',     { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_specials',    '/assets/young/young_specials.png',    { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_ko',    '/assets/young/young_ko.png',    { frameWidth: 64, frameHeight: 48 });
    this.load.spritesheet('player_down',    '/assets/young/young_down.png',    { frameWidth: 48, frameHeight: 48 });

    // === ENEMIGO (detective) ===
    this.load.spritesheet('detective_idle',         '/assets/detective/detective_idle.png',         { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_locomotion',   '/assets/detective/detective_locomotion.png',   { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_punch',        '/assets/detective/detective_punch.png',        { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_punch_right',  '/assets/detective/detective_punch_right.png',  { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_kicks_light',  '/assets/detective/detective_kicks_light.png',  { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_kicks_strong', '/assets/detective/detective_kicks_tight.png',  { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_damage',       '/assets/detective/detective_damage.png',       { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_defense',      '/assets/detective/detective_defense.png',      { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('detective_specials',     '/assets/detective/detective_specials.png',     { frameWidth: 48, frameHeight: 64 });

    // Opcionales: fondo y suelo sucio si los has colocado
    this.load.image('room_bg', '/assets/ground/room_background.png');
    this.load.image('ground',  '/assets/ground/dirty_floor.png');
  }

  create(): void {
   // 1️⃣  ―― FONDO y PLATAFORMAS ――――――――――――――――――――――――――――――――――――――
   this.add.image(400, 300, 'room_bg')
       .setDisplaySize(800, 600)
       .setScrollFactor(0);

   const platforms = this.physics.add.staticGroup();
   platforms.create(400, 568, 'ground')
            .setDisplaySize(800, 64)
            .refreshBody();

   // 2️⃣  ―― ANIMACIONES (jugador y enemigo) ―――――――――――――――――――――――――――
   this.createPlayerAnimations();
   this.createEnemyAnimations();

   // 3️⃣  ―― GRUPO DE HIT-BOXES (antes de crear al Player) ――――――――――――――
   this.playerHits = this.physics.add.group({
     classType: HitBox,
     allowGravity: false,
     runChildUpdate: false
   });

   // 4️⃣  ―― JUGADOR (usa tu clase Player) ――――――――――――――――――――――――――――
   this.player = new Player(this, 100, 515, 'player_idle', 0, this.playerHits);
   this.player.setCollideWorldBounds(true);
  (this.player.body as Phaser.Physics.Arcade.Body).setBounce(1, 0);
   this.physics.add.collider(this.player, platforms);

   // 5️⃣  ―― ENEMIGO “damageable” ――――――――――――――――――――――――――――――――――――
   this.enemy = this.physics.add
     .sprite(650, 500, 'detective_idle', 0)
     .setFlipX(true) as DamageableSprite;

   this.enemy.maxHealth = 100;
   this.enemy.health    = 100;
   this.enemy.takeDamage = (amount: number, stun = 180) => {
     this.enemy.health = Phaser.Math.Clamp(
       this.enemy.health - amount,
       0,
       this.enemy.maxHealth
     );

    this.enemy.play('enemy_hit_high', true);
     
    this.time.delayedCall(stun, () => {
      if (this.enemy.health > 0) {
      this.enemy.play('enemy_idle', true);
        }
    });

    if (this.enemy.health === 0) {
       this.enemy.play('enemy_ko', true);
     }
     this.enemy.emit('healthChanged', this.enemy.health);
   };

   this.physics.add.collider(this.enemy, platforms);

    const eBody = this.enemy.body as Phaser.Physics.Arcade.Body;
    eBody.setCollideWorldBounds(true)
         .setBounce(0.2, 0)   // rebote suave
         .setDrag(200, 0);    // lo frena poco a poco

  // 6️⃣  ―― SOLAPAMIENTO (golpes del jugador → enemigo) ―――――――――――――――――
   this.physics.add.overlap(
    this.playerHits,
    this.enemy,
    (hitObj, enemySprite) => {
      if (!(hitObj instanceof HitBox)) return;
      const hit = hitObj as HitBox;
    
      if ((hit as any).hasHit) return;
      (hit as any).hasHit = true;
      hit.destroy();
      console.log('[Overlap] aplicando golpe', hit.hitData.damage);
      // Aplicamos el golpe correctamente al sprite:
      hit.applyTo(enemySprite as DamageableSprite);
    },
    undefined,
    this
  );
  
   // 7️⃣  ―― BARRAS DE VIDA + LISTENERS ――――――――――――――――――――――――――――――
   this.playerHealthBar = this.add.graphics();
   this.enemyHealthBar  = this.add.graphics();
   this.drawHealthBar(this.playerHealthBar, 20, 20,  this.player.health);
   this.drawHealthBar(this.enemyHealthBar,  580, 20, this.enemy.health);

   // 7️⃣  ―― BARRAS DE VIDA + LISTENERS ――――――――――――――――――――――――――――――――
  this.player.on('healthChanged', (hp: number) => {          // ← tipo aquí
    this.drawHealthBar(this.playerHealthBar, 20, 20, hp);
  });

  this.enemy.on('healthChanged', (hp: number) => {           // ← …y aquí
    this.drawHealthBar(this.enemyHealthBar, 580, 20, hp);
  });

   // 8️⃣  ―― INPUT DE ANIMACIONES DEL ENEMIGO ――――――――――――――――――――――――
   const ATTACK_ANIMS = ['enemy_punch', 'enemy_kick_light', 'enemy_kick_strong'];

   this.input.keyboard?.on('keydown', (evt: KeyboardEvent) => {
     const map: Record<string, string> = {
       P: 'enemy_idle',
       K: 'enemy_walk',
       V: 'enemy_jump',
       L: 'enemy_punch',
       O: 'enemy_kick_light',
       I: 'enemy_kick_strong',
       H: 'enemy_guard_high',
       J: 'enemy_guard_low',
       U: 'enemy_hit_high',
       Y: 'enemy_hit_low',
       W: 'enemy_ko',
       B: 'enemy_special'
     };

     const anim = map[evt.key.toUpperCase()];
     if (!anim) return;

     this.enemy.play(anim, true);
     (this.enemy as any).isAttacking = ATTACK_ANIMS.includes(anim);

     this.enemy.once(
       Phaser.Animations.Events.ANIMATION_COMPLETE,
       () => ((this.enemy as any).isAttacking = false)
     );
    
     this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    
    this.enemy = this.physics.add
      .sprite(650, 500, 'detective_idle', 0)
      .setFlipX(true) as DamageableSprite;
      
   
   });
  }


  private drawHealthBar(bar: Phaser.GameObjects.Graphics, x: number, y: number, health: number) {
    const width = 200;
    const height = 20;
    const pct = Phaser.Math.Clamp(health / 100, 0, 1);

    bar.clear();
    // fondo
    bar.fillStyle(0x000000);
    bar.fillRect(x - 2, y - 2, width + 4, height + 4);
    // barra roja
    bar.fillStyle(0xff0000);
    bar.fillRect(x, y, pct * width, height);
  }

  update(): void {
    this.player.update();
  }

  private createPlayerAnimations(): void {
    
    this.anims.create({
      key: 'player_idle',
      frames: this.anims.generateFrameNumbers('player_idle', { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1
    });
    this.anims.create({
      key: 'player_guard_high',
      frames: this.anims.generateFrameNumbers('player_guard_high', { start: 0, end: 0 }),
      frameRate: 2,
      repeat: -1
    });
    this.anims.create({
      key: 'player_guard_low',
      frames: this.anims.generateFrameNumbers('player_guard_low', { start: 0, end: 0 }),
      frameRate: 2,
      repeat: -1
    });
    this.anims.create({
      key: 'player_locomotion',
      frames: this.anims.generateFrameNumbers('player_locomotion', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1
    });
    this.anims.create({
      key: 'player_jump',
      frames: this.anims.generateFrameNumbers('player_jump', { start: 0, end: 2 }),
      frameRate: 8,
      repeat: 0
    });
    this.anims.create({
      key: 'player_punch',
      frames: this.anims.generateFrameNumbers('player_punch', { start: 0, end: 1 }),
      frameRate: 8,
      repeat: 0
    });
    console.log("Player punch animation exists?", this.anims.exists('player_punch'));
    this.anims.create({
      key: 'player_kick_light',
      frames: this.anims.generateFrameNumbers('player_kick_soft', { start: 0, end: 1 }),
      frameRate: 8,
      repeat: 0
    });
    this.anims.create({
      key: 'player_kick_tight',
      frames: this.anims.generateFrameNumbers('player_kick_tight', { start: 0, end: 1 }),
      frameRate: 8,
      repeat: 0
    });
    this.anims.create({
      key: 'player_damage',
      frames: this.anims.generateFrameNumbers('player_damage', { start: 0, end: 1 }),
      frameRate: 8,
      repeat: 0
    });
    this.anims.create({
      key: 'player_ko',
      frames: this.anims.generateFrameNumbers('player_ko', { start: 0, end: 0 }),
      frameRate: 8,
      repeat: 0
    });
    this.anims.create({
      key: 'player_down',
      frames: this.anims.generateFrameNumbers('player_down', { start: 0, end: 0 }),
      frameRate: 8,
      repeat: 0
    });

    // FightScene.create()
    this.playerHits = this.physics.add.group({
      classType: HitBox,   // rectángulo invisible
      runChildUpdate: false,
      allowGravity: false
    });
  }

  // listener sencillo
  private onPlayerHitEnemy = () => {
    if ((this.enemy as any).isHit) return;               // evita multigolpes
    (this.enemy as any).isHit = true;
    this.enemy.play('enemy_hit_high', true);             // reacción
    this.time.delayedCall(300, () => (this.enemy as any).isHit = false);
  }
  
  private createEnemyAnimations(): void {
    this.anims.create({ key: 'enemy_idle',      frames: this.anims.generateFrameNumbers('detective_idle',       { start: 0, end: 0 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'enemy_walk',      frames: this.anims.generateFrameNumbers('detective_locomotion', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'enemy_punch',     frames: this.anims.generateFrameNumbers('detective_punch',      { start: 0, end: 1 }), frameRate: 10, repeat: 0 });
    this.anims.create({ key: 'enemy_kick_light',frames: this.anims.generateFrameNumbers('detective_kicks_light',{ start: 0, end: 2 }), frameRate: 10, repeat: 0 });
    this.anims.create({ key: 'enemy_kick_strong',frames:this.anims.generateFrameNumbers('detective_kicks_strong',{ start: 0, end: 2 }), frameRate:10, repeat:0 });
    this.anims.create({ key: 'enemy_guard_high',frames: this.anims.generateFrameNumbers('detective_defense',   { start: 0, end: 0 }), frameRate: 1, repeat: -1 });
    this.anims.create({ key: 'enemy_guard_low', frames: this.anims.generateFrameNumbers('detective_defense',   { start: 1, end: 1 }), frameRate: 1, repeat: -1 });
    this.anims.create({ key: 'enemy_hit_high',  frames: this.anims.generateFrameNumbers('detective_damage',    { start: 0, end: 0 }), frameRate: 1, repeat: 0 });
    this.anims.create({ key: 'enemy_hit_low',   frames: this.anims.generateFrameNumbers('detective_damage',    { start: 1, end: 1 }), frameRate: 1, repeat: 0 });
    this.anims.create({ key: 'enemy_launch',    frames: this.anims.generateFrameNumbers('detective_damage',    { start: 2, end: 2 }), frameRate: 1, repeat: 0 });
    this.anims.create({ key: 'enemy_ko',        frames: this.anims.generateFrameNumbers('detective_damage',    { start: 3, end: 3 }), frameRate: 1, repeat: 0 });
    this.anims.create({ key: 'enemy_get_up',    frames: this.anims.generateFrameNumbers('detective_damage',    { start: 4, end: 4 }), frameRate: 1, repeat: 0 });
    this.anims.create({ key: 'enemy_dizzy',     frames: this.anims.generateFrameNumbers('detective_damage',    { start: 5, end: 5 }), frameRate: 1, repeat: 0 });
    this.anims.create({ key: 'enemy_blow',      frames: this.anims.generateFrameNumbers('detective_specials',{ start: 0, end: 1 }), frameRate: 6, repeat: 0 });
    this.anims.create({ key: 'enemy_taunt',     frames: this.anims.generateFrameNumbers('detective_specials',{ start: 2, end: 3 }), frameRate: 6, repeat: 0 });
    this.anims.create({ key: 'enemy_victory',   frames: [{ key: 'detective_specials', frame: 4 }],              frameRate: 1, repeat: 0 });
    this.anims.create({ key: 'enemy_defeat',    frames: [{ key: 'detective_specials', frame: 5 }],              frameRate: 1, repeat: 0 });
  }

  
}