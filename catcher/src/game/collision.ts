import { GAME_CONFIG } from '../config';
import { BasketState, FallingItem, Rect } from './entities';

export function getBasketCollisionRect(basket: BasketState): Rect {
  const insetX = GAME_CONFIG.basket.collisionInsetX;
  const insetTop = GAME_CONFIG.basket.collisionInsetTop;
  const insetBottom = GAME_CONFIG.basket.collisionInsetBottom;

  return {
    x: basket.x - basket.width / 2 + insetX,
    y: basket.y - basket.height / 2 + insetTop,
    width: basket.width - insetX * 2,
    height: basket.height - insetTop - insetBottom
  };
}

export function getItemCollisionRect(item: FallingItem): Rect {
  const inset = item.size * 0.18;

  return {
    x: item.x - item.size / 2 + inset,
    y: item.y - item.size / 2 + inset,
    width: item.size - inset * 2,
    height: item.size - inset * 2
  };
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
