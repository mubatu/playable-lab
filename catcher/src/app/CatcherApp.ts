import { loadImages } from '../assets';
import { AudioManager } from '../audio/AudioManager';
import { Game } from '../game/Game';
import { GameState } from '../game/GameState';
import { PointerInput } from '../input/PointerInput';
import { EndScreen } from '../ui/EndScreen';
import { Hud } from '../ui/Hud';

interface CatcherAppOptions {
  width: number;
  height: number;
  onReady: () => void;
  onFinish: () => void;
  onInstall: () => void;
}

export class CatcherApp {
  private readonly root: HTMLElement;
  private readonly shell: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly hud: Hud;
  private readonly endScreen: EndScreen;
  private readonly audio = new AudioManager();
  private readonly options: CatcherAppOptions;
  private game: Game | null = null;
  private input: PointerInput | null = null;
  private hasFinished = false;
  private hasAudioInteraction = false;
  private hasStartedGame = false;

  constructor(root: HTMLElement, options: CatcherAppOptions) {
    this.root = root;
    this.options = options;
    this.root.textContent = '';

    this.shell = document.createElement('div');
    this.shell.className = 'catcher-app';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'catcher-canvas';
    this.canvas.setAttribute('aria-label', 'Catcher playable game');

    this.shell.append(this.canvas);
    this.root.append(this.shell);

    this.hud = new Hud(this.shell);
    this.endScreen = new EndScreen(this.shell, {
      onInstall: this.options.onInstall
    });

    this.addAudioUnlockListeners();
  }

  async boot(): Promise<void> {
    const images = await loadImages();

    this.game = new Game(this.canvas, images, {
      onHudChange: this.handleHudChange,
      onCatchTarget: () => this.audio.playEffect('catchTarget'),
      onCatchTrap: () => this.audio.playEffect('catchBomb'),
      onEnd: this.handleGameEnd
    });

    this.input = new PointerInput({
      canvas: this.canvas,
      getLayout: () => this.game!.getLayout(),
      onMove: (x) => this.game?.setBasketTarget(x),
      onFirstInteraction: this.handleFirstAudioInteraction
    });

    this.resize(this.options.width, this.options.height);
    this.game.markReady();
    this.startGame();
    this.options.onReady();
  }

  resize(width: number, height: number): void {
    this.game?.resize(width, height);
  }

  pause(): void {
    this.game?.pause();
    this.audio.pause();
  }

  resume(): void {
    this.game?.resume();
    this.audio.resume();
  }

  setVolume(volume: number): void {
    this.audio.setVolume(volume);
  }

  finish(): void {
    this.game?.finish();
  }

  destroy(): void {
    this.input?.destroy();
    this.removeAudioUnlockListeners();
    this.audio.stop();
    this.root.textContent = '';
  }

  private handleHudChange = (state: GameState): void => {
    this.hud.update(state.remainingSeconds, state.score, state.targetScore);
  };

  private handleGameEnd = (state: GameState): void => {
    if (this.hasFinished) return;
    this.hasFinished = true;
    // this.audio.stop();
    this.hud.hide();
    this.endScreen.show();
    this.options.onFinish();
  };

  private handleFirstAudioInteraction = (): void => {
    if (this.hasAudioInteraction) return;
    this.hasAudioInteraction = true;
    this.removeAudioUnlockListeners();
    this.audio.unlock();
    this.startGame();
  };

  private startGame(): void {
    if (!this.hasAudioInteraction || !this.game || this.hasStartedGame || this.hasFinished) return;
    this.hasStartedGame = true;
    this.game.start();
  }

  private addAudioUnlockListeners(): void {
    document.addEventListener('pointerdown', this.handleFirstAudioInteraction, { capture: true, passive: true });
    document.addEventListener('touchstart', this.handleFirstAudioInteraction, { capture: true, passive: true });
    document.addEventListener('mousedown', this.handleFirstAudioInteraction, { capture: true, passive: true });
    document.addEventListener('click', this.handleFirstAudioInteraction, { capture: true, passive: true });
    document.addEventListener('keydown', this.handleFirstAudioInteraction, { capture: true });
  }

  private removeAudioUnlockListeners(): void {
    document.removeEventListener('pointerdown', this.handleFirstAudioInteraction, { capture: true });
    document.removeEventListener('touchstart', this.handleFirstAudioInteraction, { capture: true });
    document.removeEventListener('mousedown', this.handleFirstAudioInteraction, { capture: true });
    document.removeEventListener('click', this.handleFirstAudioInteraction, { capture: true });
    document.removeEventListener('keydown', this.handleFirstAudioInteraction, { capture: true });
  }
}
