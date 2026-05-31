import { UIScene } from '../../../../reusables/UIScene/UIScene.js';

function getUiElement(uiScene, id) {
    return uiScene.getByConfigId(id);
}

function countArrowCells(arrows) {
    return arrows.reduce(function (total, arrow) {
        return total + arrow.cells.length;
    }, 0);
}

export function refreshCellDisplay(state) {
    if (state.ui.cellDisplay) {
        state.ui.cellDisplay.setValue(state.remainingCells);
    }
}

export function showEndOverlay(state, outcome) {
    var overlay = state.ui.endOverlay;

    if (!overlay) {
        return;
    }

    if (outcome === 'win') {
        overlay.setTitle('Nice Clear!');
        overlay.setSubtitle('Every arrow made it through.');
    } else if (outcome === 'lose') {
        overlay.setTitle('Frame Jammed!');
        overlay.setSubtitle('No shooter can clear the path.');
    } else {
        overlay.setTitle('Try It Now!');
        overlay.setSubtitle('Keep the arrows flowing.');
    }

    overlay.setButtonText('Play Now');
    overlay.show();
}

export function buildHud(state) {
    var uiScene = new UIScene({
        scoreDisplays: [
            {
                id: 'cell-display',
                label: 'Cells',
                initialValue: countArrowCells(state.arrows),
                styles: {
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: '#ffffff',
                    fontSize: '22px',
                    fontWeight: '800',
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.38)',
                    zIndex: '6'
                },
                labelStyles: {
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    opacity: '0.78',
                    marginBottom: '2px'
                },
                onPrimaryClick: function () {
                    window.dispatchEvent(new CustomEvent('arrow-flow-cta-clicked', {
                        detail: {
                            outcome: state.terminalReason || state.stateName
                        }
                    }));
                }
            }
        ],
        introOverlays: [
            {
                id: 'end-overlay',
                visible: false,
                title: 'Nice Clear!',
                subtitle: 'Keep the arrows flowing.',
                buttonText: 'Play Now',
                styles: {
                    overlay: {
                        background: 'rgba(31, 36, 58, 0.92)',
                        animation: 'fadeIn 0.28s ease-out'
                    },
                    title: {
                        fontSize: '36px',
                        fontWeight: '800',
                        margin: '0 0 8px 0',
                        color: '#ffffff'
                    },
                    subtitle: {
                        fontSize: '18px',
                        opacity: '0.88',
                        margin: '8px 0'
                    },
                    button: {
                        marginTop: '24px',
                        padding: '14px 38px',
                        background: '#ffe234',
                        color: '#25202c',
                        fontSize: '16px',
                        fontWeight: '800',
                        boxShadow: '0 8px 24px rgba(255, 226, 52, 0.28)'
                    }
                }
            }
        ]
    });

    state.uiScene = uiScene;
    state.ui = {
        cellDisplay: getUiElement(uiScene, 'cell-display'),
        endOverlay: getUiElement(uiScene, 'end-overlay')
    };
}
