import * as THREE from 'three';
import { getBoardCenter } from './Board.js';
import { getFrameSlotIndex, removeCellAtIndex } from './FramePath.js';

function getShooterOrderValue(shooter, metrics) {
    if (shooter.side === 'top') {
        return shooter.directCoord.col;
    }

    if (shooter.side === 'right') {
        return shooter.directCoord.row;
    }

    if (shooter.side === 'bottom') {
        return metrics.totalCols - shooter.directCoord.col;
    }

    return metrics.totalRows - shooter.directCoord.row;
}

function getSideRank(side) {
    if (side === 'top') {
        return 0;
    }
    if (side === 'right') {
        return 1;
    }
    if (side === 'bottom') {
        return 2;
    }
    return 3;
}

function sortShootersForResolution(shooters, metrics) {
    return shooters.slice().sort(function (a, b) {
        var sideDiff = getSideRank(a.side) - getSideRank(b.side);

        if (sideDiff !== 0) {
            return sideDiff;
        }

        return getShooterOrderValue(a, metrics) - getShooterOrderValue(b, metrics);
    });
}

function getDirectSlotIndex(state, shooter) {
    if (typeof shooter.directSlotIndex === 'number') {
        return shooter.directSlotIndex;
    }

    shooter.directSlotIndex = getFrameSlotIndex(state.framePath, shooter.directCoord);
    return shooter.directSlotIndex;
}

function findTarget(state, shooter) {
    var slotIndex;
    var cell;

    if (shooter.isBlocked || shooter.shots <= 0) {
        return null;
    }

    slotIndex = getDirectSlotIndex(state, shooter);
    cell = state.framePath.slots[slotIndex];

    if (cell && cell.color === shooter.color) {
        return slotIndex;
    }

    return null;
}

export function canAnyShooterFire(state) {
    var i;

    if (state.activeFrameMoves.length > 0) {
        return true;
    }

    for (i = 0; i < state.shooters.length; i += 1) {
        if (findTarget(state, state.shooters[i]) !== null) {
            return true;
        }
    }

    return false;
}

function removeActiveFrameMoveForView(state, view) {
    state.activeFrameMoves = state.activeFrameMoves.filter(function (move) {
        return move.view !== view;
    });
}

function playShooterPulse(state, shooter) {
    var view = shooter.view;
    var scale;

    if (!view) {
        return;
    }

    if (!view.userData.baseScale) {
        view.userData.baseScale = view.scale.clone();
    }

    scale = view.userData.baseScale;
    view.scale.set(scale.x * 1.12, scale.y * 0.92, scale.z * 1.12);

    window.setTimeout(function () {
        view.scale.copy(scale);
    }, Math.max(20, state.config.shooter.shotAnimationSeconds * 1000));
}

function createBulletView() {
    var group = new THREE.Group();
    var glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 12),
        new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.26,
            depthWrite: false
        })
    );
    var core = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 16, 12),
        new THREE.MeshBasicMaterial({
            color: 0xffffff
        })
    );

    group.add(glow);
    group.add(core);
    return group;
}

function spawnBullet(state, shooter, targetCell) {
    var view;
    var target;
    var start;

    if (!shooter.view || !targetCell) {
        return;
    }

    view = createBulletView();
    target = getBoardCenter(state.boardMetrics, targetCell.coord.row, targetCell.coord.col);
    if (shooter.view.getMuzzleWorldPosition) {
        start = state.board.worldToLocal(shooter.view.getMuzzleWorldPosition());
    } else {
        start = shooter.view.position;
    }
    view.position.set(
        start.x,
        start.y,
        start.z + state.boardMetrics.cellHeight * 0.3
    );

    state.board.add(view);
    state.activeBullets.push({
        view: view,
        fromX: view.position.x,
        fromY: view.position.y,
        fromZ: view.position.z,
        toX: target.x,
        toY: target.y,
        toZ: state.boardMetrics.cellHeight * 1.05,
        progress: 0,
        duration: state.config.shooter.bulletAnimationSeconds || 0.12
    });
}

export function updateShooterEffects(state, delta) {
    var remaining = [];
    var bullet;
    var t;
    var i;

    for (i = 0; i < state.activeBullets.length; i += 1) {
        bullet = state.activeBullets[i];
        bullet.progress += delta / bullet.duration;
        t = Math.min(bullet.progress, 1);

        bullet.view.position.x = bullet.fromX + ((bullet.toX - bullet.fromX) * t);
        bullet.view.position.y = bullet.fromY + ((bullet.toY - bullet.fromY) * t);
        bullet.view.position.z = bullet.fromZ + ((bullet.toZ - bullet.fromZ) * t);
        bullet.view.scale.setScalar(1 + ((1 - t) * 0.35));

        if (bullet.progress < 1) {
            remaining.push(bullet);
        } else if (bullet.view.parent) {
            bullet.view.parent.remove(bullet.view);
        }
    }

    state.activeBullets = remaining;
}

function removeCellView(cell) {
    if (!cell || !cell.view || !cell.view.parent) {
        return;
    }

    cell.view.parent.remove(cell.view);
}

function destroyClaimedCell(state, claim) {
    var cell = state.framePath.slots[claim.targetIndex];

    if (!cell) {
        return false;
    }

    spawnBullet(state, claim.shooter, cell);
    cell = removeCellAtIndex(state.framePath, claim.targetIndex);
    removeActiveFrameMoveForView(state, cell.view);
    removeCellView(cell);
    claim.shooter.shots -= 1;

    if (claim.shooter.view && claim.shooter.view.setNumber) {
        claim.shooter.view.setNumber(claim.shooter.shots);
    }

    playShooterPulse(state, claim.shooter);
    return true;
}

export function resolveShooterFire(state) {
    var shooters = sortShootersForResolution(state.shooters, state.boardMetrics);
    var claims = [];
    var destroyedTargets = {};
    var i;
    var targetIndex;

    if (state.activeFrameMoves.length > 0) {
        return;
    }

    for (i = 0; i < shooters.length; i += 1) {
        targetIndex = findTarget(state, shooters[i]);

        if (targetIndex !== null) {
            claims.push({
                shooter: shooters[i],
                targetIndex: targetIndex
            });
        }
    }

    for (i = 0; i < claims.length; i += 1) {
        if (destroyedTargets[claims[i].targetIndex]) {
            continue;
        }

        if (destroyClaimedCell(state, claims[i])) {
            destroyedTargets[claims[i].targetIndex] = true;
        }
    }
}
