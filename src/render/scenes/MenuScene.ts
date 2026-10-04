import Phaser from 'phaser';
import { Overlay } from '../../ui/dom/overlay';
import { MainMenu } from '../../ui/dom/screens/MainMenu';
import { ResearchLab } from '../../ui/dom/screens/ResearchLab';
import { Codex } from '../../ui/dom/screens/Codex';
import { SettingsScreen } from '../../ui/dom/screens/Settings';
import { DEFAULT_MAP_ID } from '../../data/maps';
import type { SimSnapshot } from '../../sim/snapshot';
import { WelcomeBack } from '../../ui/dom/screens/WelcomeBack';
import { T } from '../layout';
import { getPlatform, getStore, STRESS_KEY } from '../registry';
import { Shop } from '../../ui/dom/screens/Shop';
import type { PurchaseResult } from '../../platform/iap';
import type { ProductId } from '../../data/shop';
import { playMusic } from '../audio';
import { earnReward, rewardState } from '../rewards';

interface Screen {
  destroy(): void;
}

/**
 * Between runs: welcome back (offline income), main menu and Research Lab, all DOM screens
 * over a plain background. PLAY starts or resumes the run in GameScene.
 */
export class MenuScene extends Phaser.Scene {
  private overlay!: Overlay;
  private screen: Screen | null = null;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(T.surface100);
    this.overlay = new Overlay(this.game);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.screen?.destroy();
      this.overlay.destroy();
    });
    const store = getStore(this);
    playMusic(this, 'menu');
    if (store.pendingOffline) this.showWelcomeBack();
    else this.showMain();
  }

  private show(screen: Screen): void {
    this.screen?.destroy();
    this.screen = screen;
  }

  private showWelcomeBack(): void {
    const store = getStore(this);
    const e = store.pendingOffline!;
    this.show(
      new WelcomeBack(this.overlay.root, e, {
        collect: (mult) => {
          store.collectOffline(mult);
          this.showMain();
        },
        earn: () => earnReward(this, 'double_offline'),
        rewardState: () => rewardState(this),
        research: () => {
          store.collectOffline();
          this.showLab();
        },
      }),
    );
  }

  private showMain(): void {
    const store = getStore(this);
    this.show(
      new MainMenu(this.overlay.root, store.profile, resumeInfo(store.run), {
        play: () => this.scene.start('Game'),
        research: () => this.showLab(),
        codex: () => this.show(new Codex(this.overlay.root, store, () => this.showMain())),
        settings: () => this.showSettings(),
        shop: () => this.showShop(),
        selectMap: (id) => {
          store.selectMap(id);
          this.showMain();
        },
      }),
    );
  }

  private showShop(): void {
    const store = getStore(this);
    const { iap, analytics } = getPlatform(this);
    this.show(
      new Shop(this.overlay.root, store, {
        back: () => this.showMain(),
        products: () => iap.products(),
        purchase: async (id) => {
          const result = await iap.purchase(id).catch((): PurchaseResult => 'failed');
          if (result === 'ok') store.grant(id);
          analytics.track({ name: 'purchase', product: id, result });
          return result;
        },
        restore: async () => {
          const ids = await iap.restore().catch((): ProductId[] => []);
          for (const id of ids) store.grant(id);
          return ids;
        },
      }),
    );
  }

  private showSettings(): void {
    this.show(
      new SettingsScreen(this.overlay.root, getStore(this), {
        back: () => {
          playMusic(this, 'menu');
          this.showMain();
        },
        stressTest: () => {
          this.registry.set(STRESS_KEY, true);
          this.scene.start('Game');
        },
        replayTutorial: () => {
          getStore(this).setTutorialDone(false);
          this.showMain();
        },
      }),
    );
  }

  private showLab(): void {
    this.show(new ResearchLab(this.overlay.root, getStore(this), () => this.showMain()));
  }
}

function resumeInfo(run: SimSnapshot | null): { wave: number; mapId: string } | null {
  return run ? { wave: run.state.wave, mapId: run.config.mapId ?? DEFAULT_MAP_ID } : null;
}
