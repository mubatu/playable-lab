import * as THREE from 'three';
import { ObjectPool } from '../../../../reusables/components/ObjectPool.js';
import { getCellWorldPosition } from './Board.js';

var MERGE_PARTICLE_COLORS = ['#fff5d6', '#ffd88a', '#ffba73', '#ff8f6a'];

export function createParticlePool() {
    var particleGeometry = new THREE.PlaneGeometry(0.22, 0.22);

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
        20
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

export function emitMergeParticles(state, row, column, tier) {
    var centerWorld;
    var particleCount;
    var index;

    if (!state.fxEnabled) {
        return;
    }

    centerWorld = getCellWorldPosition(state.board, state.boardMetrics, row, column, 0.6);
    particleCount = 8;

    for (index = 0; index < particleCount; index += 1) {
        var activeParticle = state.particlePool.get();
        var angle = (Math.PI * 2 * index) / particleCount + (Math.random() * 0.35);
        var speed = 1.5 + (Math.random() * 1.2);
        var maxLife = 0.24 + (Math.random() * 0.2);
        var baseScale = 0.5 + (Math.random() * 0.4);

        activeParticle.position.copy(centerWorld);
        activeParticle.position.x += (Math.random() - 0.5) * 0.08;
        activeParticle.position.y += (Math.random() - 0.5) * 0.08;
        activeParticle.position.z = 0.6;
        activeParticle.visible = true;
        activeParticle.material.color.set(MERGE_PARTICLE_COLORS[Math.min(tier - 1, MERGE_PARTICLE_COLORS.length - 1)]);
        activeParticle.material.opacity = 0.88;
        activeParticle.userData.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
        activeParticle.userData.life = maxLife;
        activeParticle.userData.maxLife = maxLife;
        activeParticle.userData.baseScale = baseScale;
        activeParticle.scale.setScalar(baseScale);

        (function (p) {
            p.update = function (delta) {
                var progress;

                p.userData.life -= delta;

                if (p.userData.life <= 0) {
                    releaseParticle(state, p);
                    return;
                }

                progress = 1 - (p.userData.life / p.userData.maxLife);
                p.position.addScaledVector(p.userData.velocity, delta);
                p.material.opacity = (1 - progress) * 0.88;
                p.scale.setScalar(p.userData.baseScale * (1 + (progress * 0.9)));
            };
        })(activeParticle);

        state.activeParticles.add(activeParticle);
        state.sceneManager.addObject(activeParticle);
    }
}
