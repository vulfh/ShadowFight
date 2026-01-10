import { UserConfig, SessionStatus, NotificationOptions } from '../types'

export class UIManager {
  private isInitialized: boolean = false

  async init(): Promise<void> {
    this.isInitialized = true
  }

  updateConfigurationDisplay(config: UserConfig): void {
    // Update range slider values
    const durationSlider = document.getElementById('fightDuration') as HTMLInputElement
    const delaySlider = document.getElementById('actionDelay') as HTMLInputElement
    const volumeSlider = document.getElementById('volumeControl') as HTMLInputElement

    if (durationSlider) {
      durationSlider.value = config.duration.toString()
      const durationValue = document.getElementById('durationValue')
      if (durationValue) {
        durationValue.textContent = config.duration.toString()
      }
    }

    if (delaySlider) {
      delaySlider.value = config.delay.toString()
      const delayValue = document.getElementById('delayValue')
      if (delayValue) {
        delayValue.textContent = config.delay.toString()
      }
    }

    if (volumeSlider) {
      volumeSlider.value = config.volume.toString()
      const volumeValue = document.getElementById('volumeValue')
      if (volumeValue) {
        volumeValue.textContent = config.volume.toString()
      }
    }

    // Update technique list
    this.updateTechniqueList(config.techniques)
  }

  private updateTechniqueList(techniques: any[]): void {
    const techniqueList = document.getElementById('techniqueList')
    if (!techniqueList) return

    techniqueList.innerHTML = ''

    techniques.forEach(technique => {
      const techniqueItem = document.createElement('div')
      techniqueItem.className = `technique-item ${technique.selected ? 'selected' : ''}`
      
      techniqueItem.innerHTML = `
        <input type="checkbox" class="technique-checkbox" 
               id="tech_${technique.name.replace(/\s+/g, '_')}" 
               ${technique.selected ? 'checked' : ''}>
        <span class="technique-name">${technique.name}</span>
        <span class="technique-target-level badge bg-secondary">${technique.targetLevel}</span>
        <span class="technique-side badge bg-info">${technique.side}</span>
        <select class="technique-priority form-select form-select-sm">
          <option value="high" ${technique.priority === 'high' ? 'selected' : ''}>High</option>
          <option value="medium" ${technique.priority === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="low" ${technique.priority === 'low' ? 'selected' : ''}>Low</option>
        </select>
      `

      techniqueList.appendChild(techniqueItem)
    })
  }

  updateSessionDisplay(status: SessionStatus): void {
    this.updateSessionStatus(status)
    this.updateTimerDisplay(status.remainingTime)
    this.updateTechniqueDisplay(status.currentTechnique)
    this.updateSessionControls(status)
    this.updateSessionSummary(status)
    this.updateInstructionAudioStatus(status)
  }

  private updateSessionStatus(status: SessionStatus): void {
    const sessionStatus = document.getElementById('sessionStatus')
    if (!sessionStatus) return

    const icon = sessionStatus.querySelector('i')
    const title = sessionStatus.querySelector('h4')

    if (status.isActive) {
      // Check if instruction audio is playing
      if (status.isPlayingInstructionAudio || status.isWaitingForInstructionCompletion) {
        sessionStatus.className = 'session-status active instruction-audio'
        if (icon) icon.className = 'fas fa-volume-up fa-3x text-info'
        if (title) title.textContent = 'Playing Instructions...'
      } else if (status.isPaused) {
        sessionStatus.className = 'session-status active paused'
        if (icon) icon.className = 'fas fa-pause-circle fa-3x text-warning'
        if (title) title.textContent = 'Paused'
      } else {
        sessionStatus.className = 'session-status active'
        if (icon) icon.className = 'fas fa-play-circle fa-3x text-success'
        if (title) title.textContent = 'Active'
      }
    } else {
      sessionStatus.className = 'session-status'
      if (icon) icon.className = 'fas fa-stop-circle fa-3x text-muted'
      if (title) title.textContent = 'Ready to Start'
    }
  }

  private updateTimerDisplay(remainingTime: number): void {
    const timerDisplay = document.getElementById('timerDisplay')
    if (timerDisplay) {
      const minutes = Math.floor(remainingTime / 60)
      const seconds = remainingTime % 60
      timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
  }

  private updateTechniqueDisplay(currentTechnique: any): void {
    const techniqueDisplay = document.getElementById('techniqueDisplay')
    if (!techniqueDisplay) return

    if (currentTechnique) {
      techniqueDisplay.className = 'technique-display active'
      techniqueDisplay.innerHTML = `<h5 class="text-primary">${currentTechnique.name}</h5>`
    } else {
      techniqueDisplay.className = 'technique-display'
      techniqueDisplay.innerHTML = '<h5 class="text-muted">No technique announced</h5>'
    }
  }

  private updateSessionControls(status: SessionStatus): void {
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement
    const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement

    if (startBtn) {
      startBtn.disabled = status.isActive
    }

    if (pauseBtn) {
      pauseBtn.disabled = !status.isActive
    }

    if (stopBtn) {
      stopBtn.disabled = !status.isActive
    }
  }

  private updateInstructionAudioStatus(status: SessionStatus): void {
    // Create or update instruction audio status indicator
    let instructionStatusElement = document.getElementById('instructionAudioStatus')
    
    if (status.isPlayingInstructionAudio || status.isWaitingForInstructionCompletion) {
      // Create instruction audio status element if it doesn't exist
      if (!instructionStatusElement) {
        instructionStatusElement = document.createElement('div')
        instructionStatusElement.id = 'instructionAudioStatus'
        instructionStatusElement.className = 'instruction-audio-status mt-2'
        
        // Insert after the session status
        const sessionStatus = document.getElementById('sessionStatus')
        if (sessionStatus && sessionStatus.parentNode) {
          sessionStatus.parentNode.insertBefore(instructionStatusElement, sessionStatus.nextSibling)
        }
      }

      // Update content based on instruction audio state
      if (status.isPlayingInstructionAudio) {
        instructionStatusElement.innerHTML = `
          <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
              <div class="spinner-border spinner-border-sm text-info me-2" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <small class="text-info fw-bold">
                <i class="fas fa-headphones me-1"></i>Playing Instructions...
              </small>
            </div>
            <button class="btn btn-outline-info btn-sm" id="skipInstructionBtn" title="Skip Instructions">
              <i class="fas fa-forward me-1"></i>Skip
            </button>
          </div>
        `
        
        // Add event listener for skip button
        const skipBtn = instructionStatusElement.querySelector('#skipInstructionBtn')
        if (skipBtn) {
          skipBtn.addEventListener('click', () => this.handleSkipInstructionAudio())
        }
      } else if (status.isWaitingForInstructionCompletion) {
        instructionStatusElement.innerHTML = `
          <div class="d-flex align-items-center justify-content-center">
            <div class="spinner-border spinner-border-sm text-warning me-2" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <small class="text-warning fw-bold">
              <i class="fas fa-clock me-1"></i>Preparing Instructions...
            </small>
          </div>
        `
      }

      instructionStatusElement.style.display = 'block'
    } else {
      // Hide instruction audio status when not needed
      if (instructionStatusElement) {
        instructionStatusElement.style.display = 'none'
      }
    }
  }

  private updateSessionSummary(status: SessionStatus): void {
    const sessionSummary = document.getElementById('sessionSummary')
    const techniquesUsed = document.getElementById('techniquesUsed')
    const sessionDuration = document.getElementById('sessionDuration')

    if (sessionSummary && techniquesUsed && sessionDuration) {
      if (status.isActive || status.sessionStats.totalTechniques > 0) {
        sessionSummary.style.display = 'block'
        techniquesUsed.textContent = status.techniquesUsed.toString()
        sessionDuration.textContent = this.formatTime(status.sessionStats.sessionDuration)
      } else {
        sessionSummary.style.display = 'none'
      }
    }
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  showNotification(options: NotificationOptions): void {
    // Create notification element
    const notification = document.createElement('div')
    notification.className = `alert alert-${this.getAlertType(options.type)} alert-dismissible fade show position-fixed`
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;'
    
    notification.innerHTML = `
      ${options.message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

    // Add to page
    document.body.appendChild(notification)

    // Auto-remove after duration
    const duration = options.duration || 5000
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, duration)
  }

  private getAlertType(type: string): string {
    switch (type) {
      case 'success': return 'success'
      case 'error': return 'danger'
      case 'warning': return 'warning'
      case 'info': return 'info'
      default: return 'info'
    }
  }

  showLoading(show: boolean): void {
    const body = document.body
    if (show) {
      body.classList.add('loading')
    } else {
      body.classList.remove('loading')
    }
  }

  private handleSkipInstructionAudio(): void {
    // Dispatch custom event that the app can listen to
    const event = new CustomEvent('skipInstructionAudio')
    window.dispatchEvent(event)
  }

  /**
   * Add instruction audio volume control to the volume slider
   */
  addInstructionAudioVolumeControl(): void {
    const volumeSlider = document.getElementById('volumeControl') as HTMLInputElement
    if (volumeSlider) {
      // Add instruction audio volume indicator
      const volumeLabel = volumeSlider.parentElement?.querySelector('.form-label')
      if (volumeLabel && !volumeLabel.querySelector('.instruction-audio-indicator')) {
        const indicator = document.createElement('small')
        indicator.className = 'instruction-audio-indicator text-muted ms-2'
        indicator.innerHTML = '<i class="fas fa-headphones" title="Also controls instruction audio volume"></i>'
        volumeLabel.appendChild(indicator)
      }
    }
  }

  /**
   * Show instruction audio error message with enhanced options
   */
  showInstructionAudioError(message: string, errorType: 'loading' | 'playback' | 'network' | 'permission' = 'playback'): void {
    this.showNotification({
      message: `
        <div class="instruction-audio-error">
          <div class="d-flex align-items-center mb-2">
            <i class="fas fa-exclamation-triangle me-2 text-warning"></i>
            <strong>Instruction Audio Error</strong>
          </div>
          <div class="mb-2">${message}</div>
          <div class="error-actions mt-2">
            <button class="btn btn-sm btn-outline-primary me-2" onclick="window.dispatchEvent(new CustomEvent('continueWithoutInstructions'))">
              <i class="fas fa-play me-1"></i>Continue Session
            </button>
            <button class="btn btn-sm btn-outline-info" onclick="window.dispatchEvent(new CustomEvent('showTroubleshootingTips', { detail: { errorType: '${errorType}' } }))">
              <i class="fas fa-question-circle me-1"></i>Help
            </button>
          </div>
        </div>
      `,
      type: 'warning',
      duration: 12000
    })

    // Log error for debugging
    this.logInstructionAudioError(message, errorType)
  }

  /**
   * Get error-specific details and troubleshooting information
   */
  private getErrorDetails(errorType: string): { title: string; description: string; tips: string[] } {
    const errorMap = {
      loading: {
        title: 'Audio File Loading Failed',
        description: 'The instruction audio files could not be loaded.',
        tips: [
          'Check your internet connection',
          'Refresh the page to retry loading',
          'Clear your browser cache and cookies',
          'Try using a different browser'
        ]
      },
      playback: {
        title: 'Audio Playback Failed',
        description: 'The instruction audio could not be played.',
        tips: [
          'Check your device volume settings',
          'Ensure audio is not muted in your browser',
          'Try clicking on the page to enable audio (browser policy)',
          'Check if other audio works in your browser'
        ]
      },
      network: {
        title: 'Network Connection Error',
        description: 'Unable to download instruction audio files.',
        tips: [
          'Check your internet connection',
          'Try refreshing the page',
          'Disable any ad blockers or VPN temporarily',
          'Contact your network administrator if on a corporate network'
        ]
      },
      permission: {
        title: 'Audio Permission Denied',
        description: 'Browser blocked audio playback due to autoplay policy.',
        tips: [
          'Click anywhere on the page to enable audio',
          'Check browser audio permissions for this site',
          'Allow autoplay in your browser settings',
          'Try starting the session manually'
        ]
      }
    }

    return errorMap[errorType as keyof typeof errorMap] || errorMap.playback
  }

  /**
   * Show detailed troubleshooting modal
   */
  showTroubleshootingModal(errorType: string): void {
    const errorDetails = this.getErrorDetails(errorType)
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('troubleshootingModal')
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'troubleshootingModal'
      modal.className = 'modal fade'
      modal.setAttribute('tabindex', '-1')
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-warning text-dark">
              <h5 class="modal-title">
                <i class="fas fa-tools me-2"></i>Troubleshooting Guide
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="troubleshootingContent">
              <!-- Content will be populated dynamically -->
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-primary" onclick="window.dispatchEvent(new CustomEvent('continueWithoutInstructions'))" data-bs-dismiss="modal">
                <i class="fas fa-play me-1"></i>Continue Without Instructions
              </button>
              <button type="button" class="btn btn-primary" onclick="window.location.reload()">
                <i class="fas fa-refresh me-1"></i>Refresh Page
              </button>
            </div>
          </div>
        </div>
      `
      document.body.appendChild(modal)
    }

    // Update modal content
    const content = document.getElementById('troubleshootingContent')
    if (content) {
      content.innerHTML = `
        <div class="troubleshooting-guide">
          <div class="alert alert-info">
            <h6><i class="fas fa-info-circle me-2"></i>${errorDetails.title}</h6>
            <p class="mb-0">${errorDetails.description}</p>
          </div>
          
          <h6><i class="fas fa-wrench me-2"></i>Troubleshooting Steps:</h6>
          <ol class="troubleshooting-steps">
            ${errorDetails.tips.map(tip => `<li>${tip}</li>`).join('')}
          </ol>
          
          <div class="mt-3">
            <h6><i class="fas fa-cog me-2"></i>Browser Compatibility:</h6>
            <div class="row">
              <div class="col-6">
                <small class="text-success">
                  <i class="fab fa-chrome me-1"></i>Chrome 66+<br>
                  <i class="fab fa-firefox me-1"></i>Firefox 60+<br>
                  <i class="fab fa-safari me-1"></i>Safari 11.1+
                </small>
              </div>
              <div class="col-6">
                <small class="text-success">
                  <i class="fab fa-edge me-1"></i>Edge 79+<br>
                  <i class="fas fa-mobile me-1"></i>Mobile browsers<br>
                  <i class="fas fa-tablet me-1"></i>Tablet browsers
                </small>
              </div>
            </div>
          </div>
          
          <div class="mt-3 p-2 bg-light rounded">
            <small class="text-muted">
              <i class="fas fa-lightbulb me-1"></i>
              <strong>Tip:</strong> You can continue your training session without instruction audio. 
              The technique announcements will work normally.
            </small>
          </div>
        </div>
      `
    }

    // Show modal using Bootstrap
    const bootstrapModal = new (window as any).bootstrap.Modal(modal)
    bootstrapModal.show()
  }

  /**
   * Log instruction audio errors for debugging
   */
  private logInstructionAudioError(message: string, errorType: string, additionalData?: any): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: 'instruction_audio_error',
      errorType,
      message,
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData
    }

    // Log to console for development
    console.error('Instruction Audio Error:', errorLog)

    // Store in localStorage for debugging (keep last 10 errors)
    try {
      const existingLogs = JSON.parse(localStorage.getItem('instructionAudioErrorLogs') || '[]')
      existingLogs.push(errorLog)
      
      // Keep only last 10 errors
      if (existingLogs.length > 10) {
        existingLogs.splice(0, existingLogs.length - 10)
      }
      
      localStorage.setItem('instructionAudioErrorLogs', JSON.stringify(existingLogs))
    } catch (error) {
      console.warn('Failed to store error log:', error)
    }

    // Send to analytics if available (placeholder for future implementation)
    if ((window as any).gtag) {
      (window as any).gtag('event', 'instruction_audio_error', {
        error_type: errorType,
        error_message: message
      })
    }
  }

  /**
   * Show option to continue session without instruction audio
   */
  showContinueWithoutInstructionsOption(): void {
    this.showNotification({
      message: `
        <div class="continue-without-instructions">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <i class="fas fa-info-circle me-2 text-info"></i>
              <strong>Continue without instructions?</strong>
              <br><small class="text-muted">Your training session can proceed normally without instruction audio.</small>
            </div>
            <button class="btn btn-sm btn-primary" onclick="window.dispatchEvent(new CustomEvent('continueWithoutInstructions'))">
              <i class="fas fa-play me-1"></i>Continue
            </button>
          </div>
        </div>
      `,
      type: 'info',
      duration: 8000
    })
  }

  /**
   * Get instruction audio error logs for debugging
   */
  getInstructionAudioErrorLogs(): any[] {
    try {
      return JSON.parse(localStorage.getItem('instructionAudioErrorLogs') || '[]')
    } catch (error) {
      console.warn('Failed to retrieve error logs:', error)
      return []
    }
  }

  /**
   * Clear instruction audio error logs
   */
  clearInstructionAudioErrorLogs(): void {
    try {
      localStorage.removeItem('instructionAudioErrorLogs')
    } catch (error) {
      console.warn('Failed to clear error logs:', error)
    }
  }

  /**
   * Show instruction audio progress feedback
   */
  updateInstructionAudioProgress(progress: number): void {
    const instructionStatusElement = document.getElementById('instructionAudioStatus')
    if (instructionStatusElement && progress >= 0 && progress <= 100) {
      const progressBar = instructionStatusElement.querySelector('.progress-bar')
      if (progressBar) {
        (progressBar as HTMLElement).style.width = `${progress}%`
      } else {
        // Add progress bar if it doesn't exist
        const progressContainer = document.createElement('div')
        progressContainer.className = 'progress mt-2'
        progressContainer.style.height = '4px'
        progressContainer.innerHTML = `
          <div class="progress-bar bg-info" role="progressbar" style="width: ${progress}%"></div>
        `
        instructionStatusElement.appendChild(progressContainer)
      }
    }
  }

  isReady(): boolean {
    return this.isInitialized
  }
}

