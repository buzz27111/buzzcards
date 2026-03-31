const QUEUE_KEY = 'buzzcards_offline_queue';

export interface OfflineAction {
  type: 'reaction' | 'hot-take';
  payload: Record<string, unknown>;
}

/** Append an action to the offline queue stored in localStorage. */
export function queueOfflineAction(action: OfflineAction): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue: OfflineAction[] = raw ? JSON.parse(raw) : [];
    queue.push(action);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage unavailable — silently drop
  }
}

/** Replay all queued offline actions via fetch, removing each on success. */
export async function syncPendingActions(): Promise<void> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(QUEUE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  const queue: OfflineAction[] = JSON.parse(raw);
  if (queue.length === 0) return;

  const remaining: OfflineAction[] = [];

  for (const action of queue) {
    try {
      const url =
        action.type === 'reaction' ? '/api/reactions' : '/api/hot-takes';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) {
        remaining.push(action);
      }
    } catch {
      remaining.push(action);
    }
  }

  try {
    if (remaining.length > 0) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(QUEUE_KEY);
    }
  } catch {
    // ignore
  }
}
