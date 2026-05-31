function injectStyles() {
    const styleId = 'pixel-pop-hud-styles';

    if (document.getElementById(styleId)) {
        return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
        '.pixel-pop-hud {',
        '  position: fixed;',
        '  inset: 0;',
        '  pointer-events: none;',
        '  z-index: 20;',
        '  color: #f7fbff;',
        '  font-family: Arial, Helvetica, sans-serif;',
        '}',
        '.pixel-pop-hud__top {',
        '  position: absolute;',
        '  top: 16px;',
        '  left: 16px;',
        '  right: 16px;',
        '  display: flex;',
        '  justify-content: space-between;',
        '  gap: 12px;',
        '  align-items: flex-start;',
        '}',
        '.pixel-pop-hud__brand {',
        '  padding: 12px 16px;',
        '  border-radius: 18px;',
        '  background: rgba(8, 16, 31, 0.72);',
        '  border: 1px solid rgba(175, 208, 255, 0.16);',
        '  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);',
        '  backdrop-filter: blur(10px);',
        '}',
        '.pixel-pop-hud__title {',
        '  font-size: 18px;',
        '  font-weight: 900;',
        '  letter-spacing: 0.18em;',
        '}',
        '.pixel-pop-hud__subtitle {',
        '  margin-top: 6px;',
        '  font-size: 12px;',
        '  color: rgba(247, 251, 255, 0.72);',
        '  max-width: 320px;',
        '  line-height: 1.45;',
        '}',
        '.pixel-pop-hud__stats {',
        '  display: grid;',
        '  grid-template-columns: repeat(2, minmax(120px, auto));',
        '  gap: 10px;',
        '}',
        '.pixel-pop-hud__stat {',
        '  padding: 12px 14px;',
        '  border-radius: 16px;',
        '  background: rgba(15, 26, 51, 0.76);',
        '  border: 1px solid rgba(175, 208, 255, 0.14);',
        '  min-width: 120px;',
        '  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.18);',
        '}',
        '.pixel-pop-hud__stat-label {',
        '  display: block;',
        '  font-size: 10px;',
        '  letter-spacing: 0.16em;',
        '  color: rgba(247, 251, 255, 0.56);',
        '}',
        '.pixel-pop-hud__stat-value {',
        '  display: block;',
        '  margin-top: 4px;',
        '  font-size: 18px;',
        '  font-weight: 800;',
        '}',
        '.pixel-pop-hud__bottom {',
        '  position: absolute;',
        '  left: 16px;',
        '  right: 16px;',
        '  bottom: 16px;',
        '  display: flex;',
        '  justify-content: space-between;',
        '  align-items: flex-end;',
        '  gap: 14px;',
        '}',
        '.pixel-pop-hud__message {',
        '  max-width: 520px;',
        '  padding: 12px 16px;',
        '  border-radius: 16px;',
        '  background: rgba(7, 15, 29, 0.74);',
        '  border: 1px solid rgba(175, 208, 255, 0.14);',
        '  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);',
        '  line-height: 1.5;',
        '}',
        '.pixel-pop-hud__cta {',
        '  pointer-events: auto;',
        '  border: 0;',
        '  border-radius: 18px;',
        '  padding: 14px 24px;',
        '  font-size: 14px;',
        '  font-weight: 900;',
        '  letter-spacing: 0.16em;',
        '  color: #09111f;',
        '  background: linear-gradient(135deg, #d6f8ff 0%, #8fdcff 40%, #ffdf8a 100%);',
        '  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);',
        '  cursor: pointer;',
        '  display: none;',
        '}',
        '.pixel-pop-hud__cta.is-visible {',
        '  display: inline-flex;',
        '}',
        '.pixel-pop-hud__end {',
        '  position: absolute;',
        '  inset: 0;',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  background: rgba(5, 10, 18, 0.45);',
        '  opacity: 0;',
        '  transition: opacity 180ms ease;',
        '}',
        '.pixel-pop-hud__end.is-visible {',
        '  opacity: 1;',
        '}',
        '.pixel-pop-hud__panel {',
        '  pointer-events: auto;',
        '  width: min(380px, calc(100vw - 40px));',
        '  border-radius: 28px;',
        '  padding: 26px 24px;',
        '  background: rgba(9, 17, 31, 0.9);',
        '  border: 1px solid rgba(175, 208, 255, 0.18);',
        '  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35);',
        '  text-align: center;',
        '}',
        '.pixel-pop-hud__panel-title {',
        '  font-size: 28px;',
        '  font-weight: 900;',
        '  margin-bottom: 8px;',
        '}',
        '.pixel-pop-hud__panel-subtitle {',
        '  font-size: 14px;',
        '  line-height: 1.6;',
        '  color: rgba(247, 251, 255, 0.74);',
        '}',
        '.pixel-pop-hud__panel-button {',
        '  margin-top: 18px;',
        '  border: 0;',
        '  border-radius: 16px;',
        '  padding: 14px 22px;',
        '  font-weight: 900;',
        '  letter-spacing: 0.16em;',
        '  background: linear-gradient(135deg, #d6f8ff 0%, #8fdcff 50%, #ffdf8a 100%);',
        '  color: #09111f;',
        '  cursor: pointer;',
        '}'
    ].join('\n');

    document.head.appendChild(style);
}

export class GameHUD {
    constructor() {
        injectStyles();

        this.root = document.createElement('div');
        this.root.className = 'pixel-pop-hud';

        this.top = document.createElement('div');
        this.top.className = 'pixel-pop-hud__top';

        const brand = document.createElement('div');
        brand.className = 'pixel-pop-hud__brand';

        this.title = document.createElement('div');
        this.title.className = 'pixel-pop-hud__title';
        this.title.textContent = 'PIXEL POP';

        this.subtitle = document.createElement('div');
        this.subtitle.className = 'pixel-pop-hud__subtitle';
        this.subtitle.textContent = 'Fire the front shooter in any queue. Edge pixels must fall before the inner image can be hit.';

        brand.appendChild(this.title);
        brand.appendChild(this.subtitle);

        this.stats = document.createElement('div');
        this.stats.className = 'pixel-pop-hud__stats';

        this.progressStat = this.createStat('Pixels', '0 / 0');
        this.bucketStat = this.createStat('Bucket', '0 / 5');
        this.queueStat = this.createStat('Queues', '0');
        this.statusStat = this.createStat('State', 'PLAYING');

        this.stats.appendChild(this.progressStat);
        this.stats.appendChild(this.bucketStat);
        this.stats.appendChild(this.queueStat);
        this.stats.appendChild(this.statusStat);

        this.top.appendChild(brand);
        this.top.appendChild(this.stats);

        this.bottom = document.createElement('div');
        this.bottom.className = 'pixel-pop-hud__bottom';

        this.message = document.createElement('div');
        this.message.className = 'pixel-pop-hud__message';

        this.cta = document.createElement('button');
        this.cta.type = 'button';
        this.cta.className = 'pixel-pop-hud__cta';
        this.cta.textContent = 'PLAY NOW';

        this.bottom.appendChild(this.message);
        this.bottom.appendChild(this.cta);

        this.end = document.createElement('div');
        this.end.className = 'pixel-pop-hud__end';

        this.panel = document.createElement('div');
        this.panel.className = 'pixel-pop-hud__panel';

        this.panelTitle = document.createElement('div');
        this.panelTitle.className = 'pixel-pop-hud__panel-title';

        this.panelSubtitle = document.createElement('div');
        this.panelSubtitle.className = 'pixel-pop-hud__panel-subtitle';

        this.panelButton = document.createElement('button');
        this.panelButton.type = 'button';
        this.panelButton.className = 'pixel-pop-hud__panel-button';

        this.panel.appendChild(this.panelTitle);
        this.panel.appendChild(this.panelSubtitle);
        this.panel.appendChild(this.panelButton);
        this.end.appendChild(this.panel);

        this.root.appendChild(this.top);
        this.root.appendChild(this.bottom);
        this.root.appendChild(this.end);
        document.body.appendChild(this.root);
    }

    createStat(label, value) {
        const wrapper = document.createElement('div');
        wrapper.className = 'pixel-pop-hud__stat';

        const labelEl = document.createElement('span');
        labelEl.className = 'pixel-pop-hud__stat-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('span');
        valueEl.className = 'pixel-pop-hud__stat-value';
        valueEl.textContent = value;

        wrapper.appendChild(labelEl);
        wrapper.appendChild(valueEl);
        wrapper.valueEl = valueEl;

        return wrapper;
    }

    setProgress(remaining, total) {
        this.progressStat.valueEl.textContent = `${remaining} / ${total}`;
    }

    setBucket(count, max) {
        this.bucketStat.valueEl.textContent = `${count} / ${max}`;
    }

    setQueueInfo(queueCounts) {
        this.queueStat.valueEl.textContent = queueCounts.join(' | ');
    }

    setMessage(text) {
        this.message.textContent = text;
    }

    setState(text) {
        this.statusStat.valueEl.textContent = text;
    }

    showEnd(title, subtitle, buttonText, onClick) {
        this.panelTitle.textContent = title;
        this.panelSubtitle.textContent = subtitle;
        this.panelButton.textContent = buttonText;
        this.panelButton.onclick = onClick || null;
        this.end.classList.add('is-visible');
        this.cta.classList.add('is-visible');
        this.cta.textContent = buttonText;
        this.cta.onclick = onClick || null;
        this.setState(title.toUpperCase());
    }

    destroy() {
        this.root?.remove();
    }
}