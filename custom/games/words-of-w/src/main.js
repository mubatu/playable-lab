import { Scene } from './Scene.js';

const gameScene = new Scene({
    wheelLetters: ['R', 'A', 'T', 'E', 'L', 'S', 'N', 'O'],
    targetWords: ['STAR', 'STONE', 'LATE']
});

gameScene.build();
