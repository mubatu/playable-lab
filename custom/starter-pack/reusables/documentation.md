# Reusables Documentation

This folder contains shared helpers for playable ads. Use these modules before copying code into a new game. Most files are browser ES modules, imported from a game file with a relative path such as:

```js
import { UIScene } from '../../../../reusables/UIScene/UIScene.js';
import { SceneSetup } from '../../../../reusables/components/SceneSetup.js';
```

`HandTutorial.js` is the exception: it is an IIFE script that attaches `window.HandTutorial`, so load it with a `<script>` tag or import it only for side effects.

## Quick Selection Guide

| Need | Import or include | Notes |
| --- | --- | --- |
| Build DOM HUD from config | `UIScene/UIScene.js` | Supports buttons, joystick, intro overlay, deploy badge, progress bar, toggle, card rail, and score display categories. |
| Read a HUD element after build | `uiScene.getByConfigId(id)` | Returns the element instance so game code can call methods like `setValue`, `show`, `hide`, or `setCount`. |
| Full-screen start/end modal | `UIScene` category `introOverlays` or direct `UIIntroOverlay` | Includes title, subtitle, CTA button, `show()`, and `hide()`. |
| Score or counter display | `UIScene` category `scoreDisplays` or direct `UIScoreDisplay` | Includes `setValue(value)` and `showPopup(text, styles)`. |
| Progress/meter bar | `UIScene` category `progressBars` or direct `UIProgressBar` | Good for match progress, elixir, health, energy, etc. |
| Bottom selectable card strip | `UIScene` category `cardRails` or direct `UIHorizontalCardRail` | Good for troop cards, build palette, or item hand. |
| On-screen movement control | `UIScene` category `joysticks` or direct `UIVirtualJoystick` | Emits a shared `MoveCommand` with normalized `x` and `y`. |
| Reusable CTA or reset button | `UIScene` category `buttons` or direct `UIButton` | Thin DOM button wrapper. |
| Toggle setting | `UIScene` category `toggles` or direct `UIToggle` | Good for sound, FX, auto mode, etc. |
| Unit stock badge | `UIScene` category `deployBadges` or direct `UIDeployBadge` | Shows portrait-like block and `remaining/total` count. |
| Word game letter wheel | Direct `UIWordLetterWheel` or `word-wheel/LetterWheel` | Not currently registered in `UIScene` factory map; instantiate directly. Requires game CSS for `.wow-*` classes. |
| Word game answer slots | Direct `word-wheel/WordSlots` | Pooled DOM slots with progress, wrong, and solved states. Requires game CSS for `.wow-*` classes. |
| Hand/tap/drag tutorial overlay | `<script src="../../reusables/components/HandTutorial.js"></script>` | Creates `window.HandTutorial`. Call `update(now)` inside the animation loop. |
| Load JSON config | `components/ConfigLoader.js` | Uses `fetch`; run games from a server, not bare file URLs. |
| Standard Three renderer/camera sizing | `components/SceneSetup.js` | Handles pixel ratio, renderer size, color space, and orthographic camera fitting. |
| Background plane from texture | `components/Background.js` | Creates a mesh sized from source aspect and world height. |
| Load textures with correct filters/color space | `components/TextureUtils.js` | Promise-based `load` and `loadAll`. |
| Generate simple canvas textures | `components/VisualUtils.js` | Rounded white rectangle or vertical gradient textures. |
| Track update/render objects | `components/SceneManager.js` | Adds/removes Three objects, calls optional `update(delta)`, renders scene. |
| Reuse objects | `components/ObjectPool.js` | Generic object pool with optional reset callback. |
| Pointer drag in Three world space | `components/DragController.js` | Raycasts against `targetGroup.children` and moves selected object on a plane. |
| Simple DOM timer | `components/Timer.js` | Linear or circular countdown appended to `document.body`. |
| Audio wrapper | `components/Sound.js` | Handles loop, volume, replayable SFX, and blocked-play promise catches. |
| River bridge steering | `components/RiverBridgePathfinder.js` | For XZ-plane arena movement that must cross fixed bridge X positions. |
| Three global bundle | `vendor/three.min.js` | Use in static games with an import map that maps `"three"` to a local module wrapper. |

## Import Conventions

Static browser games in this repo usually load vendored Three globally:

```html
<script src="../../reusables/vendor/three.min.js"></script>
<script src="../../reusables/components/HandTutorial.js"></script>
<script type="importmap">
{
  "imports": {
    "three": "./src/js/lib/three-global-module.js"
  }
}
</script>
<script type="module" src="src/js/main.js"></script>
```

Reusable modules that say `import * as THREE from 'three'` expect the game to provide a `"three"` import-map entry or a bundler dependency. Existing static games use a local `three-global-module.js` wrapper that re-exports members from `window.THREE`.

## UIScene System

### `UIScene/UIScene.js`

`UIScene` is the main HUD factory. It creates one absolute `#ui-layer` container over the whole page and instantiates elements from a settings object.

```js
const uiScene = new UIScene({
  scoreDisplays: [{ id: 'score', label: 'Score', initialValue: 0 }],
  buttons: [{ id: 'restart', text: 'Restart', onClick: resetGame }],
  introOverlays: [{ id: 'end', visible: false, title: 'Game Over' }]
});

const scoreDisplay = uiScene.getByConfigId('score');
scoreDisplay.setValue(100);
```

Recognized settings categories:

- `buttons` -> `UIButton`
- `joysticks` -> `UIVirtualJoystick`
- `introOverlays` -> `UIIntroOverlay`
- `deployBadges` -> `UIDeployBadge`
- `progressBars` -> `UIProgressBar`
- `toggles` -> `UIToggle`
- `cardRails` -> `UIHorizontalCardRail`
- `scoreDisplays` -> `UIScoreDisplay`

Useful methods:

- `getByConfigId(id)` returns the built element instance whose `config.id` matches.
- `destroy()` destroys all built UI elements and removes the `#ui-layer`.

Use `UIScene` when a playable needs multiple HUD pieces and you want config-driven setup. Import a specific UI element directly when it is not in the factory map or when the game already owns its own HUD container.

### `UIScene/UISceneSettings.js`

Preset settings builders for common playable layouts:

- `getCocPlayableUIConfig(barbarianStock)` returns an intro overlay and deploy badge for Clash of Clans-style placement playables. The default CTA dispatches `coc-play-clicked`.
- `getRoyalePlayableUIConfig(options)` returns an intro overlay, elixir progress bar, and card rail. Options: `onPrimaryClick`, `onCardActivate`, `cardItems`, `elixirMax`, `elixirInitial`.
- `getClashRoyalGptPlayableUIConfig(options)` is the same pattern as Royale but uses distinct ids and copy for a Clash Royale GPT playable.
- `UISettings` is a small default/example config with a `PLAY NOW` button and movement joystick.

Merge these presets into a `new UIScene(...)` settings object, then grab built instances with `getByConfigId`.

### `UIScene/UISceneElements/UISceneElement.js`

Base class for DOM UI elements. It stores `config`, `container`, and `element`, and provides:

- `build()` abstract method that subclasses must implement.
- `activate()` sets `pointerEvents` to `auto`.
- `deactivate()` sets `pointerEvents` to `none`.
- `destroy()` removes the DOM element.

Use this as the parent class when adding a new reusable UI element.

### `UIScene/UISceneElements/UIButton.js`

Thin DOM button wrapper.

Config:

- `id`: DOM id.
- `text`: button text.
- `styles`: object assigned to `button.style`.
- `onClick`: optional click handler.

Use for simple reset, CTA, retry, or debug buttons. It is registered under `buttons` in `UIScene`.

### `UIScene/UISceneElements/UIVirtualJoystick.js`

On-screen joystick for touch or pointer movement. It creates a circular base and thumbstick, then exposes a normalized `MoveCommand`.

Config:

- `id`: optional DOM id, defaults to `virtual-joystick-base`.
- `maxRadius`: thumb travel radius in pixels, defaults to `50`.
- `styles`: CSS applied to the base.
- `onInit(command)`: receives the `MoveCommand` instance.

Runtime behavior:

- `command.x` and `command.y` are normalized from `-1` to `1`.
- Pointer move/up listeners are attached to `window` while active.
- `destroy()` removes listeners and DOM.

Use for character movement, camera panning, or any continuous directional input.

### `UIScene/UISceneElements/UIIntroOverlay.js`

Full-screen overlay with title, subtitle, and primary button. Registered under `introOverlays`.

Config:

- `id`: optional DOM id, defaults to `rs-ui-intro`.
- `visible`: visible by default; set `false` for hidden initial state.
- `title`, `subtitle`, `buttonText`, `buttonId`.
- `onPrimaryClick`: callback for CTA.
- `styles.overlay`, `styles.title`, `styles.subtitle`, `styles.button`: style overrides.

Methods:

- `show()` and `hide()`.
- `setTitle(title)`, `setSubtitle(subtitle)`, `setButtonText(text)`.

Use for start screens, win/lose panels, restart prompts, or user interaction gates.

### `UIScene/UISceneElements/UIDeployBadge.js`

Small fixed-position badge that displays a portrait-like visual and count text. Registered under `deployBadges`.

Config:

- `id`: optional DOM id, defaults to `rs-deploy-badge`.
- `initialText`: count text such as `5/5`.
- `portraitBackground`: CSS background for the portrait block.
- `styles.wrapper`: CSS applied to the badge root.

Methods:

- `setCount(remaining, total)` updates text to `remaining/total`.
- `getCenter()` returns `{ x, y }` screen coordinates for tutorial targeting.

Use for unit stock, remaining moves, inventory charges, or any compact count badge.

### `UIScene/UISceneElements/UIProgressBar.js`

Horizontal progress bar with optional centered text. Registered under `progressBars`.

Config:

- `id`: DOM id.
- `initialValue`: defaults to `0`.
- `max`: defaults to `100`.
- `showText`: set `false` to hide text.
- `textFormat(value, max)`: formatter, defaults to percentage text.
- `styles`: CSS applied to the root element.

Useful instance fields for polishing:

- `containerDiv`: outer bar.
- `fill`: fill element.
- `text`: text element when `showText` is enabled.

Methods:

- `setValue(newValue)` clamps between `0` and `max`.
- `setMax(newMax)`.

Use for match progress, timer progress, health, power, elixir, objective completion, etc.

### `UIScene/UISceneElements/UIToggle.js`

Clickable on/off toggle. Registered under `toggles`.

Config:

- `id`: DOM id.
- `initialState`: boolean, defaults to `false`.
- `onToggle(isOn)`: callback after state changes.
- `labels`: optional `{ on, off }`, defaults to `ON` / `OFF`.
- `styles`: CSS applied to root.

Methods:

- `toggle()`.
- `setState(state)`.

Use for sound, FX, difficulty mode, auto-play, or feature flags inside a playable.

### `UIScene/UISceneElements/UIHorizontalCardRail.js`

Bottom horizontal strip of selectable cards. Registered under `cardRails`.

Config:

- `id`: optional DOM id, defaults to `rs-ui-card-rail`.
- `items`: array of card items. Each item can use `title`, `label`, `id`, `cost`, `accentColor` or `accent`, and `locked`.
- `selectedIndex`: initial selected slot, defaults to `0`.
- `onItemActivate(index, item)`: callback when a non-disabled slot is clicked.
- `styles.rail`: CSS applied to the rail root.

Methods:

- `setSelectedIndex(index)`.
- `syncSelection()`.
- `applyElixirAvailability(availableElixir)` disables cards whose `cost` is higher than available elixir, or whose `item.locked` is true.
- `setItemLocked(index, locked)`.
- `getSlotScreenFraction(index)` returns normalized screen coordinates for `HandTutorial`.
- `getSelectedItem()`.

Use for Clash Royale-style hands, troop cards, build palettes, power-up choices, or any compact selectable item row.

### `UIScene/UISceneElements/UIScoreDisplay.js`

Label plus numeric value display. Registered under `scoreDisplays`.

Config:

- `id`: DOM id.
- `label`: label text, defaults to `Score`.
- `initialValue`: defaults to `0`.
- `styles`: root CSS.
- `labelStyles`: CSS for label.
- `valueStyles`: CSS for value.

Methods:

- `setValue(value)`.
- `showPopup(text, styles)` creates a short floating popup near the display and removes it after animation.

Use for score, coins, moves, combo count, or lightweight status values.

### `UIScene/UISceneElements/UIWordLetterWheel.js`

DOM letter wheel for word games. It extends `UISceneElement`, but it is not currently registered in `UIScene`'s factory map, so instantiate it directly.

```js
const wheel = new UIWordLetterWheel({
  letters: ['p', 'l', 'a', 'y'],
  onSelectionChange: (letters, indices) => {},
  onSelectionCommit: (letters, indices) => {}
}, hudContainer);
wheel.build();
```

Config:

- `letters`: array of letters displayed around the wheel.
- `onSelectionStart(letters, indices)`.
- `onSelectionChange(letters, indices)`.
- `onSelectionCommit(letters, indices)`.

Methods:

- `setLetters(letters)`.
- `clearSelection()`.
- `getSelectedLetters()`.
- `getTileCenter(index)` returns pixel coordinates.
- `getTileCenterNormalized(index)` returns `{ space: 'screen', x, y }` for `HandTutorial`.
- `destroy()`.

It uses pooled letter tile DOM elements via `DOMElementPool` and `WordUnitFactory`. The class names are `.wow-letter-wheel`, `.wow-letter-wheel__tile`, `.wow-letter-wheel__path`, and related classes; include matching CSS in the game.

## Word Wheel Helpers

These live in `UIScene/UISceneElements/word-wheel/`. They can be used directly in a word game or treated as implementation details of `UIWordLetterWheel`.

### `LetterWheel.js`

Standalone non-`UISceneElement` version of the letter wheel. Constructor options:

- `container`.
- `letters`.
- `onSelectionStart`, `onSelectionChange`, `onSelectionCommit`.

Call `build()` after construction. Methods mirror `UIWordLetterWheel`: `setLetters`, `clearSelection`, `getSelectedLetters`, `getTileCenter`, `getTileCenterNormalized`, and `destroy`.

Use this when you have a custom HUD container and do not want the `UISceneElement` base class. It creates fresh DOM buttons rather than using `DOMElementPool`.

### `WordSlots.js`

Pooled answer slots for word games.

```js
const slots = new WordSlots({ container: hudContainer });
slots.build();
slots.setWord('PLAY');
slots.setProgress(['P', 'L']);
```

Methods:

- `build()`.
- `setWord(word)` creates one slot per letter.
- `setProgress(letters)` fills visible progress.
- `flashWrong()` toggles `.is-wrong` to replay a wrong-attempt animation.
- `markSolved()` toggles `.is-solved` briefly.
- `destroy()`.

Requires CSS for `.wow-word-slots`, `.wow-word-slots__slot`, `.is-filled`, `.is-wrong`, and `.is-solved`.

### `DOMElementPool.js`

Tiny DOM element pool used by word wheel pieces.

- `new DOMElementPool(createFn, resetFn)`.
- `acquire()` returns an available element or creates one.
- `release(element)` runs `resetFn` and stores it for reuse.

Use for frequently recreated DOM nodes where allocation churn matters.

### `WordUnitFactory.js`

Factory for word-game DOM units:

- `createLetterTile(pointerDownHandler)` returns a button with class `.wow-letter-wheel__tile`.
- `createWordSlot()` returns a div with class `.wow-word-slots__slot`.

Use with `DOMElementPool` or custom word-game UI.

## Components

### `components/ConfigLoader.js`

Promise-based JSON loader.

- `ConfigLoader.load(path)` fetches and parses JSON, rejecting when the response is not OK.
- `ConfigLoader.loadWithDefaults(path, defaults)` loads JSON and deep-merges it over defaults.

Use for game config files such as `src/config/game-config.json`. Because it uses `fetch`, the playable must be run from a local/dev server.

### `components/SceneSetup.js`

Three.js renderer and orthographic camera setup helpers.

- `SceneSetup.configureRenderer(renderer)` sets pixel ratio, canvas size, and sRGB color output when available.
- `SceneSetup.calculateBackgroundSize(backgroundConfig)` returns `{ width, height }` from `sourceWidth`, `sourceHeight`, and `worldHeight`.
- `SceneSetup.fitOrthographicCamera(camera, backgroundSize)` fits the camera to the background while preserving aspect ratio, then positions it at `(0, 0, 10)`.

Use at game startup and on `resize`.

### `components/Background.js`

Creates a textured Three.js plane from config.

Config:

- `sourceWidth`, `sourceHeight`: source asset dimensions used for aspect ratio.
- `worldHeight`: target plane height in world units.
- `z`: optional z position, defaults to `-5`.

Instance fields:

- `size`: `{ width, height }`.
- `geometry`, `material`, `mesh`.

Call `destroy()` to remove from parent and dispose geometry/material. Use for full-screen/static backgrounds or gradient texture planes.

### `components/TextureUtils.js`

Texture loading helpers.

- `TextureUtils.setColorSpace(texture)` sets linear min/mag filters and sRGB color space/encoding when available.
- `TextureUtils.load(path)` returns a Promise for one texture.
- `TextureUtils.loadAll(paths)` returns a Promise for all paths.

Use when loading PNG/JPG assets for Three materials.

### `components/VisualUtils.js`

Canvas texture generators.

- `createRoundedRectTexture(size, radius)` returns a white rounded-rectangle `THREE.CanvasTexture`.
- `createGradientTexture(topColor, bottomColor, width, height)` returns a vertical gradient `THREE.CanvasTexture`; defaults to `4x8` if size is omitted.

Use for procedural board cells, slots, tiles, soft UI meshes, and simple backgrounds.

### `components/SceneManager.js`

Small Three scene coordinator.

- `new SceneManager(scene, renderer)`.
- `addObject(object)` adds to scene, tracks it, and returns it.
- `removeObject(object)` removes from scene and tracking.
- `update(delta)` calls `obj.update(delta)` for tracked objects that define `update`.
- `render(camera)` calls `renderer.render(scene, camera)`.

Use when game objects can own their own update functions and you want a lightweight central loop.

### `components/ObjectPool.js`

Generic object pool.

```js
const pool = new ObjectPool(createParticle, resetParticle, 40);
const particle = pool.get();
pool.release(particle);
```

Constructor:

- `createFunc`: creates a new object.
- `resetFunc`: optional cleanup before returning to pool.
- `initialSize`: number of pre-created objects, defaults to `10`.

Runtime:

- `get()` returns an inactive object or creates one.
- `release(obj)` only releases objects currently marked active.

Use for particles, temporary meshes, DOM nodes, bullets, or other repeated allocations.

### `components/PoolFactory.js`

Placeholder base class for factory-style pools. The constructor only logs `"Override Pool Factory"`.

Use as a semantic parent if creating a concrete pool factory, but do not instantiate it directly for pooling behavior.

### `components/ParticleFactory.js`

Concrete factory that creates an `ObjectPool` of shared-geometry Three box particles.

- `ParticleFactory.createPool(scene, initialSize = 50)` returns an `ObjectPool`.
- Each particle has shared `BoxGeometry` and `MeshBasicMaterial`, `visible = false`, and `userData.velocity`, `life`, and `maxLife`.
- Reset hides the particle, moves it off-screen, resets transform, opacity, velocity, and life.

Use for simple golden box burst effects. Note: this file currently imports `./PoolFactory` and `./ObjectPool` without `.js`, so confirm the game's module resolution supports that before using it directly in browser import maps.

### `components/DragController.js`

Pointer drag controller for Three.js objects.

Config:

- `renderer`: Three renderer.
- `camera`: camera used for raycasting.
- `targetGroup`: group whose direct children are draggable hit targets.
- `dragPlane`: optional `THREE.Plane`, defaults to z-plane at `0`.
- `dragZ`: z position during drag, defaults to `0.45`.
- `dragScale`: optional scale while dragging, defaults to `1`.
- `cursorIdle`, `cursorActive`: CSS cursors.
- `onDragStart(object, event)`.
- `onDragMove(object, worldPoint)`.
- `onDragEnd(object, worldPoint, dragState)`.

Methods:

- `bind()` attaches pointer listeners.
- `unbind()` removes listeners.
- `destroy()` unbinds and clears active drag state.
- `getWorldPoint(event)` converts pointer position to a world point on the drag plane.

Use for draggable tiles, blocks, cards, pieces, and placement objects.

### `components/HandTutorial.js`

Animated hand tutorial overlay. This file exposes `window.HandTutorial`.

Include:

```html
<script src="../../reusables/components/HandTutorial.js"></script>
```

Basic usage:

```js
const tutorial = new window.HandTutorial({
  container: document.body,
  renderer,
  camera,
  assetUrl: 'src/assets/hand.png',
  gesture: 'drag',
  from: { space: 'screen', x: 0.25, y: 0.7 },
  to: { space: 'screen', x: 0.75, y: 0.7 },
  loop: true
}).play();

function frame(now) {
  tutorial.update(now);
}
```

Important options:

- `container`: parent DOM element, defaults to `document.body`.
- `renderer`, `camera`: needed for renderer-relative and world-space targeting.
- `assetUrl`: image URL for the hand.
- `gesture`: `tap`, `drag`, `swipe`, `swap`, or `path`; aliases normalize to tap/drag/path behavior.
- `from`, `to`: points for tap/drag gestures.
- `points`: array of points for multi-point paths.
- Point spaces: `{ space: 'screen', x: 0..1, y: 0..1 }`, `{ space: 'pixels', x, y }`, `{ space: 'world', x, y, z }`, or `{ object3D, offset }`.
- `duration`, `loop`, `loopDelay`, `holdDuration`.
- Visual options: `opacity`, `size`, `rotation`, `followDirection`, `flipX`, `flipY`, `anchor`, `offset`, `pressScale`, `idleBobAmplitude`.
- Trail/pulse options: `showTrail`, `trailColor`, `trailWidth`, `pulseColor`, `pulseWidth`, `pulseRadius`.

Methods:

- `play()`, `pause()`, `stop()`.
- `update(now)` should be called every animation frame while playing.
- `setAssetUrl(url)`.
- `setPoints(from, to)`.
- `setConfig(patch)`.
- `destroy()`.

Use to teach tap, drag, swap, or path interactions. Stop or destroy it after the player interacts.

### `components/Timer.js`

DOM countdown timer appended to `document.body`.

Constructor:

- `new Timer(duration, type = 'linear', onComplete)`.
- `type` can be `linear` or `circular`.

Methods:

- `update(delta)` subtracts time, updates visuals, and calls `onComplete` once at zero.
- `destroy()` removes the DOM element.

Use for simple visible countdowns. For highly styled HUD bars, prefer `UIProgressBar` and drive it from game state.

### `components/Sound.js`

Small `Audio` wrapper.

Constructor:

- `new Sound(src, loop = false, volume = 1.0)`.

Methods:

- `play()` resets one-shot sound effects to the start before playing. It catches browser autoplay-block errors.
- `stop()` pauses and resets to `0`.
- `setVolume(vol)`.

Use for lightweight background music or SFX in static playables. Remember browsers usually require user interaction before audio playback.

### `components/RiverBridgePathfinder.js`

2D waypoint helper for units moving on an XZ-plane arena with an impassable river band and fixed bridge x positions.

Constructor options:

- `riverZMin`, `riverZMax`: blocked river band.
- `bridgeXs`: array of bridge center x positions.
- `alignEpsilon`: optional x alignment tolerance, defaults to `0.18`.
- `approachMargin`: optional z margin before/after the river, defaults to `0.35`.

Methods:

- `needsCrossing(fromZ, toZ)` returns whether straight movement crosses the river.
- `getSubTarget(ux, uz, tx, tz)` returns the next `{ x, z }` waypoint, either the final target or a bridge approach/crossing point.

Use for royale-lane or bridge-crossing unit AI.

## Command Helpers

### `Command/MoveCommand.js`

Simple data object used by `UIVirtualJoystick`.

```js
const command = new MoveCommand();
command.x = 0; // -1..1
command.y = 0; // -1..1
```

Use it anywhere you need a normalized 2D movement vector that can be shared between UI input and game simulation.

## Vendor

### `vendor/three.js` and `vendor/three.min.js`

Vendored Three.js builds for static playables. Existing games usually load `three.min.js` in HTML and then map module imports of `"three"` to a local wrapper that re-exports from `window.THREE`.

Use the minified file for playable runtime pages. Use the non-minified file only for debugging or inspection.

## Practical Patterns

### Config-driven HUD

```js
import { UIScene } from '../../../../reusables/UIScene/UIScene.js';

const uiScene = new UIScene({
  progressBars: [
    {
      id: 'match-progress',
      initialValue: 0,
      max: 5,
      textFormat: (value, max) => `${Math.round(value)}/${max}`,
      styles: {
        top: '22px',
        left: '50%',
        width: '58%',
        transform: 'translateX(-50%)'
      }
    }
  ],
  buttons: [
    {
      id: 'restart-button',
      text: 'Restart',
      onClick: resetGame,
      styles: { position: 'absolute', top: '22px', right: '18px' }
    }
  ]
});

const progress = uiScene.getByConfigId('match-progress');
progress.setValue(3);
```

### Three setup

```js
import { SceneSetup } from '../../../../reusables/components/SceneSetup.js';
import { Background } from '../../../../reusables/components/Background.js';
import { createGradientTexture } from '../../../../reusables/components/VisualUtils.js';

SceneSetup.configureRenderer(renderer);

const bgTexture = createGradientTexture('#223355', '#101522', 4, 8);
const background = new Background(config.background, bgTexture);

SceneSetup.fitOrthographicCamera(camera, background.size);
scene.add(background.mesh);
```

### Tutorial target from UI

```js
const rail = uiScene.getByConfigId('royale-hand');
const target = rail.getSlotScreenFraction(0);

const tutorial = new window.HandTutorial({
  assetUrl: 'src/assets/hand.png',
  gesture: 'tap',
  from: target
}).play();
```

## Cleanup Checklist

When a game resets, restarts, or destroys itself:

- Call `uiScene.destroy()` if the whole HUD is being recreated.
- Call `destroy()` on direct UI elements such as `UIWordLetterWheel`, `WordSlots`, `Timer`, and `HandTutorial`.
- Call `DragController.destroy()` or `unbind()` for pointer listeners.
- Release pooled objects through `ObjectPool.release(obj)` before reusing them.
- Dispose Three geometries/materials/textures owned by the game or reusable instance when no longer needed.
