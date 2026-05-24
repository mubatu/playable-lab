declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

interface WebpackContext {
  (key: string): string | { default: string };
  keys(): string[];
}

declare const require: {
  context(directory: string, useSubdirectories: boolean, regExp: RegExp): WebpackContext;
};
