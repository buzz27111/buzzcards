// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';

const QUEUE_KEY = 'buzzcards_offline_queue';

// Minimal localStorage mock for Node environment
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Import after localStorage is available
const { queueOfflineAction, syncPendingActions } = await import('./offlineSync');
type OfflineAction = import('./offlineSync').OfflineAction;

describe('offlineSync', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  describe('queueOfflineAction', () => {
    it('stores an action in localStorage', () => {
      const action: OfflineAction = { type: 'reaction', payload: { articleId: '1', emoji: 'fire' } };
      queueOfflineAction(action);

      const stored = JSON.parse(localStorageMock.getItem(QUEUE_KEY)!);
      expect(stored).toEqual([action]);
    });

    it('appends to existing queue', () => {
      const a1: OfflineAction = { type: 'reaction', payload: { articleId: '1' } };
      const a2: OfflineAction = { type: 'hot-take', payload: { articleId: '2', text: 'wow' } };
      queueOfflineAction(a1);
      queueOfflineAction(a2);

      const stored = JSON.parse(localStorageMock.getItem(QUEUE_KEY)!);
      expect(stored).toHaveLength(2);
      expect(stored[1]).toEqual(a2);
    });
  });

  describe('syncPendingActions', () => {
    it('does nothing when queue is empty', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      await syncPendingActions();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('replays queued actions and clears on success', async () => {
      const action: OfflineAction = { type: 'reaction', payload: { articleId: '1', emoji: 'fire' } };
      localStorageMock.setItem(QUEUE_KEY, JSON.stringify([action]));

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

      await syncPendingActions();

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/reactions', expect.objectContaining({
        method: 'POST',
      }));
      expect(localStorageMock.getItem(QUEUE_KEY)).toBeNull();
    });

    it('sends hot-take actions to /api/hot-takes', async () => {
      const action: OfflineAction = { type: 'hot-take', payload: { articleId: '2', text: 'nice' } };
      localStorageMock.setItem(QUEUE_KEY, JSON.stringify([action]));

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

      await syncPendingActions();

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/hot-takes', expect.objectContaining({
        method: 'POST',
      }));
    });

    it('keeps failed actions in the queue', async () => {
      const a1: OfflineAction = { type: 'reaction', payload: { articleId: '1' } };
      const a2: OfflineAction = { type: 'reaction', payload: { articleId: '2' } };
      localStorageMock.setItem(QUEUE_KEY, JSON.stringify([a1, a2]));

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('{}', { status: 200 }))
        .mockResolvedValueOnce(new Response('error', { status: 500 }));

      await syncPendingActions();

      const remaining = JSON.parse(localStorageMock.getItem(QUEUE_KEY)!);
      expect(remaining).toEqual([a2]);
    });
  });
});
