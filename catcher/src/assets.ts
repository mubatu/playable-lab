import background from './assets/background.png';
import endBackground from './assets/end-background.png';
import basket from './assets/basket.png';
import bomb from './assets/bomb.png';
import target1 from './assets/target-1.png';
import target2 from './assets/target-2.png';
import target3 from './assets/target-3.png';
import soundtrack from './assets/soundtrack.mp3';
import catchTarget from './assets/catch-target.mp3';
import catchBomb from './assets/catch-bomb.mp3';

export const imageSources = {
  background,
  endBackground,
  basket,
  bomb,
  targets: [target1, target2, target3]
};

export const audioSources = {
  soundtrack,
  catchTarget,
  catchBomb
};

export interface LoadedImages {
  background: HTMLImageElement;
  endBackground: HTMLImageElement;
  basket: HTMLImageElement;
  bomb: HTMLImageElement;
  targets: HTMLImageElement[];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image failed to load: ${src}`));
    image.src = src;
  });
}

export async function loadImages(): Promise<LoadedImages> {
  const [backgroundImage, endBackgroundImage, basketImage, bombImage, ...targetImages] = await Promise.all([
    loadImage(imageSources.background),
    loadImage(imageSources.endBackground),
    loadImage(imageSources.basket),
    loadImage(imageSources.bomb),
    ...imageSources.targets.map(loadImage)
  ]);

  return {
    background: backgroundImage,
    endBackground: endBackgroundImage,
    basket: basketImage,
    bomb: bombImage,
    targets: targetImages
  };
}
