import { STORAGE_KEYS } from '../constants/storage'
import { PlayMode, PLAY_MODES, DEFAULT_PLAY_MODE } from '../types/playMode'

/**
 * Persists and retrieves the selected Play Mode from localStorage.
 * All operations are safe against SecurityError and corrupted values.
 */
export class PlayModeSelectorService {
  /**
   * Reads the stored play mode.
   * - Returns the stored value if it is a valid PlayMode.
   * - Writes and returns DEFAULT_PLAY_MODE if the key is missing or invalid.
   * - Returns DEFAULT_PLAY_MODE without writing if localStorage is unavailable.
   */
  read(): PlayMode {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PLAY_MODE)
      if (raw && (PLAY_MODES as readonly string[]).includes(raw)) {
        return raw as PlayMode
      }
      // Missing or invalid value — write the default then return it
      this.write(DEFAULT_PLAY_MODE)
      return DEFAULT_PLAY_MODE
    } catch {
      // SecurityError or QuotaExceededError — return default; do not attempt write
      return DEFAULT_PLAY_MODE
    }
  }

  /**
   * Persists the given play mode.
   * Silently swallows storage errors (best-effort persistence).
   */
  write(mode: PlayMode): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAY_MODE, mode)
    } catch {
      // Best-effort — silent failure acceptable
    }
  }
}
