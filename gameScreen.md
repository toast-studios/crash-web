# Game Screen

```typescript
import { Container } from "pixi.js";

interface Screen extends Container {
  // Static property for asset bundles
  assetBundles: string[];

  // Methods
  prepare?(): void;
  resize(width: number, height: number): void;
  show(): Promise<void>;
  hide(): Promise<void>;
  update?(deltaTime: number): void;
  pause?(): Promise<void>;
  resume?(): Promise<void>;
  blur?(): void;
  focus?(): void;
}
```

**The Screen interface represents the lifecycle of a game screen.**

**The lifecycle includes the following stages:**

1. `prepare()`: An optional method to prepare the screen before showing it. This can include loading assets or setting up initial state.
2. `show()`: An asynchronous method to show the screen with animations. This is called when the screen becomes visible to the player.
3. `resize(width: number, height: number)`: A method to handle resizing of the screen. This ensures that the screen layout adapts to different screen sizes.
4. `update(deltaTime: number)`: An optional method to update the screen's state. This is called on every frame and can be used to update animations or game logic.
5. `pause()`: An optional asynchronous method to pause the screen's activities. This can be used to pause animations or game logic when the game is paused.
6. `resume()`: An optional asynchronous method to resume the screen's activities. This is called when the game is resumed after being paused.
7. `blur()`: An optional method called when the screen loses focus. This can be used to pause activities or save the current state.
8. `focus()`: An optional method called when the screen regains focus. This can be used to resume activities or restore the saved state.
9. `hide()`: An asynchronous method to hide the screen with animations. This is called when the screen is no longer visible to the player.

The `assetBundles` static property lists the asset bundles required by the screen. This helps in preloading the necessary assets before the screen is shown.
