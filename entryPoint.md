# Entry Point

```typescript
interface AppEntryPoint {
  app: Application;
  navigation: Navigation;

  init(): Promise<void>;
  resize(): void;
  visibilityChange(): void;
}
```

**The Entry Point interface represents the entry point of the application.**

**The Entry Point interface includes the following properties:**

1. `app`: The PIXI.js Application instance.
2. `navigation`: The Navigation instance for managing screen transitions.

**The Entry Point interface includes the following methods:**

1. `init()`: Handles the initialization of the application, including setting up the PIXI.js app, event listeners, asset loading, and initial navigation.
2. `resize()`: Handles window resizing.
3. `visibilityChange()`: Handles changes in document visibility.
