import { GAME_CONFIG } from '../config';

interface EndScreenOptions {
  onInstall: () => void;
}

export class EndScreen {
  private readonly element: HTMLDivElement;
  private readonly button: HTMLButtonElement;

  constructor(parent: HTMLElement, options: EndScreenOptions) {
    this.element = document.createElement('div');
    this.element.className = 'blast-end';

    this.button = document.createElement('button');
    this.button.className = 'blast-end__cta';
    this.button.type = 'button';
    this.button.addEventListener('click', options.onInstall);
    this.applyButtonConfig();

    this.element.append(this.button);
    parent.append(this.element);
  }

  show(): void {
    this.applyButtonConfig();
    this.element.classList.add('is-visible');
  }

  hide(): void {
    this.element.classList.remove('is-visible');
  }

  private applyButtonConfig(): void {
    const { endButton } = GAME_CONFIG.ui;

    this.button.textContent = endButton.text;
    this.button.style.width = `${endButton.width}px`;
    this.button.style.height = `${endButton.height}px`;
    this.button.style.fontSize = `${endButton.fontSize}px`;
    this.button.style.top = `${endButton.centerYPercent}%`;
    this.button.style.backgroundColor = endButton.backgroundColor;
    this.button.style.color = endButton.textColor;
    this.button.style.setProperty('--end-button-pulse-scale', String(endButton.pulseScale));
    this.button.style.setProperty('--end-button-pulse-duration', `${endButton.pulseDurationMs}ms`);
  }
}
