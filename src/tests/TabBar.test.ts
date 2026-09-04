/**
 * Task 1.6 — TDD tests for TabBar.
 *
 * Covers all spec items:
 *   - 1.6.3  constructor renders nav-tabs ul + tab-content div, activates first tab
 *   - 1.6.4  getActiveTabId() returns current active id
 *   - 1.6.5  setDisabled(true/false) adds/removes pe-none opacity-50 + aria-disabled
 *   - 1.6.6  activate(id) via click — switches active tab, shows/hides panes, fires onActivate
 *   - 1.6.7  full ARIA: role="tablist", role="tab", aria-controls, aria-selected,
 *             role="tabpanel", aria-labelledby
 *
 * Acceptance criteria: Req 1.1–1.8, 10.1–10.4
 *
 * Runs in jsdom (vitest.config.ts global environment).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TabBar } from '../components/TabBar'
import type { TabConfig } from '../components/TabBar'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContainer(): HTMLElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function cleanup(): void {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
}

function makePaneElement(label: string): HTMLElement {
  const el = document.createElement('div')
  el.textContent = label
  return el
}

/** Builds two tabs suitable for most tests. */
function makeTwoTabs(overrides?: Partial<TabConfig>[]): TabConfig[] {
  return [
    {
      id: 'tab-a',
      label: 'Tab A',
      paneElement: makePaneElement('Pane A'),
      ...(overrides?.[0] ?? {}),
    },
    {
      id: 'tab-b',
      label: 'Tab B',
      paneElement: makePaneElement('Pane B'),
      ...(overrides?.[1] ?? {}),
    },
  ]
}

/** Clicks the tab button with the given id. */
function clickTab(container: HTMLElement, id: string): void {
  const btn = container.querySelector(`button[data-tab-id="${id}"]`) as HTMLElement
  btn?.click()
}

// ---------------------------------------------------------------------------
// 1.6.3 — constructor: rendered structure
// ---------------------------------------------------------------------------

describe('TabBar — constructor: rendered structure', () => {
  let container: HTMLElement

  beforeEach(() => { container = makeContainer() })
  afterEach(cleanup)

  it('renders a <ul> with class nav and nav-tabs', () => {
    new TabBar(container, makeTwoTabs())
    const ul = container.querySelector('ul')
    expect(ul).not.toBeNull()
    expect(ul!.classList.contains('nav')).toBe(true)
    expect(ul!.classList.contains('nav-tabs')).toBe(true)
  })

  it('renders one <li> per tab', () => {
    new TabBar(container, makeTwoTabs())
    const items = container.querySelectorAll('ul > li')
    expect(items).toHaveLength(2)
  })

  it('renders one <button> per tab inside each <li>', () => {
    new TabBar(container, makeTwoTabs())
    const buttons = container.querySelectorAll('ul > li > button')
    expect(buttons).toHaveLength(2)
  })

  it('button text matches the tab label', () => {
    new TabBar(container, makeTwoTabs())
    const buttons = Array.from(container.querySelectorAll('ul > li > button'))
    const labels = buttons.map(b => b.textContent?.trim())
    expect(labels).toContain('Tab A')
    expect(labels).toContain('Tab B')
  })

  it('renders a tab-content container div', () => {
    new TabBar(container, makeTwoTabs())
    const content = container.querySelector('.tab-content')
    expect(content).not.toBeNull()
  })

  it('inserts each paneElement into the tab-content', () => {
    const tabs = makeTwoTabs()
    new TabBar(container, tabs)
    const content = container.querySelector('.tab-content')!
    expect(content.contains(tabs[0].paneElement)).toBe(true)
    expect(content.contains(tabs[1].paneElement)).toBe(true)
  })

  it('works with a single tab', () => {
    new TabBar(container, [makeTwoTabs()[0]])
    expect(container.querySelectorAll('ul > li')).toHaveLength(1)
  })

  it('renders an icon element when icon is provided', () => {
    const tabs: TabConfig[] = [{
      id: 'tab-icon',
      label: 'With Icon',
      icon: 'fa-flask',
      paneElement: makePaneElement('pane'),
    }]
    new TabBar(container, tabs)
    const btn = container.querySelector('button')!
    // Icon class should appear somewhere inside the button
    expect(btn.innerHTML).toContain('fa-flask')
  })
})

// ---------------------------------------------------------------------------
// 1.6.3 — constructor: first tab activated by default
// ---------------------------------------------------------------------------

describe('TabBar — constructor: first tab activated by default', () => {
  let container: HTMLElement

  beforeEach(() => { container = makeContainer() })
  afterEach(cleanup)

  it('first tab button has active class', () => {
    new TabBar(container, makeTwoTabs())
    const buttons = container.querySelectorAll('ul > li > button')
    expect(buttons[0].classList.contains('active')).toBe(true)
  })

  it('first tab button has aria-selected="true"', () => {
    new TabBar(container, makeTwoTabs())
    const buttons = container.querySelectorAll('ul > li > button')
    expect(buttons[0].getAttribute('aria-selected')).toBe('true')
  })

  it('second tab button does not have active class', () => {
    new TabBar(container, makeTwoTabs())
    const buttons = container.querySelectorAll('ul > li > button')
    expect(buttons[1].classList.contains('active')).toBe(false)
  })

  it('second tab button has aria-selected="false"', () => {
    new TabBar(container, makeTwoTabs())
    const buttons = container.querySelectorAll('ul > li > button')
    expect(buttons[1].getAttribute('aria-selected')).toBe('false')
  })

  it('first pane is visible (does not have d-none)', () => {
    const tabs = makeTwoTabs()
    new TabBar(container, tabs)
    const firstPanel = tabs[0].paneElement.closest('[role="tabpanel"]') as HTMLElement
    expect(firstPanel.classList.contains('d-none')).toBe(false)
  })

  it('second pane is hidden (has d-none)', () => {
    const tabs = makeTwoTabs()
    new TabBar(container, tabs)
    const secondPanel = tabs[1].paneElement.closest('[role="tabpanel"]') as HTMLElement
    expect(secondPanel.classList.contains('d-none')).toBe(true)
  })

  it('getActiveTabId() returns the first tab id', () => {
    const bar = new TabBar(container, makeTwoTabs())
    expect(bar.getActiveTabId()).toBe('tab-a')
  })
})

// ---------------------------------------------------------------------------
// 1.6.4 — getActiveTabId()
// ---------------------------------------------------------------------------

describe('TabBar — getActiveTabId()', () => {
  let container: HTMLElement

  beforeEach(() => { container = makeContainer() })
  afterEach(cleanup)

  it('returns id of the tab that was just activated by click', () => {
    const bar = new TabBar(container, makeTwoTabs())
    clickTab(container, 'tab-b')
    expect(bar.getActiveTabId()).toBe('tab-b')
  })

  it('returns first id again after clicking back', () => {
    const bar = new TabBar(container, makeTwoTabs())
    clickTab(container, 'tab-b')
    clickTab(container, 'tab-a')
    expect(bar.getActiveTabId()).toBe('tab-a')
  })
})

// ---------------------------------------------------------------------------
// 1.6.6 — tab switching via click
// ---------------------------------------------------------------------------

describe('TabBar — tab switching via click', () => {
  let container: HTMLElement

  beforeEach(() => { container = makeContainer() })
  afterEach(cleanup)

  it('clicking second tab makes it active', () => {
    new TabBar(container, makeTwoTabs())
    clickTab(container, 'tab-b')
    const buttons = container.querySelectorAll('ul > li > button')
    expect(buttons[1].classList.contains('active')).toBe(true)
    expect(buttons[1].getAttribute('aria-selected')).toBe('true')
  })

  it('clicking second tab deactivates first', () => {
    new TabBar(container, makeTwoTabs())
    clickTab(container, 'tab-b')
    const buttons = container.querySelectorAll('ul > li > button')
    expect(buttons[0].classList.contains('active')).toBe(false)
    expect(buttons[0].getAttribute('aria-selected')).toBe('false')
  })

  it('clicking second tab shows its pane', () => {
    const tabs = makeTwoTabs()
    new TabBar(container, tabs)
    clickTab(container, 'tab-b')
    const secondPanel = tabs[1].paneElement.closest('[role="tabpanel"]') as HTMLElement
    expect(secondPanel.classList.contains('d-none')).toBe(false)
  })

  it('clicking second tab hides first pane', () => {
    const tabs = makeTwoTabs()
    new TabBar(container, tabs)
    clickTab(container, 'tab-b')
    const firstPanel = tabs[0].paneElement.closest('[role="tabpanel"]') as HTMLElement
    expect(firstPanel.classList.contains('d-none')).toBe(true)
  })

  it('clicking the already-active tab does not throw', () => {
    new TabBar(container, makeTwoTabs())
    expect(() => clickTab(container, 'tab-a')).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// 1.6.6 — onActivate callback
// ---------------------------------------------------------------------------

describe('TabBar — onActivate callback', () => {
  let container: HTMLElement

  beforeEach(() => { container = makeContainer() })
  afterEach(cleanup)

  it('calls onActivate with the tab id when a tab is clicked', () => {
    const onActivate = vi.fn()
    const tabs = makeTwoTabs([{}, { onActivate }])
    new TabBar(container, tabs)
    clickTab(container, 'tab-b')
    expect(onActivate).toHaveBeenCalledWith('tab-b')
  })

  it('does not call onActivate for a tab that has none defined', () => {
    // tab-a has no onActivate; clicking it should not throw
    new TabBar(container, makeTwoTabs())
    expect(() => clickTab(container, 'tab-a')).not.toThrow()
  })

  it('does not fire onActivate for the non-clicked tab', () => {
    const onActivateA = vi.fn()
    const onActivateB = vi.fn()
    const tabs = makeTwoTabs([{ onActivate: onActivateA }, { onActivate: onActivateB }])
    new TabBar(container, tabs)
    clickTab(container, 'tab-b')
    expect(onActivateA).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 1.6.5 — setDisabled()
// ---------------------------------------------------------------------------

describe('TabBar — setDisabled()', () => {
  let container: HTMLElement

  beforeEach(() => { container = makeContainer() })
  afterEach(cleanup)

  it('setDisabled(true) adds pe-none to the <ul>', () => {
    const bar = new TabBar(container, makeTwoTabs())
    bar.setDisabled(true)
    expect(container.querySelector('ul')!.classList.contains('pe-none')).toBe(true)
  })

  it('setDisabled(true) adds opacity-50 to the <ul>', () => {
    const bar = new TabBar(container, makeTwoTabs())
    bar.setDisabled(true)
    expect(container.querySelector('ul')!.classList.contains('opacity-50')).toBe(true)
  })

  it('setDisabled(true) sets aria-disabled="true" on every button', () => {
    const bar = new TabBar(container, makeTwoTabs())
    bar.setDisabled(true)
    const buttons = container.querySelectorAll('ul > li > button')
    buttons.forEach(btn => {
      expect(btn.getAttribute('aria-disabled')).toBe('true')
    })
  })

  it('setDisabled(false) removes pe-none from the <ul>', () => {
    const bar = new TabBar(container, makeTwoTabs())
    bar.setDisabled(true)
    bar.setDisabled(false)
    expect(container.querySelector('ul')!.classList.contains('pe-none')).toBe(false)
  })

  it('setDisabled(false) removes opacity-50 from the <ul>', () => {
    const bar = new TabBar(container, makeTwoTabs())
    bar.setDisabled(true)
    bar.setDisabled(false)
    expect(container.querySelector('ul')!.classList.contains('opacity-50')).toBe(false)
  })

  it('setDisabled(false) removes aria-disabled from every button', () => {
    const bar = new TabBar(container, makeTwoTabs())
    bar.setDisabled(true)
    bar.setDisabled(false)
    const buttons = container.querySelectorAll('ul > li > button')
    buttons.forEach(btn => {
      expect(btn.getAttribute('aria-disabled')).toBeNull()
    })
  })

  it('setDisabled(false) is safe when never disabled first', () => {
    const bar = new TabBar(container, makeTwoTabs())
    expect(() => bar.setDisabled(false)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// 1.6.7 — ARIA attributes
// ---------------------------------------------------------------------------

describe('TabBar — ARIA attributes', () => {
  let container: HTMLElement

  beforeEach(() => { container = makeContainer() })
  afterEach(cleanup)

  it('<ul> has role="tablist"', () => {
    new TabBar(container, makeTwoTabs())
    expect(container.querySelector('ul')!.getAttribute('role')).toBe('tablist')
  })

  it('each <li> has role="presentation"', () => {
    new TabBar(container, makeTwoTabs())
    container.querySelectorAll('ul > li').forEach(li => {
      expect(li.getAttribute('role')).toBe('presentation')
    })
  })

  it('each button has role="tab"', () => {
    new TabBar(container, makeTwoTabs())
    container.querySelectorAll('ul > li > button').forEach(btn => {
      expect(btn.getAttribute('role')).toBe('tab')
    })
  })

  it('each button has aria-controls pointing to its panel id', () => {
    const tabs = makeTwoTabs()
    new TabBar(container, tabs)
    const buttons = container.querySelectorAll<HTMLButtonElement>('ul > li > button')
    buttons.forEach(btn => {
      const panelId = btn.getAttribute('aria-controls')
      expect(panelId).not.toBeNull()
      expect(container.querySelector(`#${panelId}`)).not.toBeNull()
    })
  })

  it('each pane wrapper has role="tabpanel"', () => {
    new TabBar(container, makeTwoTabs())
    const panels = container.querySelectorAll('[role="tabpanel"]')
    expect(panels).toHaveLength(2)
  })

  it('each pane wrapper has aria-labelledby pointing to its button id', () => {
    new TabBar(container, makeTwoTabs())
    const panels = container.querySelectorAll('[role="tabpanel"]')
    panels.forEach(panel => {
      const labelledBy = panel.getAttribute('aria-labelledby')
      expect(labelledBy).not.toBeNull()
      expect(container.querySelector(`#${labelledBy}`)).not.toBeNull()
    })
  })

  it('each button has an id attribute', () => {
    new TabBar(container, makeTwoTabs())
    container.querySelectorAll('ul > li > button').forEach(btn => {
      expect(btn.id).not.toBe('')
    })
  })
})
