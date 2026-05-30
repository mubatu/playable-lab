import { UIScene } from '../../../../reusables/UIScene/UIScene.js';

function getUiElement(uiScene, id) {
    return uiScene.getByConfigId(id);
}

export function addScore(state, points) {
    state.score += points;

    if (state.ui.scoreDisplay) {
        state.ui.scoreDisplay.setValue(state.score);
    }

    if (points > 0 && state.ui.scoreDisplay) {
        state.ui.scoreDisplay.showPopup('+' + points);
    }
}

export function refreshScoreDisplay(state) {
    if (state.ui.scoreDisplay) {
        state.ui.scoreDisplay.setValue(state.score);
    }
}

export function showGameOver(state) {
    state.gameOver = true;

    if (state.ui.gameOverOverlay) {
        state.ui.gameOverOverlay.setSubtitle('Final Score ' + state.score);
        state.ui.gameOverOverlay.show();
    }
}

export function buildHud(state, onResetGame) {
    var uiScene = new UIScene({
        scoreDisplays: [
            {
                id: 'score-display',
                label: 'Score',
                initialValue: 0,
                styles: {
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: '#ffffff',
                    fontSize: '22px',
                    fontWeight: '800',
                    letterSpacing: '0.04em',
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                    zIndex: '6'
                },
                labelStyles: {
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    opacity: '0.7',
                    marginBottom: '2px'
                }
            }
        ],
        buttons: [
            {
                id: 'restart-button',
                text: 'Restart',
                styles: {
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    padding: '10px 18px',
                    border: 'none',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.3)',
                    cursor: 'pointer'
                },
                onClick: function () {
                    onResetGame();
                }
            }
        ],
        introOverlays: [
            {
                id: 'game-over-overlay',
                visible: false,
                title: 'Game Over!',
                subtitle: 'Final Score 0',
                buttonText: 'Play Again',
                styles: {
                    overlay: {
                        background: 'rgba(13, 27, 42, 0.92)',
                        animation: 'fadeIn 0.4s ease-out'
                    },
                    title: {
                        fontSize: '36px',
                        fontWeight: '800',
                        margin: '0 0 8px 0',
                        background: 'linear-gradient(135deg, #FFEAA7, #FF9F43)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    },
                    subtitle: {
                        fontSize: '28px',
                        fontWeight: '800',
                        opacity: '1',
                        margin: '16px 0'
                    },
                    button: {
                        marginTop: '24px',
                        padding: '14px 40px',
                        background: 'linear-gradient(135deg, #FFEAA7 0%, #FF9F43 100%)',
                        color: '#1a0533',
                        fontSize: '16px',
                        boxShadow: '0 8px 24px rgba(255, 159, 67, 0.3)'
                    }
                },
                onPrimaryClick: function () {
                    if (state.ui.gameOverOverlay) {
                        state.ui.gameOverOverlay.hide();
                    }
                    onResetGame();
                }
            }
        ]
    });

    state.uiScene = uiScene;
    state.ui = {
        scoreDisplay: getUiElement(uiScene, 'score-display'),
        restartButton: getUiElement(uiScene, 'restart-button'),
        gameOverOverlay: getUiElement(uiScene, 'game-over-overlay')
    };
    state.onReset = onResetGame;
}
