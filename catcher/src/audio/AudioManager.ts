import { audioSources } from '../assets';
import { GAME_CONFIG } from '../config';

type EffectName = 'catchTarget' | 'catchBomb';

export class AudioManager {
  private readonly soundtrack = new Audio(audioSources.soundtrack);
  private readonly effects: Record<EffectName, HTMLAudioElement> = {
    catchTarget: new Audio(audioSources.catchTarget),
    catchBomb: new Audio(audioSources.catchBomb)
  };

  private unlocked = false;
  private mutedByPause = false;
  private networkVolume = 1;

  constructor() {
    this.soundtrack.loop = true;
    this.soundtrack.preload = 'auto';
    this.effects.catchTarget.preload = 'auto';
    this.effects.catchBomb.preload = 'auto';
    this.applyVolumes();
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.playSoundtrack();
  }

  playEffect(name: EffectName): void {
    if (!this.unlocked || this.mutedByPause || this.networkVolume <= 0) return;

    const source = this.effects[name];
    const effect = source.cloneNode(true) as HTMLAudioElement;
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
    this.effects.catchTarget.volume = GAME_CONFIG.audio.effectVolume * this.networkVolume;
    this.effects.catchBomb.volume = GAME_CONFIG.audio.effectVolume * this.networkVolume;
  }
}
