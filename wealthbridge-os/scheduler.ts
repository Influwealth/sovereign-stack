export type TaskStatus = "queued" | "running" | "completed" | "failed";

export interface SchedulerTask {
  id: string;
  capsule: string;
  routeId: string;
  payload: unknown;
  context: {
    actor: string;
    capabilities: string[];
  };
  requestedAt: string;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
}

export interface SchedulerOptions {
  maxConcurrent?: number;
}

export type TaskExecutor = (task: SchedulerTask) => Promise<unknown>;

export class Scheduler {
  private readonly maxConcurrent: number;
  private readonly executor: TaskExecutor;
  private readonly queue: SchedulerTask[] = [];
  private readonly running = new Map<string, SchedulerTask>();
  private readonly history = new Map<string, SchedulerTask>();
  private sequence = 0;

  constructor(executor: TaskExecutor, options: SchedulerOptions = {}) {
    this.executor = executor;
    this.maxConcurrent = options.maxConcurrent ?? 4;
  }

  enqueue(input: Omit<SchedulerTask, "id" | "requestedAt" | "status">): SchedulerTask {
    const task: SchedulerTask = {
      ...input,
      id: `wb-task-${++this.sequence}`,
      requestedAt: new Date().toISOString(),
      status: "queued"
    };

    this.queue.push(task);
    return task;
  }

  async runTick(): Promise<void> {
    while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) {
        return;
      }

      this.running.set(task.id, task);
      task.status = "running";
      task.startedAt = new Date().toISOString();

      void this.execute(task);
    }
  }

  async drain(timeoutMs = 10_000): Promise<void> {
    const started = Date.now();

    while (this.queue.length > 0 || this.running.size > 0) {
      await this.runTick();
      if (Date.now() - started > timeoutMs) {
        throw new Error(`Scheduler drain timed out after ${timeoutMs}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  getSnapshot(): {
    queued: SchedulerTask[];
    running: SchedulerTask[];
    history: SchedulerTask[];
  } {
    return {
      queued: [...this.queue],
      running: [...this.running.values()],
      history: [...this.history.values()]
    };
  }

  private async execute(task: SchedulerTask): Promise<void> {
    try {
      task.result = await this.executor(task);
      task.status = "completed";
    } catch (error) {
      task.status = "failed";
      task.error = String(error);
    } finally {
      task.completedAt = new Date().toISOString();
      this.running.delete(task.id);
      this.history.set(task.id, task);
    }
  }
}
