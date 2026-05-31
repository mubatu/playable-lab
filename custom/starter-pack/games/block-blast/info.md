#### Cursor > Opus 4.6 (high)
- Aylık kotanın %5'ini kullandı.
- Yaklaşık 15 dk sürdü.
- İlk prompt sonrası oyun çalışmadı, 1 prompt daha yazıp hatayı fixletmem gerekti.

#### Kullandığı modüller:
- ConfigLoader
- SceneSetup
- Background
- ObjectPool
- HandTutorial
- UIScene

#### Promptlar:
```
Your task is to implement a playable ad under folder @playable-ads/games/block-blast 

The gdd is there @playable-ads/games/block-blast/GDD.md .

You must use components and UI scene modules that we created before in @playable-ads/reusables .

Use @playable-ads/games/merge-mystery game as a reference for reusable usages, folder structure, and everything.
```

```
Great implementation!

Unfortunately, there is a blank page in index.html.

Fix these:
index.html:10 Refused to apply style from 'http://127.0.0.1:5500/playable-ads/games/block-blast/css/style.css' because its MIME type ('text/html') is not a supported stylesheet MIME type, and strict MIME checking is enabled.
index.html:22  GET http://127.0.0.1:5500/playable-ads/games/block-blast/js/main.js net::ERR_ABORTED 404 (Not Found)
three.min.js:1 Scripts "build/three.js" and "build/three.min.js" are deprecated with r150+, and will be removed with r160. Please use ES Modules or alternatives: https://threejs.org/docs/index.html#manual/en/introduction/Installation
(anonymous) @ three.min.js:1
```
