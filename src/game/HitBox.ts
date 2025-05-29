import Phaser from 'phaser';

/** Toda la información que viajará con el golpe */
export interface HitData {
  /** Daño que resta a la vida */
  damage: number;
  /** Dirección / fuerza con la que empuja al objetivo */
  knockBack: Phaser.Math.Vector2;
  /** Frames (o ms) de hit-stun si impacta */
  hitStun: number;
  /** Frames (o ms) de guard-stun si es bloqueado */
  guardStun: number;
  /** Altura del golpe: high | mid | low */
  height: 'high' | 'mid' | 'low';
  /** Quién lanzó el golpe (player | enemy) */
  owner: 'player' | 'enemy';
}

type DamageableSprite = Phaser.Physics.Arcade.Sprite & {
  takeDamage(amount: number, stun?: number): void;
};

export class HitBox extends Phaser.GameObjects.Zone {
  public readonly hitData: HitData;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    hitData: HitData
  ) {
    super(scene, x, y, w, h);
    this.hitData = hitData;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setEnable(true);

    // guardamos los datos para acceder vía getData() si hace falta
    this.setData('hitData', hitData);
  }

  applyTo(target: DamageableSprite) {
    target.takeDamage(this.hitData.damage, this.hitData.hitStun);
    // knock-back en el sprite
    target.setVelocity(
      this.hitData.knockBack.x,
      this.hitData.knockBack.y
    );

    target.scene.time.delayedCall(this.hitData.hitStun, () => {
    (target.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
      if ((target as any).health > 0) (target as any).play('enemy_idle', true);
    });
  }
}
