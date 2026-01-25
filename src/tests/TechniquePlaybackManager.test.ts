/**
 * TechniquePlaybackManager Tests
 * 
 * Tests for the TechniquePlaybackManager class that orchestrates complete technique
 * playback cycles including all associated audio files.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TechniquePlaybackManager } from '../managers/TechniquePlaybackManager'
import { AudioManager } from '../managers/AudioManager'
import { AudioPlaybackQueue } from '../managers/AudioPlaybackQueue'
import { AudioType, Technique, PlaybackConfig } from '../types'

// Mock dependencies
vi.mock('../managers/AudioManager')
vi.mock('../managers/AudioPlaybackQueue')

describe('TechniquePlaybackManager', () => {
  let techniquePlaybackManager: TechniquePlaybackManager
  let mockAudioManager: AudioManager
  let mockAudioQueue: AudioPlaybackQueue
  let sampleTechnique: Technique
  let sampleConfig: PlaybackConfig

  beforeEach(() => {
    // Create mock AudioManager
    mockAudioManager = {
      isReady: vi.fn().mockReturnValue(true),
      playAudio: vi.fn().mockResolvedValue(undefined)
    } as any

    // Create mock AudioPlaybackQueue
    mockAudioQueue = {
      clear: vi.fn(),
      enqueue: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      resume: vi.fn(),
      isPlayingAudio: vi.fn().mockReturnValue(false),
      getCurrentAudio: vi.fn().mockReturnValue(null),
      getRemainingItems: vi.fn().mockReturnValue(0)
    } as any

    // Mock the AudioPlaybackQueue constructor
    vi.mocked(AudioPlaybackQueue).mockImplementation(() => mockAudioQueue)

    // Create sample technique
    sampleTechnique = {
      name: 'Test Technique',
      file: 'test-technique.wav',
      category: 'Punches',
      priority: 'medium',
      selected: true,
      weight: 1,
      targetLevel: 'HEAD',
      side: 'RIGHT'
    }

    // Create sample config
    sampleConfig = {
      enabledAudioTypes: [AudioType.TECHNIQUE_ANNOUNCEMENT],
      fallbackOnError: true,
      maxRetries: 1
    }

    // Create TechniquePlaybackManager instance
    techniquePlaybackManager = new TechniquePlaybackManager(mockAudioManager)
  })

  describe('initialization', () => {
    it('should initialize with AudioManager', () => {
      expect(techniquePlaybackManager.isReady()).toBe(true)
      expect(AudioPlaybackQueue).toHaveBeenCalledWith(mockAudioManager)
    })

    it('should initialize without AudioManager', () => {
      const manager = new TechniquePlaybackManager()
      expect(manager.isReady()).toBe(false)
    })

    it('should set AudioManager after initialization', () => {
      const manager = new TechniquePlaybackManager()
      expect(manager.isReady()).toBe(false)
      
      manager.setAudioManager(mockAudioManager)
      expect(manager.isReady()).toBe(true)
    })
  })

  describe('playTechniqueWithAudio', () => {
    it('should throw error if AudioManager not initialized', async () => {
      const manager = new TechniquePlaybackManager()
      
      await expect(manager.playTechniqueWithAudio(sampleTechnique, sampleConfig))
        .rejects.toThrow('TechniquePlaybackManager: AudioManager not initialized')
    })

    it('should throw error if already playing', async () => {
      // Start first playback
      const firstPlayback = techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, sampleConfig)
      
      // Try to start second playback
      await expect(techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, sampleConfig))
        .rejects.toThrow('TechniquePlaybackManager: Already playing a technique')
      
      // Wait for first playback to complete
      await firstPlayback
    })

    it('should clear queue and build new audio queue', async () => {
      await techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, sampleConfig)
      
      expect(mockAudioQueue.clear).toHaveBeenCalled()
      expect(mockAudioQueue.enqueue).toHaveBeenCalledWith(
        'test-technique.wav',
        AudioType.TECHNIQUE_ANNOUNCEMENT,
        10,
        false
      )
    })

    it('should play audio queue', async () => {
      await techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, sampleConfig)
      
      expect(mockAudioQueue.play).toHaveBeenCalled()
    })

    it('should handle playback errors gracefully', async () => {
      const error = new Error('Audio playback failed')
      ;(mockAudioQueue.play as any).mockRejectedValueOnce(error)
      
      await expect(techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, sampleConfig))
        .rejects.toThrow('Audio playback failed')
      
      // Should reset active state even after error
      expect(techniquePlaybackManager.isPlaybackActive()).toBe(false)
    })

    it('should not enqueue audio if technique has no file', async () => {
      const techniqueWithoutFile = { ...sampleTechnique, file: '' }
      
      await techniquePlaybackManager.playTechniqueWithAudio(techniqueWithoutFile, sampleConfig)
      
      expect(mockAudioQueue.enqueue).not.toHaveBeenCalled()
      expect(mockAudioQueue.play).toHaveBeenCalled() // Should still try to play (empty queue)
    })

    it('should not enqueue audio if announcement type not enabled', async () => {
      const configWithoutAnnouncement = {
        ...sampleConfig,
        enabledAudioTypes: [AudioType.TECHNIQUE_INSTRUCTION]
      }
      
      await techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, configWithoutAnnouncement)
      
      expect(mockAudioQueue.enqueue).not.toHaveBeenCalled()
    })
  })

  describe('state management', () => {
    it('should report active state during playback', async () => {
      expect(techniquePlaybackManager.isPlaybackActive()).toBe(false)
      
      // Mock ongoing playback
      ;(mockAudioQueue.play as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      const playbackPromise = techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, sampleConfig)
      
      // Should be active during playback
      expect(techniquePlaybackManager.isPlaybackActive()).toBe(true)
      
      await playbackPromise
      
      // Should be inactive after completion
      expect(techniquePlaybackManager.isPlaybackActive()).toBe(false)
    })

    it('should report active state when audio queue is playing', () => {
      ;(mockAudioQueue.isPlayingAudio as any).mockReturnValue(true)
      
      expect(techniquePlaybackManager.isPlaybackActive()).toBe(true)
    })

    it('should stop playback and clear queue', () => {
      techniquePlaybackManager.stopPlayback()
      
      expect(mockAudioQueue.clear).toHaveBeenCalled()
      expect(techniquePlaybackManager.isPlaybackActive()).toBe(false)
    })

    it('should pause playback when active', async () => {
      // Start playback
      const playbackPromise = techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, sampleConfig)
      
      // Pause while active
      techniquePlaybackManager.pausePlayback()
      expect(mockAudioQueue.pause).toHaveBeenCalled()
      
      await playbackPromise
    })

    it('should not pause when not active', () => {
      techniquePlaybackManager.pausePlayback()
      expect(mockAudioQueue.pause).not.toHaveBeenCalled()
    })

    it('should resume playback when active', async () => {
      // Start playback
      const playbackPromise = techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, sampleConfig)
      
      // Resume while active
      techniquePlaybackManager.resumePlayback()
      expect(mockAudioQueue.resume).toHaveBeenCalled()
      
      await playbackPromise
    })

    it('should not resume when not active', () => {
      techniquePlaybackManager.resumePlayback()
      expect(mockAudioQueue.resume).not.toHaveBeenCalled()
    })
  })

  describe('audio queue integration', () => {
    it('should get current audio from queue', () => {
      const mockAudioItem = {
        file: 'test.wav',
        type: AudioType.TECHNIQUE_ANNOUNCEMENT,
        priority: 10,
        optional: false
      }
      ;(mockAudioQueue.getCurrentAudio as any).mockReturnValue(mockAudioItem)
      
      expect(techniquePlaybackManager.getCurrentAudio()).toBe(mockAudioItem)
    })

    it('should get remaining audio count from queue', () => {
      ;(mockAudioQueue.getRemainingItems as any).mockReturnValue(3)
      
      expect(techniquePlaybackManager.getRemainingAudioCount()).toBe(3)
    })

    it('should handle null audio queue gracefully', () => {
      const manager = new TechniquePlaybackManager()
      
      expect(manager.getCurrentAudio()).toBeNull()
      expect(manager.getRemainingAudioCount()).toBe(0)
    })
  })

  describe('buildAudioQueue', () => {
    it('should enqueue technique announcement with correct parameters', async () => {
      await techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, sampleConfig)
      
      expect(mockAudioQueue.enqueue).toHaveBeenCalledWith(
        'test-technique.wav',
        AudioType.TECHNIQUE_ANNOUNCEMENT,
        10, // High priority
        false // Required (not optional)
      )
    })

    it('should handle technique without audio file', async () => {
      const techniqueWithoutFile = { ...sampleTechnique, file: '' }
      
      await techniquePlaybackManager.playTechniqueWithAudio(techniqueWithoutFile, sampleConfig)
      
      expect(mockAudioQueue.enqueue).not.toHaveBeenCalled()
    })

    it('should respect enabled audio types configuration', async () => {
      const configWithMultipleTypes = {
        enabledAudioTypes: [AudioType.TECHNIQUE_INSTRUCTION, AudioType.TECHNIQUE_FEEDBACK],
        fallbackOnError: true,
        maxRetries: 1
      }
      
      await techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, configWithMultipleTypes)
      
      // Should not enqueue announcement since it's not in enabled types
      expect(mockAudioQueue.enqueue).not.toHaveBeenCalled()
    })
  })

  describe('static factory methods', () => {
    it('should create default config with only announcements', () => {
      const config = TechniquePlaybackManager.createDefaultConfig()
      
      expect(config.enabledAudioTypes).toEqual([AudioType.TECHNIQUE_ANNOUNCEMENT])
      expect(config.fallbackOnError).toBe(true)
      expect(config.maxRetries).toBe(1)
    })

    it('should create full config with all audio types', () => {
      const config = TechniquePlaybackManager.createFullConfig()
      
      expect(config.enabledAudioTypes).toEqual([
        AudioType.TECHNIQUE_ANNOUNCEMENT,
        AudioType.TECHNIQUE_INSTRUCTION,
        AudioType.TECHNIQUE_FEEDBACK,
        AudioType.TECHNIQUE_CORRECTION
      ])
      expect(config.fallbackOnError).toBe(true)
      expect(config.maxRetries).toBe(2)
    })
  })

  describe('error handling', () => {
    it('should handle AudioManager initialization errors', () => {
      const manager = new TechniquePlaybackManager()
      
      expect(() => manager.setAudioManager(null as any)).not.toThrow()
      expect(manager.isReady()).toBe(false)
    })

    it('should reset state after playback error', async () => {
      ;(mockAudioQueue.play as any).mockRejectedValueOnce(new Error('Playback failed'))
      
      await expect(techniquePlaybackManager.playTechniqueWithAudio(sampleTechnique, sampleConfig))
        .rejects.toThrow('Playback failed')
      
      expect(techniquePlaybackManager.isPlaybackActive()).toBe(false)
    })

    it('should handle missing audio queue gracefully', () => {
      const manager = new TechniquePlaybackManager()
      
      expect(() => manager.stopPlayback()).not.toThrow()
      expect(() => manager.pausePlayback()).not.toThrow()
      expect(() => manager.resumePlayback()).not.toThrow()
    })
  })
})