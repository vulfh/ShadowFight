import { STORAGE_KEYS } from '../constants/storage'
import { FightTest } from '../types/index'

/**
 * Persistence service for the single adhoc FightTest configuration.
 *
 * All members are static — the service has no instance state and acts as
 * a pure façade over localStorage.  This satisfies SRP (one reason to
 * change: storage format) and keeps callers simple (no instantiation needed).
 *
 * Req 5.2, 6.1–6.3, 6.5
 */
export class FightTestService {
  // -------------------------------------------------------------------------
  // Static constants
  // -------------------------------------------------------------------------

  /** Fixed id for the single adhoc configuration. */
  static readonly ADHOC_ID = 'adhoc'

  /** Display name for the single adhoc configuration. */
  static readonly ADHOC_NAME = 'Adhoc'

  /**
   * Immutable default state used when localStorage is empty or corrupt.
   * Mode intentionally null so the user must make an explicit choice.
   */
  static readonly DEFAULT: Readonly<FightTest> = Object.freeze({
    id: FightTestService.ADHOC_ID,
    name: FightTestService.ADHOC_NAME,
    mode: null,
    targetLevels: [],
    categories: [],
    side: null,
    shuffleMode: 'Random',
  } satisfies FightTest)

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Reads the stored FightTest from localStorage.
   * Returns DEFAULT when the key is absent, the JSON is malformed, or
   * any required field is missing.
   * Returns DEFAULT silently when localStorage is unavailable (SecurityError).
   */
  static read(): FightTest {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FIGHT_TEST)
      if (!raw) return { ...FightTestService.DEFAULT }

      const parsed: unknown = JSON.parse(raw)
      if (!FightTestService.isValidFightTest(parsed)) {
        return { ...FightTestService.DEFAULT }
      }
      return parsed
    } catch {
      return { ...FightTestService.DEFAULT }
    }
  }

  /**
   * Serialises the given FightTest to localStorage.
   * Swallows SecurityError silently — best-effort persistence.
   */
  static write(ft: FightTest): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FIGHT_TEST, JSON.stringify(ft))
    } catch {
      // SecurityError or QuotaExceededError — silent failure acceptable
    }
  }

  /**
   * Resets the stored configuration to DEFAULT.
   * Writes DEFAULT to localStorage and returns it.
   */
  static reset(): FightTest {
    const defaultCopy: FightTest = { ...FightTestService.DEFAULT }
    FightTestService.write(defaultCopy)
    return defaultCopy
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Type-guard: verifies that all required FightTest fields are present.
   * Does not validate enum values — that keeps the guard simple and tolerant
   * of future enum extensions.
   */
  private static isValidFightTest(value: unknown): value is FightTest {
    if (typeof value !== 'object' || value === null) return false
    const obj = value as Record<string, unknown>
    return (
      'id' in obj &&
      'name' in obj &&
      'mode' in obj &&
      Array.isArray(obj['targetLevels']) &&
      Array.isArray(obj['categories']) &&
      'side' in obj &&
      'shuffleMode' in obj
    )
  }
}
