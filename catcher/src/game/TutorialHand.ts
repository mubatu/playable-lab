import { LoadedImages } from '../assets';
import { GAME_CONFIG } from '../config';
import { BasketState } from './entities';

export class TutorialHand {
  private startTime = 0;

  reset(startTime: number): void {
    this.startTime = startTime;
  }

  render(context: CanvasRenderingContext2D, images: LoadedImages, basket: BasketState): void {
    if (!GAME_CONFIG.basket.tutorialHand.enabled) return;

    const handConfig = GAME_CONFIG.basket.tutorialHand;
    const elapsedMs = performance.now() - this.startTime;
    const cycleProgress = (elapsedMs % handConfig.cycleDurationMs) / handConfig.cycleDurationMs;
    const wave = Math.sin(cycleProgress * Math.PI * 2);
    const bob = Math.sin(cycleProgress * Math.PI * 4) * handConfig.bobDistance;
    const x = basket.x + wave * handConfig.moveDistance;
    const y = basket.y + handConfig.offsetY + bob;

    context.save();
    context.globalAlpha = handConfig.opacity;
    context.translate(x, y);
    context.drawImage(
      images.hand,
      -handConfig.width / 2,
      -handConfig.height / 2,
      handConfig.width,
      handConfig.height
    );
    context.restore();
  }
}
