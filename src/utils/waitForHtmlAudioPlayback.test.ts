import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isHtmlAudioNearEnd, waitForHtmlAudioPlayback } from './waitForHtmlAudioPlayback'

type FakeAudio = HTMLAudioElement & {
  dispatch: (type: string) => void
  play: ReturnType<typeof vi.fn>
}

function createAudio(overrides: Partial<HTMLAudioElement> = {}): FakeAudio {
  const listeners = new Map<string, Set<EventListener>>()

  const audio = {
    ended: false,
    paused: false,
    duration: 2,
    currentTime: 0,
    error: null,
    play: vi.fn().mockResolvedValue(undefined),
    addEventListener: (type: string, listener: EventListener) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }
      listeners.get(type)!.add(listener)
    },
    removeEventListener: (type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener)
    },
    dispatch: (type: string) => {
      listeners.get(type)?.forEach(listener => listener(new Event(type)))
    },
    ...overrides
  }

  return audio as unknown as FakeAudio
}

describe('isHtmlAudioNearEnd', () => {
  it('is true when ended', () => {
    expect(isHtmlAudioNearEnd(createAudio({ ended: true, currentTime: 0, duration: 2 }))).toBe(true)
  })

  it('is true when currentTime is at the end of duration', () => {
    expect(isHtmlAudioNearEnd(createAudio({ currentTime: 1.95, duration: 2 }))).toBe(true)
  })

  it('is false mid-clip', () => {
    expect(isHtmlAudioNearEnd(createAudio({ currentTime: 0.5, duration: 2 }))).toBe(false)
  })
})

describe('waitForHtmlAudioPlayback', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves on ended', async () => {
    const audio = createAudio()
    const done = waitForHtmlAudioPlayback(audio)
    audio.dispatch('ended')
    await expect(done).resolves.toBeUndefined()
  })

  it('resolves when pause fires near the end even without ended', async () => {
    const audio = createAudio({ currentTime: 1.99, duration: 2, paused: true })
    const done = waitForHtmlAudioPlayback(audio)
    audio.dispatch('pause')
    await expect(done).resolves.toBeUndefined()
  })

  it('resumes when pause fires mid-clip (screen lock)', async () => {
    const audio = createAudio({ currentTime: 0.4, duration: 2, paused: true })
    const done = waitForHtmlAudioPlayback(audio)
    audio.dispatch('pause')
    expect(audio.play).toHaveBeenCalled()
    audio.dispatch('ended')
    await done
  })

  it('retries play when the page becomes visible again', async () => {
    const audio = createAudio({ currentTime: 0.4, duration: 2, paused: true })
    const done = waitForHtmlAudioPlayback(audio)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(audio.play).toHaveBeenCalled()
    audio.dispatch('ended')
    await done
  })

  it('resolves on abort so callers cannot deadlock', async () => {
    const audio = createAudio()
    const controller = new AbortController()
    const done = waitForHtmlAudioPlayback(audio, { signal: controller.signal })
    controller.abort()
    await expect(done).resolves.toBeUndefined()
  })
})
