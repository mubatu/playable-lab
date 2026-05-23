import { loadImages } from '../assets';
import { AudioManager } from '../audio/AudioManager';
import { Game } from '../game/Game';
import { GameState } from '../game/GameState';
import { PointerInput } from '../input/PointerInput';
import { EndScreen } from '../ui/EndScreen';
import { Hud } from '../ui/Hud';

interface BlastAppOptions {
  width: number;
  height: number;
  onReady: () => void;
  onFinish: () => void;
  onInstall: () => void;
}

export class BlastApp {
  private readonly root: HTMLElement;
  private readonly shell: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly hud: Hud;
  private readonly endScreen: EndScreen;
  private readonly audio = new AudioManager();
  private readonly options: BlastAppOptions;
  private game: Game | null = null;
  private input: PointerInput | null = null;
  private hasFinished = false;
  private hasAudioInteraction = false;

  constructor(root: HTMLElement, options: BlastAppOptions) {
    this.root = root;
    this.options = options;
    this.root.textContent = '';

    this.shell = document.createElement('div');
    this.shell.className = 'blast-app';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'blast-canvas';
    this.canvas.setAttribute('aria-label', 'Blast playable game');

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
      onBlast: () => this.audio.playBlast(),
      onEnd: this.handleGameEnd
    });

    this.input = new PointerInput({
      canvas: this.canvas,
      getLayout: () => this.game!.getLayout(),
      onTap: (point) => {
        this.handleFirstAudioInteraction();
        this.game?.handleTap(point.x, point.y);
      }
    });

    this.resize(this.options.width, this.options.height);
    this.game.markReady();
    this.retrySoundtrackStart();
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
    this.retrySoundtrackStart();
  }

  setVolume(volume: number): void {
    this.audio.setVolume(volume);
    this.retrySoundtrackStart();
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
    this.hud.update(state.remainingSeconds, state.targetRemaining);
  };

  private handleGameEnd = (_state: GameState): void => {
    if (this.hasFinished) return;
    this.hasFinished = true;
    this.hud.hide();
    this.endScreen.show();
    this.options.onFinish();
  };

  private handleFirstAudioInteraction = (): void => {
    if (!this.hasAudioInteraction) {
      this.hasAudioInteraction = true;
      this.audio.unlock();
    }

    this.retrySoundtrackStart();
  };

  private retrySoundtrackStart(): void {
    void this.audio.startSoundtrack().then(() => {
      if (this.hasAudioInteraction && this.audio.isSoundtrackPlaying()) {
        this.removeAudioUnlockListeners();
      }
    });
  }

  private addAudioUnlockListeners(): void {
    document.addEventListener('pointerdown', this.handleFirstAudioInteraction, { capture: true, passive: true });
    document.addEventListener('pointerup', this.handleFirstAudioInteraction, { capture: true, passive: true });
    document.addEventListener('touchstart', this.handleFirstAudioInteraction, { capture: true, passive: true });
    document.addEventListener('touchend', this.handleFirstAudioInteraction, { capture: true, passive: true });
    document.addEventListener('mousedown', this.handleFirstAudioInteraction, { capture: true, passive: true });
    document.addEventListener('mouseup', this.handleFirstAudioInteraction, { capture: true, passive: true });
    document.addEventListener('click', this.handleFirstAudioInteraction, { capture: true, passive: true });
    document.addEventListener('keydown', this.handleFirstAudioInteraction, { capture: true });
  }

  private removeAudioUnlockListeners(): void {
    document.removeEventListener('pointerdown', this.handleFirstAudioInteraction, { capture: true });
    document.removeEventListener('pointerup', this.handleFirstAudioInteraction, { capture: true });
    document.removeEventListener('touchstart', this.handleFirstAudioInteraction, { capture: true });
    document.removeEventListener('touchend', this.handleFirstAudioInteraction, { capture: true });
    document.removeEventListener('mousedown', this.handleFirstAudioInteraction, { capture: true });
    document.removeEventListener('mouseup', this.handleFirstAudioInteraction, { capture: true });
    document.removeEventListener('click', this.handleFirstAudioInteraction, { capture: true });
    document.removeEventListener('keydown', this.handleFirstAudioInteraction, { capture: true });
  }
}
