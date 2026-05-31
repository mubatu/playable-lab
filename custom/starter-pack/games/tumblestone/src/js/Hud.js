import { UIScene } from '../../../../reusables/UIScene/UIScene.js';

function getUiElement(uiScene, id) {
    return uiScene.getByConfigId(id);
}

function polishProgressBar(progressBar) {
    if (!progressBar) {
        return;
    }

    Object.assign(progressBar.containerDiv.style, {
        height: '24px',
        border: '2px solid rgba(255, 255, 255, 0.62)',
        boxShadow: '0 8px 22px rgba(26, 8, 51, 0.32)'
    });
    Object.assign(progressBar.fill.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        background: 'linear-gradient(90deg, #ffcc4d 0%, #ff5f7e 54%, #8b5cf6 100%)',
        boxShadow: '0 0 18px rgba(255, 210, 90, 0.42)'
    });

    if (progressBar.text) {
        Object.assign(progressBar.text.style, {
            zIndex: '2',
            fontSize: '13px',
            letterSpacing: '0',
            minWidth: '54px'
        });
    }
}

export function buildHud(state, onResetGame) {
    var maxMatches = state.config.progression.requiredMatches;
    var uiScene = new UIScene({
        progressBars: [
            {
                id: 'match-progress',
                initialValue: 0,
                max: maxMatches,
                textFormat: function (value, max) {
                    return Math.round(value) + '/' + max;
                },
                styles: {
                    top: '22px',
                    left: '50%',
                    width: '58%',
                    maxWidth: '360px',
                    minWidth: '230px',
                    transform: 'translateX(-50%)',
                    zIndex: '6'
                }
            }
        ],
        buttons: [
            {
                id: 'restart-button',
                text: 'Restart',
                styles: {
                    position: 'absolute',
                    top: '22px',
                    right: '18px',
                    padding: '10px 15px',
                    border: 'none',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.18)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '800',
                    boxShadow: '0 4px 14px rgba(22, 7, 44, 0.28)',
                    cursor: 'pointer',
                    backdropFilter: 'blur(6px)'
                },
                onClick: function () {
                    onResetGame();
                }
            }
        ],
        introOverlays: [
            {
                id: 'end-overlay',
                visible: false,
                title: 'Great Match!',
                subtitle: '5/5 sets cleared',
                buttonText: 'Play Again',
                styles: {
                    overlay: {
                        background: 'rgba(25, 8, 49, 0.86)',
                        animation: 'fadeIn 0.32s ease-out'
                    },
                    title: {
                        fontSize: '40px',
                        fontWeight: '900',
                        lineHeight: '1.05',
                        margin: '0 0 8px 0',
                        color: '#ffffff',
                        textShadow: '0 4px 18px rgba(0, 0, 0, 0.34)'
                    },
                    subtitle: {
                        fontSize: '20px',
                        fontWeight: '750',
                        opacity: '0.96',
                        margin: '0',
                        maxWidth: '320px'
                    },
                    button: {
                        marginTop: '22px',
                        padding: '14px 38px',
                        background: 'linear-gradient(135deg, #ffcf52 0%, #ff5f7e 100%)',
                        color: '#271142',
                        fontSize: '16px',
                        boxShadow: '0 8px 24px rgba(255, 95, 126, 0.35)'
                    }
                },
                onPrimaryClick: function () {
                    if (state.ui.endOverlay) {
                        state.ui.endOverlay.hide();
                    }
                    onResetGame();
                }
            }
        ]
    });

    state.uiScene = uiScene;
    state.ui = {
        progressBar: getUiElement(uiScene, 'match-progress'),
        restartButton: getUiElement(uiScene, 'restart-button'),
        endOverlay: getUiElement(uiScene, 'end-overlay')
    };
    state.onReset = onResetGame;

    polishProgressBar(state.ui.progressBar);
    refreshProgressDisplay(state);
}

export function refreshProgressDisplay(state) {
    if (state.ui.progressBar) {
        state.ui.progressBar.setMax(state.config.progression.requiredMatches);
        state.ui.progressBar.setValue(state.matchesCleared);
    }
}

export function showEndState(state, didWin) {
    state.gameOver = true;
    state.locked = true;

    if (!state.ui.endOverlay) {
        return;
    }

    if (didWin) {
        state.ui.endOverlay.setTitle('You Win!');
        state.ui.endOverlay.setSubtitle(state.matchesCleared + '/' + state.config.progression.requiredMatches + ' sets cleared');
        state.ui.endOverlay.setButtonText('Play Again');
    } else {
        state.ui.endOverlay.setTitle('Mismatch!');
        state.ui.endOverlay.setSubtitle('Fill all 3 slots with one color.');
        state.ui.endOverlay.setButtonText('Try Again');
    }

    state.ui.endOverlay.show();
}
