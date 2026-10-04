import Phaser from 'phaser';
import { GAME } from '../../data/game';
import { TOWER_ORDER, TOWERS } from '../../data/towers';
import { FixedStepDriver, Sim, type Command, type SimState } from '../../sim';
import { bossFor, waveType } from '../../sim/waves';
import { Alerts } from '../../ui/dom/Alerts';
import { SpecPicker } from '../../ui/dom/SpecPicker';
import { ArtifactPick } from '../../ui/dom/ArtifactPick';
import { SPEC_LEVEL } from '../../data/specs';
import { Controls } from '../../ui/dom/Controls';
import { HudBar } from '../../ui/dom/HudBar';
import { Overlay } from '../../ui/dom/overlay';
import { PlacementChip } from '../../ui/dom/PlacementChip';
import { RunEnd } from '../../ui/dom/RunEnd';
import { PauseMenu } from '../../ui/dom/PauseMenu';
import { metaFromProfile, unlockedMaps } from '../../meta/research';
import { runRewards } from '../../meta/rewards';
import { restoreSim, snapshotSim } from '../../sim/snapshot';
import { canDualSpec } from '../../sim/sim';
import { TowerPanel } from '../../ui/dom/TowerPanel';
import { Placement } from '../input/Placement';
import { S, T, ZONES } from '../layout';
import { DEV_UNLOCK_ALL_KEY, getPlatform, getStore, STRESS_KEY } from '../registry';
import { earnReward, rewardState } from '../rewards';
import { RevivePrompt } from '../../ui/dom/RevivePrompt';
import { MONETIZATION } from '../../data/shop';
import { FpsMeter, STRESS, stressSim } from '../stress';
import { buzz, playMusic, playSfx } from '../audio';
import { Feedback } from '../feedback';
import type { SfxId } from '../../data/audio';
import { DEFAULT_MAP_ID } from '../../data/maps';
import { Tutorial } from '../../ui/dom/Tutorial';
import { SettingsScreen } from '../../ui/dom/screens/Settings';
import { WorldView } from '../WorldView';

/** UI sounds for player commands (sim-driven sounds come from Feedback). */
const COMMAND_SFX: Partial<Record<Command['type'], SfxId>> = {
  placeTower: 'place',
  upgradeTower: 'upgrade',
  sellTower: 'sell',
  specialize: 'specialize',
  pickArtifact: 'artifact',
  rerollArtifacts: 'uiTap',
  callEarly: 'uiTap',
  setTargeting: 'uiTap',
};

/** Gap kept between the selected tower's range circle and the top of the tower panel. */
const PANEL_CLEARANCE = 8;
const CAMERA_PAN_MS = 220;

/**
 * One run. Owns the Sim. Phaser draws the battlefield; the in-run UI is a DOM overlay
 * (HUD, controls, tower panel, run end). Both only read sim state and send commands.
 */
export class GameScene extends Phaser.Scene {
  private sim!: Sim;
  private driver!: FixedStepDriver;
  private world!: WorldView;
  private placement!: Placement;
  private overlay!: Overlay;
  private hud!: HudBar;
  private controls!: Controls;
  private chip!: PlacementChip;
  private panel!: TowerPanel;
  private alerts!: Alerts;
  private runEnd: RunEnd | null = null;
  private picker: SpecPicker | null = null;
  private artPick: ArtifactPick | null = null;
  private pausedByArtPick = false;
  private revivePrompt: RevivePrompt | null = null;
  private takenOffer: SimState['offer'] = null;
  private pauseMenu: PauseMenu | null = null;
  private settings: SettingsScreen | null = null;
  private tutorial: Tutorial | null = null;
  private feedback!: Feedback;
  /** Settings → Performance test run: nothing saved or paid out. */
  private stress = false;
  private fps: FpsMeter | null = null;
  private lastStressCall = 0;
  private speeds: readonly number[] = [1, 2];
  /** Towers already offered the spec pick (LATER doesn't re-open it automatically). */
  private offered = new Set<number>();
  private pausedByPicker = false;
  private lastWave = 0;
  private speed = 1;
  private ended = false;
  private lastBaseHp = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(T.void).setScroll(0, 0);
    const store = getStore(this);
    // GDD §11: a run interrupted by closing the app resumes exactly where it was.
    this.stress = this.registry.get(STRESS_KEY) === true;
    this.registry.set(STRESS_KEY, false);
    const saved = this.stress ? null : store.run;
    if (this.stress) {
      this.sim = stressSim();
    } else if (saved) {
      this.sim = restoreSim(saved);
    } else {
      // Dev builds: `?unlock=all` makes every tower buildable for playtesting.
      const unlockAll = this.registry.get(DEV_UNLOCK_ALL_KEY) === true;
      const p = store.profile;
      this.sim = new Sim({
        seed: (Date.now() ^ (performance.now() * 1000)) >>> 0,
        mapId: unlockedMaps(p).includes(p.mapId) ? p.mapId : DEFAULT_MAP_ID,
        meta: metaFromProfile(p),
        ...(unlockAll ? { unlockedTowers: TOWER_ORDER } : {}),
      });
    }
    this.speeds = this.sim.state.meta.speed3x ? [1, 2, 3] : [1, 2];
    this.driver = new FixedStepDriver();
    this.speed = this.stress ? STRESS.speed : 1;
    this.ended = false;
    this.runEnd = null;
    this.pauseMenu = null;
    this.lastBaseHp = this.sim.state.baseHp;
    this.lastWave = this.sim.state.wave;
    this.picker = null;
    this.artPick = null;
    this.pausedByArtPick = false;
    // A resumed run doesn't re-offer picks the player already deferred.
    this.offered = new Set(
      this.sim.state.towers.items
        .filter((t) => t.alive && t.level >= SPEC_LEVEL && !t.spec)
        .map((t) => t.id),
    );
    this.pausedByPicker = false;

    this.world = new WorldView(this, this.sim);
    this.feedback = new Feedback(this, this.sim);
    playMusic(this, 'battle');
    this.placement = new Placement(this, this.sim, {
      place: (kind, x, y) => {
        this.send({ type: 'placeTower', kind, x, y });
        buzz(this, 'place');
      },
      reject: () => buzz(this, 'tap'),
      dragChanged: (dragging) => {
        this.world.setDragging(dragging);
        this.controls.setDragMode(dragging);
      },
      preview: (p) => {
        if (!p) {
          this.chip.hide();
          return;
        }
        const cam = this.cameras.main;
        this.chip.show({
          kind: p.kind,
          x: p.x - cam.scrollX / S,
          y: p.y - cam.scrollY / S,
          range: TOWERS[p.kind].range,
          error: p.error,
          blocker: p.blocker ? TOWERS[p.blocker.kind].name : '',
        });
      },
    });

    this.overlay = new Overlay(this.game);
    this.hud = new HudBar(this.overlay.root);
    this.alerts = new Alerts(this.overlay.root);
    this.controls = new Controls(this.overlay.root, this.sim.state.unlocked, this.speeds, {
      togglePause: () => this.openPause(),
      setSpeed: (n) => (this.speed = n),
      callEarly: () => this.send({ type: 'callEarly' }),
      dragStart: (kind, e) => {
        this.selectTower(-1);
        this.placement.begin(kind);
        this.dragMove(e);
      },
      dragMove: (e) => this.dragMove(e),
      dragEnd: (e) => {
        this.dragMove(e);
        this.placement.end();
      },
      denied: (on) => this.hud.setCreditsAlert(on),
    });
    this.chip = new PlacementChip(this.overlay.root);
    this.panel = new TowerPanel(
      this.overlay.root,
      this.sim,
      (cmd) => this.send(cmd),
      () => this.selectTower(-1),
      (id) => this.openPicker(id),
    );

    this.input.on('pointerdown', this.onFieldDown, this);
    // GDD §11: leaving the app pauses the run.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this);
      this.input.off('pointerdown', this.onFieldDown, this);
      this.runEnd?.destroy();
      this.picker?.destroy();
      this.artPick?.destroy();
      this.revivePrompt?.destroy();
      this.pauseMenu?.destroy();
      this.alerts.destroy();
      this.tutorial?.destroy();
      this.settings?.destroy();
      this.overlay.destroy();
    });
    this.fps = this.stress ? new FpsMeter(this.overlay.root) : null;
    this.tutorial =
      !saved && !this.stress && !store.profile.tutorialDone
        ? new Tutorial(this.overlay.root, this.sim, {
            setPaused: (paused) => this.send({ type: 'setPaused', paused }),
            finish: () => {
              this.tutorial = null;
              getStore(this).setTutorialDone(true);
              getPlatform(this).analytics.track({ name: 'tutorial', step: 'done' });
            },
          })
        : null;
    if (!this.stress) {
      getPlatform(this).analytics.track({
        name: 'run_start',
        map: this.sim.map.id,
        resumed: saved !== null,
      });
    }
    if (saved) this.openPause();
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.ended) {
      const ticks = this.driver.advance(deltaMs, this.speed);
      for (let i = 0; i < ticks; i++) this.sim.step();
    }

    const now = performance.now();
    const s = this.sim.state;
    this.world.selectedTowerId = this.panel.selectedId;
    this.world.sync();
    this.hud.update(s, now);
    this.controls.update(s, this.speed, now);
    this.panel.update();
    this.feedback.update();
    if (this.fps) this.updateStress();
    if (!this.ended) this.tutorial?.update();

    if (s.wave > this.lastWave) {
      this.lastWave = s.wave;
      this.announceWave(s.wave);
      this.autosave();
    }
    if (s.baseHp < this.lastBaseHp) {
      const b = this.sim.map.base;
      const cam = this.cameras.main;
      this.alerts.baseHit(this.lastBaseHp - s.baseHp, b.x - cam.scrollX / S, b.y - cam.scrollY / S);
    }
    this.lastBaseHp = s.baseHp;

    this.artPick?.update();
    if (!this.picker && !this.artPick && !this.pauseMenu && !this.ended) {
      if (s.offer && s.offer !== this.takenOffer) this.openArtifactPick();
      else this.offerSpecs();
    }
    if (s.gameOver && !this.ended && !this.revivePrompt) {
      // GDD §12: one revive per run (rewarded ad); the performance test never ends this way.
      if (!s.revived && !this.stress) this.openRevive();
      else this.endRun();
    }
  }

  /** The base fell: offer the once-per-run revive before ending the run. */
  private openRevive(): void {
    this.selectTower(-1);
    const s = this.sim.state;
    const close = (): void => {
      this.revivePrompt?.destroy();
      this.revivePrompt = null;
    };
    this.revivePrompt = new RevivePrompt(
      this.overlay.root,
      {
        wave: s.wave,
        reviveHp: Math.max(1, Math.ceil(s.maxBaseHp * MONETIZATION.reviveHpShare)),
        maxBaseHp: s.maxBaseHp,
      },
      {
        earn: () => earnReward(this, 'revive'),
        state: () => rewardState(this),
        revive: () => {
          this.send({ type: 'revive' });
          this.lastBaseHp = Math.ceil(s.maxBaseHp * MONETIZATION.reviveHpShare);
          close();
        },
        end: () => {
          close();
          this.endRun();
        },
      },
    );
  }

  /** Performance test: keep waves stacking, auto-take picks, report fps. */
  private updateStress(): void {
    const s = this.sim.state;
    if (s.offer) this.send({ type: 'pickArtifact', index: 0 });
    if (!s.paused && s.tick - this.lastStressCall >= STRESS.callEverySeconds * GAME.tickRate) {
      this.lastStressCall = s.tick;
      this.send({ type: 'callEarly' });
    }
    this.fps!.update(this.game.loop.actualFps, s.enemies.countAlive(), s.fx.countAlive());
  }

  /** GDD §7: a tower reaching level 5 offers its specialization pick once. */
  private offerSpecs(): void {
    for (const t of this.sim.state.towers.items) {
      if (t.alive && t.level >= SPEC_LEVEL && !t.spec && !this.offered.has(t.id)) {
        this.openPicker(t.id);
        return;
      }
    }
  }

  /** Spec pick screen; the run pauses while it's open (meta/README.md). */
  private openPicker(towerId: number): void {
    const t = this.sim.findTower(towerId);
    const dual = t !== null && canDualSpec(this.sim.state, t);
    if (!t || (t.spec && !dual) || this.picker) return;
    this.offered.add(towerId);
    if (!this.sim.state.paused) {
      this.send({ type: 'setPaused', paused: true });
      this.pausedByPicker = true;
    }
    const close = (): void => {
      this.picker?.destroy();
      this.picker = null;
      if (this.pausedByPicker) {
        this.send({ type: 'setPaused', paused: false });
        this.pausedByPicker = false;
      }
    };
    this.picker = new SpecPicker(
      this.overlay.root,
      t.kind,
      this.sim.state,
      {
        pick: (spec) => {
          this.send({ type: 'specialize', towerId, spec });
          getPlatform(this).analytics.track({
            name: 'spec_pick',
            tower: t.kind,
            spec,
            wave: this.sim.state.wave,
            second: dual,
          });
          buzz(this, 'place');
          close();
        },
        later: close,
      },
      dual ? t.spec : null,
    );
  }

  /** GDD §9: after a boss, pick 1 of 3 artifacts. The run pauses while the screen is open. */
  private openArtifactPick(): void {
    this.selectTower(-1);
    if (!this.sim.state.paused) {
      this.send({ type: 'setPaused', paused: true });
      this.pausedByArtPick = true;
    }
    this.artPick = new ArtifactPick(this.overlay.root, this.sim.state, {
      take: (index) => {
        const choice = this.sim.state.offer?.choices[index];
        if (choice) {
          getPlatform(this).analytics.track({
            name: 'artifact_pick',
            artifact: choice.id,
            tier: choice.tier,
            wave: this.sim.state.wave,
          });
        }
        this.send({ type: 'pickArtifact', index });
        buzz(this, 'place');
        this.artPick?.destroy();
        this.artPick = null;
        if (this.pausedByArtPick) {
          this.send({ type: 'setPaused', paused: false });
          this.pausedByArtPick = false;
        }
        // The sim clears the offer on its next tick; don't re-open it meanwhile.
        this.takenOffer = this.sim.state.offer;
      },
      adReroll: {
        earn: () => earnReward(this, 'extra_reroll'),
        state: () => rewardState(this),
        grant: () => this.send({ type: 'rerollArtifacts', ad: true }),
      },
      reroll: () => {
        this.send({ type: 'rerollArtifacts' });
        buzz(this, 'tap');
      },
    });
  }

  private announceWave(wave: number): void {
    const type = waveType(wave);
    playSfx(this, type === 'boss' ? 'bossWave' : 'waveStart');
    if (type === 'elite') this.alerts.elite(wave);
    else if (type === 'boss') {
      const boss = bossFor(wave);
      this.alerts.boss(wave, boss.kind, boss.also);
      buzz(this, 'boss');
    }
  }

  private send(cmd: Command): void {
    this.sim.enqueue(cmd);
    const sfx = COMMAND_SFX[cmd.type];
    if (sfx) playSfx(this, sfx);
  }

  /** DOM drag position → placement (logical screen px for the cancel zone, world px for the ghost). */
  private dragMove(e: PointerEvent): void {
    const p = this.overlay.toLogical(e.clientX, e.clientY);
    const cam = this.cameras.main;
    this.placement.move(
      p.y,
      p.x + cam.scrollX / S,
      p.y + cam.scrollY / S,
      e.pointerType === 'touch',
    );
  }

  /**
   * Opens the tower panel. If the sheet would cover the tower's range circle, the map scrolls
   * up just enough to keep it visible, and scrolls back on close (decided 2026-10-04).
   */
  private selectTower(id: number): void {
    let scrollTo = 0;
    if (id >= 0) {
      this.panel.show(id);
      const t = this.sim.findTower(id);
      if (t) {
        const sheetTop = GAME.worldHeight - this.panel.height;
        const circleBottom = t.y + t.stats.range + PANEL_CLEARANCE;
        scrollTo = Math.max(0, circleBottom - sheetTop);
      }
    } else {
      this.panel.hide();
    }
    const cam = this.cameras.main;
    this.tweens.killTweensOf(cam);
    this.tweens.add({
      targets: cam,
      scrollY: scrollTo * S,
      duration: CAMERA_PAN_MS,
      ease: 'Quad.Out',
    });
  }

  /** Tap on the battlefield: select the tower under the finger, or deselect. */
  private onFieldDown(pointer: Phaser.Input.Pointer): void {
    if (this.placement.active || this.ended) return;
    const screenY = pointer.y / S;
    if (screenY >= ZONES.controlRowTop && this.panel.selectedId < 0) return;
    const wx = pointer.worldX / S;
    const wy = pointer.worldY / S;
    // Hit the 32 × 32 footprint with a little slack for fingers.
    const reach = GAME.towerFootprint / 2 + 6;
    let best = -1;
    let bestSq = Infinity;
    for (const t of this.sim.state.towers.items) {
      if (!t.alive || Math.abs(t.x - wx) > reach || Math.abs(t.y - wy) > reach) continue;
      const dSq = (t.x - wx) ** 2 + (t.y - wy) ** 2;
      if (dSq < bestSq) {
        best = t.id;
        bestSq = dSq;
      }
    }
    if (best >= 0) buzz(this, 'tap');
    if (best !== this.panel.selectedId) this.selectTower(best);
  }

  /** Snapshot the run into the save (each wave, on pause, and when the app is backgrounded). */
  private autosave(): void {
    if (!this.ended && !this.stress) void getStore(this).saveRun(snapshotSim(this.sim));
  }

  /** GDD §11: leaving the app pauses the run and saves it, so a kill resumes exactly here. */
  private onHidden(): void {
    if (this.ended) return;
    if (!this.sim.state.paused) this.send({ type: 'setPaused', paused: true });
    this.autosave();
    if (!this.pauseMenu && !this.picker && !this.artPick) this.openPause();
  }

  /** Pause menu (Pause.dc.html): earned-so-far, Retreat (with confirm), Resume. */
  private openPause(): void {
    if (this.pauseMenu || this.ended) return;
    this.selectTower(-1);
    const wasPaused = this.sim.state.paused;
    if (!wasPaused) this.send({ type: 'setPaused', paused: true });
    const s = this.sim.state;
    const r = runRewards(getStore(this).profile, s.wave, s.stats.bossesKilled, this.sim.map.id);
    this.pauseMenu = new PauseMenu(
      this.overlay.root,
      {
        wave: s.wave,
        baseHp: s.baseHp,
        maxBaseHp: s.maxBaseHp,
        cores: r.cores,
        shards: r.shards,
        artifacts: s.artifacts,
      },
      {
        resume: () => {
          this.pauseMenu?.destroy();
          this.pauseMenu = null;
          this.send({ type: 'setPaused', paused: false });
        },
        retreat: () => {
          this.pauseMenu?.destroy();
          this.pauseMenu = null;
          this.endRun(true);
        },
        settings: () => {
          this.settings = new SettingsScreen(
            this.overlay.root,
            getStore(this),
            {
              back: () => {
                this.settings?.destroy();
                this.settings = null;
                playMusic(this, 'battle');
              },
            },
            true,
          );
        },
      },
    );
    this.autosave();
  }

  /** Base fell or the player retreated: pay out (GDD §4), clear the saved run, show run end. */
  private endRun(retreated = false): void {
    this.ended = true;
    this.selectTower(-1);
    buzz(this, 'runEnd');
    this.tutorial?.destroy();
    this.tutorial = null;
    const s = this.sim.state;
    const store = getStore(this);
    if (this.stress) {
      this.scene.start('Menu');
      return;
    }
    const mapId = this.sim.map.id;
    const previousBest = store.profile.bestByMap[mapId] ?? 0;
    const rewards = runRewards(store.profile, s.wave, s.stats.bossesKilled, mapId);
    store.finishRun(s.wave, rewards, mapId);
    getPlatform(this).analytics.track({
      name: 'run_end',
      map: mapId,
      wave: s.wave,
      seconds: Math.round(s.tick / GAME.tickRate),
      retreated,
      cores: rewards.cores,
    });
    playSfx(this, rewards.newBest ? 'newBest' : 'runEnd');
    this.runEnd = new RunEnd(
      this.overlay.root,
      {
        wave: s.wave,
        previousBest,
        cores: rewards.cores,
        shards: rewards.shards,
        milestoneShards: rewards.milestoneShards,
        retreated,
      },
      {
        menu: () => this.scene.start('Menu'),
        again: () => this.scene.restart(),
        double: {
          earn: () => earnReward(this, 'double_cores'),
          state: () => rewardState(this),
          grant: () => store.addCores(rewards.cores),
        },
      },
    );
  }
}
