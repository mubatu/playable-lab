import { LoadedImages } from '../assets';
import { GAME_CONFIG } from '../config';
import { findMatchingGroup, getGridMetrics, GridCell } from './grid';

interface HandPoint {
  x: number;
  y: number;
}

export class TutorialHand {
  private startTime = 0;
  private lastObjectTapTime = 0;
  private visibleSince: number | null = null;
  private fadeOutSince: number | null = null;
  private targetCell: GridCell | null = null;
  private targetPoint: HandPoint | null = null;

  reset(startTime: number): void {
    this.startTime = startTime;
    this.lastObjectTapTime = startTime;
    this.visibleSince = null;
    this.fadeOutSince = null;
    this.targetCell = null;
    this.targetPoint = null;
  }

  markObjectTap(time: number): void {
    this.lastObjectTapTime = time;

    if (this.targetPoint) {
      this.fadeOutSince = time;
      this.visibleSince = null;
      return;
    }

    this.targetCell = null;
  }

  render(context: CanvasRenderingContext2D, images: LoadedImages, cells: GridCell[], isBoardSettling: boolean): void {
    if (!GAME_CONFIG.tutorialHand.enabled) return;

    const handConfig = GAME_CONFIG.tutorialHand;
    const now = performance.now();

    if (this.fadeOutSince !== null && this.targetPoint) {
      const alpha = 1 - this.getTransitionProgress(now - this.fadeOutSince);

      if (alpha <= 0) {
        this.hide();
        return;
      }

      this.renderHand(context, images, this.targetPoint, now, alpha);
      return;
    }

    if (isBoardSettling || now - this.lastObjectTapTime < handConfig.idleDelayMs) {
      return;
    }

    if (!this.targetPoint) {
      const targetCell = this.getTargetCell(cells);

      if (!targetCell) return;

      this.visibleSince = now;
      this.startTime = now;
      this.targetPoint = this.getHandPoint(targetCell);
    }

    const fadeInAlpha = this.visibleSince === null ? 1 : this.getTransitionProgress(now - this.visibleSince);

    this.renderHand(context, images, this.targetPoint, now, fadeInAlpha);
  }

  private renderHand(
    context: CanvasRenderingContext2D,
    images: LoadedImages,
    point: HandPoint,
    now: number,
    transitionAlpha: number
  ): void {
    const handConfig = GAME_CONFIG.tutorialHand;
    const elapsedMs = now - this.startTime;
    const cycleDuration = Math.max(1, handConfig.cycleDurationMs);
    const cycleProgress = (elapsedMs % cycleDuration) / cycleDuration;
    const scale = 1 + (handConfig.pulseScale - 1) * Math.sin(cycleProgress * Math.PI);

    context.save();
    context.globalAlpha = handConfig.opacity * transitionAlpha;
    context.translate(point.x, point.y);
    context.scale(scale, scale);
    context.drawImage(
      images.hand,
      -handConfig.width / 2,
      -handConfig.height / 2,
      handConfig.width,
      handConfig.height
    );
    context.restore();
  }

  private getTargetCell(cells: GridCell[]): GridCell | null {
    if (this.targetCell && findMatchingGroup(cells, this.targetCell).length >= GAME_CONFIG.gameplay.minBlastGroupSize) {
      return this.targetCell;
    }

    this.targetCell = this.findMiddleGroupCell(cells);

    if (this.targetCell) {
      this.startTime = performance.now();
    }

    return this.targetCell;
  }

  private findMiddleGroupCell(cells: GridCell[]): GridCell | null {
    const visited = new Set<string>();
    const grid = getGridMetrics();
    const gridCenterX = grid.x + grid.width / 2;
    const gridCenterY = grid.y + grid.height / 2;
    let bestCell: GridCell | null = null;
    let bestDistanceSquared = Number.POSITIVE_INFINITY;

    for (const cell of cells) {
      const key = this.getCellKey(cell);

      if (visited.has(key)) continue;

      const group = findMatchingGroup(cells, cell);

      for (const groupCell of group) {
        visited.add(this.getCellKey(groupCell));
      }

      if (group.length < GAME_CONFIG.gameplay.minBlastGroupSize) continue;

      const center = this.getGroupCenter(group);
      const distanceSquared = (center.x - gridCenterX) ** 2 + (center.y - gridCenterY) ** 2;

      if (distanceSquared < bestDistanceSquared) {
        bestDistanceSquared = distanceSquared;
        bestCell = this.getCellClosestToPoint(group, gridCenterX, gridCenterY);
      }
    }

    return bestCell;
  }

  private getTransitionProgress(elapsedMs: number): number {
    const fadeDuration = Math.max(0, GAME_CONFIG.tutorialHand.fadeDurationMs);

    if (fadeDuration <= 0) return 1;

    return Math.max(0, Math.min(1, elapsedMs / fadeDuration));
  }

  private getHandPoint(cell: GridCell): HandPoint {
    return {
      x: cell.x + cell.width / 2 + GAME_CONFIG.tutorialHand.offsetX,
      y: cell.objectY + GAME_CONFIG.tutorialHand.offsetY
    };
  }

  private hide(): void {
    this.visibleSince = null;
    this.fadeOutSince = null;
    this.targetCell = null;
    this.targetPoint = null;
  }

  private getGroupCenter(group: GridCell[]): { x: number; y: number } {
    const total = group.reduce((sum, cell) => ({
      x: sum.x + cell.x + cell.width / 2,
      y: sum.y + cell.objectY
    }), { x: 0, y: 0 });

    return {
      x: total.x / group.length,
      y: total.y / group.length
    };
  }

  private getCellClosestToPoint(group: GridCell[], x: number, y: number): GridCell {
    return group.reduce((bestCell, cell) => {
      const bestDistanceSquared = (bestCell.x + bestCell.width / 2 - x) ** 2 + (bestCell.objectY - y) ** 2;
      const distanceSquared = (cell.x + cell.width / 2 - x) ** 2 + (cell.objectY - y) ** 2;

      return distanceSquared < bestDistanceSquared ? cell : bestCell;
    });
  }

  private getCellKey(cell: GridCell): string {
    return `${cell.row}:${cell.column}`;
  }
}
