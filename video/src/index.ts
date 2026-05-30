import { sdk } from '@smoud/playable-sdk';
import handSrc from './assets/hand.png';
import './styles.css';
import { EndScreen } from './ui/EndScreen';
import { VIDEO_SOURCE, VIDEO_STOPOVERS } from './videoData';

type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type NormalizedPoint = {
  centerX: number;
  centerY: number;
  width?: number;
};

type RuntimeStopover = {
  id: string;
  timeMs: number;
  inputArea: NormalizedRect;
  hand: NormalizedPoint;
};

const DEFAULT_HAND_WIDTH = 0.2;

class VideoPlayableApp {
  private readonly root: HTMLElement;
  private readonly shell: HTMLDivElement;
  private readonly video: HTMLVideoElement;
  private readonly hotspot: HTMLDivElement;
  private readonly hand: HTMLImageElement;
  private readonly endScreen: EndScreen;
  private readonly stopovers: RuntimeStopover[];
  private readonly completedStopovers = new Set<string>();
  private activeStopover: RuntimeStopover | null = null;
  private stopoverFrame = 0;
  private hasFinished = false;

  constructor(root: HTMLElement, options: { onReady: () => void; onFinish: () => void; onInstall: () => void }) {
    this.root = root;
    this.stopovers = [...VIDEO_STOPOVERS] as RuntimeStopover[];
    this.stopovers.sort((a, b) => a.timeMs - b.timeMs);

    this.root.textContent = '';
    this.shell = document.createElement('div');
    this.shell.className = 'video-app';

    this.video = document.createElement('video');
    this.video.className = 'video-app__media';
    this.video.src = VIDEO_SOURCE;
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.preload = 'auto';

    this.hotspot = document.createElement('div');
    this.hotspot.className = 'video-app__hotspot';

    this.hand = document.createElement('img');
    this.hand.className = 'video-app__hand';
    this.hand.alt = '';
    this.hand.draggable = false;
    this.hand.src = handSrc;

    this.endScreen = new EndScreen(this.shell, {
      onInstall: options.onInstall
    });

    this.shell.append(this.video, this.hotspot, this.hand);
    this.root.append(this.shell);

    this.video.addEventListener('loadeddata', options.onReady, { once: true });
    this.video.addEventListener('play', () => this.startStopoverClock());
    this.video.addEventListener('pause', () => this.stopStopoverClock());
    this.video.addEventListener('timeupdate', () => this.checkStopovers());
    this.video.addEventListener('ended', () => {
      if (this.hasFinished) return;
      this.hasFinished = true;
      this.endScreen.show();
      options.onFinish();
    });
    this.shell.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
    window.addEventListener('resize', () => this.renderActiveStopover());
  }

  boot(): void {
    void this.video.play().catch(() => {
      this.shell.addEventListener(
        'pointerdown',
        () => {
          if (!this.activeStopover && !this.hasFinished) void this.video.play();
        },
        { once: true }
      );
    });
  }

  resize(): void {
    this.renderActiveStopover();
  }

  pause(): void {
    this.video.pause();
  }

  resume(): void {
    if (!this.activeStopover && !this.hasFinished) void this.video.play();
  }

  setVolume(volume: number): void {
    this.video.volume = Math.max(0, Math.min(1, volume));
  }

  finish(): void {
    this.hasFinished = true;
    this.video.pause();
    this.endScreen.show();
  }

  private checkStopovers(): void {
    if (this.activeStopover || this.hasFinished) return;

    const currentMs = this.video.currentTime * 1000;
    const stopover = this.stopovers.find((item) => !this.completedStopovers.has(item.id) && currentMs >= item.timeMs);
    if (!stopover) return;

    this.activeStopover = stopover;
    this.video.pause();
    this.video.currentTime = stopover.timeMs / 1000;
    this.shell.classList.add('is-waiting');
    this.renderActiveStopover();
  }

  private startStopoverClock(): void {
    if (this.stopoverFrame) return;

    const tick = () => {
      this.stopoverFrame = 0;
      this.checkStopovers();

      if (!this.video.paused && !this.activeStopover && !this.hasFinished) {
        this.stopoverFrame = window.requestAnimationFrame(tick);
      }
    };

    this.stopoverFrame = window.requestAnimationFrame(tick);
  }

  private stopStopoverClock(): void {
    if (!this.stopoverFrame) return;
    window.cancelAnimationFrame(this.stopoverFrame);
    this.stopoverFrame = 0;
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.activeStopover) return;

    const layout = this.getVideoLayout();
    const x = (event.clientX - layout.x) / layout.width;
    const y = (event.clientY - layout.y) / layout.height;
    const area = this.activeStopover.inputArea;

    if (x < area.x || x > area.x + area.width || y < area.y || y > area.y + area.height) {
      return;
    }

    this.completedStopovers.add(this.activeStopover.id);
    this.activeStopover = null;
    this.shell.classList.remove('is-waiting');
    void this.video.play();
  }

  private renderActiveStopover(): void {
    if (!this.activeStopover) return;

    const layout = this.getVideoLayout();
    const area = this.activeStopover.inputArea;
    const hand = this.activeStopover.hand;

    this.hotspot.style.left = `${layout.x + area.x * layout.width}px`;
    this.hotspot.style.top = `${layout.y + area.y * layout.height}px`;
    this.hotspot.style.width = `${area.width * layout.width}px`;
    this.hotspot.style.height = `${area.height * layout.height}px`;
    this.hand.style.left = `${layout.x + hand.centerX * layout.width}px`;
    this.hand.style.top = `${layout.y + hand.centerY * layout.height}px`;
    const handSize = (hand.width || DEFAULT_HAND_WIDTH) * layout.width;
    this.hand.style.width = `${handSize}px`;
    this.hand.style.height = `${handSize}px`;
  }

  private getVideoLayout(): { x: number; y: number; width: number; height: number } {
    const shellRect = this.shell.getBoundingClientRect();
    const videoWidth = this.video.videoWidth || shellRect.width || 1;
    const videoHeight = this.video.videoHeight || shellRect.height || 1;
    const scale = Math.max(shellRect.width / videoWidth, shellRect.height / videoHeight);
    const width = videoWidth * scale;
    const height = videoHeight * scale;

    return {
      x: shellRect.left + (shellRect.width - width) / 2,
      y: shellRect.top + (shellRect.height - height) / 2,
      width,
      height
    };
  }
}

let app: VideoPlayableApp | null = null;

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

  app = new VideoPlayableApp(root, {
    onReady: () => sdk.start(),
    onFinish: () => sdk.finish(),
    onInstall: () => sdk.install()
  });

  app.resize();
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

sdk.on('resize', () => {
  app?.resize();
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
