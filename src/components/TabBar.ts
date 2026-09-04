/**
 * TabBar — Bootstrap 5 tab bar component.
 *
 * Renders a <ul class="nav nav-tabs"> + <div class="tab-content"> pair from
 * a declarative list of TabConfig entries.  All DOM manipulation is done
 * through the private activate() method — one place to change if the
 * show/hide strategy ever changes (OCP).
 *
 * Design decisions (SOLID / Keep It Simple):
 *   - SRP: owns tab switching and disabled state only; pane content is
 *     provided by callers via TabConfig.paneElement.
 *   - No framework, no Bootstrap JS — pure DOM API.
 *   - IDs are derived deterministically from tab.id so aria-controls /
 *     aria-labelledby links are stable and testable.
 *
 * Req 1.1–1.8, 10.1–10.4
 */

export interface TabConfig {
  id: string
  label: string
  icon?: string
  paneElement: HTMLElement
  onActivate?: (id: string) => void
}

/** Internal record that pairs a config with its rendered button and panel. */
interface TabRecord {
  config: TabConfig
  button: HTMLButtonElement
  panel: HTMLElement
}

export class TabBar {
  private readonly ul: HTMLUListElement
  private readonly records: TabRecord[]
  private activeId: string

  constructor(containerEl: HTMLElement, tabs: TabConfig[]) {
    this.records = []

    // ── Tab list ──────────────────────────────────────────────────────────
    this.ul = document.createElement('ul')
    this.ul.className = 'nav nav-tabs'
    this.ul.setAttribute('role', 'tablist')

    // ── Tab content ───────────────────────────────────────────────────────
    const tabContent = document.createElement('div')
    tabContent.className = 'tab-content'

    tabs.forEach((tab) => {
      const buttonId = `tab-btn-${tab.id}`
      const panelId  = `tab-panel-${tab.id}`

      // ── Button ──────────────────────────────────────────────────────────
      const button = document.createElement('button')
      button.id = buttonId
      button.type = 'button'
      button.className = 'nav-link'
      button.setAttribute('role', 'tab')
      button.setAttribute('aria-controls', panelId)
      button.setAttribute('aria-selected', 'false')
      button.setAttribute('data-tab-id', tab.id)

      if (tab.icon) {
        const icon = document.createElement('i')
        icon.className = `fa ${tab.icon} me-1`
        icon.setAttribute('aria-hidden', 'true')
        button.appendChild(icon)
      }
      button.appendChild(document.createTextNode(tab.label))

      button.addEventListener('click', () => this.activate(tab.id))

      const li = document.createElement('li')
      li.setAttribute('role', 'presentation')
      li.appendChild(button)
      this.ul.appendChild(li)

      // ── Panel wrapper ────────────────────────────────────────────────────
      const panel = document.createElement('div')
      panel.id = panelId
      panel.setAttribute('role', 'tabpanel')
      panel.setAttribute('aria-labelledby', buttonId)
      panel.classList.add('d-none') // hidden by default; activate() will show first
      panel.appendChild(tab.paneElement)
      tabContent.appendChild(panel)

      this.records.push({ config: tab, button, panel })
    })

    containerEl.appendChild(this.ul)
    containerEl.appendChild(tabContent)

    // Activate the first tab (sets activeId, applies classes, removes d-none)
    this.activeId = tabs[0]?.id ?? ''
    if (tabs.length > 0) {
      this.activate(tabs[0].id, /* silent */ true)
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Returns the id of the currently active tab. */
  getActiveTabId(): string {
    return this.activeId
  }

  /**
   * Locks or unlocks the tab bar.
   *   true  → adds pe-none opacity-50 to <ul>; sets aria-disabled="true" on each button.
   *   false → removes those classes/attributes.
   */
  setDisabled(disabled: boolean): void {
    if (disabled) {
      this.ul.classList.add('pe-none', 'opacity-50')
      this.records.forEach(({ button }) =>
        button.setAttribute('aria-disabled', 'true')
      )
    } else {
      this.ul.classList.remove('pe-none', 'opacity-50')
      this.records.forEach(({ button }) =>
        button.removeAttribute('aria-disabled')
      )
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Activates the tab with the given id.
   *
   * @param id      Tab id to activate.
   * @param silent  When true, suppresses the onActivate callback (used on
   *                initial construction so callers don't receive a spurious
   *                activation event at startup).
   */
  private activate(id: string, silent = false): void {
    this.activeId = id

    this.records.forEach(({ config, button, panel }) => {
      const isTarget = config.id === id

      // Button state
      button.classList.toggle('active', isTarget)
      button.setAttribute('aria-selected', isTarget ? 'true' : 'false')

      // Pane visibility
      panel.classList.toggle('d-none', !isTarget)
    })

    if (!silent) {
      const record = this.records.find(r => r.config.id === id)
      record?.config.onActivate?.(id)
    }
  }
}
