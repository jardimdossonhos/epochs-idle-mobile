"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalEventBus = void 0;
class LocalEventBus {
    listeners = new Map();
    publish(event) {
        this.emit(event.type, event);
        this.emit("*", event);
    }
    subscribe(eventType, listener) {
        const bucket = this.listeners.get(eventType) ?? new Set();
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
    emit(eventType, event) {
        const bucket = this.listeners.get(eventType);
        if (!bucket) {
            return;
        }
        for (const listener of bucket) {
            listener(event);
        }
    }
}
exports.LocalEventBus = LocalEventBus;
