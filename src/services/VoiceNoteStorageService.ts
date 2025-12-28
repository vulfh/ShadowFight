/**
 * VoiceNoteStorageService
 * Service for storing, retrieving, and managing voice note audio blobs using IndexedDB.
 * Supports offline storage and retrieval of WebM/Opus audio for techniques and modes.
 *
 * Requirements:
 * - Store audio blobs by techniqueId and mode (PERFORMING/RESPONDING)
 * - Use IndexedDB for offline support
 * - Provide methods for save, get, delete, has, and get URL
 * - Handle quota errors and provide robust error handling
 * - JSDoc for all public methods
 */

const DB_NAME = 'voiceNotesDB';
const STORE_NAME = 'voiceNotes';
const DB_VERSION = 1;

/**
 * @typedef {Object} VoiceNoteKey
 * @property {string} techniqueId
 * @property {string} mode
 */

export class VoiceNoteStorageService {
  /**
   * Opens the IndexedDB database, creating object store if needed.
   * @returns {Promise<IDBDatabase>}
   * @private
   */
  static _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function (event) {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: ['techniqueId', 'mode'] });
        }
      };
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  /**
   * Saves a voice note blob for a technique and mode.
   * @param {string} techniqueId
   * @param {string} mode
   * @param {Blob} blob
   * @returns {Promise<void>}
   */
  static async saveVoiceNote(techniqueId, mode, blob) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const data = { techniqueId, mode, blob, createdAt: new Date().toISOString(), lastModified: new Date().toISOString() };
      const req = store.put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  /**
   * Retrieves a voice note blob for a technique and mode.
   * @param {string} techniqueId
   * @param {string} mode
   * @returns {Promise<Blob|null>}
   */
  static async getVoiceNote(techniqueId, mode) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get([techniqueId, mode]);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Deletes a voice note for a technique and mode.
   * @param {string} techniqueId
   * @param {string} mode
   * @returns {Promise<void>}
   */
  static async deleteVoiceNote(techniqueId, mode) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete([techniqueId, mode]);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  /**
   * Checks if a voice note exists for a technique and mode.
   * @param {string} techniqueId
   * @param {string} mode
   * @returns {Promise<boolean>}
   */
  static async hasVoiceNote(techniqueId, mode) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getKey([techniqueId, mode]);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Returns an object URL for a voice note blob (caller must revoke when done).
   * @param {string} techniqueId
   * @param {string} mode
   * @returns {Promise<string|null>} Object URL or null if not found
   */
  static async getVoiceNoteUrl(techniqueId, mode) {
    const blob = await this.getVoiceNote(techniqueId, mode);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }
}
