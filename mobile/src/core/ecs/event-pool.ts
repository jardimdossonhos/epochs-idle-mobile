import { ObjectPool } from "./object-pool";
import type { DomainEvent } from "../models/events";

export const MAX_EVENTS_PER_TICK = 4096;

let _eventPool: ObjectPool<DomainEvent> | null = null;

// Lazy getter — evita crash Hermes por instanciação global
export const getEventPool = (): ObjectPool<DomainEvent> => {
  if (!_eventPool) {
    _eventPool = new ObjectPool<DomainEvent>((index) => ({
      _poolIdx: index,
      generation: 0,
      isActive: false,
      id: `evt_pool_${index}`,
      type: "NONE",
      actorKingdomId: undefined,
      targetKingdomId: undefined,
      payload: {},
      occurredAt: 0
    }), MAX_EVENTS_PER_TICK);
  }
  return _eventPool;
};

// Alias de retrocompatibilidade
export const EventPool = new Proxy({} as ObjectPool<DomainEvent>, {
  get: (_target, prop) => {
    const pool = getEventPool();
    const value = (pool as any)[prop];
    return typeof value === 'function' ? value.bind(pool) : value;
  },
});


export function buildEvent(
  type: string, 
  occurredAt: number, 
  payload: Record<string, any> = {}, 
  actorKingdomId?: string, 
  targetKingdomId?: string
): DomainEvent | null {
  const evt = EventPool.acquire();
  if (!evt) return null;
  evt.type = type;
  evt.occurredAt = occurredAt;
  evt.actorKingdomId = actorKingdomId;
  evt.targetKingdomId = targetKingdomId;
  evt.payload = payload;
  return evt;
}
