export class WordUnitFactory {
    static createLetterTile(pointerDownHandler) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'wow-letter-wheel__tile';
        tile.addEventListener('pointerdown', pointerDownHandler);
        return tile;
    }

    static createWordSlot() {
        const slot = document.createElement('div');
        slot.className = 'wow-word-slots__slot';
        return slot;
    }
}
