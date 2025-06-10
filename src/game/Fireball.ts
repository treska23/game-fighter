import Phaser from 'phaser';
import { HitBox, type HitData } from './HitBox';

export default class Fireball extends Phaser.Physics.Arcade.Sprite {
  private hitbox: HitBox;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dir: number,
    hitGroup: Phaser.Physics.Arcade.Group
  ) {
    super(scene, x, y, 'player_specials', 2);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setVelocityX(dir * 200);
    this.setFlipX(dir < 0);
    this.anims.play('fireball_move', true);

    const hitData: HitData = {
      damage: 12,
      knockBack: new Phaser.Math.Vector2(dir * 60, 0),
      hitStun: 220,
      guardStun: 10,
      height: 'mid',
      owner: 'player',
      type: 'punch',
    };
    this.hitbox = new HitBox(scene, x, y, 24, 20, hitData);
    hitGroup.add(this.hitbox);
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    this.hitbox.setPosition(this.x, this.y);
    const width = this.scene.scale.width;
    if (this.x < -50 || this.x > width + 50) {
      this.destroy();
    }
  }

  destroy(fromScene?: boolean): void {
    super.destroy(fromScene);
    if (this.hitbox.active) this.hitbox.destroy();
  }
}
