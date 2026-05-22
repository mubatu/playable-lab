import { sdk } from '@smoud/playable-sdk';
import './styles.css';
import { CatcherApp } from './app/CatcherApp';

let app: CatcherApp | null = null;

function getOrCreateRoot(): HTMLElement {
  const existingRoot = document.getElementById('app');

  if (existingRoot) {
    return existingRoot;
  }

  const root = document.createElement('div');
  root.id = 'app';
  document.body.append(root);

  return root;
}

function mountApp(width: number, height: number): void {
  const root = getOrCreateRoot();

  app = new CatcherApp(root, {
    width,
    height,
    onReady: () => sdk.start(),
    onFinish: () => sdk.finish(),
    onInstall: () => sdk.install()
  });

  app.boot();
}

function mountWhenDocumentIsReady(width: number, height: number): void {
  if (document.body) {
    mountApp(width, height);
    return;
  }

  window.addEventListener(
    'DOMContentLoaded',
    () => {
      mountApp(width, height);
    },
    { once: true }
  );
}

sdk.init((width: number, height: number) => {
  mountWhenDocumentIsReady(width, height);
});

sdk.on('resize', (width: number, height: number) => {
  app?.resize(width, height);
});

sdk.on('pause', () => {
  app?.pause();
});

sdk.on('resume', () => {
  app?.resume();
});

sdk.on('volume', (volume: number) => {
  app?.setVolume(volume);
});

sdk.on('finish', () => {
  app?.finish();
});
