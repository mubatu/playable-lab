import { audioSources } from '../assets';
import { GAME_CONFIG } from '../config';

type EffectName = 'catchTarget' | 'catchBomb';
const EFFECT_NAMES: EffectName[] = ['catchTarget', 'catchBomb'];

export class AudioManager {
  private readonly soundtrack = new Audio(audioSources.soundtrack);
  private readonly effects: Record<EffectName, HTMLAudioElement[]> = {
    catchTarget: this.createEffectPool(audioSources.catchTarget),
    catchBomb: this.createEffectPool(audioSources.catchBomb)
  };
  private effectCursor = 0;

  private unlocked = false;
  private mutedByPause = false;
  private networkVolume = 1;

  constructor() {
    this.soundtrack.loop = true;
    this.soundtrack.preload = 'auto';
    this.applyVolumes();
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.unlockEffects();
    this.playSoundtrack();
  }

  playEffect(name: EffectName): void {
    if (!this.unlocked || this.mutedByPause || this.networkVolume <= 0) return;

    const pool = this.effects[name];
    const effect = pool[this.effectCursor % pool.length];
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
    this.playSoundtrack();
  }

  stop(): void {
    this.soundtrack.pause();
    this.soundtrack.currentTime = 0;
  }

  setVolume(volume: number): void {
    this.networkVolume = Math.max(0, Math.min(1, volume));
    this.applyVolumes();
  }

  private playSoundtrack(): void {
    if (!this.unlocked || this.mutedByPause || this.networkVolume <= 0) return;
    this.soundtrack.play().catch(() => undefined);
  }

  private applyVolumes(): void {
    this.soundtrack.volume = GAME_CONFIG.audio.soundtrackVolume * this.networkVolume;

    for (const name of EFFECT_NAMES) {
      const pool = this.effects[name];

      for (const effect of pool) {
        effect.volume = GAME_CONFIG.audio.effectVolume * this.networkVolume;
      }
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
    for (const name of EFFECT_NAMES) {
      const pool = this.effects[name];

      for (const effect of pool) {
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
}
