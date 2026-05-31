// ui-joystick.js
import { UISceneElement } from './UISceneElement.js';
import { MoveCommand } from '../../Command/MoveCommand';

export class UIVirtualJoystick extends UISceneElement {
    constructor(config, container) {
        super(config, container);
        this.command = new MoveCommand();
        this.active = false;

        // Max distance the thumbstick can move from center
        this.maxRadius = this.config.maxRadius || 50;

        // Bind methods to maintain 'this' context for event listeners
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
    }

    build() {
        // 1. Create Base
        this.element = document.createElement('div');
        this.element.id = this.config.id || 'virtual-joystick-base';

        Object.assign(this.element.style, {
            position: 'absolute',
            width: `${this.maxRadius * 2}px`,
            height: `${this.maxRadius * 2}px`,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            touchAction: 'none', // Prevents default browser scrolling
            ...this.config.styles
        });

        // 2. Create Thumbstick
        this.thumb = document.createElement('div');
        Object.assign(this.thumb.style, {
            position: 'absolute',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none' // Let events pass to the base
        });

        this.element.appendChild(this.thumb);
        this.activate();
        this.container.appendChild(this.element);

        // Expose the command via a callback or expose the instance directly
        if (this.config.onInit) {
            this.config.onInit(this.command);
        }
    }

    activate() {
        super.activate();
        this.element.addEventListener('pointerdown', this.onPointerDown);
        // Bind move and up to the window so we don't lose tracking if the finger slides off the base
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);
    }

    deactivate() {
        super.deactivate();
        this.element.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('pointercancel', this.onPointerUp);
        this.resetPosition();
    }

    destroy() {
        this.deactivate();
        super.destroy();
    }

    onPointerDown(event) {
        this.active = true;
        this.updateJoystick(event.clientX, event.clientY);
    }

    onPointerMove(event) {
        if (!this.active) return;
        this.updateJoystick(event.clientX, event.clientY);
    }

    onPointerUp() {
        this.active = false;
        this.resetPosition();
    }

    updateJoystick(clientX, clientY) {
        // Get the center coordinate of the joystick base on screen
        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate delta
        let dx = clientX - centerX;
        let dy = clientY - centerY;

        // Calculate distance from center
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Clamp to max radius
        if (distance > this.maxRadius) {
            const ratio = this.maxRadius / distance;
            dx *= ratio;
            dy *= ratio;
        }

        // Update UI (visually move the thumbstick)
        // Keep the translate(-50%, -50%) offset intact
        this.thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Normalize command values (-1.0 to 1.0)
        this.command.x = dx / this.maxRadius;
        this.command.y = dy / this.maxRadius;
    }

    resetPosition() {
        this.thumb.style.transform = 'translate(-50%, -50%)';
        this.command.x = 0;
        this.command.y = 0;
    }
}