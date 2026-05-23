import { audioSources } from '../assets';
import { GAME_CONFIG } from '../config';

export class AudioManager {
  private readonly soundtrack = new Audio(audioSources.soundtrack);
  private readonly blastEffects = this.createEffectPool(audioSources.blast);
  private effectCursor = 0;
  private unlocked = false;
  private effectsUnlocked = false;
  private mutedByPause = false;
  private networkVolume = 1;

  constructor() {
    this.soundtrack.loop = true;
    this.soundtrack.preload = 'auto';
    this.soundtrack.autoplay = true;
    this.applyVolumes();
  }

  unlock(): void {
    this.unlocked = true;
    this.unlockEffects();
    void this.startSoundtrack();
  }

  async startSoundtrack(): Promise<boolean> {
    if (this.mutedByPause || this.networkVolume <= 0) return false;

    try {
      await this.soundtrack.play();
      return true;
    } catch {
      return false;
    }
  }

  playBlast(): void {
    if (!this.unlocked || this.mutedByPause || this.networkVolume <= 0) return;

    const effect = this.blastEffects[this.effectCursor % this.blastEffects.length];
    this.effectCursor += 1;

    effect.pause();
    effect.currentTime = 0;
    effect.volume = GAME_CONFIG.audio.effectVolume * this.networkVolume;
    effect.play().catch(() => undefined);
  }

  pause(): void {
    this.mutedByPause = true;
    this.soundtrack.pause();
  }

  resume(): void {
    this.mutedByPause = false;
    void this.startSoundtrack();
  }

  stop(): void {
    this.soundtrack.pause();
    this.soundtrack.currentTime = 0;
  }

  setVolume(volume: number): void {
    this.networkVolume = Math.max(0, Math.min(1, volume));
    this.applyVolumes();
  }

  isSoundtrackPlaying(): boolean {
    return !this.soundtrack.paused && !this.soundtrack.ended;
  }

  private applyVolumes(): void {
    this.soundtrack.volume = GAME_CONFIG.audio.soundtrackVolume * this.networkVolume;

    for (const effect of this.blastEffects) {
      effect.volume = GAME_CONFIG.audio.effectVolume * this.networkVolume;
    }
  }

  private createEffectPool(src: string): HTMLAudioElement[] {
    return Array.from({ length: 4 }, () => {
      const effect = new Audio(src);
      effect.preload = 'auto';
      return effect;
    });
  }

  private unlockEffects(): void {
    if (this.effectsUnlocked) return;
    this.effectsUnlocked = true;

    for (const effect of this.blastEffects) {
      const wasMuted = effect.muted;
      effect.muted = true;
      effect.play()
        .then(() => {
          effect.pause();
          effect.currentTime = 0;
          effect.muted = wasMuted;
        })
        .catch(() => {
          effect.muted = wasMuted;
        });
    }
  }
}
