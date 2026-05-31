import * as THREE from 'three';

function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

export function createTextTexture(text, options = {}) {
    const width = options.width || 256;
    const height = options.height || 128;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    const background = options.background || 'rgba(0, 0, 0, 0)';

    if (background !== 'transparent') {
        ctx.fillStyle = background;
        roundedRect(ctx, 0, 0, width, height, options.radius || 24);
        ctx.fill();
    }

    if (options.borderColor) {
        const borderWidth = options.borderWidth || 4;
        ctx.strokeStyle = options.borderColor;
        ctx.lineWidth = borderWidth;
        roundedRect(ctx, borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth, options.radius || 24);
        ctx.stroke();
    }

    ctx.fillStyle = options.color || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${options.weight || 800} ${options.fontSize || 64}px ${options.fontFamily || 'Arial'}`;
    ctx.fillText(String(text), width / 2, height / 2 + (options.textOffsetY || 0));

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    return texture;
}