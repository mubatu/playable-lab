export const GAME_CONFIG = {
    background: {
        sourceWidth: 1080,
        sourceHeight: 1920,
        worldHeight: 19.2,
        imageUrl: 'src/assets/background.png',
        z: -5
    },
    board: {
        columns: 5,
        rows: 12,
        gap: 0.08,
        padding: 0.22,
        maxWidth: 7.1,
        maxHeight: 11.35,
        offsetY: -1.15,
        backgroundColor: '#2d1955',
        cellColor: '#402265'
    },
    slots: {
        count: 3,
        offsetY: 5.45,
        spacing: 1.45,
        sizeScale: 1.02,
        emptyColor: '#25103f',
        activeColor: '#4d2d77'
    },
    tiles: {
        baseZ: 0.22,
        collectedZ: 0.55,
        outlineZ: 0.28,
        colors: [
            { id: 'red', texture: 'src/assets/red.png' },
            { id: 'green', texture: 'src/assets/green.png' },
            { id: 'yellow', texture: 'src/assets/yellow.png' },
            { id: 'purple', texture: 'src/assets/purple.png' }
        ]
    },
    progression: {
        requiredMatches: 5,
        matchSize: 3
    },
    animation: {
        collectDuration: 0.22,
        clearDuration: 0.24,
        failShakeSeconds: 0.35
    },
    tutorial: {
        enabled: true,
        assetUrl: 'src/assets/hand-2.png',
        gesture: 'tap',
        size: 120,
        duration: 1.05,
        loopDelay: 0.45,
        startDelayMs: 650
    },
    layout: {
        titleY: 7.75
    }
};
