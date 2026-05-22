interface EndScreenOptions {
  onInstall: () => void;
}

export class EndScreen {
  private readonly element: HTMLDivElement;
  private readonly scoreElement: HTMLParagraphElement;

  constructor(parent: HTMLElement, options: EndScreenOptions) {
    this.element = document.createElement('div');
    this.element.className = 'catcher-end';

    const title = document.createElement('h1');
    title.className = 'catcher-end__title';
    title.textContent = 'Great Catch';

    this.scoreElement = document.createElement('p');
    this.scoreElement.className = 'catcher-end__score';

    const button = document.createElement('button');
    button.className = 'catcher-end__cta';
    button.type = 'button';
    button.textContent = 'Play Now';
    button.addEventListener('click', options.onInstall);

    this.element.append(title, this.scoreElement, button);
    parent.append(this.element);
  }

  show(score: number, targetScore: number): void {
    this.scoreElement.textContent = `${score}/${targetScore}`;
    this.element.classList.add('is-visible');
  }

  hide(): void {
    this.element.classList.remove('is-visible');
  }
}
