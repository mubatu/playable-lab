// ui-scene.js
import { UIButton } from './UISceneElements/UIButton.js';
import { UIVirtualJoystick } from './UISceneElements/UIVirtualJoystick';

// Factory Map: Links config types to classes
const UI_ELEMENT_MAP = {
    'buttons': UIButton,
    'joysticks': UIVirtualJoystick
};

export class UIScene {
    constructor(settings) {
        this.settings = settings;
        this.uiElements = [];

        this.container = document.createElement('div');
        this.container.id = 'ui-layer';

        Object.assign(this.container.style, {
            position: 'absolute', top: '0', left: '0',
            width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: '5'
        });

        document.body.appendChild(this.container);
        this.buildUI();
    }

    buildUI() {

        this.uiElements = Object.entries(this.settings).flatMap(([categoryName, elementsArray]) => {
            const ElementClass = UI_ELEMENT_MAP[categoryName];

            if (!ElementClass) {
                console.warn(`UI Element category '${categoryName}' is not recognized in the factory map.`);
                return []; // Return an empty array so flatMap ignores it
            }

            // Map over the elements array to instantiate and build them
            return elementsArray.map(elementConfig => {
                const uiElement = new ElementClass(elementConfig, this.container);
                uiElement.build();
                return uiElement;
            });
        });
    }

    destroy() {
        // Delegate destruction to the individual objects
        this.uiElements.forEach(el => el.destroy());
        this.uiElements = [];
        this.container.remove();
    }
}