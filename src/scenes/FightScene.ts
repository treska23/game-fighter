import Phaser from 'phaser';
import { Player } from '../game/Player';
type AttackGroup = Phaser.Physics.Arcade.Group;

export default class FightScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemy!: Phaser.Physics.Arcade.Sprite;
  private playerHits!: AttackGroup;

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
    // Crea suelo si existe
    this.add.image(400, 300, 'room_bg')
        .setDisplaySize(800, 600)
        .setScrollFactor(0);
    const platforms = this.physics.add.staticGroup();
    const ground = platforms.create(400, 568, 'ground') as Phaser.Physics.Arcade.Sprite;
    ground.setDisplaySize(800, 64).refreshBody();
  
    // Animaciones jugador y enemigo...
    this.createPlayerAnimations();
    this.createEnemyAnimations();

    // Instancia el jugador con frame inicial 0
    this.player = new Player(this, 100, 515, 'player_idle', 0, this.playerHits);
    this.physics.add.collider(this.player, platforms);

    // Instancia el enemigo con frame inicial 0
    this.enemy = this.physics.add
      .sprite(650, 500, 'detective_idle', 0)
      .setImmovable(true)
      .setFlipX(true);
    this.physics.add.collider(this.enemy, platforms);
    const ATTACK_ANIMS = ['enemy_punch', 'enemy_kick_light', 'enemy_kick_strong'];
    
    // Input para animaciones de enemigo
     this.input.keyboard?.on('keydown', (evt: KeyboardEvent) => {
      const map: Record<string, string> = {
     
        P: 'enemy_idle',
        K: 'enemy_locomotion',
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

      // ——— flag isAttacking ———
      (this.enemy as any).isAttacking = ATTACK_ANIMS.includes(anim);

      // cuando termine la animación, desactiva el flag
      this.enemy.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        (this.enemy as any).isAttacking = false;
      });
    });
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
      classType: Phaser.GameObjects.Zone,   // rectángulo invisible
      runChildUpdate: false,
      allowGravity: false
    });

    // solapamiento hit-box ↔ enemigo
    this.physics.add.overlap(
      this.playerHits,
      this.enemy,
      this.onPlayerHitEnemy,
      undefined,
      this
    );

    
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