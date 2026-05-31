
export class MoveCommand {
    constructor() {
        this.x = 0; // Normalized -1 to 1
        this.y = 0; // Normalized -1 to 1
    }

    execute(target, speed) {
        if (this.x === 0 && this.y === 0) return;

        target.position.x += this.x * speed;
        target.position.y -= this.y * speed;
    }
}