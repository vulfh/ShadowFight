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
   * Show instruction audio error message
   */
  showInstructionAudioError(message: string): void {
    this.showNotification({
      message: `<i class="fas fa-exclamation-triangle me-2"></i><strong>Instruction Audio Error:</strong> ${message}`,
      type: 'warning',
      duration: 8000
    })
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

