import type { Technique, FightTest } from '../types/index'

/**
 * AdhocFilterEngine — pure, stateless filtering of a technique catalogue
 * against a FightTest configuration.
 *
 * Design decisions (SOLID / Keep It Simple):
 *   - Single static method, no instance state, no DOM, no side effects (SRP, ISP).
 *   - Each filter dimension is a separate predicate; they are composed
 *     conjunctively with Array.filter (Open/Closed: add a dimension without
 *     touching the others).
 *   - Caller contract: ft.mode is non-null when filter() is called.
 *     The engine asserts this implicitly — a null mode simply matches nothing
 *     because no technique has null in its modes array.
 *
 * Req 4.1–4.3, 11.3
 */
export class AdhocFilterEngine {
  /**
   * Returns the subset of `catalogue` that satisfies all active filter
   * dimensions in `ft`.  The input array is never mutated.
   *
   * Filter order (as specified in task 1.3.2):
   *   1. Mode        — technique must list ft.mode in its modes array.
   *   2. TargetLevel — skipped when ft.targetLevels is empty; otherwise
   *                    technique.targetLevel must be in ft.targetLevels.
   *   3. Category    — skipped when ft.categories is empty; otherwise
   *                    technique.category must be in ft.categories.
   *   4. Side        — skipped when ft.side is null or 'BOTH'; otherwise
   *                    technique.side must equal ft.side.
   */
  static filter(catalogue: Technique[], ft: FightTest): Technique[] {
    return catalogue.filter(
      t =>
        AdhocFilterEngine.passesMode(t, ft) &&
        AdhocFilterEngine.passesTargetLevel(t, ft) &&
        AdhocFilterEngine.passesCategory(t, ft) &&
        AdhocFilterEngine.passesSide(t, ft)
    )
  }

  // -------------------------------------------------------------------------
  // Private predicates — one per filter dimension
  // -------------------------------------------------------------------------

  /** Dimension 1: mode. */
  private static passesMode(t: Technique, ft: FightTest): boolean {
    return (t.modes ?? []).includes(ft.mode!)
  }

  /** Dimension 2: target level. Empty array = no restriction. */
  private static passesTargetLevel(t: Technique, ft: FightTest): boolean {
    if (ft.targetLevels.length === 0) return true
    return ft.targetLevels.includes(t.targetLevel)
  }

  /** Dimension 3: category. Empty array = no restriction. */
  private static passesCategory(t: Technique, ft: FightTest): boolean {
    if (ft.categories.length === 0) return true
    return ft.categories.includes(t.category)
  }

  /** Dimension 4: side. null or 'BOTH' = no restriction. */
  private static passesSide(t: Technique, ft: FightTest): boolean {
    if (ft.side === null || ft.side === 'BOTH') return true
    return t.side === ft.side
  }
}
