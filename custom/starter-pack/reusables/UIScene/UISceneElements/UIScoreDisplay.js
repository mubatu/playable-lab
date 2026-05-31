import { UISceneElement } from './UISceneElement.js';

const STYLE_ID = 'rs-ui-score-display-base';

function ensureBaseStyles() {
    if (document.getElementById(STYLE_ID)) {
        return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        .rs-ui-score-popup {
            position: absolute;
            pointer-events: none;
            animation: rsScoreFloat 0.8s ease-out forwards;
        }

        @keyframes rsScoreFloat {
            0% {
                opacity: 1;
                transform: translate(-50%, 0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -60px) scale(1.3);
            }
        }
    `;
    document.head.appendChild(style);
}

export class UIScoreDisplay extends UISceneElement {
    constructor(config, container) {
        super(config, container);
        this.value = config.initialValue || 0;
        this.labelText = config.label || 'Score';
    }

    build() {
        ensureBaseStyles();

        this.element = document.createElement('div');
        this.element.id = this.config.id;

        Object.assign(this.element.style, {
            position: 'absolute',
            pointerEvents: 'none',
            textAlign: 'center',
            lineHeight: '1.2',
            ...this.config.styles
        });

        this.label = document.createElement('span');
        this.label.textContent = this.labelText;
        Object.assign(this.label.style, {
            display: 'block',
            ...this.config.labelStyles
        });

        this.valueEl = document.createElement('span');
        this.valueEl.textContent = String(this.value);
        Object.assign(this.valueEl.style, this.config.valueStyles || {});

        this.element.appendChild(this.label);
        this.element.appendChild(this.valueEl);
        this.container.appendChild(this.element);
    }

    setValue(value) {
        this.value = value;

        if (this.valueEl) {
            this.valueEl.textContent = String(value);
        }
    }

    showPopup(text, styles) {
        if (!this.element) {
            return;
        }

        const popup = document.createElement('div');
        const rect = this.element.getBoundingClientRect();

        popup.className = 'rs-ui-score-popup';
        popup.textContent = text;

        Object.assign(popup.style, {
            left: rect.left + rect.width / 2 + 'px',
            top: rect.bottom + 'px',
            color: '#FFEAA7',
            fontSize: '20px',
            fontWeight: '800',
            zIndex: '8',
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
            ...styles
        });

        document.body.appendChild(popup);

        window.setTimeout(function () {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 900);
    }
}
