/**
 * Tests for audio validation utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  isAudioSupported, 
  isAudioFormatSupported,
  getAudioFormat,
  validateAudioFormat,
  createAudioFallback
} from '../utils/audioValidation'
import { MODES } from '../constants/modes'

// Mock Audio constructor
const mockAudio = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  canPlayType: vi.fn(),
  preload: '',
  src: ''
}

// Mock window.Audio
Object.defineProperty(window, 'Audio', {
  writable: true,
  value: vi.fn(() => mockAudio)
})

describe('audioValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAudio.addEventListener.mockClear()
    mockAudio.removeEventListener.mockClear()
    mockAudio.canPlayType.mockClear()
  })

  describe('isAudioSupported', () => {
    it('should return true when Audio is supported', () => {
      expect(isAudioSupported()).toBe(true)
    })

    it('should return false when Audio is not supported', () => {
      const originalAudio = window.Audio
      // @ts-ignore
      delete window.Audio
      
      expect(isAudioSupported()).toBe(false)
      
      window.Audio = originalAudio
    })

    it('should return false when Audio constructor throws', () => {
      const originalAudio = window.Audio
      window.Audio = vi.fn(() => {
        throw new Error('Audio not supported')
      })
      
      expect(isAudioSupported()).toBe(false)
      
      window.Audio = originalAudio
    })
  })

  describe('isAudioFormatSupported', () => {
    it('should return true for supported wav format', () => {
      mockAudio.canPlayType.mockReturnValue('probably')
      
      expect(isAudioFormatSupported('wav')).toBe(true)
      expect(mockAudio.canPlayType).toHaveBeenCalledWith('audio/wav')
    })

    it('should return true for maybe supported format', () => {
      mockAudio.canPlayType.mockReturnValue('maybe')
      
      expect(isAudioFormatSupported('mp3')).toBe(true)
      expect(mockAudio.canPlayType).toHaveBeenCalledWith('audio/mpeg')
    })

    it('should return false for unsupported format', () => {
      mockAudio.canPlayType.mockReturnValue('')
      
      expect(isAudioFormatSupported('wav')).toBe(false)
    })

    it('should return false for unknown format', () => {
      expect(isAudioFormatSupported('unknown')).toBe(false)
    })

    it('should return false when Audio is not supported', () => {
      const originalAudio = window.Audio
      // @ts-ignore
      delete window.Audio
      
      expect(isAudioFormatSupported('wav')).toBe(false)
      
      window.Audio = originalAudio
    })
  })

  describe('getAudioFormat', () => {
    it('should extract format from file path', () => {
      expect(getAudioFormat('/sounds/test.wav')).toBe('wav')
      expect(getAudioFormat('/sounds/test.mp3')).toBe('mp3')
      expect(getAudioFormat('/sounds/test.WAV')).toBe('wav')
    })

    it('should return null for files without extension', () => {
      expect(getAudioFormat('/sounds/test')).toBe(null)
      expect(getAudioFormat('')).toBe(null)
    })
  })

  describe('validateAudioFormat', () => {
    beforeEach(() => {
      mockAudio.canPlayType.mockReturnValue('probably')
    })

    it('should return true for supported wav files', () => {
      expect(validateAudioFormat('/sounds/test.wav')).toBe(true)
    })

    it('should return false for unsupported formats', () => {
      expect(validateAudioFormat('/sounds/test.xyz')).toBe(false)
    })

    it('should return false for files without extension', () => {
      expect(validateAudioFormat('/sounds/test')).toBe(false)
    })
  })

  describe('createAudioFallback', () => {
    it('should create fallback configuration for PERFORMING mode', () => {
      const fallback = createAudioFallback(MODES.PERFORMING)
      
      expect(fallback).toEqual({
        mode: MODES.PERFORMING,
        skipInstructionAudio: true,
        fallbackMessage: 'Instruction audio for PERFORMING mode is not available. Proceeding with technique session.',
        proceedWithSession: true
      })
    })

    it('should create fallback configuration for RESPONDING mode', () => {
      const fallback = createAudioFallback(MODES.RESPONDING)
      
      expect(fallback).toEqual({
        mode: MODES.RESPONDING,
        skipInstructionAudio: true,
        fallbackMessage: 'Instruction audio for RESPONDING mode is not available. Proceeding with technique session.',
        proceedWithSession: true
      })
    })
  })
})