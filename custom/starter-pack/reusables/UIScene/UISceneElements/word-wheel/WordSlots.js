import { DOMElementPool } from './DOMElementPool.js';
import { WordUnitFactory } from './WordUnitFactory.js';

export class WordSlots {
    constructor(options) {
        this.container = options.container;
        this.root = null;
        this.slotElements = [];
        this.currentWord = '';

        this.slotPool = new DOMElementPool(
            () => WordUnitFactory.createWordSlot(),
            (slot) => {
                slot.textContent = '';
                slot.classList.remove('is-filled');
                if (slot.parentNode) {
                    slot.parentNode.removeChild(slot);
                }
            }
        );
    }

    build() {
        this.root = document.createElement('div');
        this.root.className = 'wow-word-slots';
        this.container.appendChild(this.root);
    }

    setWord(word) {
        this.currentWord = String(word || '').toUpperCase();
        this.slotElements.forEach((slot) => this.slotPool.release(slot));
        this.slotElements = [];

        for (let i = 0; i < this.currentWord.length; i += 1) {
            const slot = this.slotPool.acquire();
            this.root.appendChild(slot);
            this.slotElements.push(slot);
        }
    }

    setProgress(letters) {
        const chars = (letters || []).map((letter) => String(letter || '').toUpperCase());

        this.slotElements.forEach((slot, index) => {
            slot.textContent = chars[index] || '';
            slot.classList.toggle('is-filled', Boolean(chars[index]));
        });
    }

    flashWrong() {
        this.root.classList.remove('is-wrong');
        // Force reflow so animation replays on repeated wrong attempts.
        void this.root.offsetWidth;
        this.root.classList.add('is-wrong');
    }

    markSolved() {
        this.root.classList.add('is-solved');
        setTimeout(() => {
            this.root.classList.remove('is-solved');
        }, 320);
    }

    destroy() {
        this.slotElements.forEach((slot) => this.slotPool.release(slot));
        this.slotElements = [];

        if (this.root && this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
    }
}
