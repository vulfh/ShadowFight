/**
 * Task 1.7 — TDD tests for FightListUIManager TabBar integration.
 *
 * Tests the new behaviour added in 1.7.3 / 1.7.4:
 *   - init() builds a TabBar inside #training-tab-bar
 *   - TabBar has two tabs: fight-lists + fight-test
 *   - fight-lists tab is active by default
 *   - existing fightListContainer content is inside the fight-lists pane
 *   - getTabBar() returns the TabBar instance
 *   - getFightTestTabPane() returns the FightTestTabPane instance
 *
 * Acceptance criteria: Req 1.1–1.7, 2.1–2.3, 4.3
 *
 * Runs in jsdom (global vitest env). Raw DOM APIs only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FightListUIManager } from '../managers/FightListUIManager'
import { FightListManager } from '../managers/FightListManager'
import { UIManager } from '../managers/UIManager'
import { TabBar } from '../components/TabBar'
import { FightTestTabPane } from '../components/FightTestTabPane'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockFightListManager(): FightListManager {
  return {
    getFightLists: vi.fn().mockReturnValue([]),
    getCurrentFightList: vi.fn().mockReturnValue(null),
    setCurrentFightList: vi.fn(),
    updateFightList: vi.fn(),
    removeTechniqueFromFightList: vi.fn(),
    deleteFightList: vi.fn(),
    init: vi.fn().mockResolvedValue(undefined),
    isReady: vi.fn().mockReturnValue(true),
  } as unknown as FightListManager
}

function makeMockUIManager(): UIManager {
  return {
    showNotification: vi.fn(),
    init: vi.fn().mockResolvedValue(undefined),
    isReady: vi.fn().mockReturnValue(true),
  } as unknown as UIManager
}

/** Sets up the minimal DOM that FightListUIManager.init() requires. */
function setupDOM(): void {
  // #fightListContainer — required by existing renderFightLists()
  const fightListContainer = document.createElement('div')
  fightListContainer.id = 'fightListContainer'
  document.body.appendChild(fightListContainer)

  // #training-tab-bar — new anchor added by 1.7.1
  const tabBarAnchor = document.createElement('div')
  tabBarAnchor.id = 'training-tab-bar'
  document.body.appendChild(tabBarAnchor)
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('FightListUIManager — TabBar integration (task 1.7)', () => {
  let manager: FightListUIManager

  beforeEach(() => {
    setupDOM()
    manager = new FightListUIManager(
      makeMockFightListManager(),
      makeMockUIManager(),
    )
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
    localStorage.clear()
  })

  // ── getTabBar() / getFightTestTabPane() available after init ──────────────

  it('getTabBar() returns a TabBar instance after init()', async () => {
    await manager.init()
    expect(manager.getTabBar()).toBeInstanceOf(TabBar)
  })

  it('getFightTestTabPane() returns a FightTestTabPane instance after init()', async () => {
    await manager.init()
    expect(manager.getFightTestTabPane()).toBeInstanceOf(FightTestTabPane)
  })

  // ── TabBar rendered into #training-tab-bar ────────────────────────────────

  it('renders a nav-tabs <ul> inside #training-tab-bar after init()', async () => {
    await manager.init()
    const anchor = document.getElementById('training-tab-bar')!
    expect(anchor.querySelector('ul.nav-tabs')).not.toBeNull()
  })

  // ── Two tabs present ──────────────────────────────────────────────────────

  it('TabBar has exactly two tab buttons', async () => {
    await manager.init()
    const anchor = document.getElementById('training-tab-bar')!
    const buttons = anchor.querySelectorAll('[role="tab"]')
    expect(buttons).toHaveLength(2)
  })

  it('first tab id is "fight-lists"', async () => {
    await manager.init()
    expect(manager.getTabBar().getActiveTabId()).toBe('fight-lists')
  })

  it('tab buttons contain "Fight Lists" and "Fight Test" labels', async () => {
    await manager.init()
    const anchor = document.getElementById('training-tab-bar')!
    const text = anchor.querySelector('ul.nav-tabs')!.textContent ?? ''
    expect(text).toContain('Fight Lists')
    expect(text).toContain('Fight Test')
  })

  // ── fightListContainer inside fight-lists pane ────────────────────────────

  it('#fightListContainer is inside the fight-lists tab pane', async () => {
    await manager.init()
    const anchor = document.getElementById('training-tab-bar')!
    const fightListsPanel = anchor.querySelector('#tab-panel-fight-lists')
    expect(fightListsPanel).not.toBeNull()
    expect(fightListsPanel!.querySelector('#fightListContainer')).not.toBeNull()
  })

  // ── FightTestTabPane pane present ─────────────────────────────────────────

  it('fight-test pane contains the FightTestTabPane root element', async () => {
    await manager.init()
    const anchor = document.getElementById('training-tab-bar')!
    const ftPanel = anchor.querySelector('#tab-panel-fight-test')
    expect(ftPanel).not.toBeNull()
    // FightTestTabPane renders a #ft-match-count inside its root
    expect(ftPanel!.querySelector('#ft-match-count')).not.toBeNull()
  })

  // ── isReady() still works ─────────────────────────────────────────────────

  it('isReady() returns true after init()', async () => {
    await manager.init()
    expect(manager.isReady()).toBe(true)
  })
})
