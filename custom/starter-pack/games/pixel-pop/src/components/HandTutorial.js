const HandTutorial = (function () {
    'use strict';

    const DEFAULT_OPTIONS = {
        container: document.body,
        renderer: null,
        camera: null,
        assetUrl: '',
        gesture: 'tap',
        from: { space: 'screen', x: 0.5, y: 0.5 },
        to: { space: 'screen', x: 0.5, y: 0.5 },
        points: null,
        duration: 1.2,
        loop: true,
        loopDelay: 0.35,
        holdDuration: 0.18,
        opacity: 1,
        size: 144,
        rotation: 0,
        followDirection: false,
        flipX: false,
        flipY: false,
        anchor: { x: 0.22, y: 0.08 },
        offset: { x: 0, y: 0 },
        pressScale: 0.9,
        idleBobAmplitude: 6,
        showTrail: true,
        trailColor: 'rgba(255, 255, 255, 0.42)',
        trailWidth: 10,
        pulseColor: 'rgba(255, 255, 255, 0.72)',
        pulseWidth: 4,
        pulseRadius: 24,
        zIndex: 12,
        hideOnComplete: true
    };

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function lerp(start, end, alpha) {
        return start + (end - start) * alpha;
    }

    function easeInOutCubic(value) {
        if (value < 0.5) {
            return 4 * value * value * value;
        }

        return 1 - Math.pow(-2 * value + 2, 3) / 2;
    }

    function easeOutQuad(value) {
        return 1 - (1 - value) * (1 - value);
    }

    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    function isPlainObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    }

    function mergeOptions(base, patch) {
        const result = Array.isArray(base) ? base.slice() : {};
        const source = patch || {};
        let key;

        for (key in base) {
            if (!Object.prototype.hasOwnProperty.call(base, key)) {
                continue;
            }

            if (isPlainObject(base[key])) {
                result[key] = mergeOptions(base[key], source[key]);
                continue;
            }

            result[key] = base[key];
        }

        for (key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) {
                continue;
            }

            if (isPlainObject(source[key]) && isPlainObject(result[key])) {
                result[key] = mergeOptions(result[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    function clonePoint(point) {
        if (!point) {
            return null;
        }

        return mergeOptions({}, point);
    }

    function normalizeGesture(gesture) {
        const value = String(gesture || 'tap').toLowerCase();

        if (value === 'click') {
            return 'tap';
        }

        if (value === 'swipe' || value === 'drag' || value === 'swap') {
            return 'drag';
        }

        if (value === 'path') {
            return 'path';
        }

        return 'tap';
    }

    function ensureBaseStyles() {
        const styleId = 'hand-tutorial-base-styles';

        if (document.getElementById(styleId)) {
            return;
        }

        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = [
            '.hand-tutorial-overlay {',
            '    position: absolute;',
            '    inset: 0;',
            '    pointer-events: none;',
            '    overflow: hidden;',
            '}',
            '.hand-tutorial-overlay__svg {',
            '    position: absolute;',
            '    inset: 0;',
            '    width: 100%;',
            '    height: 100%;',
            '}',
            '.hand-tutorial-overlay__trail {',
            '    fill: none;',
            '    stroke-linecap: round;',
            '    stroke-linejoin: round;',
            '    opacity: 0.8;',
            '}',
            '.hand-tutorial-overlay__pulse {',
            '    fill: none;',
            '}',
            '.hand-tutorial-overlay__hand {',
            '    position: absolute;',
            '    inset: auto;',
            '    transform-origin: top left;',
            '    user-select: none;',
            '    -webkit-user-drag: none;',
            '}'
        ].join('\n');

        document.head.appendChild(styleEl);
    }

    class HandTutorial {
        constructor(options) {
            this.options = mergeOptions(DEFAULT_OPTIONS, options || {});
            this.container = null;
            this.renderer = this.options.renderer || null;
            this.camera = this.options.camera || null;
            this.isPlaying = false;
            this.startTime = 0;
            this.objectUrl = null;
            this.warnedAboutWorldSpace = false;

            ensureBaseStyles();

            this.rootEl = document.createElement('div');
            this.rootEl.className = 'hand-tutorial-overlay';

            this.svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.svgEl.setAttribute('class', 'hand-tutorial-overlay__svg');

            this.trailEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            this.trailEl.setAttribute('class', 'hand-tutorial-overlay__trail');

            this.pulseEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            this.pulseEl.setAttribute('class', 'hand-tutorial-overlay__pulse');

            this.svgEl.appendChild(this.trailEl);
            this.svgEl.appendChild(this.pulseEl);
            this.rootEl.appendChild(this.svgEl);

            this.handEl = document.createElement('img');
            this.handEl.className = 'hand-tutorial-overlay__hand';
            this.handEl.alt = '';
            this.handEl.draggable = false;
            this.rootEl.appendChild(this.handEl);

            this.setConfig(this.options);
            this._attach();
        }

        _attach() {
            const nextContainer = this.options.container || document.body;

            if (this.container === nextContainer && this.rootEl.parentNode === nextContainer) {
                return;
            }

            if (this.rootEl.parentNode) {
                this.rootEl.parentNode.removeChild(this.rootEl);
            }

            this.container = nextContainer;

            if (window.getComputedStyle(this.container).position === 'static') {
                this.container.style.position = 'relative';
            }

            this.container.appendChild(this.rootEl);
        }

        _measureSurface() {
            const containerRect = this.container.getBoundingClientRect();
            const width = Math.max(containerRect.width || this.container.clientWidth || window.innerWidth, 1);
            const height = Math.max(containerRect.height || this.container.clientHeight || window.innerHeight, 1);

            if (!this.renderer || !this.renderer.domElement) {
                return {
                    offsetX: 0,
                    offsetY: 0,
                    width: width,
                    height: height
                };
            }

            const surfaceRect = this.renderer.domElement.getBoundingClientRect();

            return {
                offsetX: surfaceRect.left - containerRect.left,
                offsetY: surfaceRect.top - containerRect.top,
                width: Math.max(surfaceRect.width, 1),
                height: Math.max(surfaceRect.height, 1)
            };
        }

        _resolvePoint(point, surface) {
            const fallback = {
                x: surface.offsetX + surface.width * 0.5,
                y: surface.offsetY + surface.height * 0.5
            };

            if (!point) {
                return fallback;
            }

            if (window.THREE && point.object3D && typeof point.object3D.getWorldPosition === 'function') {
                const offset = point.offset || {};
                const worldPosition = new THREE.Vector3();
                point.object3D.getWorldPosition(worldPosition);
                worldPosition.x += offset.x || 0;
                worldPosition.y += offset.y || 0;
                worldPosition.z += offset.z || 0;

                return this._projectWorldPoint(worldPosition, surface);
            }

            const space = point.space || 'screen';

            if (space === 'pixels') {
                return {
                    x: surface.offsetX + (point.x || 0),
                    y: surface.offsetY + (point.y || 0)
                };
            }

            if (space === 'world') {
                return this._projectWorldPoint(point, surface);
            }

            const screenX = typeof point.x === 'number' ? point.x : 0.5;
            const screenY = typeof point.y === 'number' ? point.y : 0.5;

            return {
                x: surface.offsetX + clamp(screenX, 0, 1) * surface.width,
                y: surface.offsetY + clamp(screenY, 0, 1) * surface.height
            };
        }

        _projectWorldPoint(point, surface) {
            if (!window.THREE || !this.camera) {
                if (!this.warnedAboutWorldSpace) {
                    this.warnedAboutWorldSpace = true;
                    console.warn('HandTutorial: world-space targets need THREE and a camera.');
                }

                return {
                    x: surface.offsetX + surface.width * 0.5,
                    y: surface.offsetY + surface.height * 0.5
                };
            }

            const projected = new THREE.Vector3(point.x || 0, point.y || 0, point.z || 0);
            projected.project(this.camera);

            return {
                x: surface.offsetX + (projected.x * 0.5 + 0.5) * surface.width,
                y: surface.offsetY + (-projected.y * 0.5 + 0.5) * surface.height
            };
        }

        _getPathPoints(surface) {
            const points = [];
            const configuredPoints = Array.isArray(this.options.points) && this.options.points.length > 0
                ? this.options.points
                : [this.options.from];

            let index;

            if (!Array.isArray(this.options.points) && this.options.to) {
                configuredPoints.push(this.options.to);
            }

            for (index = 0; index < configuredPoints.length; index += 1) {
                points.push(this._resolvePoint(configuredPoints[index], surface));
            }

            if (points.length === 0) {
                points.push(this._resolvePoint(this.options.from, surface));
            }

            return points;
        }

        _samplePath(points, progress) {
            if (!points.length) {
                return {
                    point: { x: 0, y: 0 },
                    angle: 0
                };
            }

            if (points.length === 1) {
                return {
                    point: { x: points[0].x, y: points[0].y },
                    angle: 0
                };
            }

            const lengths = [];
            let totalLength = 0;
            let index;

            for (index = 0; index < points.length - 1; index += 1) {
                const dx = points[index + 1].x - points[index].x;
                const dy = points[index + 1].y - points[index].y;
                const segmentLength = Math.sqrt(dx * dx + dy * dy);
                lengths.push(segmentLength);
                totalLength += segmentLength;
            }

            if (totalLength <= 0.001) {
                return {
                    point: { x: points[0].x, y: points[0].y },
                    angle: 0
                };
            }

            let travel = clamp(progress, 0, 1) * totalLength;

            for (index = 0; index < lengths.length; index += 1) {
                if (travel <= lengths[index] || index === lengths.length - 1) {
                    const start = points[index];
                    const end = points[index + 1];
                    const localProgress = lengths[index] <= 0.001 ? 0 : travel / lengths[index];

                    return {
                        point: {
                            x: lerp(start.x, end.x, localProgress),
                            y: lerp(start.y, end.y, localProgress)
                        },
                        angle: Math.atan2(end.y - start.y, end.x - start.x)
                    };
                }

                travel -= lengths[index];
            }

            const lastPoint = points[points.length - 1];
            return {
                point: { x: lastPoint.x, y: lastPoint.y },
                angle: 0
            };
        }

        _buildFrame(progress) {
            const gesture = normalizeGesture(this.options.gesture);
            const duration = Math.max(this.options.duration, 0.01);
            const holdWindow = clamp(this.options.holdDuration / duration, 0.04, 0.32);
            const releaseWindow = clamp(holdWindow * 0.8, 0.05, 0.2);
            const fadeWindow = 0.12;

            if (gesture === 'tap') {
                return {
                    motionProgress: 0,
                    press: Math.sin(progress * Math.PI),
                    alpha: clamp(Math.min(progress / fadeWindow, (1 - progress) / fadeWindow, 1), 0, 1),
                    pulse: Math.sin(progress * Math.PI)
                };
            }

            const travelStart = holdWindow;
            const travelEnd = 1 - releaseWindow;
            let motionProgress = 0;
            let press = 0;
            let pulse = 0;

            if (progress < travelStart) {
                press = easeOutQuad(progress / Math.max(travelStart, 0.001));
                pulse = press;
                motionProgress = 0;
            } else if (progress > travelEnd) {
                press = easeOutQuad((1 - progress) / Math.max(releaseWindow, 0.001));
                pulse = press;
                motionProgress = 1;
            } else {
                motionProgress = easeInOutCubic((progress - travelStart) / Math.max(travelEnd - travelStart, 0.001));
                press = 1;
                pulse = 0.2;
            }

            return {
                motionProgress: motionProgress,
                press: press,
                alpha: clamp(Math.min(progress / fadeWindow, (1 - progress) / fadeWindow, 1), 0, 1),
                pulse: pulse
            };
        }

        _drawTrail(points, frame, surface) {
            const shouldShow = this.options.showTrail && points.length > 1 && normalizeGesture(this.options.gesture) !== 'tap';

            this.svgEl.setAttribute('viewBox', '0 0 ' + this.container.clientWidth + ' ' + this.container.clientHeight);

            if (!shouldShow) {
                this.trailEl.setAttribute('d', '');
                this.trailEl.style.opacity = '0';
                return;
            }

            let pathData = 'M ' + points[0].x.toFixed(2) + ' ' + points[0].y.toFixed(2);
            let index;

            for (index = 1; index < points.length; index += 1) {
                pathData += ' L ' + points[index].x.toFixed(2) + ' ' + points[index].y.toFixed(2);
            }

            this.trailEl.setAttribute('d', pathData);
            this.trailEl.style.stroke = this.options.trailColor;
            this.trailEl.style.strokeWidth = String(this.options.trailWidth);
            this.trailEl.style.opacity = String(0.2 + frame.alpha * 0.7);

            const totalLength = this.trailEl.getTotalLength();
            this.trailEl.style.strokeDasharray = String(totalLength);
            this.trailEl.style.strokeDashoffset = String(totalLength * (1 - frame.motionProgress));
        }

        _drawPulse(point, frame) {
            const pulseStrength = this.options.pulseRadius * (0.7 + frame.pulse * 0.7);
            this.pulseEl.setAttribute('cx', point.x.toFixed(2));
            this.pulseEl.setAttribute('cy', point.y.toFixed(2));
            this.pulseEl.setAttribute('r', pulseStrength.toFixed(2));
            this.pulseEl.style.stroke = this.options.pulseColor;
            this.pulseEl.style.strokeWidth = String(this.options.pulseWidth);
            this.pulseEl.style.opacity = String(frame.pulse * frame.alpha);
            this.pulseEl.style.transformOrigin = point.x + 'px ' + point.y + 'px';
        }

        _drawHand(sample, frame) {
            const size = this.options.size;
            const anchorX = this.options.anchor.x * size;
            const anchorY = this.options.anchor.y * size;
            const flipX = this.options.flipX ? -1 : 1;
            const flipY = this.options.flipY ? -1 : 1;
            const directionRotation = this.options.followDirection ? sample.angle : 0;
            const rotation = directionRotation + toRadians(this.options.rotation || 0);
            const idleBob = Math.sin(frame.motionProgress * Math.PI * 2) * this.options.idleBobAmplitude;
            const pressedScale = lerp(1, this.options.pressScale, frame.press);
            const translateX = sample.point.x - anchorX + this.options.offset.x;
            const translateY = sample.point.y - anchorY + this.options.offset.y + idleBob;

            this.handEl.style.width = size + 'px';
            this.handEl.style.height = size + 'px';
            this.handEl.style.opacity = String(this.options.opacity * frame.alpha);
            this.handEl.style.transform =
                'translate(' + translateX.toFixed(2) + 'px, ' + translateY.toFixed(2) + 'px) ' +
                'rotate(' + rotation.toFixed(4) + 'rad) ' +
                'scale(' + (pressedScale * flipX).toFixed(4) + ', ' + (pressedScale * flipY).toFixed(4) + ')';
        }

        update(now) {
            if (!this.isPlaying) {
                return;
            }

            const currentTime = typeof now === 'number' ? now : performance.now();
            const surface = this._measureSurface();
            const cycleDuration = Math.max(this.options.duration + this.options.loopDelay, 0.01);
            const elapsed = (currentTime - this.startTime) / 1000;
            const pathPoints = this._getPathPoints(surface);
            const gesture = normalizeGesture(this.options.gesture);
            let activeTime = elapsed;

            if (this.options.loop) {
                activeTime = elapsed % cycleDuration;
            } else if (elapsed > this.options.duration) {
                activeTime = this.options.duration;
            }

            if (activeTime > this.options.duration) {
                this.rootEl.style.opacity = '0';
                if (!this.options.loop && this.options.hideOnComplete) {
                    this.isPlaying = false;
                }
                return;
            }

            const frame = this._buildFrame(clamp(activeTime / Math.max(this.options.duration, 0.01), 0, 1));
            const sample = this._samplePath(pathPoints, gesture === 'tap' ? 0 : frame.motionProgress);

            this.rootEl.style.opacity = '1';
            this.rootEl.style.zIndex = String(this.options.zIndex);
            this._drawTrail(pathPoints, frame, surface);
            this._drawPulse(sample.point, frame);
            this._drawHand(sample, frame);
        }

        play() {
            this.startTime = performance.now();
            this.isPlaying = true;
            this.rootEl.style.opacity = '1';
            return this;
        }

        pause() {
            this.isPlaying = false;
            return this;
        }

        stop() {
            this.isPlaying = false;
            this.rootEl.style.opacity = '0';
            return this;
        }

        setAssetUrl(url) {
            this.options.assetUrl = url;
            this.handEl.src = url || '';
            return this;
        }

        setPoints(from, to) {
            this.options.from = clonePoint(from);
            this.options.to = clonePoint(to);
            this.options.points = null;
            return this;
        }

        setConfig(patch) {
            this.options = mergeOptions(this.options, patch || {});
            this.renderer = this.options.renderer || this.renderer;
            this.camera = this.options.camera || this.camera;
            this._attach();
            this.setAssetUrl(this.options.assetUrl);
            this.rootEl.style.zIndex = String(this.options.zIndex);
            return this;
        }

        destroy() {
            this.stop();

            if (this.rootEl.parentNode) {
                this.rootEl.parentNode.removeChild(this.rootEl);
            }
        }
    }

    return HandTutorial;
})();

window.HandTutorial = HandTutorial;
