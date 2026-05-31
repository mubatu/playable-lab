import { UISceneElement } from './UISceneElement.js';

const STYLE_ID = 'rs-ui-deploy-badge-base';

function ensureBaseStyles() {
    if (document.getElementById(STYLE_ID)) {
        return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        .rs-ui-deploy-badge {
            position: fixed;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            pointer-events: none;
            z-index: 90;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #fff;
        }
        .rs-ui-deploy-badge__portrait {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            border: 3px solid rgba(255, 217, 110, 0.95);
            box-shadow: 0 4px 12px rgba(0,0,0,0.45);
        }
        .rs-ui-deploy-badge__count {
            background: rgba(7, 13, 26, 0.88);
            border-radius: 10px;
            padding: 2px 10px;
            font-weight: 700;
            font-size: 14px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Deploy / unit-stock badge (portrait + count). Pointer-events none by default.
 */
export class UIDeployBadge extends UISceneElement {
    build() {
        ensureBaseStyles();
        this.element = document.createElement('div');
        this.element.id = this.config.id || 'rs-deploy-badge';
        this.element.className = 'rs-ui-deploy-badge';

        if (this.config.styles?.wrapper) {
            Object.assign(this.element.style, this.config.styles.wrapper);
        }

        const portrait = document.createElement('div');
        portrait.className = 'rs-ui-deploy-badge__portrait';
        const bg = this.config.portraitBackground
            || 'radial-gradient(circle at 50% 35%, #ff8a3d 0%, #b65020 75%)';
        portrait.style.background = bg;

        const countWrap = document.createElement('div');
        countWrap.className = 'rs-ui-deploy-badge__count';
        this.countEl = document.createElement('span');
        this.countEl.className = 'rs-ui-deploy-badge__count-value';
        this.countEl.textContent = this.config.initialText ?? '0/0';
        countWrap.appendChild(this.countEl);

        this.element.appendChild(portrait);
        this.element.appendChild(countWrap);

        this.container.appendChild(this.element);
    }

    setCount(remaining, total) {
        if (this.countEl) {
            this.countEl.textContent = `${remaining}/${total}`;
        }
    }

    getCenter() {
        if (!this.element) {
            return null;
        }
        const rect = this.element.getBoundingClientRect();
        return {
            x: rect.left + rect.width * 0.5,
            y: rect.top + rect.height * 0.5
        };
    }
}
