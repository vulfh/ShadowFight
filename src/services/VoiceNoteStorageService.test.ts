import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoiceNoteStorageService } from './VoiceNoteStorageService';

// IndexedDB mock helpers
function mockIndexedDB() {
  let store = new Map();
  let db = {
    objectStoreNames: { contains: (name) => name === 'voiceNotes' },
    createObjectStore: vi.fn(),
    transaction: (storeName, mode) => {
      let tx = {
        objectStore: () => ({
          put: ({ techniqueId, mode, blob }) => ({
            onsuccess: null,
            onerror: null,
            result: undefined,
            set onsuccess(fn) { setTimeout(fn, 0); },
            set onerror(fn) { },
          }),
          get: ([techniqueId, mode]) => ({
            onsuccess: null,
            onerror: null,
            result: store.get(`${techniqueId}|${mode}`),
            set onsuccess(fn) { setTimeout(() => { fn({ target: { result: store.get(`${techniqueId}|${mode}`) } }); }, 0); },
            set onerror(fn) { },
          }),
          delete: ([techniqueId, mode]) => ({
            onsuccess: null,
            onerror: null,
            set onsuccess(fn) { setTimeout(fn, 0); },
            set onerror(fn) { },
          }),
          getKey: ([techniqueId, mode]) => ({
            onsuccess: null,
            onerror: null,
            result: store.has(`${techniqueId}|${mode}`) ? [techniqueId, mode] : undefined,
            set onsuccess(fn) { setTimeout(() => { fn({ target: { result: store.has(`${techniqueId}|${mode}`) ? [techniqueId, mode] : undefined } }); }, 0); },
            set onerror(fn) { },
          })
        }),
        onabort: null,
        set onabort(fn) { },
      };
      return tx;
    }
  };
  global.indexedDB = {
    open: vi.fn().mockImplementation((dbName, version) => {
      let req = {
        result: db,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        error: null,
        set onupgradeneeded(fn) { setTimeout(() => fn({}), 0); },
        set onsuccess(fn) { setTimeout(fn, 0); },
        set onerror(fn) { },
      };
      setTimeout(() => req.onsuccess && req.onsuccess(), 0);
      return req;
    })
  };
  return store;
}

describe('VoiceNoteStorageService', () => {
  let store;
  beforeEach(() => {
    store = mockIndexedDB();
  });

  it('saves and retrieves a voice note', async () => {
    const blob = new Blob(['test'], { type: 'audio/webm' });
    await VoiceNoteStorageService.saveVoiceNote('t1', 'PERFORMING', blob);
    // Simulate storage
    store.set('t1|PERFORMING', { techniqueId: 't1', mode: 'PERFORMING', blob });
    const result = await VoiceNoteStorageService.getVoiceNote('t1', 'PERFORMING');
    expect(result).toBe(blob);
  });

  it('returns null for missing voice note', async () => {
    const result = await VoiceNoteStorageService.getVoiceNote('t2', 'RESPONDING');
    expect(result).toBeNull();
  });

  it('deletes a voice note', async () => {
    const blob = new Blob(['test'], { type: 'audio/webm' });
    store.set('t3|PERFORMING', { techniqueId: 't3', mode: 'PERFORMING', blob });
    await VoiceNoteStorageService.deleteVoiceNote('t3', 'PERFORMING');
    store.delete('t3|PERFORMING');
    const result = await VoiceNoteStorageService.getVoiceNote('t3', 'PERFORMING');
    expect(result).toBeNull();
  });

  it('checks if a voice note exists', async () => {
    const blob = new Blob(['test'], { type: 'audio/webm' });
    store.set('t4|RESPONDING', { techniqueId: 't4', mode: 'RESPONDING', blob });
    const exists = await VoiceNoteStorageService.hasVoiceNote('t4', 'RESPONDING');
    expect(exists).toBe(true);
    const notExists = await VoiceNoteStorageService.hasVoiceNote('t4', 'PERFORMING');
    expect(notExists).toBe(false);
  });

  it('returns object URL for a voice note', async () => {
    const blob = new Blob(['test'], { type: 'audio/webm' });
    store.set('t5|PERFORMING', { techniqueId: 't5', mode: 'PERFORMING', blob });
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    const url = await VoiceNoteStorageService.getVoiceNoteUrl('t5', 'PERFORMING');
    expect(url).toBe('blob:url');
  });

  it('returns null for object URL if note not found', async () => {
    const url = await VoiceNoteStorageService.getVoiceNoteUrl('t6', 'PERFORMING');
    expect(url).toBeNull();
  });
});
