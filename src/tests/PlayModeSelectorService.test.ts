import { describe, it, expect, beforeEach, vi, afterEach, MockInstance } from 'vitest'
import { PlayModeSelectorService } from '../services/PlayModeSelectorService'
import { STORAGE_KEYS } from '../constants/storage'

describe('PlayModeSelectorService', () => {
  let service: PlayModeSelectorService
  let getItemSpy:  MockInstance<(key: string) => string | null>
  let setItemSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    service = new PlayModeSelectorService()
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem')
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the stored value when it is a valid PlayMode', () => {
    getItemSpy.mockReturnValue('Ordered')

    const result = service.read()

    expect(result).toBe('Ordered')
    expect(setItemSpy).not.toHaveBeenCalled()
  })

  it("returns 'Random' and writes it when nothing is stored", () => {
    getItemSpy.mockReturnValue(null)

    const result = service.read()

    expect(result).toBe('Random')
    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.PLAY_MODE, 'Random')
  })

  it("returns 'Random' and overwrites an invalid stored value", () => {
    getItemSpy.mockReturnValue('garbage')

    const result = service.read()

    expect(result).toBe('Random')
    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.PLAY_MODE, 'Random')
  })

  it("returns 'Random' and does NOT call setItem when getItem throws", () => {
    getItemSpy.mockImplementation(() => {
      throw new DOMException('Simulated SecurityError', 'SecurityError')
    })

    const result = service.read()

    expect(result).toBe('Random')
    expect(setItemSpy).not.toHaveBeenCalled()
  })

  it('write() persists the value under the correct storage key', () => {
    service.write('Prioritized')

    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.PLAY_MODE, 'Prioritized')
  })
})
