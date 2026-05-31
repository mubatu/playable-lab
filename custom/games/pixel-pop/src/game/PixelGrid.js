import * as THREE from 'three';

function toColor(value) {
    if (value instanceof THREE.Color) {
        return value;
    }

    return new THREE.Color(value);
}

export class PixelGrid {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.rows = options.rows || 8;
        this.cols = options.cols || 8;
        this.cellSize = options.cellSize || 0.7;
        this.gap = options.gap || 0.08;
        this.step = this.cellSize + this.gap;
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.pixels = options.pixels || [];
        this.onCellDestroyed = options.onCellDestroyed || null;

        this.group = new THREE.Group();
        this.cells = [];
        this.totalCount = this.rows * this.cols;
        this.remainingCount = this.totalCount;
        this.bounds = {
            width: this.cols * this.step - this.gap,
            height: this.rows * this.step - this.gap
        };

        this.geometry = new THREE.BoxGeometry(this.cellSize, this.cellSize, 0.24);
        this.build();

        if (this.scene) {
            this.scene.add(this.group);
        }
    }

    build() {
        const halfCols = (this.cols - 1) / 2;
        const halfRows = (this.rows - 1) / 2;

        for (let row = 0; row < this.rows; row += 1) {
            const rowCells = [];

            for (let col = 0; col < this.cols; col += 1) {
                const colorValue = this.pixels[row]?.[col] ?? 0x3f6fd6;
                const material = new THREE.MeshStandardMaterial({
                    color: toColor(colorValue),
                    emissive: new THREE.Color(0x111827),
                    emissiveIntensity: 0.55,
                    roughness: 0.34,
                    metalness: 0.16,
                    transparent: true,
                    opacity: 1
                });
                const mesh = new THREE.Mesh(this.geometry, material);
                const x = this.position.x + (col - halfCols) * this.step;
                const y = this.position.y + (halfRows - row) * this.step;

                mesh.position.set(x, y, this.position.z);
                mesh.userData = {
                    row,
                    col,
                    color: colorValue,
                    alive: true,
                    targetable: false,
                    fade: 0
                };

                this.group.add(mesh);
                rowCells.push({ row, col, color: colorValue, mesh, alive: true, targetable: false, fade: 0 });
            }

            this.cells.push(rowCells);
        }
    }

    update(delta) {
        for (let row = 0; row < this.rows; row += 1) {
            for (let col = 0; col < this.cols; col += 1) {
                const cell = this.cells[row][col];

                if (cell.alive) {
                    cell.targetable = this.isTargetable(row, col);
                    cell.mesh.userData.targetable = cell.targetable;
                    continue;
                }

                if (cell.fade < 1) {
                    cell.fade = Math.min(1, cell.fade + delta * 4.5);
                    const scale = 1 - cell.fade * 0.94;
                    cell.mesh.scale.setScalar(Math.max(0.06, scale));
                    cell.mesh.material.opacity = Math.max(0, 1 - cell.fade);
                }
            }
        }
    }

    isTargetable(row, col) {
        const cell = this.cells[row][col];

        if (!cell.alive) {
            return false;
        }

        return !this.isNeighborAlive(row - 1, col) || !this.isNeighborAlive(row + 1, col) || !this.isNeighborAlive(row, col - 1) || !this.isNeighborAlive(row, col + 1);
    }

    isNeighborAlive(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return false;
        }

        return this.cells[row][col].alive;
    }

    getWorldPosition(row, col) {
        const cell = this.cells[row][col];

        return cell ? cell.mesh.position : null;
    }

    findTargetForShot(side, shooterPosition, shooterColor) {
        const left = this.position.x - ((this.cols - 1) * this.step) / 2;
        const top = this.position.y + ((this.rows - 1) * this.step) / 2;
        const alignmentTolerance = this.step * 0.35;
        let targetRow;
        let targetCol;
        let cell;
        let row;
        let col;

        if (side === 'top' || side === 'bottom') {
            if (Math.abs(shooterPosition.x - this.position.x) > (this.bounds.width / 2) + this.step) {
                return null;
            }

            targetCol = Math.round((shooterPosition.x - left) / this.step);

            if (targetCol < 0 || targetCol >= this.cols) {
                return null;
            }

            if (side === 'top') {
                for (row = 0; row < this.rows; row += 1) {
                    cell = this.cells[row][targetCol];

                    if (!cell.alive) {
                        continue;
                    }

                    return cell.color === shooterColor ? cell.mesh : null;
                }
            } else {
                for (row = this.rows - 1; row >= 0; row -= 1) {
                    cell = this.cells[row][targetCol];

                    if (!cell.alive) {
                        continue;
                    }

                    return cell.color === shooterColor ? cell.mesh : null;
                }
            }

            return null;
        }

        if (Math.abs(shooterPosition.y - this.position.y) > (this.bounds.height / 2) + this.step) {
            return null;
        }

        targetRow = Math.round((top - shooterPosition.y) / this.step);

        if (targetRow < 0 || targetRow >= this.rows) {
            return null;
        }

        if (side === 'left') {
            for (col = 0; col < this.cols; col += 1) {
                cell = this.cells[targetRow][col];

                if (!cell.alive) {
                    continue;
                }

                return cell.color === shooterColor ? cell.mesh : null;
            }

            return null;
        }

        if (side === 'right') {
            for (col = this.cols - 1; col >= 0; col -= 1) {
                cell = this.cells[targetRow][col];

                if (!cell.alive) {
                    continue;
                }

                return cell.color === shooterColor ? cell.mesh : null;
            }

            return null;
        }

        return null;
    }

    destroyCell(mesh) {
        const cell = this.cells[mesh.userData.row]?.[mesh.userData.col];

        if (!cell || !cell.alive) {
            return false;
        }

        cell.alive = false;
        cell.mesh.userData.alive = false;
        cell.fade = 0;
        this.remainingCount = Math.max(0, this.remainingCount - 1);

        if (this.onCellDestroyed) {
            this.onCellDestroyed(cell);
        }

        return true;
    }
}