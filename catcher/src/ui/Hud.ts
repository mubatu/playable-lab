import { GAME_CONFIG } from '../config';

export class Hud {
  private readonly element: HTMLDivElement;
  private readonly timeElement: HTMLDivElement;
  private readonly progressElement: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'catcher-hud';

    this.timeElement = document.createElement('div');
    this.timeElement.className = 'catcher-hud__pill';

    this.progressElement = document.createElement('div');
    this.progressElement.className = 'catcher-hud__pill';

    this.element.append(this.timeElement, this.progressElement);
    parent.append(this.element);
  }

  update(remainingSeconds: number, score: number, targetScore: number): void {
    const displayedTime = Math.max(0, Math.ceil(remainingSeconds));
    this.timeElement.textContent = `${displayedTime}s`;
    this.progressElement.textContent = `${score}/${targetScore}`;
    this.timeElement.classList.toggle('catcher-hud__pill--warning', displayedTime <= GAME_CONFIG.ui.lowTimeWarningSeconds);
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  show(): void {
    this.element.style.display = 'flex';
  }
}
