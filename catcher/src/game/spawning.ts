import { GAME_CONFIG } from '../config';
import { FallingItem } from './entities';

let nextItemId = 1;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function getSpawnInterval(elapsedSeconds: number): number {
  const ramp = Math.min(1, elapsedSeconds / GAME_CONFIG.gameplay.spawnRampDurationSeconds);
  const intervalRange = GAME_CONFIG.gameplay.spawnIntervalMs - GAME_CONFIG.gameplay.minSpawnIntervalMs;

  return GAME_CONFIG.gameplay.spawnIntervalMs - intervalRange * ramp;
}

export function createFallingItem(elapsedSeconds: number, targetCount: number): FallingItem {
  const { stage, gameplay, fallingItem } = GAME_CONFIG;
  const kind = Math.random() < gameplay.trapChance ? 'trap' : 'target';
  const speedRamp = Math.min(1, elapsedSeconds / gameplay.spawnRampDurationSeconds) * fallingItem.speedRamp;
  const spawnRotation = degreesToRadians(fallingItem.spawnRotationAngle);
  const targetIndex = Math.floor(Math.random() * Math.max(1, targetCount));

  return {
    id: nextItemId++,
    kind,
    x: randomBetween(fallingItem.horizontalPadding, stage.width - fallingItem.horizontalPadding),
    y: fallingItem.spawnTopOffset,
    size: fallingItem.size,
    speed: randomBetween(fallingItem.minSpeed, fallingItem.maxSpeed) + speedRamp,
    rotation: randomBetween(-spawnRotation, spawnRotation),
    rotationSpeed: randomBetween(fallingItem.rotationSpeedMin, fallingItem.rotationSpeedMax),
    targetIndex
  };
}
