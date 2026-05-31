// ui-settings.js

/** CoC-style intro + deploy badge; merge into `UIScene` settings (with empty `buttons` / `joysticks` if needed). */
export function getCocPlayableUIConfig(barbarianStock) {
    return {
        introOverlays: [
            {
                id: 'coc-intro',
                title: 'Clash of Clans',
                subtitle:
                    'Tap any tile on the outer edge of the base to deploy a Barbarian. Destroy the Town Hall before time runs out.',
                buttonId: 'coc-play-btn',
                buttonText: 'PLAY NOW',
                visible: true,
                onPrimaryClick: () => window.dispatchEvent(new CustomEvent('coc-play-clicked'))
            }
        ],
        deployBadges: [
            {
                id: 'coc-deploy-badge',
                initialText: `${barbarianStock}/${barbarianStock}`,
                portraitBackground: 'radial-gradient(circle at 50% 35%, #ff8a3d 0%, #b65020 75%)',
                styles: {
                    wrapper: {
                        bottom: '18px',
                        right: '18px',
                        zIndex: '90'
                    }
                }
            }
        ]
    };
}

/** Royale-style intro + elixir bar + bottom card hand. Merge into `UIScene` settings. */
export function getRoyalePlayableUIConfig(options = {}) {
    const {
        onPrimaryClick,
        onCardActivate,
        cardItems,
        elixirMax = 10,
        elixirInitial = 5
    } = options;

    return {
        introOverlays: [
            {
                id: 'royale-intro',
                title: 'Royale Arena',
                subtitle:
                    'Select a troop below, then tap your side of the arena to deploy. Spend elixir wisely and destroy the enemy King tower.',
                buttonId: 'royale-play-btn',
                buttonText: 'BATTLE',
                visible: true,
                onPrimaryClick:
                    typeof onPrimaryClick === 'function'
                        ? onPrimaryClick
                        : () => window.dispatchEvent(new CustomEvent('royale-play-clicked'))
            }
        ],
        progressBars: [
            {
                id: 'royale-elixir-bar',
                initialValue: elixirInitial,
                max: elixirMax,
                showText: true,
                textFormat: (v, max) => `Elixir ${v.toFixed(1)}/${max}`,
                styles: {
                    top: '56px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'min(88vw, 320px)',
                    zIndex: '70',
                    padding: '0 8px'
                }
            }
        ],
        cardRails: [
            {
                id: 'royale-hand',
                items: Array.isArray(cardItems) ? cardItems : [],
                selectedIndex: 0,
                onItemActivate:
                    typeof onCardActivate === 'function'
                        ? onCardActivate
                        : () => {},
                styles: {
                    rail: {
                        bottom: '6px'
                    }
                }
            }
        ]
    };
}

/**
 * Same building blocks as `getRoyalePlayableUIConfig`, but with distinct element ids
 * and copy tuned for the `clash-royal-gpt` playable (avoids collisions if multiple
 * royale-style demos are embedded on one page).
 */
export function getClashRoyalGptPlayableUIConfig(options = {}) {
    const {
        onPrimaryClick,
        onCardActivate,
        cardItems,
        elixirMax = 10,
        elixirInitial = 5
    } = options;

    return {
        introOverlays: [
            {
                id: 'crgpt-intro',
                title: 'Clash Royale',
                subtitle:
                    'Pick a card, then tap your side of the arena to deploy. Cross the river using the bridges, spend elixir wisely, and take the enemy King tower.',
                buttonId: 'crgpt-play-btn',
                buttonText: 'BATTLE',
                visible: true,
                onPrimaryClick:
                    typeof onPrimaryClick === 'function'
                        ? onPrimaryClick
                        : () => window.dispatchEvent(new CustomEvent('crgpt-play-clicked'))
            }
        ],
        progressBars: [
            {
                id: 'crgpt-elixir-bar',
                initialValue: elixirInitial,
                max: elixirMax,
                showText: true,
                textFormat: (v, max) => `Elixir ${v.toFixed(1)}/${max}`,
                styles: {
                    top: '56px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'min(88vw, 320px)',
                    zIndex: '70',
                    padding: '0 8px'
                }
            }
        ],
        cardRails: [
            {
                id: 'crgpt-hand',
                items: Array.isArray(cardItems) ? cardItems : [],
                selectedIndex: 0,
                onItemActivate:
                    typeof onCardActivate === 'function'
                        ? onCardActivate
                        : () => {},
                styles: {
                    rail: {
                        bottom: '6px'
                    }
                }
            }
        ]
    };
}

export const UISettings = {
    buttons: [
        {
            id: "download-btn",
            text: "PLAY NOW",
            styles: {
                // Positioning
                position: "absolute",
                bottom: "30px",
                left: "50%",
                transform: "translateX(-50%)",

                // Aesthetics
                padding: "15px 40px",
                fontSize: "24px",
                fontWeight: "bold",
                backgroundColor: "#ff5722",
                color: "#ffffff",
                border: "none",
                borderRadius: "30px",
                cursor: "pointer",
                boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",

                // Ensure it sits above the canvas
                zIndex: "10"
            },
            onClick: () => {
                window.dispatchEvent(new CustomEvent("play-now-clicked"));
            }
        }
    ],
    joysticks: [
        {
            id: "movement-joystick",
            maxRadius: 60,
            styles: {
                bottom: "50px",
                left: "50px",
                zIndex: "10"
            },
            // Capture the command reference when the joystick is built
            onInit: (commandInstance) => {
                window.playerMovementCommand = commandInstance;
                // Or store it in a dedicated GameManager/InputManager
            }
        }
    ],
    introOverlays: [],
    deployBadges: []
};