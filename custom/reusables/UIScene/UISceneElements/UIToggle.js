import { UISceneElement } from './UISceneElement.js';

export class UIToggle extends UISceneElement {
    constructor(config, container) {
        super(config, container);
        this.isOn = config.initialState || false;
        this.onToggle = config.onToggle || (() => {});
        this.labels = config.labels || { on: 'ON', off: 'OFF' };
    }

    build() {
        this.element = document.createElement('div');
        this.element.id = this.config.id;

        Object.assign(this.element.style, {
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            ...this.config.styles
        });

        this.track = document.createElement('div');
        Object.assign(this.track.style, {
            width: '50px',
            height: '24px',
            backgroundColor: this.isOn ? '#4CAF50' : '#ccc',
            borderRadius: '12px',
            position: 'relative',
            transition: 'background-color 0.3s ease'
        });

        this.thumb = document.createElement('div');
        Object.assign(this.thumb.style, {
            width: '20px',
            height: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            position: 'absolute',
            top: '2px',
            left: this.isOn ? '28px' : '2px',
            transition: 'left 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        });

        this.label = document.createElement('span');
        this.label.textContent = this.isOn ? this.labels.on : this.labels.off;
        Object.assign(this.label.style, {
            marginLeft: '10px',
            color: '#ffffff',
            fontSize: '14px',
            transition: 'color 0.3s ease'
        });

        this.track.appendChild(this.thumb);
        this.element.appendChild(this.track);
        this.element.appendChild(this.label);

        this.activate();
        this.container.appendChild(this.element);

        this.element.addEventListener('click', () => this.toggle());
    }

    toggle() {
        this.isOn = !this.isOn;
        this.updateUI();
        this.onToggle(this.isOn);
    }

    setState(state) {
        this.isOn = state;
        this.updateUI();
    }

    updateUI() {
        this.track.style.backgroundColor = this.isOn ? '#4CAF50' : '#ccc';
        this.thumb.style.left = this.isOn ? '28px' : '2px';
        this.label.textContent = this.isOn ? this.labels.on : this.labels.off;
    }
}
