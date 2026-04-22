import { AsyncQueue } from "./asyncUtils";

export type FTUEStepCallback = () => void | Promise<void>;

export interface FTUEStep {
  id: string;
  callback: FTUEStepCallback;
  timeout?: number;
  isActive: boolean;
  priority: number; // Lower number means higher priority
  isInProcess: boolean;
}

export class FTUEQueue {
  private queue: AsyncQueue;
  private steps: Map<string, FTUEStep> = new Map();
  private activeStepIds: Set<string> = new Set();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.queue = new AsyncQueue();
  }

  public addStep(
    id: string,
    callback: FTUEStepCallback,
    timeout?: number,
    priority: number = 0,
  ): void {
    this.steps.set(id, {
      id,
      callback,
      timeout,
      isActive: false,
      priority,
      isInProcess: false,
    });
  }

  public startStep(id: string): void {
    const step = this.steps.get(id);
    if (!step) return;

    // Clear any existing timeout for this step
    this.clearTimeout(id);

    // Mark step as active
    step.isActive = true;
    this.activeStepIds.add(id);

    // If there's a timeout, set it up
    if (step.timeout) {
      const timeoutId = setTimeout(() => {
        this.executeStep(id);
      }, step.timeout);
      this.timeouts.set(id, timeoutId);
    } else {
      // Execute immediately if no timeout
      this.executeStep(id);
    }
  }

  public skipStep(id: string): void {
    const step = this.steps.get(id);
    if (!step || !step.isActive) return;

    // Clear any existing timeout
    this.clearTimeout(id);

    // Mark step as inactive
    step.isActive = false;
    this.activeStepIds.delete(id);

    // Execute the step immediately
    this.executeStep(id);
  }

  public skipAllSteps(): void {
    // Clear all timeouts
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();

    // Mark all steps as inactive
    this.steps.forEach((step) => {
      step.isActive = false;
    });
    this.activeStepIds.clear();

    // Clear the queue
    this.queue.clear();
  }

  private clearTimeout(id: string): void {
    const timeoutId = this.timeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(id);
    }
  }

  private async executeStep(id: string): Promise<void> {
    const step = this.steps.get(id);
    if (!step) return;

    if (step.isInProcess) return;
    step.isInProcess = true;

    // Add to queue for execution
    await this.queue.add(async () => {
      try {
        await step.callback();
        this.activeStepIds.delete(id);
      } catch (error) {
        console.error(`Error executing step ${id}:`, error);
      }
    });
  }

  public getActiveStepId(): string | null {
    if (this.activeStepIds.size === 0) return null;

    // Find the active step with the highest priority (lowest number)
    let highestPriorityStep: FTUEStep | null = null;
    let highestPriority = Infinity;

    for (const stepId of this.activeStepIds) {
      const step = this.steps.get(stepId);
      if (step && step.isActive && step.priority < highestPriority) {
        highestPriority = step.priority;
        highestPriorityStep = step;
      }
    }

    return highestPriorityStep?.id || null;
  }

  public isStepActive(id: string): boolean {
    const step = this.steps.get(id);
    return step?.isActive || false;
  }

  public getActiveSteps(): string[] {
    return Array.from(this.activeStepIds);
  }
}
