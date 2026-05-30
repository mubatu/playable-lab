import { UISceneElement } from './UISceneElement.js';

const STYLE_ID = 'rs-ui-intro-overlay-base';

function ensureBaseStyles() {
    if (document.getElementById(STYLE_ID)) {
        return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        .rs-ui-intro-overlay {
            position: fixed;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 12px;
            text-align: center;
            background: rgba(4, 9, 20, 0.72);
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #fff;
            z-index: 100;
        }
        .rs-ui-intro-overlay.is-visible { display: flex; }
        .rs-ui-intro-overlay__title { margin: 0; font-size: 42px; }
        .rs-ui-intro-overlay__subtitle { margin: 0; max-width: 460px; line-height: 1.4; font-size: 15px; opacity: 0.92; }
        .rs-ui-intro-overlay__button {
            margin-top: 8px;
            border: none;
            border-radius: 999px;
            padding: 13px 28px;
            font-size: 17px;
            font-weight: 700;
            color: #fff;
            cursor: pointer;
            background: linear-gradient(180deg, #ff9a2f 0%, #ff4d2e 100%);
            box-shadow: 0 6px 18px rgba(255, 90, 30, 0.45);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Full-screen intro with title, subtitle, and primary CTA.
 * Reusable for playable ads / game starts.
 */
export class UIIntroOverlay extends UISceneElement {
    build() {
        ensureBaseStyles();
        this.element = document.createElement('div');
        this.element.id = this.config.id || 'rs-ui-intro';
        this.element.className = 'rs-ui-intro-overlay';
        if (this.config.visible !== false) {
            this.element.classList.add('is-visible');
        }

        if (this.config.styles?.overlay) {
            Object.assign(this.element.style, this.config.styles.overlay);
        }

        const title = document.createElement('h2');
        this.titleEl = title;
        title.className = 'rs-ui-intro-overlay__title';
        title.textContent = this.config.title || '';
        if (this.config.styles?.title) {
            Object.assign(title.style, this.config.styles.title);
        }

        const subtitle = document.createElement('p');
        this.subtitleEl = subtitle;
        subtitle.className = 'rs-ui-intro-overlay__subtitle';
        subtitle.textContent = this.config.subtitle || '';
        if (this.config.styles?.subtitle) {
            Object.assign(subtitle.style, this.config.styles.subtitle);
        }

        const button = document.createElement('button');
        this.buttonEl = button;
        button.type = 'button';
        button.id = this.config.buttonId || 'rs-intro-primary';
        button.className = 'rs-ui-intro-overlay__button';
        button.textContent = this.config.buttonText || 'PLAY NOW';
        if (this.config.styles?.button) {
            Object.assign(button.style, this.config.styles.button);
        }
        button.addEventListener('click', () => {
            if (typeof this.config.onPrimaryClick === 'function') {
                this.config.onPrimaryClick();
            }
        });

        this.element.appendChild(title);
        this.element.appendChild(subtitle);
        this.element.appendChild(button);

        this.activate();
        this.container.appendChild(this.element);
    }

    hide() {
        this.element?.classList.remove('is-visible');
    }

    show() {
        this.element?.classList.add('is-visible');
    }

    setTitle(title) {
        if (this.titleEl) {
            this.titleEl.textContent = title;
        }
    }

    setSubtitle(subtitle) {
        if (this.subtitleEl) {
            this.subtitleEl.textContent = subtitle;
        }
    }

    setButtonText(text) {
        if (this.buttonEl) {
            this.buttonEl.textContent = text;
        }
    }
}
