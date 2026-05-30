/**
 * 2D waypoint helper for units that must cross an impassable river band
 * using fixed bridge X positions (arena on XZ plane, river spans Z).
 *
 * @param {object} opts
 * @param {number} opts.riverZMin
 * @param {number} opts.riverZMax
 * @param {number[]} opts.bridgeXs - world X centers of each bridge
 * @param {number} [opts.alignEpsilon=0.18]
 * @param {number} [opts.approachMargin=0.35] - how far before/after the band to aim
 */
export class RiverBridgePathfinder {
    constructor(opts) {
        this.riverZMin = opts.riverZMin;
        this.riverZMax = opts.riverZMax;
        this.bridgeXs = Array.isArray(opts.bridgeXs) ? opts.bridgeXs.slice() : [];
        this.alignEpsilon = typeof opts.alignEpsilon === 'number' ? opts.alignEpsilon : 0.18;
        this.approachMargin = typeof opts.approachMargin === 'number' ? opts.approachMargin : 0.35;
    }

    _pickBridgeX(targetX) {
        if (this.bridgeXs.length === 0) {
            return targetX;
        }
        let best = this.bridgeXs[0];
        let bestD = Math.abs(targetX - best);
        for (let i = 1; i < this.bridgeXs.length; i += 1) {
            const bx = this.bridgeXs[i];
            const d = Math.abs(targetX - bx);
            if (d < bestD) {
                bestD = d;
                best = bx;
            }
        }
        return best;
    }

    /**
     * Whether a straight march from (fromZ) to (toZ) must cross the river band.
     */
    needsCrossing(fromZ, toZ) {
        const lo = Math.min(fromZ, toZ);
        const hi = Math.max(fromZ, toZ);
        if (hi < this.riverZMin || lo > this.riverZMax) {
            return false;
        }
        const fromIn = fromZ > this.riverZMin && fromZ < this.riverZMax;
        const toIn = toZ > this.riverZMin && toZ < this.riverZMax;
        return !fromIn && !toIn && ((fromZ < this.riverZMin && toZ > this.riverZMax) || (fromZ > this.riverZMax && toZ < this.riverZMin));
    }

    /**
     * Next (x, z) to steer toward before chasing (tx, tz).
     */
    getSubTarget(ux, uz, tx, tz) {
        if (!this.needsCrossing(uz, tz)) {
            return { x: tx, z: tz };
        }

        const bx = this._pickBridgeX(tx);
        const eps = this.alignEpsilon;
        const m = this.approachMargin;

        if (uz < this.riverZMin && tz > this.riverZMax) {
            if (Math.abs(ux - bx) > eps) {
                return { x: bx, z: Math.min(uz, this.riverZMin - m) };
            }
            if (uz < this.riverZMax + m) {
                return { x: bx, z: this.riverZMax + m };
            }
            return { x: tx, z: tz };
        }

        if (uz > this.riverZMax && tz < this.riverZMin) {
            if (Math.abs(ux - bx) > eps) {
                return { x: bx, z: Math.max(uz, this.riverZMax + m) };
            }
            if (uz > this.riverZMin - m) {
                return { x: bx, z: this.riverZMin - m };
            }
            return { x: tx, z: tz };
        }

        return { x: tx, z: tz };
    }
}
