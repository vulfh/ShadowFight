import { Technique, SessionConfig, SessionStatus, SessionStats, FightList } from '../types'
import { ITechniqueSelectionStrategy, TechniqueSelectionStrategyFactory } from '../utils/TechniqueSelectionStrategy'
import { STRATEGY_TYPES, TECHNIQUE_CATEGORIES, STORAGE_KEYS, SESSION_LIMITS, ERROR_MESSAGES } from '../constants'
import { AudioManager } from './AudioManager'

export class SessionManager {
  private selectionStrategy!: ITechniqueSelectionStrategy
  private _isActive: boolean = false
  private _isPaused: boolean = false
  private sessionTimer: number | null = null
  private techniqueTimer: number | null = null
  private remainingTime: number = 0
  private sessionDuration: number = 0
  private currentTechnique: Technique | null = null
  private techniquesUsed: number = 0
  private currentFightList: FightList | null = null
  private currentSessionConfig: SessionConfig | null = null // Store the current session config
  private sessionStats: SessionStats = {
    totalTechniques: 0,
    techniquesByCategory: {
      [TECHNIQUE_CATEGORIES.PUNCHES]: 0,
      [TECHNIQUE_CATEGORIES.STRIKES]: 0,
      [TECHNIQUE_CATEGORIES.KICKS]: 0,
      [TECHNIQUE_CATEGORIES.KNEES]: 0,
      [TECHNIQUE_CATEGORIES.DEFENSES_GRABS]: 0,
      [TECHNIQUE_CATEGORIES.WEAPONS]: 0,
      [TECHNIQUE_CATEGORIES.HAND_GRIP]: 0,
      [TECHNIQUE_CATEGORIES.KNIFE]: 0,
      [TECHNIQUE_CATEGORIES.SLIP]: 0
    },
    sessionDuration: 0
  }
  private isInitialized: boolean = false
  
  // Instruction audio state management
  private _isPlayingInstructionAudio: boolean = false
  private _instructionAudioCompleted: boolean = false
  private _waitingForInstructionCompletion: boolean = false
  private _instructionAudioPlayedThisSession: boolean = false
  private audioManager: AudioManager | null = null
  
  public onSessionComplete?: () => void
  public onInstructionAudioStarted?: () => void
  public onInstructionAudioCompleted?: () => void
  public onFirstTechniqueReady?: () => void

  async init(): Promise<void> {
    this.selectionStrategy = TechniqueSelectionStrategyFactory.createStrategy(STRATEGY_TYPES.RANDOM)
    this.isInitialized = true
  }

  /**
   * Set the audio manager instance for instruction audio integration
   */
  setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager
  }

  async startSession(config: SessionConfig): Promise<void> {
    if (this._isActive) {
      throw new Error(ERROR_MESSAGES.SESSION_ALREADY_ACTIVE)
    }

    // Store the session config for later use
    this.currentSessionConfig = config

    this._isActive = true
    this._isPaused = false
    this.remainingTime = config.duration * 60 // Convert to seconds
    this.sessionDuration = config.duration * 60
    this.techniquesUsed = 0
    this.currentTechnique = null
    this.resetSessionStats()
    this.resetAudioFailureCount()
    this.resetInstructionAudioStateForNewSession()

    this.saveSessionState()
    this.startSessionTimer()
    
    // Start with instruction audio if fight list is available and hasn't been played this session
    if (this.shouldPlayInstructionAudio()) {
      await this.playInstructionAudioForSession()
    } else {
      this.scheduleNextTechnique(config)
    }
  }

  async startSessionWithFightList(config: SessionConfig, fightList: FightList): Promise<void> {
    if (this._isActive) {
      throw new Error(ERROR_MESSAGES.SESSION_ALREADY_ACTIVE)
    }

    if (!fightList.techniques.some(t => t.selected)) {
      throw new Error(`Please select at least one technique in ${fightList.name}`)
    }

    // Get selected techniques from fight list
    const selectedTechniques = fightList.techniques
      .filter(t => t.selected)
      .map(flTechnique => {
        const technique = config.techniques.find(t => t.name === flTechnique.techniqueId)
        if (!technique) return null
        return {
          ...technique,
          weight: flTechnique.priority // Use fight list priority as weight
        }
      })
      .filter((t): t is Technique => t !== null)

    this.currentFightList = fightList
    const fightListConfig = { ...config, techniques: selectedTechniques }
    await this.startSession(fightListConfig)
  }


  getCurrentFightList(): FightList | null {
    return this.currentFightList
  }

  // ========== INSTRUCTION AUDIO METHODS ==========

  /**
   * Determine if instruction audio should be played
   */
  private shouldPlayInstructionAudio(): boolean {
    // Don't play if no fight list or audio manager
    if (!this.currentFightList || !this.audioManager) {
      return false
    }

    // Don't play if fight list has no mode
    if (!this.currentFightList.mode) {
      return false
    }

    // Don't play if instruction audio has already been played this session
    if (this._instructionAudioPlayedThisSession) {
      return false
    }

    // Don't play if instruction audio was already completed (session resume case)
    if (this._instructionAudioCompleted) {
      return false
    }

    return true
  }

  /**
   * Play instruction audio for the current fight list mode
   */
  private async playInstructionAudioForSession(): Promise<void> {
    if (!this.currentFightList || !this.audioManager || !this.currentFightList.mode) {
      return
    }

    try {
      this._isPlayingInstructionAudio = true
      this._waitingForInstructionCompletion = true
      this._instructionAudioCompleted = false
      this._instructionAudioPlayedThisSession = true

      // Notify that instruction audio is starting
      this.onInstructionAudioStarted?.()

      // Play instruction audio with completion callback
      await this.audioManager.playInstructionAudio(
        this.currentFightList.mode,
        () => this.handleInstructionAudioCompleted()
      )

    } catch (error) {
      console.error('Failed to play instruction audio:', error)
      // If instruction audio fails, continue with technique cycle
      this.handleInstructionAudioCompleted()
    }
  }

  /**
   * Handle instruction audio completion and start technique cycle
   */
  private handleInstructionAudioCompleted(): void {
    this._isPlayingInstructionAudio = false
    this._instructionAudioCompleted = true
    this._waitingForInstructionCompletion = false

    // Notify that instruction audio is completed
    this.onInstructionAudioCompleted?.()

    // Now start the technique cycle by scheduling the first technique
    // We'll let the app handle starting the technique loop via the callback
    this.onFirstTechniqueReady?.()
  }

  /**
   * Reset instruction audio state (used internally for pause/resume)
   */
  private resetInstructionAudioState(): void {
    this._isPlayingInstructionAudio = false
    this._instructionAudioCompleted = false
    this._waitingForInstructionCompletion = false
    // Note: Don't reset _instructionAudioPlayedThisSession here - it should persist during session
  }

  /**
   * Reset instruction audio state for new session
   */
  private resetInstructionAudioStateForNewSession(): void {
    this._isPlayingInstructionAudio = false
    this._instructionAudioCompleted = false
    this._waitingForInstructionCompletion = false
    this._instructionAudioPlayedThisSession = false
  }

  /**
   * Resume instruction audio after pause
   */
  private async resumeInstructionAudio(): Promise<void> {
    if (!this.currentFightList || !this.audioManager || !this.currentFightList.mode) {
      // If we can't resume instruction audio, just complete it
      this.handleInstructionAudioCompleted()
      return
    }

    try {
      this._isPlayingInstructionAudio = true
      
      // Notify that instruction audio is resuming
      this.onInstructionAudioStarted?.()

      // Play instruction audio with completion callback
      await this.audioManager.playInstructionAudio(
        this.currentFightList.mode,
        () => this.handleInstructionAudioCompleted()
      )

    } catch (error) {
      console.error('Failed to resume instruction audio:', error)
      // If instruction audio fails, continue with technique cycle
      this.handleInstructionAudioCompleted()
    }
  }

  /**
   * Check if instruction audio is currently playing
   */
  isPlayingInstructionAudio(): boolean {
    return this._isPlayingInstructionAudio
  }

  /**
   * Check if session is waiting for instruction audio to complete
   */
  isWaitingForInstructionCompletion(): boolean {
    return this._waitingForInstructionCompletion
  }

  /**
   * Check if instruction audio has completed
   */
  hasInstructionAudioCompleted(): boolean {
    return this._instructionAudioCompleted
  }

  /**
   * Check if instruction audio has been played this session
   */
  hasInstructionAudioBeenPlayedThisSession(): boolean {
    return this._instructionAudioPlayedThisSession
  }

  /**
   * Start technique cycle (called externally after instruction audio completes)
   */
  startTechniqueAfterInstruction(): void {
    if (this._instructionAudioCompleted || !this.currentFightList) {
      if (this.currentSessionConfig) {
        this.scheduleNextTechnique(this.currentSessionConfig)
      }
    }
  }

  pauseSession(): void {
    if (!this._isActive) return

    this._isPaused = true
    this.stopSessionTimer()
    this.stopTechniqueTimer()
    
    // If instruction audio is playing, stop it but remember the state
    if (this._isPlayingInstructionAudio && this.audioManager) {
      this.audioManager.stopInstructionAudio()
      this.resetInstructionAudioState()
      // Keep _waitingForInstructionCompletion true so we know to resume instruction audio
      this._waitingForInstructionCompletion = true
    }
  }

  resumeSession(): void {
    if (!this._isActive || !this._isPaused) return

    this._isPaused = false
    this.startSessionTimer()
    
    // If we were waiting for instruction completion when paused, resume instruction audio
    if (this._waitingForInstructionCompletion && !this._instructionAudioCompleted) {
      this.resumeInstructionAudio()
    }
  }

  stopSession(): void {
    this._isActive = false
    this._isPaused = false
    this.stopSessionTimer()
    this.stopTechniqueTimer()
    this.currentTechnique = null
    this.currentFightList = null
    this.currentSessionConfig = null // Clear the stored session config
    
    // Stop instruction audio if playing
    if (this._isPlayingInstructionAudio && this.audioManager) {
      this.audioManager.stopInstructionAudio()
    }
    
    // Reset instruction audio state for new session
    this.resetInstructionAudioStateForNewSession()
    
    this.clearSessionState()
  }

  private startSessionTimer(): void {
    this.sessionTimer = window.setInterval(() => {
      if (this.remainingTime > 0) {
        this.remainingTime--
        // Save session state every 30 seconds
        if (this.remainingTime % SESSION_LIMITS.SESSION_SAVE_INTERVAL === 0) {
          this.saveSessionState()
        }
      } else {
        this.completeSession()
      }
    }, 1000)
  }

  private stopSessionTimer(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer)
      this.sessionTimer = null
    }
  }

  private stopTechniqueTimer(): void {
    if (this.techniqueTimer) {
      clearTimeout(this.techniqueTimer)
      this.techniqueTimer = null
    }
  }

  private scheduleNextTechnique(config: SessionConfig): void {
    if (!this._isActive || this._isPaused) return

    const selectedTechniques = config.techniques.filter(t => t.selected)
    if (selectedTechniques.length === 0) return

    const technique = this.selectionStrategy.selectTechnique(selectedTechniques)
    this.announceTechnique(technique, config)
  }

  private announceTechnique(technique: Technique, config: SessionConfig): void {
    this.currentTechnique = technique
    this.techniquesUsed++
    this.updateSessionStats(technique)

    // Schedule next technique after delay
    this.techniqueTimer = window.setTimeout(() => {
      this.currentTechnique = null
      this.scheduleNextTechnique(config)
    }, config.delay * 1000)
  }

  private updateSessionStats(technique: Technique): void {
    this.sessionStats.totalTechniques++
    this.sessionStats.techniquesByCategory[technique.category]++
  }

  private resetSessionStats(): void {
    this.sessionStats = {
      totalTechniques: 0,
      techniquesByCategory: {
        [TECHNIQUE_CATEGORIES.PUNCHES]: 0,
        [TECHNIQUE_CATEGORIES.STRIKES]: 0,
        [TECHNIQUE_CATEGORIES.KICKS]: 0,
        [TECHNIQUE_CATEGORIES.KNEES]: 0,
        [TECHNIQUE_CATEGORIES.DEFENSES_GRABS]: 0,
        [TECHNIQUE_CATEGORIES.WEAPONS]: 0,
        [TECHNIQUE_CATEGORIES.HAND_GRIP]: 0,
        [TECHNIQUE_CATEGORIES.KNIFE]: 0,
        [TECHNIQUE_CATEGORIES.SLIP]: 0
      },
      sessionDuration: 0
    }
  }

  private completeSession(): void {
    this.sessionStats.sessionDuration = this.sessionDuration - this.remainingTime
    this.stopSession()
    // Trigger session completion event
    this.onSessionComplete?.()
  }

  isReadyToStart(config: SessionConfig): boolean {
    return config.techniques.filter(t => t.selected).length > 0
  }

  isReadyToStartWithFightList(fightList: FightList): boolean {
    return fightList.techniques.filter(t => t.selected).length > 0
  }

  getSessionStatus(): SessionStatus {
    return {
      isActive: this._isActive,
      isPaused: this._isPaused,
      remainingTime: this.remainingTime,
      sessionDuration: this.sessionDuration,
      currentTechnique: this.currentTechnique,
      techniquesUsed: this.techniquesUsed,
      sessionStats: this.sessionStats,
      isPlayingInstructionAudio: this._isPlayingInstructionAudio,
      isWaitingForInstructionCompletion: this._waitingForInstructionCompletion,
      instructionAudioCompleted: this._instructionAudioCompleted,
      instructionAudioPlayedThisSession: this._instructionAudioPlayedThisSession
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  getSessionProgress(): number {
    if (this.sessionDuration === 0) return 0
    return ((this.sessionDuration - this.remainingTime) / this.sessionDuration) * 100
  }

  /**
   * Restart the current session (plays instruction audio again if applicable)
   */
  async restartSession(config: SessionConfig): Promise<void> {
    if (!this._isActive) {
      throw new Error('No active session to restart')
    }

    // Stop current session but keep fight list
    const currentFightList = this.currentFightList
    this.stopSession()

    // Start new session with same fight list
    if (currentFightList) {
      await this.startSessionWithFightList(config, currentFightList)
    } else {
      await this.startSession(config)
    }
  }

  // Public getters for session state
  get isActive(): boolean {
    return this._isActive
  }

  get isPaused(): boolean {
    return this._isPaused
  }

  // Strategy management methods
  setSelectionStrategy(strategyType: typeof STRATEGY_TYPES[keyof typeof STRATEGY_TYPES]): void {
    this.selectionStrategy = TechniqueSelectionStrategyFactory.createStrategy(strategyType)
  }

  getCurrentStrategyName(): string {
    return this.selectionStrategy.getName()
  }

  // Audio integration method (to be called by external audio manager)
  async announceTechniqueWithAudio(technique: Technique, audioManager: any): Promise<boolean> {
    try {
      await audioManager.playAudio(technique.file)
      return true
    } catch (error) {
      console.error(`Failed to play audio for technique ${technique.name}:`, error)
      return false
    }
  }

  // Error tracking for audio failures
  private consecutiveAudioFailures: number = 0
  private readonly MAX_CONSECUTIVE_FAILURES = SESSION_LIMITS.MAX_CONSECUTIVE_AUDIO_FAILURES

  resetAudioFailureCount(): void {
    this.consecutiveAudioFailures = 0
  }

  incrementAudioFailureCount(): number {
    this.consecutiveAudioFailures++
    return this.consecutiveAudioFailures
  }

  shouldStopSessionDueToAudioFailures(): boolean {
    return this.consecutiveAudioFailures >= this.MAX_CONSECUTIVE_FAILURES
  }

  // Session persistence methods
  private saveSessionState(): void {
    try {
      const sessionState = {
        isActive: this._isActive,
        isPaused: this._isPaused,
        remainingTime: this.remainingTime,
        sessionDuration: this.sessionDuration,
        techniquesUsed: this.techniquesUsed,
        sessionStats: this.sessionStats,
        currentFightList: this.currentFightList,
        instructionAudioCompleted: this._instructionAudioCompleted,
        instructionAudioPlayedThisSession: this._instructionAudioPlayedThisSession,
        waitingForInstructionCompletion: this._waitingForInstructionCompletion,
        timestamp: Date.now()
      }
      localStorage.setItem(STORAGE_KEYS.KRAV_MAGA_SESSION_STATE, JSON.stringify(sessionState))
    } catch (error) {
      console.warn('Failed to save session state:', error)
    }
  }

  private loadSessionState(): boolean {
    try {
      const savedState = localStorage.getItem(STORAGE_KEYS.KRAV_MAGA_SESSION_STATE)
      if (savedState) {
        const state = JSON.parse(savedState)
        const timeSinceSave = Date.now() - state.timestamp
        
        // Only restore if saved within last 5 minutes
        if (timeSinceSave < SESSION_LIMITS.SESSION_RESTORE_TIME_LIMIT) {
          this._isActive = state.isActive
          this._isPaused = state.isPaused
          this.remainingTime = state.remainingTime
          this.sessionDuration = state.sessionDuration
          this.techniquesUsed = state.techniquesUsed
          this.sessionStats = state.sessionStats
          this.currentFightList = state.currentFightList
          this._instructionAudioCompleted = state.instructionAudioCompleted || false
          this._instructionAudioPlayedThisSession = state.instructionAudioPlayedThisSession || false
          this._waitingForInstructionCompletion = state.waitingForInstructionCompletion || false
          // Don't restore playing state - it should be false on restoration
          this._isPlayingInstructionAudio = false
          return true
        }
      }
    } catch (error) {
      console.warn('Failed to load session state:', error)
    }
    return false
  }

  private clearSessionState(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.KRAV_MAGA_SESSION_STATE)
    } catch (error) {
      console.warn('Failed to clear session state:', error)
    }
  }

  // Check for existing session on initialization
  hasExistingSession(): boolean {
    return this.loadSessionState()
  }

  /**
   * Skip instruction audio and proceed directly to technique cycle
   * Used when user chooses to continue without instruction audio
   */
  skipInstructionAudio(): void {
    if (this._isPlayingInstructionAudio || this._waitingForInstructionCompletion) {
      // Stop any playing instruction audio
      if (this.audioManager) {
        this.audioManager.stopInstructionAudio()
      }
      
      // Reset instruction audio state
      this.resetInstructionAudioState()
      
      // Mark instruction audio as completed for this session
      this._instructionAudioCompleted = true
      this._instructionAudioPlayedThisSession = true
      
      // Notify that we're ready for first technique
      if (this.onFirstTechniqueReady) {
        this.onFirstTechniqueReady()
      }
    }
  }

  isReady(): boolean {
    return this.isInitialized
  }
}

