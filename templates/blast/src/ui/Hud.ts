import { imageSources } from '../assets';
import { GAME_CONFIG } from '../config';
import { getGridMetrics } from '../game/grid';
import { ViewportLayout } from '../game/sizing';

export class Hud {
  private readonly element: HTMLDivElement;
  private readonly timeElement: HTMLDivElement;
  private readonly targetIconElement: HTMLImageElement;
  private readonly targetCountElement: HTMLDivElement;
  private readonly instructionElement: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'blast-hud';

    this.timeElement = document.createElement('div');
    this.timeElement.className = 'blast-hud__time';

    const targetElement = document.createElement('div');
    targetElement.className = 'blast-hud__target';

    this.targetIconElement = document.createElement('img');
    this.targetIconElement.className = 'blast-hud__target-icon';
    this.targetIconElement.alt = '';
    this.targetIconElement.draggable = false;
    this.targetIconElement.src = this.getTargetImageSource();

    this.targetCountElement = document.createElement('div');
    this.targetCountElement.className = 'blast-hud__target-count';

    targetElement.append(this.targetIconElement, this.targetCountElement);
    this.element.append(this.timeElement, targetElement);

    this.instructionElement = document.createElement('div');
    this.instructionElement.className = 'blast-instruction';
    this.instructionElement.textContent = GAME_CONFIG.ui.instructionText;

    this.applyConfig();
    parent.append(this.element, this.instructionElement);
  }

  update(remainingSeconds: number, targetRemaining: number): void {
    const displayedTime = Math.max(0, Math.ceil(remainingSeconds));

    this.timeElement.textContent = this.formatTime(displayedTime);
    this.targetCountElement.textContent = `x${targetRemaining}`;
    this.timeElement.classList.toggle('blast-hud__time--warning', displayedTime <= GAME_CONFIG.ui.lowTimeWarningSeconds);
  }

  hide(): void {
    this.element.style.display = 'none';
    this.instructionElement.style.display = 'none';
  }

  show(): void {
    this.element.style.display = 'flex';
    this.instructionElement.style.display = 'block';
  }

  updateLayout(layout: ViewportLayout): void {
    const hudBottom = this.element.getBoundingClientRect().bottom;
    const grid = getGridMetrics();
    const gridTop = (layout.offsetY + grid.y * layout.scale) / layout.dpr;
    const instructionCenterY = (hudBottom + gridTop) / 2;

    this.instructionElement.style.setProperty('--instruction-center-y', `${instructionCenterY}px`);
  }

  private formatTime(totalSeconds: number): string {
    return String(totalSeconds);
  }

  private getTargetImageSource(): string {
    const targetIndex = Math.max(0, Math.min(imageSources.objects.length - 1, GAME_CONFIG.gameplay.targetObjectIndex));
    return imageSources.objects[targetIndex] ?? '';
  }

  private applyConfig(): void {
    const { hud, instruction } = GAME_CONFIG.ui;

    this.element.style.setProperty('--hud-top', `${hud.top}px`);
    this.element.style.setProperty('--hud-width-vw', `${hud.widthVw}vw`);
    this.element.style.setProperty('--hud-max-width', `${hud.maxWidth}px`);
    this.element.style.setProperty('--hud-height', `${hud.height}px`);
    this.element.style.setProperty('--hud-gap', `${hud.gap}px`);
    this.element.style.setProperty('--hud-font-size', `${hud.fontSize}px`);
    this.element.style.setProperty('--hud-text-color', hud.textColor);
    this.element.style.setProperty('--hud-warning-color', hud.warningColor);
    this.element.style.setProperty('--hud-panel-background', this.withOpacity(hud.panelColor, hud.panelOpacity));
    this.element.style.setProperty('--hud-panel-border-color', hud.panelBorderColor);
    this.element.style.setProperty('--hud-target-icon-size', `${hud.targetIconSize}px`);

    this.instructionElement.style.setProperty('--instruction-font-size', `${instruction.fontSize}px`);
    this.instructionElement.style.setProperty('--instruction-color', instruction.color);
    this.instructionElement.style.setProperty('--instruction-stroke-color', instruction.strokeColor);
    this.instructionElement.style.setProperty('--instruction-pulse-scale', String(instruction.pulseScale));
    this.instructionElement.style.setProperty('--instruction-pulse-duration', `${instruction.pulseDurationMs}ms`);
  }

  private withOpacity(hexColor: string, opacity: number): string {
    const normalized = hexColor.replace('#', '');
    const alpha = Math.max(0, Math.min(1, opacity));

    if (!/^[\da-f]{6}$/i.test(normalized)) {
      return hexColor;
    }

    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}
