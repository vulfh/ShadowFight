import { STORAGE_KEYS } from '../constants/storage'
import { PlayMode, PLAY_MODES, DEFAULT_PLAY_MODE } from '../types/playMode'

/**
 * Persists and retrieves the selected Play Mode from localStorage.
 * Each fight list stores its own value under a scoped key so that
 * changing one list's mode never affects another.
 * All operations are safe against SecurityError and corrupted values.
 */
export class PlayModeSelectorService {
  /** Returns the per-fight-list storage key. */
  private key(fightListId: string): string {
    return `${STORAGE_KEYS.PLAY_MODE}_${fightListId}`
  }

  /**
   * Reads the stored play mode for the given fight list.
   * - Returns the stored value if it is a valid PlayMode.
   * - Writes and returns DEFAULT_PLAY_MODE if the key is missing or invalid.
   * - Returns DEFAULT_PLAY_MODE without writing if localStorage is unavailable.
   */
  read(fightListId: string): PlayMode {
    try {
      const raw = localStorage.getItem(this.key(fightListId))
      if (raw && (PLAY_MODES as readonly string[]).includes(raw)) {
        return raw as PlayMode
      }
      // Missing or invalid value — write the default then return it
      this.write(fightListId, DEFAULT_PLAY_MODE)
      return DEFAULT_PLAY_MODE
    } catch {
      // SecurityError or QuotaExceededError — return default; do not attempt write
      return DEFAULT_PLAY_MODE
    }
  }

  /**
   * Persists the given play mode for the given fight list.
   * Silently swallows storage errors (best-effort persistence).
   */
  write(fightListId: string, mode: PlayMode): void {
    try {
      localStorage.setItem(this.key(fightListId), mode)
    } catch {
      // Best-effort — silent failure acceptable
    }
  }
}
