import Phaser from 'phaser';
import { GAME } from '../../data/game';
import { TOWERS, type TowerKind } from '../../data/towers';
import { placeCost, placementError, snapToGrid, type PlacementError, type Sim } from '../../sim';
import { COLORS, S } from '../layout';
import { ATLAS, FRAME } from '../textures';

export type PlacementRejection = PlacementError | 'credits';

export interface PlacementActions {
  place(kind: TowerKind, x: number, y: number): void;
  reject(reason: PlacementRejection): void;
  dragChanged(dragging: boolean): void;
}

/** Lift the ghost above the finger on touch so it stays visible. World units. */
const TOUCH_LIFT = 36;

/**
 * Drag-to-place: ghost tower snapped to the grid, range preview, red when invalid.
 * Validity uses the same pure `placementError` the sim enforces.
 */
export class Placement {
  private kind: TowerKind | null = null;
  private x = 0;
  private y = 0;
  private overField = false;
  private readonly ghost: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: Sim,
    private readonly actions: PlacementActions,
  ) {
    this.ring = scene.add.graphics().setDepth(5);
    this.ghost = scene.add
      .image(0, 0, ATLAS, FRAME.hex)
      .setScale(1.3)
      .setDepth(6)
      .setVisible(false);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  get active(): boolean {
    return this.kind !== null;
  }

  begin(kind: TowerKind, pointer: Phaser.Input.Pointer): void {
    this.kind = kind;
    this.actions.dragChanged(true);
    this.onMove(pointer);
  }

  private error(): PlacementRejection | null {
    if (!this.kind) return null;
    if (this.sim.state.credits < placeCost(this.kind)) return 'credits';
    return placementError(this.sim.state, this.sim.path, this.x, this.y);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!this.kind) return;
    const lift = pointer.wasTouch ? TOUCH_LIFT : 0;
    const wy = pointer.worldY / S - lift;
    this.overField = wy < GAME.playfieldBottom;
    this.x = snapToGrid(pointer.worldX / S);
    this.y = snapToGrid(wy);
    this.draw();
  }

  private draw(): void {
    const g = this.ring;
    g.clear();
    if (!this.kind || !this.overField) {
      this.ghost.setVisible(false);
      return;
    }
    const color = this.error() ? COLORS.invalid : COLORS.tower;
    const sx = this.x * S;
    const sy = this.y * S;
    const r = TOWERS[this.kind].range * S;
    g.fillStyle(color, 0.08);
    g.fillCircle(sx, sy, r);
    g.lineStyle(2, color, 0.7);
    g.strokeCircle(sx, sy, r);
    this.ghost.setVisible(true).setPosition(sx, sy).setTint(color).setAlpha(0.85);
  }

  private onUp(): void {
    const kind = this.kind;
    if (!kind) return;
    if (this.overField) {
      const err = this.error();
      if (err) this.actions.reject(err);
      else this.actions.place(kind, this.x, this.y);
    }
    this.kind = null;
    this.ring.clear();
    this.ghost.setVisible(false);
    this.actions.dragChanged(false);
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
  }
}
