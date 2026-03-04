import { VoiceNote } from '../types/index';
import { Mode } from '../constants/modes';
import { STORAGE_KEYS } from '../constants/storage';

/**
 * Service for managing voice notes associated with techniques.
 * Handles CRUD operations, audio blob storage in IndexedDB, and enforces limits.
 * 
 * Limits:
 * - Maximum 15 notes per (techniqueId, mode) combination
 * - Maximum 100MB total storage for all notes
 * - Maximum 1 minute per note (enforced at recording level)
 * - Unique title per (techniqueId, mode) combination
 */
export class VoiceNoteService {
  private static readonly DB_NAME = 'KravMagaVoiceNotes';
  private static readonly DB_VERSION = 1;
  private static readonly AUDIO_STORE_NAME = 'audioBlobs';
  private static readonly MAX_NOTES_PER_TECHNIQUE_MODE = 15;
  private static readonly MAX_TOTAL_STORAGE_BYTES = 100 * 1024 * 1024; // 100MB
  
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initDB();
  }

  /**
   * Initialize IndexedDB for audio blob storage
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(VoiceNoteService.DB_NAME, VoiceNoteService.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store for audio blobs if it doesn't exist
        if (!db.objectStoreNames.contains(VoiceNoteService.AUDIO_STORE_NAME)) {
          db.createObjectStore(VoiceNoteService.AUDIO_STORE_NAME);
          console.log('Created audio blobs object store');
        }
      };
    });
  }

  /**
   * Ensure DB is initialized before operations
   */
  private async ensureDB(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
  }

  /**
   * Get all voice notes metadata from localStorage
   */
  private getAllNotesMetadata(): VoiceNote[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VOICE_NOTES);
      if (!data) {
        return [];
      }
      return JSON.parse(data) as VoiceNote[];
    } catch (error) {
      console.error('Failed to load voice notes metadata:', error);
      return [];
    }
  }

  /**
   * Save all voice notes metadata to localStorage
   */
  private saveAllNotesMetadata(notes: VoiceNote[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.VOICE_NOTES, JSON.stringify(notes));
      console.log(`Saved ${notes.length} voice notes metadata to localStorage`);
    } catch (error) {
      console.error('Failed to save voice notes metadata:', error);
      throw new Error('Failed to save voice notes metadata');
    }
  }

  /**
   * Get notes for a specific technique and mode
   */
  public getNotesForTechniqueMode(techniqueId: string, mode: Mode): VoiceNote[] {
    const allNotes = this.getAllNotesMetadata();
    return allNotes.filter(note => 
      note.techniqueId === techniqueId && note.mode === mode
    );
  }

  /**
   * Get all notes for a specific technique (across all modes)
   */
  public getNotesForTechnique(techniqueId: string): VoiceNote[] {
    const allNotes = this.getAllNotesMetadata();
    return allNotes.filter(note => note.techniqueId === techniqueId);
  }

  /**
   * Check if a title is unique for a given technique and mode
   */
  public isTitleUnique(techniqueId: string, mode: Mode, title: string, excludeNoteId?: string): boolean {
    const notes = this.getNotesForTechniqueMode(techniqueId, mode);
    return !notes.some(note => 
      note.title.trim().toLowerCase() === title.trim().toLowerCase() && 
      note.id !== excludeNoteId
    );
  }

  /**
   * Calculate total storage used by all audio blobs
   */
  private async calculateTotalStorageUsed(): Promise<number> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VoiceNoteService.AUDIO_STORE_NAME], 'readonly');
      const store = transaction.objectStore(VoiceNoteService.AUDIO_STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = async () => {
        const keys = request.result;
        let totalSize = 0;

        for (const key of keys) {
          const getRequest = store.get(key);
          await new Promise<void>((resolveGet) => {
            getRequest.onsuccess = () => {
              const blob = getRequest.result as Blob;
              if (blob) {
                totalSize += blob.size;
              }
              resolveGet();
            };
            getRequest.onerror = () => resolveGet();
          });
        }

        resolve(totalSize);
      };

      request.onerror = () => {
        console.error('Failed to calculate storage:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Create a new voice note
   * @param techniqueId - ID of the technique
   * @param mode - Mode of the fight list
   * @param title - Title of the note (must be unique per technique+mode)
   * @param audioBlob - Audio blob to store
   * @returns The created VoiceNote or null if creation failed
   */
  public async createNote(
    techniqueId: string,
    mode: Mode,
    title: string,
    audioBlob: Blob
  ): Promise<VoiceNote | null> {
    try {
      await this.ensureDB();

      // Validate title is not empty
      if (!title || title.trim().length === 0) {
        console.error('Note title cannot be empty');
        return null;
      }

      // Check if title is unique
      if (!this.isTitleUnique(techniqueId, mode, title)) {
        console.error('Note title must be unique per technique and mode');
        return null;
      }

      // Check note count limit
      const existingNotes = this.getNotesForTechniqueMode(techniqueId, mode);
      if (existingNotes.length >= VoiceNoteService.MAX_NOTES_PER_TECHNIQUE_MODE) {
        console.error(`Maximum ${VoiceNoteService.MAX_NOTES_PER_TECHNIQUE_MODE} notes per technique per mode exceeded`);
        return null;
      }

      // Check total storage limit
      const currentStorage = await this.calculateTotalStorageUsed();
      if (currentStorage + audioBlob.size > VoiceNoteService.MAX_TOTAL_STORAGE_BYTES) {
        console.error(`Maximum storage limit of ${VoiceNoteService.MAX_TOTAL_STORAGE_BYTES / (1024 * 1024)}MB exceeded`);
        return null;
      }

      // Generate unique ID
      const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storageKey = `${techniqueId}_${mode}_${noteId}`;

      // Store audio blob in IndexedDB
      await this.saveAudioBlob(storageKey, audioBlob);

      // Create note metadata
      const note: VoiceNote = {
        id: noteId,
        techniqueId,
        mode,
        title: title.trim(),
        storageKey
      };

      // Save metadata to localStorage
      const allNotes = this.getAllNotesMetadata();
      allNotes.push(note);
      this.saveAllNotesMetadata(allNotes);

      console.log(`Created voice note: ${noteId} for technique ${techniqueId} in mode ${mode}`);
      return note;
    } catch (error) {
      console.error('Failed to create voice note:', error);
      return null;
    }
  }

  /**
   * Save audio blob to IndexedDB
   */
  private async saveAudioBlob(storageKey: string, blob: Blob): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VoiceNoteService.AUDIO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VoiceNoteService.AUDIO_STORE_NAME);
      const request = store.put(blob, storageKey);

      request.onsuccess = () => {
        console.log(`Saved audio blob with key: ${storageKey}`);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to save audio blob:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get audio blob from IndexedDB
   */
  public async getAudioBlob(storageKey: string): Promise<Blob | null> {
    try {
      await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([VoiceNoteService.AUDIO_STORE_NAME], 'readonly');
        const store = transaction.objectStore(VoiceNoteService.AUDIO_STORE_NAME);
        const request = store.get(storageKey);

        request.onsuccess = () => {
          resolve(request.result as Blob || null);
        };

        request.onerror = () => {
          console.error('Failed to get audio blob:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to get audio blob:', error);
      return null;
    }
  }

  /**
   * Delete a voice note
   * @param noteId - ID of the note to delete
   * @returns true if deleted successfully, false otherwise
   */
  public async deleteNote(noteId: string): Promise<boolean> {
    try {
      await this.ensureDB();

      // Get note metadata
      const allNotes = this.getAllNotesMetadata();
      const note = allNotes.find(n => n.id === noteId);
      
      if (!note) {
        console.error(`Note ${noteId} not found`);
        return false;
      }

      // Delete audio blob from IndexedDB
      await this.deleteAudioBlob(note.storageKey);

      // Remove metadata from localStorage
      const updatedNotes = allNotes.filter(n => n.id !== noteId);
      this.saveAllNotesMetadata(updatedNotes);

      console.log(`Deleted voice note: ${noteId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete voice note:', error);
      return false;
    }
  }

  /**
   * Delete audio blob from IndexedDB
   */
  private async deleteAudioBlob(storageKey: string): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VoiceNoteService.AUDIO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VoiceNoteService.AUDIO_STORE_NAME);
      const request = store.delete(storageKey);

      request.onsuccess = () => {
        console.log(`Deleted audio blob with key: ${storageKey}`);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete audio blob:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete all notes for a specific technique (across all modes)
   * Called when a technique is removed from all fight lists
   */
  public async deleteNotesForTechnique(techniqueId: string): Promise<number> {
    try {
      const notes = this.getNotesForTechnique(techniqueId);
      let deletedCount = 0;

      for (const note of notes) {
        const success = await this.deleteNote(note.id);
        if (success) {
          deletedCount++;
        }
      }

      console.log(`Deleted ${deletedCount} notes for technique ${techniqueId}`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to delete notes for technique:', error);
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalNotes: number;
    totalStorageUsed: number;
    maxStorage: number;
    percentageUsed: number;
  }> {
    const allNotes = this.getAllNotesMetadata();
    const totalStorageUsed = await this.calculateTotalStorageUsed();
    const maxStorage = VoiceNoteService.MAX_TOTAL_STORAGE_BYTES;
    const percentageUsed = (totalStorageUsed / maxStorage) * 100;

    return {
      totalNotes: allNotes.length,
      totalStorageUsed,
      maxStorage,
      percentageUsed
    };
  }

  /**
   * Play a voice note
   * @param noteId - ID of the note to play
   * @returns Promise that resolves when playback completes or rejects on error
   */
  public async playNote(noteId: string): Promise<void> {
    try {
      const allNotes = this.getAllNotesMetadata();
      const note = allNotes.find(n => n.id === noteId);
      
      if (!note) {
        throw new Error(`Note ${noteId} not found`);
      }

      const audioBlob = await this.getAudioBlob(note.storageKey);
      if (!audioBlob) {
        throw new Error(`Audio blob not found for note ${noteId}`);
      }

      return new Promise((resolve, reject) => {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          console.log(`Finished playing note: ${noteId}`);
          resolve();
        };

        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          console.error(`Error playing note ${noteId}:`, error);
          reject(error);
        };

        console.log(`Playing note: ${noteId}`);
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('Failed to play note:', error);
      throw error;
    }
  }

  /**
   * Play multiple notes sequentially
   * @param noteIds - Array of note IDs to play in order
   * @returns Promise that resolves when all notes have been played
   */
  public async playNotesSequentially(noteIds: string[]): Promise<void> {
    for (const noteId of noteIds) {
      await this.playNote(noteId);
    }
  }
}
