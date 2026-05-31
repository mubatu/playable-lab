export class DOMElementPool {
    constructor(createFn, resetFn = null) {
        this.createFn = createFn;
        this.resetFn = resetFn || (() => {});
        this.available = [];
    }

    acquire() {
        if (this.available.length > 0) {
            return this.available.pop();
        }

        return this.createFn();
    }

    release(element) {
        this.resetFn(element);
        this.available.push(element);
    }
}
