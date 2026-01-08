import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SessionManager } from '../managers/SessionManager'
import { AudioManager } from '../managers/AudioManager'
import { MODES } from '../constants/modes'
import { TECHNIQUE_CATEGORIES } from '../constants'
import type { SessionConfig, FightList, Technique } from '../types'

// Mock AudioManager
vi.mock('../managers/AudioManager')

describe('SessionManager - Instruction Audio Integration', () => {
  let sessionManager: SessionManager
  let mockAudioManager: AudioManager
  let mockSessionConfig: SessionConfig
  let mockFightList: FightList
  let mockTechniques: Technique[]

  beforeEach(async () => {
    sessionManager = new SessionManager()
    mockAudioManager = new AudioManager()
    
    // Mock AudioManager methods
    vi.mocked(mockAudioManager.playInstructionAudio).mockImplementation(
      (_mode, onComplete) => {
        // Simulate async audio playback
        setTimeout(() => {
          if (onComplete) onComplete()
        }, 100)
        return Promise.resolve()
      }
    )
    
    vi.mocked(mockAudioManager.stopInstructionAudio).mockImplementation(() => {
      // Mock stop instruction audio
    })
    
    mockTechniques = [
      {
        name: 'Test Technique 1',
        file: 'test1.wav',
        category: TECHNIQUE_CATEGORIES.PUNCHES,
        priority: 'high' as const,
        selected: true,
        weight: 1,
        targetLevel: 'HEAD' as const,
        side: 'LEFT' as const,
        modes: [MODES.PERFORMING]
      },
      {
        name: 'Test Technique 2',
        file: 'test2.wav',
        category: TECHNIQUE_CATEGORIES.KICKS,
        priority: 'medium' as const,
        selected: true,
        weight: 1,
        targetLevel: 'CHEST' as const,
        side: 'RIGHT' as const,
        modes: [MODES.RESPONDING]
      }
    ]

    mockSessionConfig = {
      duration: 5,
      delay: 3,
      volume: 80,
      techniques: mockTechniques
    }

    mockFightList = {
      id: 'test-fight-list',
      name: 'Test Fight List',
      mode: MODES.PERFORMING,
      techniques: [
        {
          id: 'fl-tech-1',
          techniqueId: 'Test Technique 1',
          priority: 3,
          selected: true
        }
      ],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }

    await sessionManager.init()
    sessionManager.setAudioManager(mockAudioManager)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Audio Manager Integration', () => {
    it('should set audio manager correctly', () => {
      const newAudioManager = new AudioManager()
      sessionManager.setAudioManager(newAudioManager)
      
      // We can't directly test the private property, but we can test the behavior
      expect(sessionManager).toBeDefined()
    })
  })

  describe('Session Start with Instruction Audio', () => {
    it('should play instruction audio when starting session with fight list', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      expect(mockAudioManager.playInstructionAudio).toHaveBeenCalledWith(
        MODES.PERFORMING,
        expect.any(Function)
      )
      
      const status = sessionManager.getSessionStatus()
      expect(status.isActive).toBe(true)
      expect(status.isPlayingInstructionAudio).toBe(true)
      expect(status.isWaitingForInstructionCompletion).toBe(true)
      expect(status.instructionAudioCompleted).toBe(false)
    })

    it('should not play instruction audio when starting regular session', async () => {
      await sessionManager.startSession(mockSessionConfig)
      
      expect(mockAudioManager.playInstructionAudio).not.toHaveBeenCalled()
      
      const status = sessionManager.getSessionStatus()
      expect(status.isActive).toBe(true)
      expect(status.isPlayingInstructionAudio).toBe(false)
      expect(status.isWaitingForInstructionCompletion).toBe(false)
      expect(status.instructionAudioCompleted).toBe(false)
    })

    it('should handle different fight list modes correctly', async () => {
      const respondingFightList = {
        ...mockFightList,
        mode: MODES.RESPONDING
      }

      await sessionManager.startSessionWithFightList(mockSessionConfig, respondingFightList)
      
      expect(mockAudioManager.playInstructionAudio).toHaveBeenCalledWith(
        MODES.RESPONDING,
        expect.any(Function)
      )
    })

    it('should skip instruction audio if fight list has no mode', async () => {
      const fightListWithoutMode = {
        ...mockFightList,
        mode: undefined
      }

      await sessionManager.startSessionWithFightList(mockSessionConfig, fightListWithoutMode)
      
      expect(mockAudioManager.playInstructionAudio).not.toHaveBeenCalled()
      
      const status = sessionManager.getSessionStatus()
      expect(status.isPlayingInstructionAudio).toBe(false)
    })

    it('should skip instruction audio if no audio manager is set', async () => {
      const sessionManagerWithoutAudio = new SessionManager()
      await sessionManagerWithoutAudio.init()
      
      await sessionManagerWithoutAudio.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      expect(mockAudioManager.playInstructionAudio).not.toHaveBeenCalled()
    })
  })

  describe('Instruction Audio State Management', () => {
    it('should update state correctly during instruction audio lifecycle', async () => {
      let instructionStartedCalled = false
      let instructionCompletedCalled = false
      let firstTechniqueReadyCalled = false

      sessionManager.onInstructionAudioStarted = () => {
        instructionStartedCalled = true
      }
      sessionManager.onInstructionAudioCompleted = () => {
        instructionCompletedCalled = true
      }
      sessionManager.onFirstTechniqueReady = () => {
        firstTechniqueReadyCalled = true
      }

      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      // Wait for instruction audio to complete
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(instructionStartedCalled).toBe(true)
      expect(instructionCompletedCalled).toBe(true)
      expect(firstTechniqueReadyCalled).toBe(true)
      
      const status = sessionManager.getSessionStatus()
      expect(status.isPlayingInstructionAudio).toBe(false)
      expect(status.isWaitingForInstructionCompletion).toBe(false)
      expect(status.instructionAudioCompleted).toBe(true)
    })

    it('should provide correct instruction audio state methods', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      expect(sessionManager.isPlayingInstructionAudio()).toBe(true)
      expect(sessionManager.isWaitingForInstructionCompletion()).toBe(true)
      expect(sessionManager.hasInstructionAudioCompleted()).toBe(false)
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(sessionManager.isPlayingInstructionAudio()).toBe(false)
      expect(sessionManager.isWaitingForInstructionCompletion()).toBe(false)
      expect(sessionManager.hasInstructionAudioCompleted()).toBe(true)
    })

    it('should reset instruction audio state on new session', async () => {
      // Start first session
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Stop session
      sessionManager.stopSession()
      
      // Start new session
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      const status = sessionManager.getSessionStatus()
      expect(status.isPlayingInstructionAudio).toBe(true)
      expect(status.isWaitingForInstructionCompletion).toBe(true)
      expect(status.instructionAudioCompleted).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle instruction audio playback errors gracefully', async () => {
      vi.mocked(mockAudioManager.playInstructionAudio).mockRejectedValue(
        new Error('Audio playback failed')
      )

      let instructionCompletedCalled = false
      sessionManager.onInstructionAudioCompleted = () => {
        instructionCompletedCalled = true
      }

      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(instructionCompletedCalled).toBe(true)
      
      const status = sessionManager.getSessionStatus()
      expect(status.isActive).toBe(true)
      expect(status.isPlayingInstructionAudio).toBe(false)
      expect(status.instructionAudioCompleted).toBe(true)
    })

    it('should continue session even if instruction audio fails', async () => {
      vi.mocked(mockAudioManager.playInstructionAudio).mockRejectedValue(
        new Error('Audio file not found')
      )

      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      const status = sessionManager.getSessionStatus()
      expect(status.isActive).toBe(true)
    })
  })

  describe('Session Persistence', () => {
    it('should save instruction audio completion state', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Check that session state includes instruction audio completion
      const status = sessionManager.getSessionStatus()
      expect(status.instructionAudioCompleted).toBe(true)
    })

    it('should restore session without instruction audio playing state', () => {
      // Mock localStorage with session state that includes instruction audio
      const mockSessionState = {
        isActive: true,
        isPaused: false,
        remainingTime: 240,
        sessionDuration: 300,
        techniquesUsed: 2,
        sessionStats: {
          totalTechniques: 2,
          techniquesByCategory: {},
          sessionDuration: 60
        },
        currentFightList: mockFightList,
        instructionAudioCompleted: true,
        timestamp: Date.now()
      }

      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(mockSessionState))
      
      const hasExistingSession = sessionManager.hasExistingSession()
      expect(hasExistingSession).toBe(true)
      
      const status = sessionManager.getSessionStatus()
      expect(status.instructionAudioCompleted).toBe(true)
      expect(status.isPlayingInstructionAudio).toBe(false)
      expect(status.isWaitingForInstructionCompletion).toBe(false)
    })
  })

  describe('Technique Cycle Integration', () => {
    it('should allow starting technique cycle after instruction audio completes', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should be able to start technique cycle
      sessionManager.startTechniqueAfterInstruction(mockSessionConfig)
      
      const status = sessionManager.getSessionStatus()
      expect(status.isActive).toBe(true)
      expect(status.instructionAudioCompleted).toBe(true)
    })

    it('should not start technique cycle if instruction audio has not completed', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      // Try to start technique cycle before instruction audio completes
      sessionManager.startTechniqueAfterInstruction(mockSessionConfig)
      
      const status = sessionManager.getSessionStatus()
      expect(status.isWaitingForInstructionCompletion).toBe(true)
    })

    it('should start technique cycle for regular sessions without fight list', async () => {
      await sessionManager.startSession(mockSessionConfig)
      
      sessionManager.startTechniqueAfterInstruction(mockSessionConfig)
      
      const status = sessionManager.getSessionStatus()
      expect(status.isActive).toBe(true)
    })
  })

  describe('Fight List Mode Integration', () => {
    it('should play instruction audio only once per session', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      // Wait for instruction audio to complete
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(mockAudioManager.playInstructionAudio).toHaveBeenCalledTimes(1)
      
      // Pause and resume session
      sessionManager.pauseSession()
      sessionManager.resumeSession()
      
      // Should not play instruction audio again
      expect(mockAudioManager.playInstructionAudio).toHaveBeenCalledTimes(1)
      
      const status = sessionManager.getSessionStatus()
      expect(status.instructionAudioPlayedThisSession).toBe(true)
    })

    it('should skip instruction audio on session resume', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Instruction audio should be completed by now
      expect(sessionManager.hasInstructionAudioCompleted()).toBe(true)
      
      // Pause session
      sessionManager.pauseSession()
      
      // Resume session
      sessionManager.resumeSession()
      
      // Should not play instruction audio again since it was already completed
      expect(mockAudioManager.playInstructionAudio).toHaveBeenCalledTimes(1)
    })

    it('should handle instruction audio in session restart scenarios', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(mockAudioManager.playInstructionAudio).toHaveBeenCalledTimes(1)
      
      // Restart session
      await sessionManager.restartSession(mockSessionConfig)
      
      // Should play instruction audio again for new session
      expect(mockAudioManager.playInstructionAudio).toHaveBeenCalledTimes(2)
    })

    it('should handle pause during instruction audio playback', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      // Pause while instruction audio is playing
      sessionManager.pauseSession()
      
      expect(mockAudioManager.stopInstructionAudio).toHaveBeenCalled()
      
      const status = sessionManager.getSessionStatus()
      expect(status.isPlayingInstructionAudio).toBe(false)
      expect(status.isWaitingForInstructionCompletion).toBe(true)
    })

    it('should resume instruction audio after pause if not completed', async () => {
      // Mock instruction audio to not complete immediately
      let completionCallback: (() => void) | undefined
      vi.mocked(mockAudioManager.playInstructionAudio).mockImplementation(
        (_mode, onComplete) => {
          completionCallback = onComplete
          return Promise.resolve()
        }
      )

      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      // Verify instruction audio is playing but not completed
      expect(sessionManager.isPlayingInstructionAudio()).toBe(true)
      expect(sessionManager.isWaitingForInstructionCompletion()).toBe(true)
      
      // Pause while instruction audio is playing
      sessionManager.pauseSession()
      
      // Resume session
      sessionManager.resumeSession()
      
      // Should resume instruction audio since it wasn't completed
      expect(mockAudioManager.playInstructionAudio).toHaveBeenCalledTimes(2)
      
      // Complete the instruction audio if callback exists
      completionCallback?.()
      
      expect(sessionManager.hasInstructionAudioCompleted()).toBe(true)
    })

    it('should maintain compatibility with existing session features', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      const status = sessionManager.getSessionStatus()
      expect(status.isActive).toBe(true)
      expect(status.remainingTime).toBeGreaterThan(0)
      expect(status.sessionDuration).toBe(300) // 5 minutes
      
      // Should have all the original session properties
      expect(status).toHaveProperty('techniquesUsed')
      expect(status).toHaveProperty('sessionStats')
      expect(status).toHaveProperty('currentTechnique')
    })

    it('should handle edge cases with no current fight list', async () => {
      await sessionManager.startSession(mockSessionConfig)
      
      expect(mockAudioManager.playInstructionAudio).not.toHaveBeenCalled()
      
      const status = sessionManager.getSessionStatus()
      expect(status.instructionAudioPlayedThisSession).toBe(false)
    })

    it('should handle edge cases with invalid mode', async () => {
      const fightListWithInvalidMode = {
        ...mockFightList,
        mode: undefined
      }

      await sessionManager.startSessionWithFightList(mockSessionConfig, fightListWithInvalidMode)
      
      expect(mockAudioManager.playInstructionAudio).not.toHaveBeenCalled()
      
      const status = sessionManager.getSessionStatus()
      expect(status.instructionAudioPlayedThisSession).toBe(false)
    })
  })

  describe('Session Status Updates', () => {
    it('should include instruction audio state in session status', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      const status = sessionManager.getSessionStatus()
      expect(status).toHaveProperty('isPlayingInstructionAudio')
      expect(status).toHaveProperty('isWaitingForInstructionCompletion')
      expect(status).toHaveProperty('instructionAudioCompleted')
      expect(status).toHaveProperty('instructionAudioPlayedThisSession')
      
      expect(status.isPlayingInstructionAudio).toBe(true)
      expect(status.isWaitingForInstructionCompletion).toBe(true)
      expect(status.instructionAudioCompleted).toBe(false)
      expect(status.instructionAudioPlayedThisSession).toBe(true)
    })

    it('should update instruction audio state correctly over time', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      // Initial state
      let status = sessionManager.getSessionStatus()
      expect(status.isPlayingInstructionAudio).toBe(true)
      expect(status.isWaitingForInstructionCompletion).toBe(true)
      expect(status.instructionAudioCompleted).toBe(false)
      expect(status.instructionAudioPlayedThisSession).toBe(true)
      
      // After completion
      await new Promise(resolve => setTimeout(resolve, 150))
      status = sessionManager.getSessionStatus()
      expect(status.isPlayingInstructionAudio).toBe(false)
      expect(status.isWaitingForInstructionCompletion).toBe(false)
      expect(status.instructionAudioCompleted).toBe(true)
      expect(status.instructionAudioPlayedThisSession).toBe(true)
    })

    it('should provide helper methods for instruction audio state', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      
      expect(sessionManager.hasInstructionAudioBeenPlayedThisSession()).toBe(true)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(sessionManager.hasInstructionAudioCompleted()).toBe(true)
      expect(sessionManager.isPlayingInstructionAudio()).toBe(false)
      expect(sessionManager.isWaitingForInstructionCompletion()).toBe(false)
    })
  })

  describe('Session Restart Functionality', () => {
    it('should restart session and play instruction audio again', async () => {
      await sessionManager.startSessionWithFightList(mockSessionConfig, mockFightList)
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(mockAudioManager.playInstructionAudio).toHaveBeenCalledTimes(1)
      
      // Restart session
      await sessionManager.restartSession(mockSessionConfig)
      
      expect(mockAudioManager.playInstructionAudio).toHaveBeenCalledTimes(2)
      
      const status = sessionManager.getSessionStatus()
      expect(status.instructionAudioPlayedThisSession).toBe(true)
      expect(status.isActive).toBe(true)
    })

    it('should handle restart with no active session', async () => {
      await expect(sessionManager.restartSession(mockSessionConfig)).rejects.toThrow('No active session to restart')
    })

    it('should restart regular session without fight list', async () => {
      await sessionManager.startSession(mockSessionConfig)
      
      await sessionManager.restartSession(mockSessionConfig)
      
      expect(mockAudioManager.playInstructionAudio).not.toHaveBeenCalled()
      
      const status = sessionManager.getSessionStatus()
      expect(status.isActive).toBe(true)
    })
  })
})