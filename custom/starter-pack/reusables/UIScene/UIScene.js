// ui-scene.js
import { UIButton } from './UISceneElements/UIButton.js';
import { UIVirtualJoystick } from './UISceneElements/UIVirtualJoystick.js';
import { UIIntroOverlay } from './UISceneElements/UIIntroOverlay.js';
import { UIDeployBadge } from './UISceneElements/UIDeployBadge.js';
import { UIProgressBar } from './UISceneElements/UIProgressBar.js';
import { UIToggle } from './UISceneElements/UIToggle.js';
import { UIHorizontalCardRail } from './UISceneElements/UIHorizontalCardRail.js';
import { UIScoreDisplay } from './UISceneElements/UIScoreDisplay.js';

// Factory Map: Links config types to classes
const UI_ELEMENT_MAP = {
    'buttons': UIButton,
    'joysticks': UIVirtualJoystick,
    'introOverlays': UIIntroOverlay,
    'deployBadges': UIDeployBadge,
    'progressBars': UIProgressBar,
    'toggles': UIToggle,
    'cardRails': UIHorizontalCardRail,
    'scoreDisplays': UIScoreDisplay
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

    /**
     * @param {string} id - matches `config.id` on a built element
     * @returns {UISceneElement|null}
     */
    getByConfigId(id) {
        for (let i = 0; i < this.uiElements.length; i += 1) {
            const el = this.uiElements[i];
            if (el.config && el.config.id === id) {
                return el;
            }
        }
        return null;
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
