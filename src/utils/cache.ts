export class MessageCache {
  private cache: Set<string>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Set();
    this.maxSize = maxSize;
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  add(id: string): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.values().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.add(id);
  }
}
