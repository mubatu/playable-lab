import { UISceneElement } from './UISceneElement.js';

const STYLE_ID = 'rs-ui-horizontal-card-rail-base';

function ensureBaseStyles() {
    if (document.getElementById(STYLE_ID)) {
        return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        .rs-ui-card-rail {
            position: absolute;
            left: 50%;
            bottom: 0;
            transform: translateX(-50%);
            display: flex;
            flex-direction: row;
            align-items: flex-end;
            justify-content: center;
            gap: 10px;
            padding: 12px 16px 18px;
            pointer-events: auto;
            z-index: 80;
            font-family: 'Segoe UI', Arial, sans-serif;
            box-sizing: border-box;
        }
        .rs-ui-card-rail__slot {
            position: relative;
            width: 72px;
            height: 88px;
            border-radius: 14px;
            border: 3px solid rgba(255, 255, 255, 0.35);
            background: linear-gradient(180deg, rgba(28, 36, 52, 0.92) 0%, rgba(12, 16, 28, 0.96) 100%);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            padding: 6px 4px 8px;
            transition: transform 0.12s ease, border-color 0.12s ease, opacity 0.15s ease;
            overflow: hidden;
        }
        .rs-ui-card-rail__slot::before {
            content: '';
            position: absolute;
            inset: 0;
            background: var(--slot-accent, rgba(120, 140, 180, 0.25));
            opacity: 0.55;
            pointer-events: none;
        }
        .rs-ui-card-rail__slot:hover:not(.is-disabled) {
            transform: translateY(-4px);
            border-color: rgba(255, 217, 110, 0.85);
        }
        .rs-ui-card-rail__slot.is-selected {
            border-color: #ffcf4a;
            box-shadow: 0 0 0 2px rgba(255, 207, 74, 0.45), 0 8px 20px rgba(0, 0, 0, 0.5);
        }
        .rs-ui-card-rail__slot.is-disabled {
            opacity: 0.42;
            cursor: not-allowed;
            transform: none;
        }
        .rs-ui-card-rail__title {
            position: relative;
            z-index: 1;
            font-size: 11px;
            font-weight: 700;
            color: #fff;
            text-align: center;
            line-height: 1.15;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .rs-ui-card-rail__cost {
            position: relative;
            z-index: 1;
            margin-top: 4px;
            min-width: 26px;
            padding: 2px 7px;
            border-radius: 999px;
            background: rgba(155, 89, 242, 0.95);
            color: #fff;
            font-size: 13px;
            font-weight: 800;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Bottom horizontal strip of selectable "cards" (icons + elixir-style cost).
 * Generic for deck UIs, RTS build palettes, or royale-style hands.
 */
export class UIHorizontalCardRail extends UISceneElement {
    build() {
        ensureBaseStyles();
        this.slots = [];
        this.selectedIndex = typeof this.config.selectedIndex === 'number' ? this.config.selectedIndex : 0;
        this.items = Array.isArray(this.config.items) ? this.config.items : [];

        this.element = document.createElement('div');
        this.element.id = this.config.id || 'rs-ui-card-rail';
        this.element.className = 'rs-ui-card-rail';

        if (this.config.styles?.rail) {
            Object.assign(this.element.style, this.config.styles.rail);
        }

        for (let i = 0; i < this.items.length; i += 1) {
            const item = this.items[i];
            const slot = document.createElement('button');
            slot.type = 'button';
            slot.className = 'rs-ui-card-rail__slot';
            slot.dataset.index = String(i);
            const accent = item.accentColor || item.accent || 'rgba(120, 140, 180, 0.35)';
            slot.style.setProperty('--slot-accent', accent);

            const title = document.createElement('div');
            title.className = 'rs-ui-card-rail__title';
            title.textContent = item.title || item.label || item.id || '';

            const cost = document.createElement('div');
            cost.className = 'rs-ui-card-rail__cost';
            cost.textContent = String(item.cost != null ? item.cost : '');

            slot.appendChild(title);
            slot.appendChild(cost);

            slot.addEventListener('click', () => this._onSlotClick(i));

            this.element.appendChild(slot);
            this.slots.push(slot);
        }

        this.activate();
        this.container.appendChild(this.element);
        this.syncSelection();
    }

    _onSlotClick(index) {
        const slot = this.slots[index];
        if (!slot || slot.classList.contains('is-disabled')) {
            return;
        }
        const item = this.items[index];
        if (!item) {
            return;
        }
        this.setSelectedIndex(index);
        if (typeof this.config.onItemActivate === 'function') {
            this.config.onItemActivate(index, item);
        }
    }

    setSelectedIndex(index) {
        if (index < 0 || index >= this.slots.length) {
            return;
        }
        this.selectedIndex = index;
        this.syncSelection();
    }

    syncSelection() {
        for (let i = 0; i < this.slots.length; i += 1) {
            this.slots[i].classList.toggle('is-selected', i === this.selectedIndex);
        }
    }

    /**
     * Grey out slots when elixir is too low. Use `item.locked` for permanent disable.
     * @param {number} availableElixir
     */
    applyElixirAvailability(availableElixir) {
        const elixir = typeof availableElixir === 'number' ? availableElixir : 0;
        for (let i = 0; i < this.items.length; i += 1) {
            const item = this.items[i];
            const cost = item.cost != null ? item.cost : 0;
            const dis = item.locked === true || cost > elixir;
            this.slots[i].classList.toggle('is-disabled', dis);
        }
    }

    setItemLocked(index, locked) {
        if (index < 0 || index >= this.items.length) {
            return;
        }
        this.items[index].locked = locked;
    }

    /**
     * Normalized screen position (0–1) for HandTutorial `space: 'screen'`.
     */
    getSlotScreenFraction(index) {
        const slot = this.slots[index];
        if (!slot) {
            return { x: 0.5, y: 0.85 };
        }
        const r = slot.getBoundingClientRect();
        const w = Math.max(window.innerWidth, 1);
        const h = Math.max(window.innerHeight, 1);
        return {
            x: (r.left + r.width * 0.5) / w,
            y: (r.top + r.height * 0.5) / h
        };
    }

    getSelectedItem() {
        return this.items[this.selectedIndex] || null;
    }
}
