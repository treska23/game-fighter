import Phaser from "phaser";

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
  height: "high" | "mid" | "low";
  /** Quién lanzó el golpe (player | enemy) */
  owner: "player" | "enemy";
  /** Tipo de ataque: punch o kick (opcional) */
  type?: "punch" | "kick";
}



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
    body.setSize(w, h);
    body.setEnable(true);

    // guardamos los datos para acceder vía getData() si hace falta
    this.setData("hitData", hitData);
  }

  // ==== src/game/HitBox.ts ====

  applyTo(
    target: Phaser.Physics.Arcade.Sprite & {
      takeDamage: (dmg: number, stun?: number) => void;
      guardState?: "none" | "high" | "low";
      isCrouching?: boolean;
    }
  ) {
    const { damage, knockBack, hitStun, guardStun, height } = this.hitData;

    const crouching = !!(target as any).isCrouching;
    if (crouching && height !== "low") {
      this.destroy();
      return;
    }

    /* 1. ── ¿El objetivo está guardando? ─────────────────────────── */
    let blocked = false;
    if (target.guardState && target.guardState !== "none") {
      const highGuard = target.guardState === "high";
      const lowGuard = target.guardState === "low";

      blocked =
        (height === "low" && lowGuard) || // patada baja ↔ guardia baja
        (height !== "low" && highGuard); // todo lo demás ↔ guardia alta
    }

    /* 2. ── Respuesta si se BLOQUEA ──────────────────────────────── */
    if (blocked) {
      // - pequeño retroceso visual
      if (knockBack) target.setVelocityX(knockBack.x * 0.3);
      
      target.takeDamage(0, guardStun);

      this.destroy();
      return;
    }

    /* 3. ── Golpe entra con normalidad ───────────────────────────── */
    if (knockBack) {
      target.setVelocity(knockBack.x, knockBack.y);
    }

    const finalDamage = height === "high" ? Math.round(damage * 0.5) : damage;
    const extraStun = height === "high" ? 80 : 0;
    target.takeDamage(finalDamage, hitStun + extraStun);
    
    if ((target as any).health === 0) {
      target.setVelocity(0, 0);
    }

    this.destroy();
  }
}
