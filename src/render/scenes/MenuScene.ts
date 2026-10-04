import Phaser from 'phaser';
import { Overlay } from '../../ui/dom/overlay';
import { MainMenu } from '../../ui/dom/screens/MainMenu';
import { ResearchLab } from '../../ui/dom/screens/ResearchLab';
import { Codex } from '../../ui/dom/screens/Codex';
import { WelcomeBack } from '../../ui/dom/screens/WelcomeBack';
import { T } from '../layout';
import { getStore } from '../registry';

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
        collect: () => {
          store.collectOffline();
          this.showMain();
        },
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
      new MainMenu(this.overlay.root, store.profile, store.run?.state.wave ?? null, {
        play: () => this.scene.start('Game'),
        research: () => this.showLab(),
        codex: () => this.show(new Codex(this.overlay.root, store, () => this.showMain())),
      }),
    );
  }

  private showLab(): void {
    this.show(new ResearchLab(this.overlay.root, getStore(this), () => this.showMain()));
  }
}
