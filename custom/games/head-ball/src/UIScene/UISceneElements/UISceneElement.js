// ui-scene-element.js
export class UISceneElement {
    constructor(config, container) {
        this.config = config;
        this.container = container;
        this.element = null; // This will hold the actual DOM node
    }

    // Subclasses MUST implement this
    build() {
        throw new Error("Method 'build()' must be implemented by subclasses.");
    }

    // Enable interaction
    activate() {
        if (this.element) {
            this.element.style.pointerEvents = 'auto';
        }
    }

    // Disable interaction without hiding
    deactivate() {
        if (this.element) {
            this.element.style.pointerEvents = 'none';
        }
    }

    // Standard cleanup
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}