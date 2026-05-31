import { UISceneElement } from './UISceneElement.js';

export class UIProgressBar extends UISceneElement {
    constructor(config, container) {
        super(config, container);
        this.value = config.initialValue || 0;
        this.max = config.max || 100;
        this.showText = config.showText !== false;
        this.textFormat = config.textFormat || ((value, max) => `${Math.round((value / max) * 100)}%`);
    }

    build() {
        this.element = document.createElement('div');
        this.element.id = this.config.id;

        Object.assign(this.element.style, {
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            ...this.config.styles
        });

        this.containerDiv = document.createElement('div');
        Object.assign(this.containerDiv.style, {
            flex: '1',
            height: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            position: 'relative',
            overflow: 'hidden'
        });

        this.fill = document.createElement('div');
        Object.assign(this.fill.style, {
            height: '100%',
            backgroundColor: '#2196F3',
            borderRadius: '10px',
            width: '0%',
            transition: 'width 0.3s ease'
        });

        if (this.showText) {
            this.text = document.createElement('div');
            Object.assign(this.text.style, {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                pointerEvents: 'none'
            });
            this.containerDiv.appendChild(this.text);
        }

        this.containerDiv.appendChild(this.fill);
        this.element.appendChild(this.containerDiv);

        this.activate();
        this.container.appendChild(this.element);

        this.updateUI();
    }

    setValue(newValue) {
        this.value = Math.max(0, Math.min(this.max, newValue));
        this.updateUI();
    }

    setMax(newMax) {
        this.max = Math.max(0, newMax);
        this.updateUI();
    }

    updateUI() {
        const percentage = (this.value / this.max) * 100;
        this.fill.style.width = `${percentage}%`;

        if (this.showText && this.text) {
            this.text.textContent = this.textFormat(this.value, this.max);
        }
    }
}
