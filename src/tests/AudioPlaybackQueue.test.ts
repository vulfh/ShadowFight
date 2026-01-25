/**
 * AudioPlaybackQueue Tests
 * 
 * Tests for the AudioPlaybackQueue class that manages sequential audio playback
 * with completion tracking, pause/resume functionality, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AudioPlaybackQueue } from '../managers/AudioPlaybackQueue'
import { AudioManager } from '../managers/AudioManager'
import { AudioType } from '../types/audio'

// Mock AudioManager
vi.mock('../managers/AudioManager')

describe('AudioPlaybackQueue', () => {
  let audioPlaybackQueue: AudioPlaybackQueue
  let mockAudioManager: AudioManager

  beforeEach(() => {
    // Create mock AudioManager
    mockAudioManager = {
      playAudio: vi.fn().mockResolvedValue(undefined),
      stopCurrentAudio: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false)
    } as any

    // Create AudioPlaybackQueue instance
    audioPlaybackQueue = new AudioPlaybackQueue(mockAudioManager)
  })

  describe('enqueue functionality', () => {
    it('should add audio item to queue', () => {
      audioPlaybackQueue.enqueue('test-audio.wav', AudioType.TECHNIQUE_ANNOUNCEMENT)
      
      expect(audioPlaybackQueue.getQueueLength()).toBe(1)
      expect(audioPlaybackQueue.getCurrentAudio()).toBeNull() // Not playing yet
    })

    it('should validate audioFile parameter', () => {
      expect(() => {
        audioPlaybackQueue.enqueue('', AudioType.TECHNIQUE_ANNOUNCEMENT)
      }).toThrow('AudioPlaybackQueue: audioFile must be a non-empty string')

      expect(() => {
        audioPlaybackQueue.enqueue(null as any, AudioType.TECHNIQUE_ANNOUNCEMENT)
      }).toThrow('AudioPlaybackQueue: audioFile must be a non-empty string')
    })

    it('should sort queue by priority (higher priority first)', () => {
      audioPlaybackQueue.enqueue('low-priority.wav', AudioType.TECHNIQUE_FEEDBACK, 1)
      audioPlaybackQueue.enqueue('high-priority.wav', AudioType.TECHNIQUE_ANNOUNCEMENT, 5)
      audioPlaybackQueue.enqueue('medium-priority.wav', AudioType.TECHNIQUE_INSTRUCTION, 3)

      expect(audioPlaybackQueue.getQueueLength()).toBe(3)
      
      // Start playing to access the first item
      audioPlaybackQueue.play()
      const firstItem = audioPlaybackQueue.getCurrentAudio()
      expect(firstItem?.file).toBe('high-priority.wav')
      expect(firstItem?.priority).toBe(5)
    })

    it('should prevent duplicate entries for same file and type', () => {
      audioPlaybackQueue.enqueue('test.wav', AudioType.TECHNIQUE_ANNOUNCEMENT, 1)
      audioPlaybackQueue.enqueue('test.wav', AudioType.TECHNIQUE_ANNOUNCEMENT, 2)
      
      expect(audioPlaybackQueue.getQueueLength()).toBe(1)
      
      // Should update priority to higher value
      audioPlaybackQueue.play()
      const item = audioPlaybackQueue.getCurrentAudio()
      expect(item?.priority).toBe(2)
    })

    it('should set optional flag correctly based on audio type', () => {
      audioPlaybackQueue.enqueue('announcement.wav', AudioType.TECHNIQUE_ANNOUNCEMENT)
      audioPlaybackQueue.enqueue('feedback.wav', AudioType.TECHNIQUE_FEEDBACK)
      
      audioPlaybackQueue.play()
      
      // Technique announcements should be required (not optional)
      const firstItem = audioPlaybackQueue.getCurrentAudio()
      expect(firstItem?.type).toBe(AudioType.TECHNIQUE_ANNOUNCEMENT)
      expect(firstItem?.optional).toBe(false)
    })
  })

  describe('playback functionality', () => {
    it('should return immediately for empty queue', async () => {
      await expect(audioPlaybackQueue.play()).resolves.toBeUndefined()
      expect(mockAudioManager.playAudio).not.toHaveBeenCalled()
    })

    it('should throw error if already playing', async () => {
      audioPlaybackQueue.enqueue('test.wav', AudioType.TECHNIQUE_ANNOUNCEMENT)
      
      // Start first playback
      audioPlaybackQueue.play()
      
      // Try to start second playback
      await expect(audioPlaybackQueue.play()).rejects.toThrow('AudioPlaybackQueue: Already playing')
      
      // Clean up first playback
      audioPlaybackQueue.clear()
    })

    it('should play audio using AudioManager', async () => {
      const testFile = 'test-audio.wav'
      audioPlaybackQueue.enqueue(testFile, AudioType.TECHNIQUE_ANNOUNCEMENT)
      
      // Mock audio completion
      mockAudioManager.isPlaying = vi.fn()
        .mockReturnValueOnce(true)  // First check - still playing
        .mockReturnValue(false)     // Subsequent checks - completed
      
      await audioPlaybackQueue.play()
      
      expect(mockAudioManager.playAudio).toHaveBeenCalledWith(testFile)
      expect(audioPlaybackQueue.isPlayingAudio()).toBe(false) // Should be completed
    })

    it('should handle multiple audio items sequentially', async () => {
      audioPlaybackQueue.enqueue('first.wav', AudioType.TECHNIQUE_ANNOUNCEMENT, 2)
      audioPlaybackQueue.enqueue('second.wav', AudioType.TECHNIQUE_INSTRUCTION, 1)
      
      // Mock audio completion for both files
      mockAudioManager.isPlaying = vi.fn().mockReturnValue(false)
      
      await audioPlaybackQueue.play()
      
      expect(mockAudioManager.playAudio).toHaveBeenCalledTimes(2)
      expect(mockAudioManager.playAudio).toHaveBeenNthCalledWith(1, 'first.wav') // Higher priority first
      expect(mockAudioManager.playAudio).toHaveBeenNthCalledWith(2, 'second.wav')
    })
  })

  describe('pause/resume functionality', () => {
    it('should pause playback and stop current audio', () => {
      audioPlaybackQueue.enqueue('test.wav', AudioType.TECHNIQUE_ANNOUNCEMENT)
      audioPlaybackQueue.play()
      
      audioPlaybackQueue.pause()
      
      expect(mockAudioManager.stopCurrentAudio).toHaveBeenCalled()
      expect(audioPlaybackQueue.isPausedState()).toBe(true)
      expect(audioPlaybackQueue.isPlayingAudio()).toBe(false)
    })

    it('should resume playback from paused position', async () => {
      audioPlaybackQueue.enqueue('test.wav', AudioType.TECHNIQUE_ANNOUNCEMENT)
      audioPlaybackQueue.play()
      audioPlaybackQueue.pause()
      
      // Mock audio completion for resume
      mockAudioManager.isPlaying = vi.fn().mockReturnValue(false)
      
      audioPlaybackQueue.resume()
      
      expect(audioPlaybackQueue.isPausedState()).toBe(false)
    })

    it('should not pause if not playing', () => {
      audioPlaybackQueue.pause()
      
      expect(mockAudioManager.stopCurrentAudio).not.toHaveBeenCalled()
      expect(audioPlaybackQueue.isPausedState()).toBe(false)
    })

    it('should not resume if not paused', () => {
      audioPlaybackQueue.resume()
      
      expect(audioPlaybackQueue.isPausedState()).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should continue with optional audio failures', async () => {
      audioPlaybackQueue.enqueue('required.wav', AudioType.TECHNIQUE_ANNOUNCEMENT, 2, false) // Higher priority
      audioPlaybackQueue.enqueue('optional.wav', AudioType.TECHNIQUE_FEEDBACK, 1, true) // Lower priority
      
      // Mock first audio (required) to succeed, second (optional) to fail
      mockAudioManager.playAudio = vi.fn()
        .mockResolvedValueOnce(undefined) // Required audio succeeds
        .mockRejectedValueOnce(new Error('Audio load failed')) // Optional audio fails
      
      mockAudioManager.isPlaying = vi.fn().mockReturnValue(false)
      
      await audioPlaybackQueue.play()
      
      expect(mockAudioManager.playAudio).toHaveBeenCalledTimes(2)
      expect(mockAudioManager.playAudio).toHaveBeenNthCalledWith(1, 'required.wav') // Higher priority first
      expect(mockAudioManager.playAudio).toHaveBeenNthCalledWith(2, 'optional.wav') // Lower priority second
    })

    it('should stop queue on required audio failure', async () => {
      audioPlaybackQueue.enqueue('required.wav', AudioType.TECHNIQUE_ANNOUNCEMENT, 1, false)
      audioPlaybackQueue.enqueue('after-failure.wav', AudioType.TECHNIQUE_FEEDBACK, 1, true)
      
      // Mock first audio to fail
      mockAudioManager.playAudio = vi.fn()
        .mockRejectedValueOnce(new Error('Required audio failed'))
      
      await expect(audioPlaybackQueue.play()).rejects.toThrow('Required audio failed')
      
      expect(mockAudioManager.playAudio).toHaveBeenCalledTimes(1)
      expect(audioPlaybackQueue.isPlayingAudio()).toBe(false)
    })
  })

  describe('utility methods', () => {
    it('should clear queue and reset state', () => {
      audioPlaybackQueue.enqueue('test.wav', AudioType.TECHNIQUE_ANNOUNCEMENT)
      audioPlaybackQueue.play()
      
      audioPlaybackQueue.clear()
      
      expect(audioPlaybackQueue.getQueueLength()).toBe(0)
      expect(audioPlaybackQueue.isPlayingAudio()).toBe(false)
      expect(audioPlaybackQueue.getCurrentAudio()).toBeNull()
      expect(mockAudioManager.stopCurrentAudio).toHaveBeenCalled()
    })

    it('should return correct queue length', () => {
      expect(audioPlaybackQueue.getQueueLength()).toBe(0)
      
      audioPlaybackQueue.enqueue('test1.wav', AudioType.TECHNIQUE_ANNOUNCEMENT)
      expect(audioPlaybackQueue.getQueueLength()).toBe(1)
      
      audioPlaybackQueue.enqueue('test2.wav', AudioType.TECHNIQUE_FEEDBACK)
      expect(audioPlaybackQueue.getQueueLength()).toBe(2)
    })

    it('should return correct remaining items count', () => {
      audioPlaybackQueue.enqueue('test1.wav', AudioType.TECHNIQUE_ANNOUNCEMENT)
      audioPlaybackQueue.enqueue('test2.wav', AudioType.TECHNIQUE_FEEDBACK)
      
      expect(audioPlaybackQueue.getRemainingItems()).toBe(2)
      
      audioPlaybackQueue.play()
      expect(audioPlaybackQueue.getRemainingItems()).toBe(2) // Still at start
    })

    it('should return current audio item when playing', () => {
      audioPlaybackQueue.enqueue('current.wav', AudioType.TECHNIQUE_ANNOUNCEMENT)
      
      expect(audioPlaybackQueue.getCurrentAudio()).toBeNull() // Not playing yet
      
      audioPlaybackQueue.play()
      const currentAudio = audioPlaybackQueue.getCurrentAudio()
      expect(currentAudio?.file).toBe('current.wav')
      expect(currentAudio?.type).toBe(AudioType.TECHNIQUE_ANNOUNCEMENT)
    })
  })
})