import { UISceneElement } from './UISceneElement.js';
import { DOMElementPool } from '../../game/word-wheel/DOMElementPool.js';
import { WordUnitFactory } from '../../game/word-wheel/WordUnitFactory.js';

export class UIWordLetterWheel extends UISceneElement {
    constructor(config, container) {
        super(config, container);

        this.letters = config.letters || [];
        this.onSelectionStart = config.onSelectionStart || (() => {});
        this.onSelectionChange = config.onSelectionChange || (() => {});
        this.onSelectionCommit = config.onSelectionCommit || (() => {});

        this.tileElements = [];
        this.pathSvg = null;
        this.pathLine = null;

        this.active = false;
        this.selectedIndices = [];
        this.selectedSet = new Set();

        this.tilePool = new DOMElementPool(
            () => WordUnitFactory.createLetterTile(this.onTilePointerDown.bind(this)),
            (tile) => {
                tile.classList.remove('is-selected');
                tile.dataset.index = '';
                tile.textContent = '';
                tile.style.transform = '';
                if (tile.parentNode) {
                    tile.parentNode.removeChild(tile);
                }
            }
        );

        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
    }

    build() {
        this.element = document.createElement('div');
        this.element.className = 'wow-letter-wheel';

        const ring = document.createElement('div');
        ring.className = 'wow-letter-wheel__ring';
        this.element.appendChild(ring);

        this.pathSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.pathSvg.setAttribute('class', 'wow-letter-wheel__path');
        this.pathLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        this.pathLine.setAttribute('class', 'wow-letter-wheel__polyline');
        this.pathSvg.appendChild(this.pathLine);
        this.element.appendChild(this.pathSvg);

        this.container.appendChild(this.element);
        this.activate();
        this.setLetters(this.letters);
    }

    activate() {
        super.activate();
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);
    }

    deactivate() {
        super.deactivate();
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('pointercancel', this.onPointerUp);
    }

    onTilePointerDown(event) {
        event.preventDefault();

        const index = Number(event.currentTarget.dataset.index);
        if (Number.isNaN(index)) {
            return;
        }

        this.startSelection(index);
    }

    setLetters(letters) {
        this.letters = letters.slice();
        this.releaseAllTiles();
        this.clearSelection();

        const count = this.letters.length;
        const radius = 118;

        for (let i = 0; i < count; i += 1) {
            const angle = ((Math.PI * 2) / count) * i - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const tile = this.tilePool.acquire();
            tile.dataset.index = String(i);
            tile.textContent = String(this.letters[i] || '').toUpperCase();
            tile.style.transform = `translate(${x}px, ${y}px)`;

            this.element.appendChild(tile);
            this.tileElements.push(tile);
        }
    }

    releaseAllTiles() {
        this.tileElements.forEach((tile) => {
            this.tilePool.release(tile);
        });
        this.tileElements = [];
    }

    startSelection(startIndex) {
        this.active = true;
        this.selectedIndices = [];
        this.selectedSet.clear();
        this.addIndex(startIndex);
        this.onSelectionStart(this.getSelectedLetters(), this.selectedIndices.slice());
    }

    onPointerMove(event) {
        if (!this.active) {
            return;
        }

        const hoveredTile = this.getTileFromPoint(event.clientX, event.clientY);

        if (!hoveredTile) {
            return;
        }

        const index = Number(hoveredTile.dataset.index);

        if (Number.isNaN(index)) {
            return;
        }

        this.addIndex(index);
    }

    onPointerUp() {
        if (!this.active) {
            return;
        }

        const letters = this.getSelectedLetters();
        this.active = false;
        this.onSelectionCommit(letters, this.selectedIndices.slice());
        this.clearSelection();
    }

    addIndex(index) {
        if (this.selectedSet.has(index)) {
            return;
        }

        this.selectedSet.add(index);
        this.selectedIndices.push(index);

        const tile = this.tileElements[index];
        if (tile) {
            tile.classList.add('is-selected');
        }

        this.updatePath();
        this.onSelectionChange(this.getSelectedLetters(), this.selectedIndices.slice());
    }

    getSelectedLetters() {
        return this.selectedIndices.map((index) => this.letters[index] || '');
    }

    getTileFromPoint(x, y) {
        const element = document.elementFromPoint(x, y);
        if (!element) {
            return null;
        }

        if (element.classList && element.classList.contains('wow-letter-wheel__tile')) {
            return element;
        }

        return element.closest ? element.closest('.wow-letter-wheel__tile') : null;
    }

    updatePath() {
        if (!this.pathSvg || !this.pathLine) {
            return;
        }

        const wheelRect = this.element.getBoundingClientRect();
        const points = this.selectedIndices
            .map((index) => this.getTileCenter(index))
            .filter(Boolean)
            .map((center) => `${(center.x - wheelRect.left).toFixed(2)},${(center.y - wheelRect.top).toFixed(2)}`)
            .join(' ');

        this.pathLine.setAttribute('points', points);
    }

    getTileCenter(index) {
        const tile = this.tileElements[index];
        if (!tile) {
            return null;
        }

        const rect = tile.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    getTileCenterNormalized(index) {
        const center = this.getTileCenter(index);
        if (!center) {
            return null;
        }

        return {
            space: 'screen',
            x: center.x / Math.max(window.innerWidth, 1),
            y: center.y / Math.max(window.innerHeight, 1)
        };
    }

    clearSelection() {
        this.selectedIndices = [];
        this.selectedSet.clear();

        this.tileElements.forEach((tile) => {
            tile.classList.remove('is-selected');
        });

        if (this.pathLine) {
            this.pathLine.setAttribute('points', '');
        }
    }

    destroy() {
        this.deactivate();
        this.releaseAllTiles();
        super.destroy();
    }
}
