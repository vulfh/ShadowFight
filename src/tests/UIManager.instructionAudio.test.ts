import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { UIManager } from '../managers/UIManager'
import { TECHNIQUE_CATEGORIES } from '../constants'
import type { SessionStatus } from '../types'

// Mock DOM methods
Object.defineProperty(window, 'addEventListener', {
  value: vi.fn(),
  writable: true
})

Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn(),
  writable: true
})

describe('UIManager - Instruction Audio UI Integration', () => {
  let uiManager: UIManager
  let mockSessionStatus: SessionStatus

  beforeEach(async () => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="sessionStatus">
        <i class="fas fa-stop-circle fa-3x text-muted"></i>
        <h4>Ready</h4>
      </div>
      <div id="timerDisplay">05:00</div>
      <div id="techniqueDisplay">
        <h5 class="text-muted">No technique announced</h5>
      </div>
      <div id="sessionSummary" style="display: none;">
        <span id="techniquesUsed">0</span>
        <span id="sessionDuration">0:00</span>
      </div>
      <div class="form-label">
        <i class="fas fa-volume-up me-2"></i>Volume: <span id="volumeValue">80</span>%
      </div>
      <input type="range" id="volumeControl" value="80">
    `

    uiManager = new UIManager()
    await uiManager.init()

    mockSessionStatus = {
      isActive: true,
      isPaused: false,
      remainingTime: 300,
      sessionDuration: 300,
      currentTechnique: null,
      techniquesUsed: 0,
      sessionStats: {
        totalTechniques: 0,
        techniquesByCategory: {
          [TECHNIQUE_CATEGORIES.PUNCHES]: 0,
          [TECHNIQUE_CATEGORIES.STRIKES]: 0,
          [TECHNIQUE_CATEGORIES.KICKS]: 0,
          [TECHNIQUE_CATEGORIES.KNEES]: 0,
          [TECHNIQUE_CATEGORIES.DEFENSES_GRABS]: 0,
          [TECHNIQUE_CATEGORIES.WEAPONS]: 0,
          [TECHNIQUE_CATEGORIES.HAND_GRIP]: 0,
          [TECHNIQUE_CATEGORIES.KNIFE]: 0
        },
        sessionDuration: 0
      },
      isPlayingInstructionAudio: false,
      isWaitingForInstructionCompletion: false,
      instructionAudioCompleted: false,
      instructionAudioPlayedThisSession: false
    }
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  describe('Session Status Display with Instruction Audio', () => {
    it('should show instruction audio status when playing', () => {
      mockSessionStatus.isPlayingInstructionAudio = true
      mockSessionStatus.isWaitingForInstructionCompletion = true

      uiManager.updateSessionDisplay(mockSessionStatus)

      const sessionStatus = document.getElementById('sessionStatus')
      const icon = sessionStatus?.querySelector('i')
      const title = sessionStatus?.querySelector('h4')

      expect(sessionStatus?.className).toContain('instruction-audio')
      expect(icon?.className).toContain('fa-volume-up')
      expect(icon?.className).toContain('text-info')
      expect(title?.textContent).toBe('Playing Instructions...')
    })

    it('should show paused status correctly', () => {
      mockSessionStatus.isPaused = true

      uiManager.updateSessionDisplay(mockSessionStatus)

      const sessionStatus = document.getElementById('sessionStatus')
      const icon = sessionStatus?.querySelector('i')
      const title = sessionStatus?.querySelector('h4')

      expect(sessionStatus?.className).toContain('paused')
      expect(icon?.className).toContain('fa-pause-circle')
      expect(icon?.className).toContain('text-warning')
      expect(title?.textContent).toBe('Paused')
    })

    it('should show active status when not playing instruction audio', () => {
      mockSessionStatus.isPlayingInstructionAudio = false
      mockSessionStatus.isWaitingForInstructionCompletion = false

      uiManager.updateSessionDisplay(mockSessionStatus)

      const sessionStatus = document.getElementById('sessionStatus')
      const icon = sessionStatus?.querySelector('i')
      const title = sessionStatus?.querySelector('h4')

      expect(sessionStatus?.className).toContain('active')
      expect(icon?.className).toContain('fa-play-circle')
      expect(icon?.className).toContain('text-success')
      expect(title?.textContent).toBe('Active')
    })

    it('should show ready status when session is not active', () => {
      mockSessionStatus.isActive = false

      uiManager.updateSessionDisplay(mockSessionStatus)

      const sessionStatus = document.getElementById('sessionStatus')
      const icon = sessionStatus?.querySelector('i')
      const title = sessionStatus?.querySelector('h4')

      expect(sessionStatus?.className).toBe('session-status')
      expect(icon?.className).toContain('fa-stop-circle')
      expect(icon?.className).toContain('text-muted')
      expect(title?.textContent).toBe('Ready to Start')
    })
  })

  describe('Instruction Audio Status Indicator', () => {
    it('should create instruction audio status element when playing', () => {
      mockSessionStatus.isPlayingInstructionAudio = true

      uiManager.updateSessionDisplay(mockSessionStatus)

      const instructionStatus = document.getElementById('instructionAudioStatus')
      expect(instructionStatus).toBeTruthy()
      expect(instructionStatus?.style.display).toBe('block')
      expect(instructionStatus?.innerHTML).toContain('Playing Instructions...')
      expect(instructionStatus?.innerHTML).toContain('spinner-border')
      expect(instructionStatus?.innerHTML).toContain('fa-headphones')
    })

    it('should show skip button when instruction audio is playing', () => {
      mockSessionStatus.isPlayingInstructionAudio = true

      uiManager.updateSessionDisplay(mockSessionStatus)

      const instructionStatus = document.getElementById('instructionAudioStatus')
      const skipBtn = instructionStatus?.querySelector('#skipInstructionBtn')
      
      expect(skipBtn).toBeTruthy()
      expect(skipBtn?.innerHTML).toContain('Skip')
      expect(skipBtn?.innerHTML).toContain('fa-forward')
    })

    it('should show preparing status when waiting for instruction completion', () => {
      mockSessionStatus.isWaitingForInstructionCompletion = true
      mockSessionStatus.isPlayingInstructionAudio = false

      uiManager.updateSessionDisplay(mockSessionStatus)

      const instructionStatus = document.getElementById('instructionAudioStatus')
      expect(instructionStatus).toBeTruthy()
      expect(instructionStatus?.innerHTML).toContain('Preparing Instructions...')
      expect(instructionStatus?.innerHTML).toContain('fa-clock')
      expect(instructionStatus?.innerHTML).toContain('text-warning')
    })

    it('should hide instruction audio status when not needed', () => {
      // First show it
      mockSessionStatus.isPlayingInstructionAudio = true
      uiManager.updateSessionDisplay(mockSessionStatus)
      
      let instructionStatus = document.getElementById('instructionAudioStatus')
      expect(instructionStatus?.style.display).toBe('block')

      // Then hide it
      mockSessionStatus.isPlayingInstructionAudio = false
      mockSessionStatus.isWaitingForInstructionCompletion = false
      uiManager.updateSessionDisplay(mockSessionStatus)

      instructionStatus = document.getElementById('instructionAudioStatus')
      expect(instructionStatus?.style.display).toBe('none')
    })

    it('should dispatch skip event when skip button is clicked', () => {
      mockSessionStatus.isPlayingInstructionAudio = true
      uiManager.updateSessionDisplay(mockSessionStatus)

      const skipBtn = document.getElementById('skipInstructionBtn')
      expect(skipBtn).toBeTruthy()

      // Mock the event dispatch
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      
      // Simulate click
      skipBtn?.click()

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'skipInstructionAudio'
        })
      )
    })
  })

  describe('User Control Enhancements', () => {
    it('should add instruction audio volume control indicator', () => {
      uiManager.addInstructionAudioVolumeControl()

      const volumeLabel = document.querySelector('.form-label')
      const indicator = volumeLabel?.querySelector('.instruction-audio-indicator')
      
      expect(indicator).toBeTruthy()
      expect(indicator?.innerHTML).toContain('fa-headphones')
      expect(indicator?.innerHTML).toContain('Also controls instruction audio volume')
    })

    it('should not add duplicate volume control indicators', () => {
      uiManager.addInstructionAudioVolumeControl()
      uiManager.addInstructionAudioVolumeControl()

      const indicators = document.querySelectorAll('.instruction-audio-indicator')
      expect(indicators.length).toBe(1)
    })

    it('should show instruction audio error messages', () => {
      const errorMessage = 'Failed to load instruction audio file'
      
      // Mock document.body.appendChild
      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      
      uiManager.showInstructionAudioError(errorMessage)

      expect(appendChildSpy).toHaveBeenCalled()
      const notificationCall = appendChildSpy.mock.calls[0][0] as HTMLElement
      expect(notificationCall.innerHTML).toContain('Instruction Audio Error')
      expect(notificationCall.innerHTML).toContain(errorMessage)
      expect(notificationCall.className).toContain('alert-warning')
    })

    it('should update instruction audio progress', () => {
      // First create the instruction status element
      mockSessionStatus.isPlayingInstructionAudio = true
      uiManager.updateSessionDisplay(mockSessionStatus)

      // Update progress
      uiManager.updateInstructionAudioProgress(50)

      const instructionStatus = document.getElementById('instructionAudioStatus')
      const progressBar = instructionStatus?.querySelector('.progress-bar')
      
      expect(progressBar).toBeTruthy()
      expect((progressBar as HTMLElement)?.style.width).toBe('50%')
    })

    it('should create progress bar if it does not exist', () => {
      // Create instruction status without progress bar
      const instructionStatus = document.createElement('div')
      instructionStatus.id = 'instructionAudioStatus'
      document.body.appendChild(instructionStatus)

      uiManager.updateInstructionAudioProgress(75)

      const progressContainer = instructionStatus.querySelector('.progress')
      const progressBar = instructionStatus.querySelector('.progress-bar')
      
      expect(progressContainer).toBeTruthy()
      expect(progressBar).toBeTruthy()
      expect((progressBar as HTMLElement)?.style.width).toBe('75%')
    })

    it('should handle invalid progress values', () => {
      const instructionStatus = document.createElement('div')
      instructionStatus.id = 'instructionAudioStatus'
      document.body.appendChild(instructionStatus)

      // Should not create progress bar for invalid values
      uiManager.updateInstructionAudioProgress(-10)
      uiManager.updateInstructionAudioProgress(150)

      const progressBar = instructionStatus.querySelector('.progress-bar')
      expect(progressBar).toBeFalsy()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing DOM elements gracefully', () => {
      // Remove session status element
      document.getElementById('sessionStatus')?.remove()

      // Should not throw error
      expect(() => {
        uiManager.updateSessionDisplay(mockSessionStatus)
      }).not.toThrow()
    })

    it('should handle missing volume control element', () => {
      document.getElementById('volumeControl')?.remove()

      // Should not throw error
      expect(() => {
        uiManager.addInstructionAudioVolumeControl()
      }).not.toThrow()
    })

    it('should handle missing instruction status element for progress update', () => {
      // Should not throw error when element doesn't exist
      expect(() => {
        uiManager.updateInstructionAudioProgress(50)
      }).not.toThrow()
    })
  })

  describe('Integration with Session Display', () => {
    it('should update all session elements including instruction audio', () => {
      mockSessionStatus.isPlayingInstructionAudio = true
      mockSessionStatus.currentTechnique = {
        name: 'Test Technique',
        file: 'test.wav',
        category: TECHNIQUE_CATEGORIES.PUNCHES,
        priority: 'high' as const,
        selected: true,
        weight: 1,
        targetLevel: 'HEAD' as const,
        side: 'LEFT' as const
      }

      uiManager.updateSessionDisplay(mockSessionStatus)

      // Check session status
      const sessionStatus = document.getElementById('sessionStatus')
      expect(sessionStatus?.className).toContain('instruction-audio')

      // Check instruction audio status
      const instructionStatus = document.getElementById('instructionAudioStatus')
      expect(instructionStatus).toBeTruthy()
      expect(instructionStatus?.style.display).toBe('block')

      // Check technique display
      const techniqueDisplay = document.getElementById('techniqueDisplay')
      expect(techniqueDisplay?.innerHTML).toContain('Test Technique')

      // Check timer display
      const timerDisplay = document.getElementById('timerDisplay')
      expect(timerDisplay?.textContent).toBe('05:00')
    })

    it('should maintain session display consistency', () => {
      // Test transition from instruction audio to active session
      mockSessionStatus.isPlayingInstructionAudio = true
      uiManager.updateSessionDisplay(mockSessionStatus)

      let sessionStatus = document.getElementById('sessionStatus')
      expect(sessionStatus?.className).toContain('instruction-audio')

      // Complete instruction audio
      mockSessionStatus.isPlayingInstructionAudio = false
      mockSessionStatus.isWaitingForInstructionCompletion = false
      uiManager.updateSessionDisplay(mockSessionStatus)

      sessionStatus = document.getElementById('sessionStatus')
      expect(sessionStatus?.className).toContain('active')
      expect(sessionStatus?.className).not.toContain('instruction-audio')
    })
  })
})