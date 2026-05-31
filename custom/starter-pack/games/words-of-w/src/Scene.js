import * as THREE from 'three';
import './css/style.css';
import './css/word-wheel.css';
import './components/HandTutorial.js';
import { Timer } from './components/Timer.js';
import { UIWordLetterWheel } from './UIScene/UISceneElements/UIWordLetterWheel.js';
import { WordSlots } from './game/word-wheel/WordSlots.js';

const HAND_ICON_SVG = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">',
    '<circle cx="64" cy="64" r="61" fill="#ffffff" fill-opacity="0.08"/>',
    '<path d="M51 106c-10-10-15-23-15-36 0-9 5-15 11-15 5 0 8 3 10 7V30c0-5 4-9 9-9s9 4 9 9v21h2V35c0-5 4-9 9-9s9 4 9 9v20h2V43c0-5 4-9 9-9s9 4 9 9v34c0 24-16 43-41 43H74c-9 0-17-5-23-14z" fill="#ffffff"/>',
    '</svg>'
].join('');

const HAND_ICON_URL = `data:image/svg+xml;utf8,${encodeURIComponent(HAND_ICON_SVG)}`;

const DEFAULT_LEVEL = {
    wheelLetters: ['R', 'A', 'T', 'E', 'L', 'S', 'N', 'O'],
    targetWords: ['STAR', 'STONE', 'LATE']
};

const WORD_DURATION_SECONDS = 30;

export class Scene {
    constructor(level = DEFAULT_LEVEL) {
        this.level = {
            wheelLetters: level.wheelLetters.slice(),
            targetWords: level.targetWords.map((word) => String(word || '').toUpperCase())
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.ringMesh = null;

        this.root = null;
        this.hud = null;
        this.statusEl = null;

        this.playOverlay = null;
        this.endOverlay = null;
        this.endTitleEl = null;

        this.letterWheel = null;
        this.wordSlots = null;

        this.wordIndex = 0;
        this.timer = null;
        this.gameStarted = false;
        this.gameEnded = false;
        this.hasInteractedOnCurrentWord = false;

        this.handTutorial = null;

        this.animate = this.animate.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onPlayClick = this.onPlayClick.bind(this);
        this.onDownloadClick = this.onDownloadClick.bind(this);
    }

    build() {
        this.buildRenderer();
        this.buildWorld();
        this.buildUI();
        this.bindOverlayButtons();

        window.addEventListener('resize', this.onResize);
        this.renderer.setAnimationLoop(this.animate);
    }

    buildRenderer() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 0, 8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
    }

    buildWorld() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xa3bfff, 1.1);
        keyLight.position.set(1.5, 1.5, 2.5);
        this.scene.add(keyLight);

        this.ringMesh = new THREE.Mesh(
            new THREE.TorusGeometry(2.4, 0.11, 28, 96),
            new THREE.MeshStandardMaterial({ color: 0x9db7f7, emissive: 0x1f305f, emissiveIntensity: 0.38 })
        );
        this.ringMesh.position.y = -0.4;
        this.scene.add(this.ringMesh);
    }

    buildUI() {
        this.root = document.createElement('div');
        this.root.id = 'wow-game-root';

        this.hud = document.createElement('div');
        this.hud.className = 'wow-hud';

        this.statusEl = document.createElement('div');
        this.statusEl.className = 'wow-status';

        this.wordSlots = new WordSlots({ container: this.hud });
        this.wordSlots.build();

        this.letterWheel = new UIWordLetterWheel({
            letters: this.level.wheelLetters,
            onSelectionStart: () => {
                this.stopTutorial();
                this.hasInteractedOnCurrentWord = true;
            },
            onSelectionChange: (letters) => {
                if (!this.gameStarted || this.gameEnded) {
                    return;
                }

                this.wordSlots.setProgress(letters);
            },
            onSelectionCommit: (letters) => {
                if (!this.gameStarted || this.gameEnded) {
                    return;
                }

                this.handleWordAttempt(letters.join('').toUpperCase());
            }
        }, this.hud);
        this.letterWheel.build();

        this.playOverlay = this.createOverlay({
            title: 'Words of W',
            subtitle: 'Drag across letters on the wheel to form each target word.',
            buttonText: 'PLAY NOW',
            buttonClass: 'wow-overlay__button wow-overlay__button--play',
            buttonId: 'play-now-btn',
            visible: true
        });

        this.endOverlay = this.createOverlay({
            title: 'Great!',
            subtitle: 'Challenge complete.',
            buttonText: 'DOWNLOAD',
            buttonClass: 'wow-overlay__button wow-overlay__button--download',
            buttonId: 'download-btn',
            visible: false
        });

        this.endTitleEl = this.endOverlay.querySelector('.wow-overlay__title');

        this.root.appendChild(this.hud);
        this.root.appendChild(this.playOverlay);
        this.root.appendChild(this.endOverlay);
        this.root.appendChild(this.statusEl);
        document.body.appendChild(this.root);

        this.updateStatus();
        this.prepareWordRound();
    }

    createOverlay(options) {
        const overlay = document.createElement('div');
        overlay.className = `wow-overlay${options.visible ? ' is-visible' : ''}`;

        const title = document.createElement('h2');
        title.className = 'wow-overlay__title';
        title.textContent = options.title;

        const subtitle = document.createElement('p');
        subtitle.className = 'wow-overlay__subtitle';
        subtitle.textContent = options.subtitle;

        const button = document.createElement('button');
        button.type = 'button';
        button.id = options.buttonId;
        button.className = options.buttonClass;
        button.textContent = options.buttonText;

        overlay.appendChild(title);
        overlay.appendChild(subtitle);
        overlay.appendChild(button);

        return overlay;
    }

    bindOverlayButtons() {
        const playButton = this.playOverlay.querySelector('#play-now-btn');
        const downloadButton = this.endOverlay.querySelector('#download-btn');

        if (playButton) {
            playButton.addEventListener('click', this.onPlayClick);
        }

        if (downloadButton) {
            downloadButton.addEventListener('click', this.onDownloadClick);
        }
    }

    onPlayClick(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();

            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
        }

        if (this.gameStarted) {
            return;
        }

        this.gameStarted = true;
        this.playOverlay.classList.remove('is-visible');

        this.startWordTimer();
        this.startTutorialForCurrentWord();
        this.updateStatus();
    }

    onDownloadClick() {
        window.open('https://www.google.com', '_blank');
    }

    prepareWordRound() {
        const targetWord = this.getCurrentTargetWord();
        this.wordSlots.setWord(targetWord);
        this.wordSlots.setProgress([]);
        this.hasInteractedOnCurrentWord = false;
    }

    getCurrentTargetWord() {
        return this.level.targetWords[this.wordIndex] || '';
    }

    handleWordAttempt(word) {
        const targetWord = this.getCurrentTargetWord();

        if (!word || word.length !== targetWord.length) {
            this.wordSlots.flashWrong();
            this.wordSlots.setProgress([]);
            return;
        }

        if (word !== targetWord) {
            this.wordSlots.flashWrong();
            this.wordSlots.setProgress([]);
            return;
        }

        this.wordSlots.markSolved();
        this.wordIndex += 1;

        if (this.wordIndex >= this.level.targetWords.length) {
            this.endGame(true);
            return;
        }

        this.prepareWordRound();
        this.resetWordTimer();
        this.startTutorialForCurrentWord();
        this.updateStatus();
    }

    updateStatus() {
        if (!this.statusEl) {
            return;
        }

        if (this.gameEnded) {
            this.statusEl.textContent = 'Round finished';
            return;
        }

        if (!this.gameStarted) {
            this.statusEl.textContent = 'Tap PLAY NOW to begin';
            return;
        }

        this.statusEl.textContent = `Word ${this.wordIndex + 1}/${this.level.targetWords.length}`;
    }

    startWordTimer() {
        this.destroyTimer();
        this.timer = new Timer(WORD_DURATION_SECONDS, 'circular', () => {
            this.endGame(false);
        });

        this.timer.element.style.top = '16px';
        this.timer.element.style.left = 'auto';
        this.timer.element.style.right = '16px';
        this.timer.element.style.transform = 'none';
        this.timer.element.style.zIndex = '40';
    }

    resetWordTimer() {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }

        this.startWordTimer();
    }

    destroyTimer() {
        if (!this.timer) {
            return;
        }

        this.timer.destroy();
        this.timer = null;
    }

    startTutorialForCurrentWord() {
        this.stopTutorial();

        const currentWord = this.getCurrentTargetWord();
        if (!currentWord || !window.HandTutorial) {
            return;
        }

        const firstIndex = this.level.wheelLetters.indexOf(currentWord[0]);
        const secondIndex = this.level.wheelLetters.indexOf(currentWord[1]);

        if (firstIndex < 0 || secondIndex < 0) {
            return;
        }

        const from = this.letterWheel.getTileCenterNormalized(firstIndex);
        const to = this.letterWheel.getTileCenterNormalized(secondIndex);

        if (!from || !to) {
            return;
        }

        this.handTutorial = new window.HandTutorial({
            container: document.body,
            renderer: this.renderer,
            camera: this.camera,
            assetUrl: HAND_ICON_URL,
            gesture: 'drag',
            from,
            to,
            duration: 1.0,
            loop: true,
            loopDelay: 0.2,
            size: 96,
            showTrail: true,
            followDirection: true,
            zIndex: 42
        });
        this.handTutorial.play();
    }

    stopTutorial() {
        if (!this.handTutorial) {
            return;
        }

        this.handTutorial.destroy();
        this.handTutorial = null;
    }

    endGame(isWin) {
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;
        this.gameStarted = false;
        this.stopTutorial();
        this.destroyTimer();

        this.endTitleEl.textContent = isWin ? 'You Win!' : 'You Lose!';
        this.endOverlay.classList.add('is-visible');
        this.updateStatus();
    }

    animate() {
        const delta = this.clock.getDelta();

        if (this.timer && this.gameStarted && !this.gameEnded) {
            this.timer.update(delta);
        }

        if (this.ringMesh) {
            this.ringMesh.rotation.z += delta * 0.35;
            this.ringMesh.rotation.x += delta * 0.15;
        }

        if (this.handTutorial && this.gameStarted && !this.gameEnded && !this.hasInteractedOnCurrentWord) {
            this.handTutorial.update(performance.now());
        }

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        if (!this.renderer || !this.camera) {
            return;
        }

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    destroy() {
        this.stopTutorial();
        this.destroyTimer();
        window.removeEventListener('resize', this.onResize);

        if (this.renderer) {
            this.renderer.setAnimationLoop(null);
            this.renderer.dispose();
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        if (this.letterWheel) {
            this.letterWheel.destroy();
            this.letterWheel = null;
        }

        if (this.wordSlots) {
            this.wordSlots.destroy();
            this.wordSlots = null;
        }

        if (this.root && this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
    }
}
