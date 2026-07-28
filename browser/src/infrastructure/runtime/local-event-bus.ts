import type { EventBus } from "../../core/contracts/services";
import type { DomainEvent } from "../../core/models/events";

type Listener = (event: DomainEvent) => void;

export class LocalEventBus implements EventBus {
  private readonly listeners = new Map<string, Set<Listener>>();

  publish(event: DomainEvent): void {
    this.emit(event.type, event);
    this.emit("*", event);
  }

  subscribe(eventType: string, listener: Listener): () => void {
    const bucket = this.listeners.get(eventType) ?? new Set<Listener>();
    bucket.add(listener);
    this.listeners.set(eventType, bucket);

    return () => {
      const activeBucket = this.listeners.get(eventType);
      if (!activeBucket) {
        return;
      }

      activeBucket.delete(listener);

      if (activeBucket.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  private emit(eventType: string, event: DomainEvent): void {
    const bucket = this.listeners.get(eventType);
    if (!bucket) {
      return;
    }

    for (const listener of bucket) {
      listener(event);
    }
  }
}
