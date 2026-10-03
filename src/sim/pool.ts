/**
 * Fixed-identity object pool. Items are reused via an `alive` flag; the backing
 * array only grows, so steady-state ticks allocate nothing.
 */
export class Pool<T extends { alive: boolean }> {
  readonly items: T[] = [];

  constructor(
    private readonly create: () => T,
    initialCapacity = 0,
  ) {
    for (let i = 0; i < initialCapacity; i++) this.items.push(create());
  }

  /** Returns a dead item (marked alive) for the caller to initialise. */
  acquire(): T {
    for (const item of this.items) {
      if (!item.alive) {
        item.alive = true;
        return item;
      }
    }
    const item = this.create();
    item.alive = true;
    this.items.push(item);
    return item;
  }

  countAlive(): number {
    let n = 0;
    for (const item of this.items) if (item.alive) n++;
    return n;
  }

  clear(): void {
    for (const item of this.items) item.alive = false;
  }
}
