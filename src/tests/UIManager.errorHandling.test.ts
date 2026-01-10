import { UIManager } from '../managers/UIManager'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock DOM methods
const mockDispatchEvent = vi.fn()
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}

// Mock window and document
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
  writable: true
})

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

// Mock Bootstrap modal
const mockBootstrapModal = {
  show: vi.fn(),
  hide: vi.fn()
}

Object.defineProperty(window, 'bootstrap', {
  value: {
    Modal: vi.fn().mockImplementation(() => mockBootstrapModal)
  },
  writable: true
})

describe('UIManager Error Handling', () => {
  let uiManager: UIManager
  let mockElement: HTMLElement
  let mockModal: HTMLElement

  beforeEach(() => {
    uiManager = new UIManager()
    
    // Reset mocks
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue('[]')
    
    // Reset Bootstrap modal mock
    ;(window as any).bootstrap.Modal.mockImplementation(() => mockBootstrapModal)
    
    // Mock DOM elements
    mockElement = document.createElement('div')
    mockModal = document.createElement('div')
    mockModal.id = 'troubleshootingModal'
    
    vi.spyOn(document, 'createElement').mockReturnValue(mockElement)
    vi.spyOn(document, 'getElementById').mockImplementation((id) => {
      if (id === 'troubleshootingModal') return mockModal
      if (id === 'troubleshootingContent') return mockElement
      return mockElement
    })
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockElement)
    
    // Mock showNotification
    vi.spyOn(uiManager, 'showNotification').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('showInstructionAudioError', () => {
    it('should show error notification with continue and help buttons', () => {
      const message = 'Test error message'
      const errorType = 'playback'

      uiManager.showInstructionAudioError(message, errorType)

      expect(uiManager.showNotification).toHaveBeenCalledWith({
        message: expect.stringContaining('Instruction Audio Error'),
        type: 'warning',
        duration: 12000
      })

      const notificationCall = (uiManager.showNotification as jest.Mock).mock.calls[0][0]
      expect(notificationCall.message).toContain(message)
      expect(notificationCall.message).toContain('Continue Session')
      expect(notificationCall.message).toContain('Help')
    })

    it('should handle different error types', () => {
      const errorTypes = ['loading', 'playback', 'network', 'permission'] as const

      errorTypes.forEach(errorType => {
        uiManager.showInstructionAudioError('Test message', errorType)
        
        expect(uiManager.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            duration: 12000
          })
        )
      })
    })

    it('should default to playback error type', () => {
      uiManager.showInstructionAudioError('Test message')

      expect(uiManager.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning'
        })
      )
    })

    it('should log error for debugging', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      uiManager.showInstructionAudioError('Test message', 'network')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Instruction Audio Error:',
        expect.objectContaining({
          errorType: 'network',
          message: 'Test message'
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('getErrorDetails', () => {
    it('should return correct details for loading error', () => {
      const details = (uiManager as any).getErrorDetails('loading')

      expect(details.title).toBe('Audio File Loading Failed')
      expect(details.description).toContain('could not be loaded')
      expect(details.tips).toContain('Check your internet connection')
    })

    it('should return correct details for playback error', () => {
      const details = (uiManager as any).getErrorDetails('playback')

      expect(details.title).toBe('Audio Playback Failed')
      expect(details.description).toContain('could not be played')
      expect(details.tips).toContain('Check your device volume settings')
    })

    it('should return correct details for network error', () => {
      const details = (uiManager as any).getErrorDetails('network')

      expect(details.title).toBe('Network Connection Error')
      expect(details.description).toContain('Unable to download')
      expect(details.tips).toContain('Check your internet connection')
    })

    it('should return correct details for permission error', () => {
      const details = (uiManager as any).getErrorDetails('permission')

      expect(details.title).toBe('Audio Permission Denied')
      expect(details.description).toContain('autoplay policy')
      expect(details.tips).toContain('Click anywhere on the page to enable audio')
    })

    it('should default to playback error for unknown types', () => {
      const details = (uiManager as any).getErrorDetails('unknown')

      expect(details.title).toBe('Audio Playback Failed')
    })
  })

  describe('showTroubleshootingModal', () => {
    it('should create modal if it does not exist', () => {
      vi.spyOn(document, 'getElementById').mockReturnValue(null)

      uiManager.showTroubleshootingModal('playback')

      expect(document.createElement).toHaveBeenCalledWith('div')
      expect(document.body.appendChild).toHaveBeenCalled()
    })

    it('should update existing modal content', () => {
      const mockContent = document.createElement('div')
      vi.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'troubleshootingModal') return mockModal
        if (id === 'troubleshootingContent') return mockContent
        return null
      })

      uiManager.showTroubleshootingModal('loading')

      expect(mockContent.innerHTML).toContain('Audio File Loading Failed')
      expect(mockContent.innerHTML).toContain('Troubleshooting Steps')
      expect(mockContent.innerHTML).toContain('Browser Compatibility')
    })

    it('should show Bootstrap modal', () => {
      uiManager.showTroubleshootingModal('network')

      expect((window as any).bootstrap.Modal).toHaveBeenCalledWith(mockModal)
      expect(mockBootstrapModal.show).toHaveBeenCalled()
    })

    it('should include error-specific troubleshooting content', () => {
      const mockContent = document.createElement('div')
      vi.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'troubleshootingContent') return mockContent
        return mockModal
      })

      uiManager.showTroubleshootingModal('permission')

      expect(mockContent.innerHTML).toContain('Audio Permission Denied')
      expect(mockContent.innerHTML).toContain('Click anywhere on the page')
    })
  })

  describe('logInstructionAudioError', () => {
    it('should log error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      ;(uiManager as any).logInstructionAudioError('Test message', 'playback', { extra: 'data' })

      expect(consoleSpy).toHaveBeenCalledWith(
        'Instruction Audio Error:',
        expect.objectContaining({
          type: 'instruction_audio_error',
          errorType: 'playback',
          message: 'Test message',
          additionalData: { extra: 'data' }
        })
      )

      consoleSpy.mockRestore()
    })

    it('should store error in localStorage', () => {
      ;(uiManager as any).logInstructionAudioError('Test message', 'network')

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'instructionAudioErrorLogs',
        expect.stringContaining('Test message')
      )
    })

    it('should limit stored errors to 10', () => {
      const existingLogs = Array(12).fill(null).map((_, i) => ({ id: i }))
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingLogs))

      ;(uiManager as any).logInstructionAudioError('New error', 'loading')

      const setItemCall = mockLocalStorage.setItem.mock.calls[0]
      const storedLogs = JSON.parse(setItemCall[1])
      expect(storedLogs).toHaveLength(10)
      expect(storedLogs[9].message).toBe('New error')
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => {
        ;(uiManager as any).logInstructionAudioError('Test message', 'playback')
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to store error log:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('should send to analytics if available', () => {
      const mockGtag = vi.fn()
      ;(window as any).gtag = mockGtag

      ;(uiManager as any).logInstructionAudioError('Test message', 'permission')

      expect(mockGtag).toHaveBeenCalledWith('event', 'instruction_audio_error', {
        error_type: 'permission',
        error_message: 'Test message'
      })

      delete (window as any).gtag
    })
  })

  describe('showContinueWithoutInstructionsOption', () => {
    it('should show notification with continue option', () => {
      uiManager.showContinueWithoutInstructionsOption()

      expect(uiManager.showNotification).toHaveBeenCalledWith({
        message: expect.stringContaining('Continue without instructions?'),
        type: 'info',
        duration: 8000
      })

      const notificationCall = (uiManager.showNotification as jest.Mock).mock.calls[0][0]
      expect(notificationCall.message).toContain('Continue')
      expect(notificationCall.message).toContain('training session can proceed normally')
    })
  })

  describe('getInstructionAudioErrorLogs', () => {
    it('should return parsed error logs from localStorage', () => {
      const mockLogs = [
        { timestamp: '2024-01-01', message: 'Error 1' },
        { timestamp: '2024-01-02', message: 'Error 2' }
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockLogs))

      const logs = uiManager.getInstructionAudioErrorLogs()

      expect(logs).toEqual(mockLogs)
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('instructionAudioErrorLogs')
    })

    it('should return empty array if no logs exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const logs = uiManager.getInstructionAudioErrorLogs()

      expect(logs).toEqual([])
    })

    it('should handle JSON parse errors gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const logs = uiManager.getInstructionAudioErrorLogs()

      expect(logs).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Failed to retrieve error logs:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('clearInstructionAudioErrorLogs', () => {
    it('should remove error logs from localStorage', () => {
      uiManager.clearInstructionAudioErrorLogs()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('instructionAudioErrorLogs')
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => {
        uiManager.clearInstructionAudioErrorLogs()
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear error logs:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('Error handling integration', () => {
    it('should provide comprehensive error information', () => {
      const message = 'Network timeout occurred'
      const errorType = 'network'

      uiManager.showInstructionAudioError(message, errorType)

      // Should show notification
      expect(uiManager.showNotification).toHaveBeenCalled()
      
      // Should log error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(uiManager as any).logInstructionAudioError(message, errorType)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle all error types consistently', () => {
      const errorTypes = ['loading', 'playback', 'network', 'permission'] as const

      errorTypes.forEach(errorType => {
        const details = (uiManager as any).getErrorDetails(errorType)
        
        expect(details).toHaveProperty('title')
        expect(details).toHaveProperty('description')
        expect(details).toHaveProperty('tips')
        expect(Array.isArray(details.tips)).toBe(true)
        expect(details.tips.length).toBeGreaterThan(0)
      })
    })

    it('should provide actionable troubleshooting steps', () => {
      const errorTypes = ['loading', 'playback', 'network', 'permission'] as const

      errorTypes.forEach(errorType => {
        const details = (uiManager as any).getErrorDetails(errorType)
        
        // Each error type should have specific, actionable tips
        details.tips.forEach((tip: string) => {
          expect(tip).toBeTruthy()
          expect(tip.length).toBeGreaterThan(10) // Ensure tips are meaningful
        })
      })
    })
  })
})