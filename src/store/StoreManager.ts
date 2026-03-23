type Listener<T> = (state: T) => void;

class StoreManager<T extends object> {
  private state: T;
  private listeners: Set<Listener<T>> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return { ...this.state };
  }

  setState(partialState: Partial<T>): void {
    const newState = { ...this.state, ...partialState };
    this.state = newState;
    this.notifyListeners();
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }
}

// Define your game state interface
interface GameState {
  playerName: string;
  score: number;
  level: number;
  // Add more properties as needed
}

// Create and export a singleton instance of StoreManager
const initialState: GameState = {
  playerName: "",
  score: 0,
  level: 1,
};

export const gameStore = new StoreManager<GameState>(initialState);
