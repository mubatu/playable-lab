import * as THREE from 'three';
import { ObjectPool } from '../../../../reusables/components/ObjectPool.js';
import { getCellWorldPosition } from './Board.js';

var LINE_CLEAR_COLORS = ['#ffffff', '#FFEAA7', '#FF9F43', '#FF6B6B', '#4ECDC4', '#45B7D1'];

export function createParticlePool() {
    var particleGeometry = new THREE.PlaneGeometry(0.18, 0.18);

    return new ObjectPool(
        function () {
            var particle = new THREE.Mesh(
                particleGeometry,
                new THREE.MeshBasicMaterial({
                    color: '#ffffff',
                    transparent: true,
                    opacity: 0,
                    depthWrite: false
                })
            );

            particle.visible = false;
            particle.userData.velocity = new THREE.Vector3();
            particle.userData.life = 0;
            particle.userData.maxLife = 0;
            particle.userData.baseScale = 1;
            particle.update = null;
            return particle;
        },
        function (particle) {
            particle.visible = false;
            particle.material.opacity = 0;
            particle.userData.velocity.set(0, 0, 0);
            particle.userData.life = 0;
            particle.userData.maxLife = 0;
            particle.userData.baseScale = 1;
            particle.update = null;
        },
        40
    );
}

export function releaseParticle(state, particle) {
    if (state.activeParticles.has(particle)) {
        state.activeParticles.delete(particle);
    }

    state.sceneManager.removeObject(particle);
    state.particlePool.release(particle);
}

export function clearParticles(state) {
    Array.from(state.activeParticles).forEach(function (particle) {
        releaseParticle(state, particle);
    });
}

export function emitClearParticles(state, clearedPositions) {
    var index;
    var pos;
    var centerWorld;
    var particlesPerCell = 3;
    var pi;
    var angle;
    var speed;
    var maxLife;
    var baseScale;
    var p;
    var colorHex;

    if (!state.fxEnabled) {
        return;
    }

    for (index = 0; index < clearedPositions.length; index += 1) {
        pos = clearedPositions[index];
        centerWorld = getCellWorldPosition(state.board, state.boardMetrics, pos.row, pos.col, 0.6);

        for (pi = 0; pi < particlesPerCell; pi += 1) {
            p = state.particlePool.get();
            angle = Math.random() * Math.PI * 2;
            speed = 1.2 + (Math.random() * 1.8);
            maxLife = 0.2 + (Math.random() * 0.25);
            baseScale = 0.4 + (Math.random() * 0.5);
            colorHex = LINE_CLEAR_COLORS[Math.floor(Math.random() * LINE_CLEAR_COLORS.length)];

            p.position.copy(centerWorld);
            p.position.x += (Math.random() - 0.5) * 0.1;
            p.position.y += (Math.random() - 0.5) * 0.1;
            p.position.z = 0.6;
            p.visible = true;
            p.material.color.set(colorHex);
            p.material.opacity = 0.9;
            p.userData.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
            p.userData.life = maxLife;
            p.userData.maxLife = maxLife;
            p.userData.baseScale = baseScale;
            p.scale.setScalar(baseScale);

            (function (particle) {
                particle.update = function (delta) {
                    var progress;

                    particle.userData.life -= delta;

                    if (particle.userData.life <= 0) {
                        releaseParticle(state, particle);
                        return;
                    }

                    progress = 1 - (particle.userData.life / particle.userData.maxLife);
                    particle.position.addScaledVector(particle.userData.velocity, delta);
                    particle.material.opacity = (1 - progress) * 0.9;
                    particle.scale.setScalar(particle.userData.baseScale * (1 + (progress * 1.2)));
                };
            })(p);

            state.activeParticles.add(p);
            state.sceneManager.addObject(p);
        }
    }
}

export function startScreenShake(state, intensity) {
    state.shakeTime = intensity || 0.2;
}
