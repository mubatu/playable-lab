import { GAME_CONFIG } from '../config';

export class Hud {
  private readonly element: HTMLDivElement;
  private readonly timeElement: HTMLDivElement;
  private readonly progressBarElement: HTMLDivElement;
  private readonly progressFillElement: HTMLDivElement;
  private readonly progressTextElement: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'catcher-hud';

    this.timeElement = document.createElement('div');
    this.timeElement.className = 'catcher-hud__time';

    this.progressBarElement = document.createElement('div');
    this.progressBarElement.className = 'catcher-hud__progress';

    this.progressFillElement = document.createElement('div');
    this.progressFillElement.className = 'catcher-hud__progress-fill';

    this.progressTextElement = document.createElement('div');
    this.progressTextElement.className = 'catcher-hud__progress-text';

    this.progressBarElement.append(this.progressFillElement, this.progressTextElement);
    this.element.append(this.timeElement, this.progressBarElement);
    this.applyConfig();
    parent.append(this.element);
  }

  update(remainingSeconds: number, score: number, targetScore: number): void {
    const displayedTime = Math.max(0, Math.ceil(remainingSeconds));
    const progress = targetScore <= 0 ? 0 : Math.max(0, Math.min(1, score / targetScore));

    this.timeElement.textContent = this.formatTime(displayedTime);
    this.progressTextElement.textContent = `${score}/${targetScore}`;
    this.progressFillElement.style.width = `${progress * 100}%`;
    this.timeElement.classList.toggle('catcher-hud__time--warning', displayedTime <= GAME_CONFIG.ui.lowTimeWarningSeconds);
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  show(): void {
    this.element.style.display = 'flex';
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private applyConfig(): void {
    const { hud } = GAME_CONFIG.ui;

    this.element.style.setProperty('--hud-top', `${hud.top}px`);
    this.element.style.setProperty('--hud-width-vw', `${hud.widthVw}vw`);
    this.element.style.setProperty('--hud-max-width', `${hud.maxWidth}px`);
    this.element.style.setProperty('--hud-gap', `${hud.gap}px`);
    this.element.style.setProperty('--hud-time-font-size', `${hud.timeFontSize}px`);
    this.element.style.setProperty('--hud-time-color', hud.timeColor);
    this.element.style.setProperty('--hud-time-warning-color', hud.timeWarningColor);
    this.element.style.setProperty('--hud-progress-height', `${hud.progressHeight}px`);
    this.element.style.setProperty('--hud-progress-border-width', `${hud.progressBorderWidth}px`);
    this.element.style.setProperty('--hud-progress-border-color', hud.progressBorderColor);
    this.element.style.setProperty('--hud-progress-background-color', hud.progressBackgroundColor);
    this.element.style.setProperty('--hud-progress-fill-color', hud.progressFillColor);
    this.element.style.setProperty('--hud-progress-font-size', `${hud.progressFontSize}px`);
    this.element.style.setProperty('--hud-progress-text-color', hud.progressTextColor);
  }
}
