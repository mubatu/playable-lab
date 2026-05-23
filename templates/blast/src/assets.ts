import background from './assets/background.png';
import endBackground from './assets/end-background.png';
import object1 from './assets/object-1.png';
import object2 from './assets/object-2.png';
import object3 from './assets/object-3.png';
import object4 from './assets/object-4.png';
import object5 from './assets/object-5.png';
import soundtrack from './assets/soundtrack.mp3';
import blast from './assets/blast.mp3';

export const imageSources = {
  background,
  endBackground,
  objects: [object1, object2, object3, object4, object5]
};

export const audioSources = {
  soundtrack,
  blast
};

export interface LoadedImages {
  background: HTMLImageElement;
  endBackground: HTMLImageElement;
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
  const [backgroundImage, endBackgroundImage, ...objectImages] = await Promise.all([
    loadImage(imageSources.background),
    loadImage(imageSources.endBackground),
    ...imageSources.objects.map(loadImage)
  ]);

  return {
    background: backgroundImage,
    endBackground: endBackgroundImage,
    objects: objectImages
  };
}
