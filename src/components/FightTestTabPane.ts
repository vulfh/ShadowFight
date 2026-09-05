import type { Technique, FightTest, FightTestFilterValues } from '../types/index'
import { FightTestService } from '../services/FightTestService'
import { FightTestFilterForm } from './FightTestFilterForm'
import { AdhocFilterEngine } from '../utils/AdhocFilterEngine'

/**
 * FightTestTabPane — orchestrates FightTestFilterForm, FightTestService, and
 * AdhocFilterEngine into a single tab pane for the Adhoc Fight Test feature.
 *
 * Responsibilities (SRP):
 *   - Owns the pane root element and the match-count display.
 *   - Delegates form rendering/state to FightTestFilterForm.
 *   - Delegates persistence to FightTestService.
 *   - Delegates filtering to AdhocFilterEngine.
 *
 * This class has no opinion about its position in the DOM — callers choose
 * the container via mount().
 *
 * Req 6.1–6.3, 11.1–11.7
 */
export class FightTestTabPane {
  // -------------------------------------------------------------------------
  // Private state
  // -------------------------------------------------------------------------

  private readonly service: typeof FightTestService
  private readonly catalogue: Technique[]

  /** Root element — created eagerly so getElement() works before mount(). */
  private readonly root: HTMLElement

  private form: FightTestFilterForm | null = null
  private matchCountEl: HTMLElement | null = null

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  constructor(service: typeof FightTestService, catalogue: Technique[]) {
    this.service = service
    this.catalogue = catalogue
    this.root = document.createElement('div')
    this.root.className = 'ft-tab-pane'
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Renders the pane into `container`:
   *   1. Appends root → formContainer + matchCount divs.
   *   2. Mounts FightTestFilterForm into formContainer.
   *   3. Populates form from service.read().
   *   4. Updates match count from service.read().
   */
  mount(container: HTMLElement): void {
    // Form container
    const formContainer = document.createElement('div')
    formContainer.className = 'ft-form-container'

    // Match count display
    const matchCount = document.createElement('div')
    matchCount.id = 'ft-match-count'
    matchCount.className = 'mt-2 small'
    this.matchCountEl = matchCount

    this.root.appendChild(formContainer)
    this.root.appendChild(matchCount)
    container.appendChild(this.root)

    // Instantiate and mount form
    this.form = new FightTestFilterForm(this.catalogue)
    this.form.mount(formContainer, (values) => this.handleChange(values))

    // Restore persisted state
    const saved = this.service.read()
    this.form.populate(saved)
    this.updateMatchCount(saved)
  }

  /** Returns the pane root element for registration with TabBar. */
  getElement(): HTMLElement {
    return this.root
  }

  /**
   * Returns the current FightTest by merging ADHOC identity fields with the
   * live form values.
   */
  getCurrentFightTest(): FightTest {
    const values = this.form
      ? this.form.getValues()
      : (this.service.DEFAULT as FightTestFilterValues)
    return {
      id: FightTestService.ADHOC_ID,
      name: FightTestService.ADHOC_NAME,
      ...values,
    }
  }

  /** Delegates to the inner form. */
  showModeError(): void {
    this.form?.showModeError()
  }

  /** Delegates to the inner form. */
  clearModeError(): void {
    this.form?.clearModeError()
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Called by the form's onChange.  Persists the new state and refreshes the
   * match count.  Also clears any outstanding mode error so the user gets
   * immediate feedback on correction.
   */
  private handleChange(values: FightTestFilterValues): void {
    const ft: FightTest = {
      id: FightTestService.ADHOC_ID,
      name: FightTestService.ADHOC_NAME,
      ...values,
    }
    this.form?.clearModeError()
    this.service.write(ft)
    this.updateMatchCount(ft)
  }

  /**
   * Updates #ft-match-count with one of three states:
   *   - mode null   → text-muted fst-italic, "Select a mode to see matches"
   *   - count === 0 → text-danger, "0 techniques matched"
   *   - count > 0   → text-success, "${count} techniques matched"
   */
  private updateMatchCount(ft: FightTest): void {
    const el = this.matchCountEl
    if (!el) return

    // Reset all state classes
    el.classList.remove('text-muted', 'fst-italic', 'text-danger', 'text-success')

    if (ft.mode === null) {
      el.classList.add('text-muted', 'fst-italic')
      el.textContent = 'Select a mode to see matches'
      return
    }

    const count = AdhocFilterEngine.filter(this.catalogue, ft).length

    if (count === 0) {
      el.classList.add('text-danger')
      el.textContent = '0 techniques matched'
    } else {
      el.classList.add('text-success')
      el.textContent = `${count} techniques matched`
    }
  }
}
