export const CONFIG = {
    resolution: {
        width: 1080,
        height: 1920,
        devicePixelRatioLimit: 2
    },

    background: {
        sourceWidth: 1080,
        sourceHeight: 1920,
        worldHeight: 19.2,
        gradientTop: '#555b7a',
        gradientBottom: '#2f344f'
    },

    camera: {
        boardOffsetY: 0.85,
        framingWorldHeight: 16.2,
        position: { x: 0, y: -5.2, z: 10 },
        lookAt: { x: 0, y: 0, z: 0 }
    },

    grid: {
        rows: 5,
        cols: 4,
        cellSize: 1.04,
        cellGap: 0.1,
        cellHeight: 1,
        boardPadding: 0.16,
        outerRingGap: 0.1,
        arrowScale: 0.9
    },

    arrow: {
        exitIntervalSeconds: 0.08,
        exitAnimationSeconds: 0.12,
        clickablePulseDelaySeconds: 1.5,
        invalidTapFeedbackSeconds: 0.12
    },

    frame: {
        moveTickSeconds: 0.18,
        moveAnimationSeconds: 0.12,
        loseOnlyWhenFullAndNoShot: true
    },

    shooter: {
        fireCooldownSeconds: 0,
        simultaneousFire: true,
        consumeShotOnSuccessfulDestroyOnly: true,
        inactiveWhenShotsReachZero: true,
        shotAnimationSeconds: 0.08,
        distanceFromFrameCells: 1.6,
        bulletAnimationSeconds: 0.12
    },

    playableAd: {
        maxSessionSeconds: 30,
        showCTAOnWin: true,
        showCTAOnLose: true,
        showCTAOnTimeout: true,
        autoHintAfterSeconds: 1.5
    },

    colors: {
        pink: '#ff3fa6',
        yellow: '#ffe234',
        green: '#30e83a',
        orange: '#ff9a19',
        purple: '#8b55ff',
        frame: '#b8c8ef',
        frameEmpty: '#7280a9',
        background: '#555b7a',
        gridBase: '#6d7294',
        gridCell: '#8c93b8',
        boardBorder: '#d6defd',
        shooterInactive: '#46506f'
    },

    debug: {
        showFrameSlotIndices: false,
        showShooterSightLines: false,
        logStateChanges: false,
        startPaused: false
    }
};
