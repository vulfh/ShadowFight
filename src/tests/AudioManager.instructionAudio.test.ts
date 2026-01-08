/**
 * Tests for AudioManager instruction audio functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioManager } from '../managers/AudioManager'
import { MODES } from '../constants/modes'
import { AUDIO_EVENTS, AUDIO_ERRORS } from '../constants/audio'

// Mock Web Audio API
const mockAudioContext = {
  createGain: vi.fn(),
  createBufferSource: vi.fn(),
  decodeAudioData: vi.fn(),
  destination: {},
  state: 'running',
  resume: vi.fn()
}

const mockGainNode = {
  connect: vi.fn(),
  gain: { value: 0.8 }
}

const mockBufferSource = {
  buffer: null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null as (() => void) | null
}

const mockAudioBuffer = {
  duration: 2.5,
  sampleRate: 44100
}

// Mock fetch
const mockFetch = vi.fn()

// Mock window objects
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext)
})

Object.defineProperty(window, 'fetch', {
  writable: true,
  value: mockFetch
})

describe('AudioManager - Instruction Audio', () => {
  let audioManager: AudioManager

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mocks
    mockAudioContext.createGain.mockReturnValue(mockGainNode)
    mockAudioContext.createBufferSource.mockReturnValue(mockBufferSource)
    mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer)
    
    // Mock successful fetch
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
    })
    
    audioManager = new AudioManager()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('initialization', () => {
    it('should initialize and preload instruction audio', async () => {
      await audioManager.init()
      
      expect(mockAudioContext.createGain).toHaveBeenCalled()
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination)
      expect(audioManager.isReady()).toBe(true)
    })

    it('should handle initialization errors gracefully', async () => {
      mockAudioContext.createGain.mockImplementation(() => {
        throw new Error('AudioContext creation failed')
      })

      await expect(audioManager.init()).rejects.toThrow('AudioContext creation failed')
    })
  })

  describe('playInstructionAudio', () => {
    beforeEach(async () => {
      await audioManager.init()
    })

    it('should play instruction audio for PERFORMING mode', async () => {
      const onComplete = vi.fn()
      
      await audioManager.playInstructionAudio(MODES.PERFORMING, onComplete)
      
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('instruction-for-performer.wav'))
      expect(mockBufferSource.start).toHaveBeenCalledWith(0)
      expect(audioManager.isPlayingInstructionAudio()).toBe(true)
      expect(audioManager.getCurrentInstructionMode()).toBe(MODES.PERFORMING)
    })

    it('should play instruction audio for RESPONDING mode', async () => {
      const onComplete = vi.fn()
      
      await audioManager.playInstructionAudio(MODES.RESPONDING, onComplete)
      
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('instruction-for-responder.wav'))
      expect(mockBufferSource.start).toHaveBeenCalledWith(0)
      expect(audioManager.isPlayingInstructionAudio()).toBe(true)
      expect(audioManager.getCurrentInstructionMode()).toBe(MODES.RESPONDING)
    })

    it('should call completion callback when audio ends', async () => {
      const onComplete = vi.fn()
      
      await audioManager.playInstructionAudio(MODES.PERFORMING, onComplete)
      
      // Simulate audio ending
      if (mockBufferSource.onended) {
        mockBufferSource.onended()
      }
      
      expect(onComplete).toHaveBeenCalled()
      expect(audioManager.isPlayingInstructionAudio()).toBe(false)
      expect(audioManager.getCurrentInstructionMode()).toBe(null)
    })

    it('should dispatch audio events', async () => {
      const eventListener = vi.fn()
      window.addEventListener(AUDIO_EVENTS.STARTED, eventListener)
      
      await audioManager.playInstructionAudio(MODES.PERFORMING)
      
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            mode: MODES.PERFORMING,
            filePath: expect.stringContaining('instruction-for-performer.wav')
          })
        })
      )
      
      window.removeEventListener(AUDIO_EVENTS.STARTED, eventListener)
    })

    it('should handle audio loading errors', async () => {
      // Clear any cached buffers first
      audioManager.clearCache()
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      await expect(audioManager.playInstructionAudio(MODES.PERFORMING))
        .rejects.toThrow('Network error')
      
      expect(audioManager.isPlayingInstructionAudio()).toBe(false)
    })

    it('should stop current audio before playing new instruction', async () => {
      // Start first instruction
      await audioManager.playInstructionAudio(MODES.PERFORMING)
      
      // Start second instruction
      await audioManager.playInstructionAudio(MODES.RESPONDING)
      
      expect(mockBufferSource.stop).toHaveBeenCalled()
      expect(audioManager.getCurrentInstructionMode()).toBe(MODES.RESPONDING)
    })

    it('should throw error if AudioContext not initialized', async () => {
      const uninitializedManager = new AudioManager()
      
      await expect(uninitializedManager.playInstructionAudio(MODES.PERFORMING))
        .rejects.toThrow(AUDIO_ERRORS.LOAD_FAILED)
    })
  })

  describe('stopInstructionAudio', () => {
    beforeEach(async () => {
      await audioManager.init()
    })

    it('should stop instruction audio playback', async () => {
      await audioManager.playInstructionAudio(MODES.PERFORMING)
      
      audioManager.stopInstructionAudio()
      
      expect(mockBufferSource.stop).toHaveBeenCalled()
      expect(audioManager.isPlayingInstructionAudio()).toBe(false)
      expect(audioManager.getCurrentInstructionMode()).toBe(null)
    })

    it('should clear pending callbacks when stopped', async () => {
      const onComplete = vi.fn()
      
      await audioManager.playInstructionAudio(MODES.PERFORMING, onComplete)
      audioManager.stopInstructionAudio()
      
      // Simulate audio ending after stop
      if (mockBufferSource.onended) {
        mockBufferSource.onended()
      }
      
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('should handle stop when no audio is playing', () => {
      expect(() => audioManager.stopInstructionAudio()).not.toThrow()
    })
  })

  describe('validateInstructionAudio', () => {
    beforeEach(async () => {
      await audioManager.init()
    })

    it('should validate all instruction audio files', async () => {
      const results = await audioManager.validateInstructionAudio()
      
      expect(results[MODES.PERFORMING]).toBe(true)
      expect(results[MODES.RESPONDING]).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should validate specific mode', async () => {
      const results = await audioManager.validateInstructionAudio(MODES.PERFORMING)
      
      expect(results[MODES.PERFORMING]).toBe(true)
      expect(results[MODES.RESPONDING]).toBeUndefined()
    })

    it('should handle validation failures', async () => {
      // Clear cache and mock failure
      audioManager.clearCache()
      mockFetch.mockRejectedValue(new Error('File not found'))
      
      const results = await audioManager.validateInstructionAudio(MODES.PERFORMING)
      
      expect(results[MODES.PERFORMING]).toBe(false)
    })
  })

  describe('volume control', () => {
    beforeEach(async () => {
      await audioManager.init()
    })

    it('should set instruction audio volume', () => {
      audioManager.setInstructionAudioVolume(0.5)
      
      expect(audioManager.getInstructionAudioVolume()).toBe(0.5)
      expect(mockGainNode.gain.value).toBe(0.5)
    })

    it('should get instruction audio volume', () => {
      audioManager.setVolume(0.7)
      
      expect(audioManager.getInstructionAudioVolume()).toBe(0.7)
    })
  })

  describe('state management', () => {
    beforeEach(async () => {
      await audioManager.init()
    })

    it('should track instruction audio playing state', async () => {
      expect(audioManager.isPlayingInstructionAudio()).toBe(false)
      expect(audioManager.getCurrentInstructionMode()).toBe(null)
      
      await audioManager.playInstructionAudio(MODES.PERFORMING)
      
      expect(audioManager.isPlayingInstructionAudio()).toBe(true)
      expect(audioManager.getCurrentInstructionMode()).toBe(MODES.PERFORMING)
    })

    it('should reset state when audio completes', async () => {
      await audioManager.playInstructionAudio(MODES.PERFORMING)
      
      // Simulate audio completion
      if (mockBufferSource.onended) {
        mockBufferSource.onended()
      }
      
      expect(audioManager.isPlayingInstructionAudio()).toBe(false)
      expect(audioManager.getCurrentInstructionMode()).toBe(null)
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      await audioManager.init()
    })

    it('should dispatch error events on playback failure', async () => {
      const errorListener = vi.fn()
      window.addEventListener(AUDIO_EVENTS.ERROR, errorListener)
      
      // Clear cache and mock decode failure
      audioManager.clearCache()
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode failed'))
      
      await expect(audioManager.playInstructionAudio(MODES.PERFORMING))
        .rejects.toThrow('Decode failed')
      
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            mode: MODES.PERFORMING,
            error: 'Decode failed'
          })
        })
      )
      
      window.removeEventListener(AUDIO_EVENTS.ERROR, errorListener)
    })

    it('should handle buffer source creation failure', async () => {
      mockAudioContext.createBufferSource.mockImplementation(() => {
        throw new Error('Buffer source creation failed')
      })
      
      await expect(audioManager.playInstructionAudio(MODES.PERFORMING))
        .rejects.toThrow('Buffer source creation failed')
    })
  })

  describe('integration with existing audio methods', () => {
    beforeEach(async () => {
      await audioManager.init()
    })

    it('should stop instruction audio when stopCurrentAudio is called', async () => {
      await audioManager.playInstructionAudio(MODES.PERFORMING)
      
      audioManager.stopCurrentAudio()
      
      expect(audioManager.isPlayingInstructionAudio()).toBe(false)
      expect(audioManager.getCurrentInstructionMode()).toBe(null)
    })

    it('should work with existing volume controls', () => {
      audioManager.setVolume(0.3)
      
      expect(audioManager.getInstructionAudioVolume()).toBe(0.3)
    })

    it('should maintain compatibility with existing audio methods', async () => {
      // Test that existing methods still work
      expect(audioManager.isReady()).toBe(true)
      expect(audioManager.getVolume()).toBe(0.8)
      expect(audioManager.isPlaying()).toBe(false)
    })
  })
})