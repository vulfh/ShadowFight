/**
 * Task 1.8 — TDD tests for app.ts session wiring (AFT path).
 *
 * Tests the new behaviour introduced in 1.8.1–1.8.6:
 *   - handleStartSession() routes to fight-test path when fight-test tab active
 *   - mode null → showModeError(), no session started
 *   - 0 matches → error notification, no session started
 *   - valid → startSessionWithFightList called, UI disabled, tabBar locked
 *   - disableConfigurationControls() locks tabBar
 *   - enableConfigurationControls() unlocks tabBar
 *   - fight-lists path still works (zero regression)
 *
 * Strategy: exercise KravMagaTrainerApp directly after init(), with heavy
 * vi.spyOn on collaborators so no real audio / IndexedDB is touched.
 *
 * Acceptance criteria: Req 7.1–7.6, 8.1–8.4, 10.4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { KravMagaTrainerApp } from '../app'

// ---------------------------------------------------------------------------
// DOM bootstrap — minimal elements the app reads on startup / session start
// ---------------------------------------------------------------------------

function buildDOM(): void {
  document.body.innerHTML = `
    <div id="fightListContainer"></div>
    <div id="training-tab-bar"></div>
    <input id="fightDuration"  type="range" value="5">
    <input id="actionDelay"    type="range" value="3">
    <input id="volumeControl"  type="range" value="80">
    <span  id="durationValue">5</span>
    <span  id="delayValue">3</span>
    <span  id="volumeValue">80</span>
    <div   id="sessionStatus"></div>
    <div   id="timerDisplay"></div>
    <div   id="techniqueDisplay"></div>
    <button id="startBtn"></button>
    <button id="pauseBtn"></button>
    <button id="stopBtn"></button>
    <form  id="timeConfigForm"></form>
    <div   id="notification-container"></div>
  `
}

// ---------------------------------------------------------------------------
// Heavy stub: silence all async managers so init() completes fast
// ---------------------------------------------------------------------------

async function initApp(app: KravMagaTrainerApp): Promise<void> {
  // Silence VoiceNoteService IndexedDB noise and AudioContext errors
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})

  // AudioManager uses AudioContext which is unavailable in jsdom
  vi.spyOn(app['audioManager'], 'init').mockResolvedValue(undefined)
  // VoiceNoteService IndexedDB — already silent via console mock, but also mock preload
  vi.spyOn(app as any, 'preloadAudioFiles').mockResolvedValue(undefined)

  await app.init()
}

// ---------------------------------------------------------------------------
// Helpers to reach tabs via the TabBar rendered into #training-tab-bar
// ---------------------------------------------------------------------------

function clickTab(id: string): void {
  const btn = document.querySelector(
    `#training-tab-bar button[data-tab-id="${id}"]`
  ) as HTMLElement | null
  btn?.click()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KravMagaTrainerApp — fight-test session wiring (task 1.8)', () => {
  let app: KravMagaTrainerApp

  beforeEach(() => {
    buildDOM()
    localStorage.clear()
    app = new KravMagaTrainerApp()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    vi.restoreAllMocks()
  })

  // ── TabBar locked / unlocked around session ─────────────────────────────

  it('disableConfigurationControls locks the TabBar', async () => {
    await initApp(app)
    const tabBar = app['fightListUIManager'].getTabBar()
    const setDisabledSpy = vi.spyOn(tabBar, 'setDisabled')
    ;(app as any).disableConfigurationControls()
    expect(setDisabledSpy).toHaveBeenCalledWith(true)
  })

  it('enableConfigurationControls unlocks the TabBar', async () => {
    await initApp(app)
    const tabBar = app['fightListUIManager'].getTabBar()
    const setDisabledSpy = vi.spyOn(tabBar, 'setDisabled')
    ;(app as any).enableConfigurationControls()
    expect(setDisabledSpy).toHaveBeenCalledWith(false)
  })

  // ── mode null → showModeError, no session ───────────────────────────────

  it('fight-test path: mode null → showModeError() called', async () => {
    await initApp(app)
    clickTab('fight-test')

    const ftPane = app['fightListUIManager'].getFightTestTabPane()
    const showErr = vi.spyOn(ftPane, 'showModeError')
    const startSpy = vi.spyOn(app['sessionManager'], 'startSessionWithFightList')
      .mockResolvedValue(undefined as any)

    await (app as any).handleStartSession()

    expect(showErr).toHaveBeenCalled()
    expect(startSpy).not.toHaveBeenCalled()
  })

  // ── 0 matches → error notification, no session ──────────────────────────

  it('fight-test path: 0 matches → error notification, no session', async () => {
    await initApp(app)
    clickTab('fight-test')

    // Give a valid mode but override AdhocFilterEngine to return empty
    const { AdhocFilterEngine } = await import('../utils/AdhocFilterEngine')
    vi.spyOn(AdhocFilterEngine, 'filter').mockReturnValue([])

    const ftPane = app['fightListUIManager'].getFightTestTabPane()
    // Patch getCurrentFightTest to return mode: 'PERFORMING'
    vi.spyOn(ftPane, 'getCurrentFightTest').mockReturnValue({
      id: 'adhoc', name: 'Adhoc',
      mode: 'PERFORMING', targetLevels: [], categories: [], side: null, shuffleMode: 'Random',
    })

    const showNotification = vi.spyOn(app as any, 'showNotification')
    const startSpy = vi.spyOn(app['sessionManager'], 'startSessionWithFightList')
      .mockResolvedValue(undefined as any)

    await (app as any).handleStartSession()

    expect(startSpy).not.toHaveBeenCalled()
    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' })
    )
  })

  // ── valid → startSessionWithFightList called ─────────────────────────────

  it('fight-test path: valid → startSessionWithFightList called with synthetic list', async () => {
    await initApp(app)
    clickTab('fight-test')

    const ftPane = app['fightListUIManager'].getFightTestTabPane()
    vi.spyOn(ftPane, 'getCurrentFightTest').mockReturnValue({
      id: 'adhoc', name: 'Adhoc',
      mode: 'PERFORMING', targetLevels: [], categories: [], side: null, shuffleMode: 'Random',
    })

    // AdhocFilterEngine returns real results from the loaded catalogue
    const { AdhocFilterEngine } = await import('../utils/AdhocFilterEngine')
    vi.spyOn(AdhocFilterEngine, 'filter').mockReturnValue([
      { name: 't1', file: 't1.wav', category: 'Kicks', priority: 'medium',
        selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING'] },
    ])

    const startSpy = vi.spyOn(app['sessionManager'], 'startSessionWithFightList')
      .mockResolvedValue(undefined as any)
    vi.spyOn(app['sessionManager'], 'isPlayingInstructionAudio').mockReturnValue(false)
    vi.spyOn(app['sessionManager'], 'isWaitingForInstructionCompletion').mockReturnValue(false)
    vi.spyOn(app as any, 'startTechniqueAnnouncementLoop').mockResolvedValue(undefined)

    await (app as any).handleStartSession()

    expect(startSpy).toHaveBeenCalledOnce()
    const [, fightList, shuffleMode] = startSpy.mock.calls[0]
    expect(fightList.mode).toBe('PERFORMING')
    expect(fightList.techniques).toHaveLength(1)
    expect(fightList.techniques[0].priority).toBe(3)
    expect(fightList.techniques[0].selected).toBe(true)
    expect(shuffleMode).toBe('Random')
  })

  // ── valid → tabBar locked ────────────────────────────────────────────────

  it('fight-test path: valid → tabBar setDisabled(true) called', async () => {
    await initApp(app)
    clickTab('fight-test')

    const ftPane = app['fightListUIManager'].getFightTestTabPane()
    vi.spyOn(ftPane, 'getCurrentFightTest').mockReturnValue({
      id: 'adhoc', name: 'Adhoc',
      mode: 'PERFORMING', targetLevels: [], categories: [], side: null, shuffleMode: 'Random',
    })
    const { AdhocFilterEngine } = await import('../utils/AdhocFilterEngine')
    vi.spyOn(AdhocFilterEngine, 'filter').mockReturnValue([
      { name: 't1', file: 't1.wav', category: 'Kicks', priority: 'medium',
        selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING'] },
    ])
    vi.spyOn(app['sessionManager'], 'startSessionWithFightList').mockResolvedValue(undefined as any)
    vi.spyOn(app['sessionManager'], 'isPlayingInstructionAudio').mockReturnValue(false)
    vi.spyOn(app['sessionManager'], 'isWaitingForInstructionCompletion').mockReturnValue(false)
    vi.spyOn(app as any, 'startTechniqueAnnouncementLoop').mockResolvedValue(undefined)

    const tabBar = app['fightListUIManager'].getTabBar()
    const setDisabledSpy = vi.spyOn(tabBar, 'setDisabled')

    await (app as any).handleStartSession()

    expect(setDisabledSpy).toHaveBeenCalledWith(true)
  })

  // ── fight-lists tab: existing path unaffected ────────────────────────────

  it('fight-lists tab: still routes to fight-list session path (regression)', async () => {
    await initApp(app)
    // fight-lists is default active tab — no clickTab needed

    const startSpy = vi.spyOn(app['sessionManager'], 'startSessionWithFightList')
      .mockResolvedValue(undefined as any)
    vi.spyOn(app['sessionManager'], 'isPlayingInstructionAudio').mockReturnValue(false)
    vi.spyOn(app['sessionManager'], 'isWaitingForInstructionCompletion').mockReturnValue(false)
    vi.spyOn(app as any, 'startTechniqueAnnouncementLoop').mockResolvedValue(undefined)

    // handleStartFightListSession when no fight list → shows modal (no crash)
    await (app as any).handleStartSession()

    // No fight-test route taken → startSessionWithFightList not called by fight-test path
    // (modal appears but is async; just confirm no crash and no ft-path call)
    expect(startSpy).not.toHaveBeenCalled()
  })
})
