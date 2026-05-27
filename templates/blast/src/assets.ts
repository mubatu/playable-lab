import soundtrack from './assets/soundtrack.mp3';
import blast from './assets/blast.mp3';
import hand from './assets/hand.png';

const imageContext = require.context('./assets', false, /\.png$/);

export const imageSources = {
  background: getRequiredImageSource('background.png'),
  endBackground: getImageSource('end-background.png') ?? getRequiredImageSource('background.png'),
  hand,
  objects: getSortedObjectSources()
};

export const audioSources = {
  soundtrack,
  blast
};

export interface LoadedImages {
  background: HTMLImageElement;
  endBackground: HTMLImageElement;
  hand: HTMLImageElement;
  objects: HTMLImageElement[];
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
  if (imageSources.objects.length === 0) {
    throw new Error('Blast template requires at least one object image matching src/assets/object-{index}.png');
  }

  const [backgroundImage, endBackgroundImage, handImage, ...objectImages] = await Promise.all([
    loadImage(imageSources.background),
    loadImage(imageSources.endBackground),
    loadImage(imageSources.hand),
    ...imageSources.objects.map(loadImage)
  ]);

  return {
    background: backgroundImage,
    endBackground: endBackgroundImage,
    hand: handImage,
    objects: objectImages
  };
}

function getSortedObjectSources(): string[] {
  return imageContext.keys()
    .filter((path) => /^\.\/object-\d+\.png$/.test(path))
    .sort((pathA, pathB) => getObjectIndex(pathA) - getObjectIndex(pathB))
    .map((path) => normalizeImageModule(imageContext(path)));
}

function getImageSource(fileName: string): string | null {
  const key = `./${fileName}`;

  if (!imageContext.keys().includes(key)) {
    return null;
  }

  return normalizeImageModule(imageContext(key));
}

function getRequiredImageSource(fileName: string): string {
  const source = getImageSource(fileName);

  if (!source) {
    throw new Error(`Blast template requires src/assets/${fileName}`);
  }

  return source;
}

function normalizeImageModule(module: string | { default: string }): string {
  return typeof module === 'string' ? module : module.default;
}

function getObjectIndex(path: string): number {
  const match = path.match(/object-(\d+)\.png$/);

  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}
