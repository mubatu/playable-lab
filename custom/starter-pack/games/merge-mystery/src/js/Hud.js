import { UIScene } from '../../../../reusables/UIScene/UIScene.js';
import { findHighestTier } from './Pieces.js';
import { clearParticles } from './ParticleFX.js';

function getUiElement(uiScene, id) {
    return uiScene.getByConfigId(id);
}

export function refreshHud(state) {
    state.highestTier = findHighestTier(state);

    if (state.ui.progressBar) {
        state.ui.progressBar.setValue(state.highestTier);
    }
}

export function buildHud(state, onResetBoard) {
    var uiScene = new UIScene({
        progressBars: [
            {
                id: 'best-cake-progress',
                initialValue: state.config.pieces.initialTier || 1,
                max: state.maxTier,
                textFormat: function (value, max) {
                    return 'Best Cake ' + value + '/' + max;
                },
                styles: {
                    top: '24px',
                    left: '24px',
                    right: '160px'
                }
            }
        ],
        buttons: [
            {
                id: 'restart-button',
                text: 'Restart',
                styles: {
                    position: 'absolute',
                    top: '24px',
                    right: '24px',
                    padding: '11px 18px',
                    border: 'none',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, #ffe18f 0%, #ffad6d 100%)',
                    color: '#163647',
                    fontSize: '14px',
                    fontWeight: '700',
                    boxShadow: '0 10px 18px rgba(22, 54, 71, 0.18)'
                },
                onClick: function () {
                    onResetBoard();
                }
            }
        ],
        toggles: [
            {
                id: 'fx-toggle',
                initialState: true,
                labels: {
                    on: 'FX On',
                    off: 'FX Off'
                },
                styles: {
                    top: '78px',
                    right: '24px'
                },
                onToggle: function (isOn) {
                    state.fxEnabled = isOn;

                    if (!isOn) {
                        clearParticles(state);
                    }
                }
            }
        ]
    });
    var progressBar = getUiElement(uiScene, 'best-cake-progress');
    var toggle = getUiElement(uiScene, 'fx-toggle');

    if (progressBar) {
        progressBar.containerDiv.style.height = '18px';
        progressBar.containerDiv.style.borderRadius = '999px';
        progressBar.containerDiv.style.backgroundColor = 'rgba(22, 54, 71, 0.22)';
        progressBar.fill.style.background = 'linear-gradient(90deg, #ffe18f 0%, #ff9f67 100%)';
        progressBar.text.style.fontSize = '13px';
        progressBar.text.style.fontWeight = '700';
        progressBar.text.style.letterSpacing = '0.02em';
    }

    if (toggle) {
        toggle.label.style.fontWeight = '700';
        toggle.label.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.24)';
        toggle.track.style.boxShadow = '0 8px 16px rgba(22, 54, 71, 0.14)';
    }

    state.uiScene = uiScene;
    state.ui = {
        progressBar: progressBar,
        restartButton: getUiElement(uiScene, 'restart-button'),
        fxToggle: toggle
    };
}
