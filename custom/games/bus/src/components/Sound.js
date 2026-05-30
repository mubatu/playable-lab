export class Sound {
    constructor(src, loop = false, volume = 1.0) {
        this.audio = new Audio(src);
        this.audio.loop = loop;
        this.audio.volume = volume;

        // Allows overlapping sound effects (like multiple rapid explosions)
        this.isSoundEffect = !loop;
    }

    play() {
        if (this.isSoundEffect) {
            // Reset to the beginning so we can spam the sound effect rapidly
            this.audio.currentTime = 0;
        }

        // Browsers block audio before the first user interaction.
        // Catching the promise prevents ugly red errors in the console.
        this.audio.play().catch(err => {
            console.warn("Audio playback blocked by browser pending user interaction.");
        });
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
    }

    setVolume(vol) {
        this.audio.volume = vol;
    }
}