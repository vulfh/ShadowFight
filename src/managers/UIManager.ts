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
  }

  private updateSessionStatus(status: SessionStatus): void {
    const sessionStatus = document.getElementById('sessionStatus')
    if (!sessionStatus) return

    const icon = sessionStatus.querySelector('i')
    const title = sessionStatus.querySelector('h4')

    if (status.isActive) {
      sessionStatus.className = 'session-status active'
      if (icon) icon.className = 'fas fa-play-circle fa-3x text-success'
      if (title) title.textContent = status.isPaused ? 'Paused' : 'Active'
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

  isReady(): boolean {
    return this.isInitialized
  }
}

