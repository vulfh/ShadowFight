import { Technique,
        SessionConfig, 
        NotificationOptions,
        FightListManagerCallbacks } from './types'
import { TechniqueManager } from './managers/TechniqueManager'
import { AudioManager } from './managers/AudioManager'
import { SessionManager } from './managers/SessionManager'
import { ConfigManager } from './managers/ConfigManager'
import { UIManager } from './managers/UIManager'
import { FightListManager } from './managers/FightListManager'
import { FightListUIManager } from './managers/FightListUIManager'
import { 
  UI_ELEMENTS, 
  NOTIFICATION_TYPES, 
  KEYBOARD_SHORTCUTS, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES, 
  INFO_MESSAGES, 
  WARNING_MESSAGES,
  STRATEGY_TYPES
} from './constants'

export class KravMagaTrainerApp {
  private techniqueManager: TechniqueManager
  private audioManager: AudioManager
  private sessionManager: SessionManager
  private configManager: ConfigManager
  private uiManager: UIManager
  private fightListManager: FightListManager
  private fightListUIManager: FightListUIManager
  private isInitialized: boolean = false

  constructor() {
    this.techniqueManager = new TechniqueManager()
    this.audioManager = new AudioManager()
    this.sessionManager = new SessionManager()
    this.configManager = new ConfigManager()
    this.uiManager = new UIManager()
    this.fightListManager = new FightListManager()
    this.fightListUIManager = new FightListUIManager(this.fightListManager, this.uiManager)
  }

  async init(): Promise<void> {
    try {
      console.log('Initializing Krav Maga Trainer App...')

      // Initialize managers in order
      await this.techniqueManager.init()
      await this.audioManager.init()
      await this.configManager.init()
      await this.sessionManager.init()
      await this.uiManager.init()

      // Initialize Fight List managers and hydrate UI
      await this.fightListManager.init()
      await this.fightListUIManager.init()

      // Set up event flow contracts
      this.setupEventFlowContracts()

      // Set up session completion callback
      this.sessionManager.onSessionComplete = () => this.handleSessionComplete()

      // Set up event listeners
      this.setupEventListeners()

      // Load initial configuration
      await this.loadConfiguration()

      // Check for existing session
      if (this.sessionManager.hasExistingSession()) {
        this.handleSessionRestoration()
      }

      // Preload audio files
      await this.preloadAudioFiles()

      this.isInitialized = true
      console.log('Krav Maga Trainer App initialized successfully')

      // Show welcome notification
      this.showNotification({
        message: SUCCESS_MESSAGES.WELCOME,
        type: NOTIFICATION_TYPES.INFO
      })

    } catch (error) {
      console.error('Failed to initialize app:', error)
      this.showNotification({
        message: ERROR_MESSAGES.FAILED_TO_INITIALIZE,
        type: NOTIFICATION_TYPES.ERROR
      })
      throw error
    }
  }

  private setupEventFlowContracts(): void {
    // Set up Manager→UI callbacks for FightListUIManager
    const managerCallbacks: FightListManagerCallbacks = {
      onFightListsChanged: () => {
        // Re-render fight lists when they change
        this.fightListUIManager.renderFightLists()
      },
      onCurrentFightListChanged: () => {
        // Update UI when current fight list changes
        this.updateStartButtonState()
        this.fightListUIManager.renderFightLists()
      },
      onFightListExpanded: (fightListId, expanded) => {
        // Handle fight list expansion state
        console.log(`Fight list ${fightListId} ${expanded ? 'expanded' : 'collapsed'}`)
      },
      onNotification: (options) => {
        // Forward notifications to UIManager
        this.uiManager.showNotification(options)
      }
    }
    this.fightListUIManager.setManagerCallbacks(managerCallbacks)

    // Set up Session→UI callbacks (defined for future use)
    // These callbacks define the contract for session events
    // Currently handled by existing methods in the app
  }

  private setupEventListeners(): void {
    // Time configuration form events
    const timeConfigForm = document.getElementById('timeConfigForm') as HTMLFormElement
    if (timeConfigForm) {
      timeConfigForm.addEventListener('submit', (e) => this.handleConfigSubmit(e))
    }

    // Range slider events
    this.setupRangeSliderEvents()

    // Session control events
    this.setupSessionControlEvents()

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e))

    // Page visibility change events for session persistence
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange())
    
    // Before unload event to save session state
    window.addEventListener('beforeunload', () => this.handleBeforeUnload())
  }

  private setupRangeSliderEvents(): void {
    const durationSlider = document.getElementById(UI_ELEMENTS.FIGHT_DURATION) as HTMLInputElement
    const delaySlider = document.getElementById(UI_ELEMENTS.ACTION_DELAY) as HTMLInputElement
    const volumeSlider = document.getElementById(UI_ELEMENTS.VOLUME_CONTROL) as HTMLInputElement

    if (durationSlider) {
      durationSlider.addEventListener('input', (e) => this.handleDurationChange(e))
    }

    if (delaySlider) {
      delaySlider.addEventListener('input', (e) => this.handleDelayChange(e))
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => this.handleVolumeChange(e))
    }
  }


  private setupSessionControlEvents(): void {
    const startBtn = document.getElementById(UI_ELEMENTS.START_BTN)
    const pauseBtn = document.getElementById(UI_ELEMENTS.PAUSE_BTN)
    const stopBtn = document.getElementById(UI_ELEMENTS.STOP_BTN)

    if (startBtn) {
      startBtn.addEventListener('click', () => this.handleStartSession())
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.handlePauseSession())
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.handleStopSession())
    }
  }

  private async loadConfiguration(): Promise<void> {
    // Sync techniques from TechniqueManager to ConfigManager
    const techniques = this.techniqueManager.getTechniques()
    this.configManager.updateTechniques(techniques)
    
    const config = this.configManager.getConfig()
    this.uiManager.updateConfigurationDisplay(config)
    this.updateStartButtonState()
    this.syncTimerWithDuration()
  }

  private syncTimerWithDuration(): void {
    const config = this.configManager.getConfig()
    const timerDisplay = document.getElementById(UI_ELEMENTS.TIMER_DISPLAY)
    if (timerDisplay) {
      const minutes = Math.floor(config.duration)
      const seconds = 0
      timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
  }

  private async preloadAudioFiles(): Promise<void> {
    try {
      const config = this.configManager.getConfig()
      const selectedTechniques = config.techniques.filter((t: Technique) => t.selected)
      const audioFiles = selectedTechniques.map((t: Technique) => t.file)

      if (audioFiles.length > 0) {
        this.showNotification({
          message: INFO_MESSAGES.LOADING_AUDIO,
          type: NOTIFICATION_TYPES.INFO
        })

        await this.audioManager.preloadAudio(audioFiles)

        this.showNotification({
          message: SUCCESS_MESSAGES.AUDIO_LOADED,
          type: NOTIFICATION_TYPES.SUCCESS
        })
      }
    } catch (error) {
      console.warn('Failed to preload some audio files:', error)
      this.showNotification({
        message: WARNING_MESSAGES.AUDIO_LOAD_FAILED,
        type: NOTIFICATION_TYPES.WARNING
      })
    }
  }

  private handleConfigSubmit(e: Event): void {
    e.preventDefault()

    const validation = this.configManager.validateConfig()
    if (!validation.isValid) {
      this.showNotification({
        message: validation.errors.join(', '),
        type: NOTIFICATION_TYPES.ERROR
      })
      return
    }

    if (validation.warnings.length > 0) {
      this.showNotification({
        message: validation.warnings.join(', '),
        type: NOTIFICATION_TYPES.WARNING
      })
    }

    this.configManager.saveConfig()
    this.updateStartButtonState()
    this.preloadAudioFiles()

    this.showNotification({
      message: SUCCESS_MESSAGES.CONFIG_SAVED,
      type: NOTIFICATION_TYPES.SUCCESS
    })
  }

  private handleDurationChange(e: Event): void {
    const target = e.target as HTMLInputElement
    const duration = parseInt(target.value)
    
    const durationValue = document.getElementById(UI_ELEMENTS.DURATION_VALUE)
    if (durationValue) {
      durationValue.textContent = duration.toString()
    }

    this.configManager.updateDuration(duration)
    this.updateStartButtonState()
    this.syncTimerWithDuration()
  }

  private handleDelayChange(e: Event): void {
    const target = e.target as HTMLInputElement
    const delay = parseFloat(target.value)
    
    const delayValue = document.getElementById(UI_ELEMENTS.DELAY_VALUE)
    if (delayValue) {
      delayValue.textContent = delay.toString()
    }

    this.configManager.updateDelay(delay)
  }

  private handleVolumeChange(e: Event): void {
    const target = e.target as HTMLInputElement
    const volume = parseInt(target.value)
    
    const volumeValue = document.getElementById(UI_ELEMENTS.VOLUME_VALUE)
    if (volumeValue) {
      volumeValue.textContent = volume.toString()
    }

    this.configManager.updateVolume(volume)
    this.audioManager.setVolume(volume / 100)
  }


  // Strategy selection method
  public setTechniqueSelectionStrategy(strategyType: typeof STRATEGY_TYPES[keyof typeof STRATEGY_TYPES]): void {
    this.sessionManager.setSelectionStrategy(strategyType)
    this.showNotification({
      message: `${INFO_MESSAGES.STRATEGY_CHANGED} ${this.sessionManager.getCurrentStrategyName()}`,
      type: NOTIFICATION_TYPES.INFO
    })
  }

  private handleVisibilityChange(): void {
    if (document.hidden && this.sessionManager.isActive) {
      // Page is hidden, save session state
      console.log('Page hidden, saving session state')
    } else if (!document.hidden && this.sessionManager.isActive) {
      // Page is visible again, update UI
      this.updateSessionUI()
    }
  }

  private handleBeforeUnload(): void {
    if (this.sessionManager.isActive) {
      // Save session state before page unload
      console.log('Page unloading, saving session state')
    }
  }

  private async handleStartSession(): Promise<void> {
    try {
      const sessionConfig = this.configManager.getSessionConfig()
      const currentFightList = this.fightListManager.getCurrentFightList()

      // Check if we have a current fight list
      if (currentFightList) {
        // Validate fight list has selected techniques
        if (!this.sessionManager.isReadyToStartWithFightList(currentFightList)) {
          this.showNotification({
            message: `Please select at least one technique in ${currentFightList.name}`,
            type: NOTIFICATION_TYPES.ERROR
          })
          return
        }

        // Start session with fight list
        await this.sessionManager.startSessionWithFightList(sessionConfig, currentFightList)
      } else {
        // No current fight list - show fallback prompt
        const useAllTechniques = confirm('There is no selected fight list. Do you want to run over all available techniques?')
        
        if (!useAllTechniques) {
          this.showNotification({
            message: 'Please select a fight list first',
            type: NOTIFICATION_TYPES.INFO
          })
          return
        }

        // Validate regular session
        if (!this.sessionManager.isReadyToStart(sessionConfig)) {
          this.showNotification({
            message: ERROR_MESSAGES.CONFIGURE_SESSION,
            type: NOTIFICATION_TYPES.ERROR
          })
          return
        }

        // Start regular session with all techniques
        await this.sessionManager.startSession(sessionConfig)
      }

      // Update UI to reflect session state
      this.updateSessionUI()
      this.disableConfigurationControls()

      // Start the technique announcement loop
      this.startTechniqueAnnouncementLoop(sessionConfig)

      this.showNotification({
        message: SUCCESS_MESSAGES.SESSION_STARTED,
        type: NOTIFICATION_TYPES.SUCCESS
      })

    } catch (error) {
      console.error('Failed to start session:', error)
      this.showNotification({
        message: `${ERROR_MESSAGES.FAILED_TO_START_SESSION}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: NOTIFICATION_TYPES.ERROR
      })
    }
  }

  private handlePauseSession(): void {
    if (this.sessionManager.isPaused) {
      this.sessionManager.resumeSession()
      this.showNotification({
        message: INFO_MESSAGES.SESSION_RESUMED,
        type: NOTIFICATION_TYPES.INFO
      })
    } else {
      this.sessionManager.pauseSession()
      this.showNotification({
        message: WARNING_MESSAGES.SESSION_PAUSED,
        type: NOTIFICATION_TYPES.WARNING
      })
    }
    this.updateSessionUI()
  }

  private handleStopSession(): void {
    this.sessionManager.stopSession()
    this.enableConfigurationControls()
    this.updateSessionUI()
    
    // Clear current fight list from storage when session stops
    this.fightListManager.clearCurrentFightList();
    
    this.showNotification({
      message: INFO_MESSAGES.SESSION_STOPPED,
      type: NOTIFICATION_TYPES.INFO
    })
  }

  private handleSessionComplete(): void {
    // Session completed naturally - behave exactly like Stop button was pressed
    this.enableConfigurationControls()
    this.updateSessionUI()
    
    // Clear current fight list from storage when session completes
    this.fightListManager.clearCurrentFightList();
    
    this.showNotification({
      message: SUCCESS_MESSAGES.SESSION_COMPLETED,
      type: NOTIFICATION_TYPES.SUCCESS
    })
  }

  private handleKeyboardShortcuts(e: KeyboardEvent): void {
    // Space bar to start/pause
    if (e.code === KEYBOARD_SHORTCUTS.SPACE && !this.isFormElement(e.target)) {
      e.preventDefault()
      if (this.sessionManager.isActive) {
        this.handlePauseSession()
      } else {
        this.handleStartSession()
      }
    }

    // Escape to stop
    if (e.code === KEYBOARD_SHORTCUTS.ESCAPE) {
      if (this.sessionManager.isActive) {
        this.handleStopSession()
      }
    }
  }

  private isFormElement(element: EventTarget | null): boolean {
    if (!element) return false
    const target = element as HTMLElement
    return target.matches('input, textarea, select, button[type="submit"]')
  }

  private updateStartButtonState(): void {
    const startBtn = document.getElementById(UI_ELEMENTS.START_BTN) as HTMLButtonElement
    if (startBtn) {
      const sessionConfig = this.configManager.getSessionConfig()
      startBtn.disabled = !this.sessionManager.isReadyToStart(sessionConfig)
    }
  }

  private showNotification(options: NotificationOptions): void {
    this.uiManager.showNotification(options)
  }

  // UI Update Methods
  private updateSessionUI(): void {
    const status = this.sessionManager.getSessionStatus()
    this.uiManager.updateSessionDisplay(status)
  }

  private disableConfigurationControls(): void {
    const durationSlider = document.getElementById(UI_ELEMENTS.FIGHT_DURATION) as HTMLInputElement
    const delaySlider = document.getElementById(UI_ELEMENTS.ACTION_DELAY) as HTMLInputElement
    const volumeSlider = document.getElementById(UI_ELEMENTS.VOLUME_CONTROL) as HTMLInputElement
    const timeConfigForm = document.getElementById('timeConfigForm') as HTMLFormElement

    if (durationSlider) durationSlider.disabled = true
    if (delaySlider) delaySlider.disabled = true
    if (volumeSlider) volumeSlider.disabled = true
    if (timeConfigForm) timeConfigForm.style.pointerEvents = 'none'
  }

  private enableConfigurationControls(): void {
    const durationSlider = document.getElementById(UI_ELEMENTS.FIGHT_DURATION) as HTMLInputElement
    const delaySlider = document.getElementById(UI_ELEMENTS.ACTION_DELAY) as HTMLInputElement
    const volumeSlider = document.getElementById(UI_ELEMENTS.VOLUME_CONTROL) as HTMLInputElement
    const timeConfigForm = document.getElementById('timeConfigForm') as HTMLFormElement

    if (durationSlider) durationSlider.disabled = false
    if (delaySlider) delaySlider.disabled = false
    if (volumeSlider) volumeSlider.disabled = false
    if (timeConfigForm) timeConfigForm.style.pointerEvents = 'auto'
  }

  private async startTechniqueAnnouncementLoop(config: SessionConfig): Promise<void> {
    const announceNextTechnique = async () => {
      if (!this.sessionManager.isActive) return

      const status = this.sessionManager.getSessionStatus()
      if (status.currentTechnique) {
        // Play audio for the current technique
        const audioSuccess = await this.sessionManager.announceTechniqueWithAudio(status.currentTechnique, this.audioManager)
        
        if (!audioSuccess) {
          // const failureCount = this.sessionManager.incrementAudioFailureCount()
          
          // Show error notification
          this.showNotification({
            message: `${ERROR_MESSAGES.AUDIO_FAILURE} ${status.currentTechnique.name}`,
            type: NOTIFICATION_TYPES.ERROR,
            duration: 3000
          })

          // Check if we should stop the session
          if (this.sessionManager.shouldStopSessionDueToAudioFailures()) {
            this.showNotification({
              message: ERROR_MESSAGES.MULTIPLE_AUDIO_FAILURES,
              type: NOTIFICATION_TYPES.ERROR,
              duration: 5000
            })
            this.handleStopSession()
            return
          }
        } else {
          // Reset failure count on success
          this.sessionManager.resetAudioFailureCount()
        }
        
        // Update UI
        this.updateSessionUI()
      }

      // Schedule next announcement if session is still active
      if (this.sessionManager.isActive && !this.sessionManager.isPaused) {
        setTimeout(announceNextTechnique, config.delay * 1000)
      }
    }

    // Start the loop
    announceNextTechnique()

    // Start continuous UI updates for timer
    this.startContinuousUIUpdates()
  }

  private handleSessionRestoration(): void {
    const status = this.sessionManager.getSessionStatus()
    
    if (status.isActive) {
      this.showNotification({
        message: INFO_MESSAGES.PREVIOUS_SESSION_RESTORED,
        type: NOTIFICATION_TYPES.INFO,
        duration: 5000
      })

      // Update UI to reflect restored session state
      this.updateSessionUI()
      
      if (status.isPaused) {
        this.enableConfigurationControls()
      } else {
        this.disableConfigurationControls()
        // Restart the technique announcement loop
        const config = this.configManager.getSessionConfig()
        this.startTechniqueAnnouncementLoop(config)
      }
    }
  }

  private startContinuousUIUpdates(): void {
    const updateInterval = setInterval(() => {
      if (this.sessionManager.isActive) {
        this.updateSessionUI()
      } else {
        clearInterval(updateInterval)
      }
    }, 1000) // Update every second
  }

  // Public methods for external access
  public getSessionStatus() {
    return this.sessionManager.getSessionStatus()
  }

  public getConfig() {
    return this.configManager.getConfig()
  }

  public isReady(): boolean {
    return this.isInitialized
  }
}
