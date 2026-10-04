import Phaser from 'phaser';
import { GAME } from '../../data/game';
import { TOWERS, type TowerKind } from '../../data/towers';
import {
  blockingTower,
  placeCost,
  placementError,
  snapToGrid,
  type PlacementError,
  type Sim,
} from '../../sim';
import { dashedCircle, dashedRect, hatchRect } from '../draw';
import { S, T, ZONES } from '../layout';
import { UNIT_ATLAS } from '../units';

export type PlacementRejection = PlacementError | 'credits';

export interface PlacementActions {
  place(kind: TowerKind, x: number, y: number): void;
  reject(reason: PlacementRejection): void;
  dragChanged(dragging: boolean): void;
}

/** HANDOFF.md "Placement drag": ghost floats 72 px above the finger on touch. */
const TOUCH_LIFT = 72;
/** Local grid brightened around the snap cell, 96 × 96 px. */
const LOCAL_GRID = 96;

/**
 * Drag-to-place, following docs/design/screens/in-run/Place-*.dc.html. Validity uses the
 * same pure `placementError` the sim enforces, so the preview never disagrees with the result.
 */
export class Placement {
  private kind: TowerKind | null = null;
  private x = 0;
  private y = 0;
  private overField = false;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly ghostBase: Phaser.GameObjects.Image;
  private readonly ghostTurret: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: Sim,
    private readonly actions: PlacementActions,
  ) {
    this.g = scene.add.graphics().setDepth(5);
    const ghost = (frame: string): Phaser.GameObjects.Image =>
      scene.add
        .image(0, 0, UNIT_ATLAS, frame)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(6)
        .setVisible(false);
    this.ghostBase = ghost('tower-pulse-laser-l1-base');
    this.ghostTurret = ghost('tower-pulse-laser-l1-turret');
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
    const err = placementError(this.sim.state, this.sim.path, this.sim.map, this.x, this.y);
    if (err) return err;
    if (this.sim.state.credits < placeCost(this.kind)) return 'credits';
    return null;
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!this.kind) return;
    const fingerY = pointer.worldY / S;
    // Dragging back onto the control row / build bar cancels ("DROP HERE TO CANCEL").
    this.overField = fingerY < ZONES.controlRowTop;
    const lift = pointer.wasTouch ? TOUCH_LIFT : 0;
    this.x = snapToGrid(pointer.worldX / S);
    this.y = snapToGrid(fingerY - lift);
    this.draw();
  }

  private draw(): void {
    const g = this.g;
    g.clear();
    if (!this.kind || !this.overField) {
      this.ghostBase.setVisible(false);
      this.ghostTurret.setVisible(false);
      return;
    }
    const err = this.error();
    const valid = err === null;
    const sx = this.x * S;
    const sy = this.y * S;
    const half = (GAME.towerFootprint / 2) * S;
    const r = TOWERS[this.kind].range * S;

    // Local grid around the snap cell, brightened in `line`.
    const lg = (LOCAL_GRID / 2) * S;
    const step = GAME.gridSize * S;
    g.lineStyle(1 * S, T.line, 1);
    for (let o = -lg; o <= lg; o += step) {
      g.lineBetween(sx + o, sy - lg, sx + o, sy + lg);
      g.lineBetween(sx - lg, sy + o, sx + lg, sy + o);
    }

    if (valid) {
      g.fillStyle(T.accent, 0.07);
      g.fillCircle(sx, sy, r);
      g.lineStyle(2 * S, T.accent, 1);
      g.strokeCircle(sx, sy, r);
      g.strokeRect(sx - half, sy - half, half * 2, half * 2);
    } else {
      g.lineStyle(2 * S, T.danger, 1);
      dashedCircle(g, sx, sy, r, 6 * S, 5 * S);
      g.lineStyle(3 * S, T.danger, 0.45);
      hatchRect(g, sx - half, sy - half, half * 2, half * 2, 8 * S);
      g.lineStyle(2 * S, T.danger, 1);
      dashedRect(g, sx - half, sy - half, half * 2, half * 2, 5 * S, 4 * S);
      if (err === 'overlap') {
        const t = blockingTower(this.sim.state, this.x, this.y);
        if (t) {
          const bh = 20 * S;
          dashedRect(g, t.x * S - bh, t.y * S - bh, bh * 2, bh * 2, 5 * S, 4 * S);
        }
      }
    }

    const alpha = valid ? 0.85 : 0.45;
    this.ghostBase.setVisible(true).setPosition(sx, sy).setAlpha(alpha);
    this.ghostTurret.setVisible(true).setPosition(sx, sy).setAlpha(alpha);
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
    this.g.clear();
    this.ghostBase.setVisible(false);
    this.ghostTurret.setVisible(false);
    this.actions.dragChanged(false);
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
  }
}
