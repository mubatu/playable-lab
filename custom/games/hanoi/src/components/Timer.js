// src/components/Timer.js

export class Timer {
    constructor(duration, type = 'linear', onComplete) {
        this.duration = duration;
        this.timeRemaining = duration;
        this.type = type; // 'linear' or 'circular'
        this.onComplete = onComplete;
        this.isFinished = false;

        this.element = document.createElement('div');
        this.buildUI();
        document.body.appendChild(this.element);
    }

    buildUI() {
        // Shared container styles
        this.element.style.position = 'absolute';
        this.element.style.top = '20px';
        this.element.style.left = '50%';
        this.element.style.transform = 'translateX(-50%)';
        this.element.style.zIndex = '100';
        this.element.style.userSelect = 'none';

        if (this.type === 'linear') {
            this.element.style.width = '200px';
            this.element.style.height = '20px';
            this.element.style.backgroundColor = 'rgba(0,0,0,0.5)';
            this.element.style.borderRadius = '10px';
            this.element.style.overflow = 'hidden';
            this.element.style.border = '2px solid #fff';

            // The inner filling
            this.fill = document.createElement('div');
            this.fill.style.width = '100%';
            this.fill.style.height = '100%';
            this.fill.style.backgroundColor = '#4CAF50';
            this.fill.style.transformOrigin = 'left center'; // Scale from the left
            this.element.appendChild(this.fill);

        } else if (this.type === 'circular') {
            this.element.style.width = '60px';
            this.element.style.height = '60px';
            this.element.style.borderRadius = '50%';
            this.element.style.border = '3px solid #fff';
            this.element.style.background = `conic-gradient(#4CAF50 360deg, rgba(0,0,0,0.5) 0deg)`;
            this.element.style.display = 'flex';
            this.element.style.alignItems = 'center';
            this.element.style.justifyContent = 'center';
            this.element.style.color = '#fff';
            this.element.style.fontFamily = 'Arial, sans-serif';
            this.element.style.fontWeight = 'bold';
            this.element.style.fontSize = '24px';
            this.element.style.textShadow = '1px 1px 2px #000';

            // The text number in the center
            this.text = document.createElement('span');
            this.text.innerText = Math.ceil(this.duration);
            this.element.appendChild(this.text);
        }
    }

    update(delta) {
        if (this.isFinished) return;

        this.timeRemaining -= delta;

        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.isFinished = true;
            if (this.onComplete) this.onComplete();
        }

        const percentage = this.timeRemaining / this.duration;
        const color = percentage < 0.25 ? '#ff4d4d' : '#4CAF50'; // Turn red at 25%

        if (this.type === 'linear') {
            // Using transform: scaleX is highly optimized by the browser
            this.fill.style.transform = `scaleX(${percentage})`;
            this.fill.style.backgroundColor = color;
        } else if (this.type === 'circular') {
            // Update the CSS conic-gradient angle
            const degrees = percentage * 360;
            this.element.style.background = `conic-gradient(${color} ${degrees}deg, rgba(0,0,0,0.5) 0deg)`;
            this.text.innerText = Math.ceil(this.timeRemaining);
        }
    }

    // Call this if the player wins/loses and you need to hide the timer
    destroy() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}