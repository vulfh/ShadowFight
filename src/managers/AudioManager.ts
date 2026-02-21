import { Mode } from '../types'
import { 
  INSTRUCTION_AUDIO_FILES, 
  AUDIO_ERRORS, 
  AUDIO_EVENTS,
  getInstructionAudioPath 
} from '../constants/audio'

export class AudioManager {
  private audioContext: AudioContext | null = null
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private currentSource: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private volume: number = 0.8
  private isInitialized: boolean = false
  
  // Instruction audio specific properties
  private instructionAudioCallbacks: Map<string, () => void> = new Map()
  private isPlayingInstruction: boolean = false
  private currentInstructionMode: Mode | null = null

  async init(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
      this.gainNode.gain.value = this.volume
      this.isInitialized = true
      
      // Preload instruction audio files
      await this.preloadInstructionAudio()
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error)
      throw error
    }
  }

  // ========== INSTRUCTION AUDIO METHODS ==========

  /**
   * Preload instruction audio files for both modes
   */
  private async preloadInstructionAudio(): Promise<void> {
    try {
      const instructionFiles = Object.values(INSTRUCTION_AUDIO_FILES).map(path => 
        path.replace('/Sounds/', '')
      )
      await this.preloadAudio(instructionFiles)
    } catch (error) {
      console.warn('Failed to preload instruction audio files:', error)
    }
  }

  /**
   * Play instruction audio for the specified mode
   * @param mode - The fight list mode (PERFORMING or RESPONDING)
   * @param onComplete - Optional callback when audio completes
   * @returns Promise that resolves when audio starts playing
   */
  async playInstructionAudio(mode: Mode, onComplete?: () => void): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      throw new Error(AUDIO_ERRORS.LOAD_FAILED)
    }

    try {
      // Stop any currently playing audio
      this.stopCurrentAudio()
      
      // Get the instruction audio file path
      const filePath = getInstructionAudioPath(mode)
      const filename = filePath.replace('/Sounds/', '')
      
      // Load and play the instruction audio
      const audioBuffer = await this.loadAudio(filename)
      
      this.currentSource = this.audioContext.createBufferSource()
      this.currentSource.buffer = audioBuffer
      this.currentSource.connect(this.gainNode)
      
      // Set up completion handling
      this.isPlayingInstruction = true
      this.currentInstructionMode = mode
      
      // Create a unique callback ID for this playback
      const callbackId = `instruction_${mode}_${Date.now()}`
      
      if (onComplete) {
        this.instructionAudioCallbacks.set(callbackId, onComplete)
      }
      
      // Set up the ended event listener
      this.currentSource.onended = () => {
        this.isPlayingInstruction = false
        this.currentInstructionMode = null
        this.currentSource = null
        
        // Fire completion callback
        const callback = this.instructionAudioCallbacks.get(callbackId)
        if (callback) {
          this.instructionAudioCallbacks.delete(callbackId)
          callback()
        }
        
        // Dispatch completion event
        this.dispatchAudioEvent(AUDIO_EVENTS.COMPLETED, { mode, filePath })
      }
      
      // Dispatch started event
      this.dispatchAudioEvent(AUDIO_EVENTS.STARTED, { mode, filePath })
      
      // Start playing
      this.currentSource.start(0)
      
    } catch (error) {
      this.isPlayingInstruction = false
      this.currentInstructionMode = null
      console.error(`Failed to play instruction audio for ${mode}:`, error)
      
      // Dispatch error event
      this.dispatchAudioEvent(AUDIO_EVENTS.ERROR, { 
        mode, 
        error: error instanceof Error ? error.message : AUDIO_ERRORS.PLAYBACK_FAILED 
      })
      
      throw error
    }
  }

  /**
   * Check if instruction audio is currently playing
   */
  isPlayingInstructionAudio(): boolean {
    return this.isPlayingInstruction
  }

  /**
   * Get the current instruction audio mode being played
   */
  getCurrentInstructionMode(): Mode | null {
    return this.currentInstructionMode
  }

  /**
   * Stop instruction audio playback
   */
  stopInstructionAudio(): void {
    if (this.isPlayingInstruction) {
      this.stopCurrentAudio()
      this.isPlayingInstruction = false
      this.currentInstructionMode = null
      
      // Clear any pending callbacks
      this.instructionAudioCallbacks.clear()
    }
  }

  /**
   * Validate that instruction audio files are available
   * @param mode - Optional specific mode to validate, or all if not specified
   * @returns Promise resolving to validation results
   */
  async validateInstructionAudio(mode?: Mode): Promise<{ [key in Mode]?: boolean }> {
    const results: { [key in Mode]?: boolean } = {}
    const modesToCheck = mode ? [mode] : Object.keys(INSTRUCTION_AUDIO_FILES) as Mode[]
    
    for (const checkMode of modesToCheck) {
      try {
        const filePath = getInstructionAudioPath(checkMode)
        const filename = filePath.replace('/Sounds/', '')
        await this.loadAudio(filename)
        results[checkMode] = true
      } catch (error) {
        console.warn(`Instruction audio validation failed for ${checkMode}:`, error)
        results[checkMode] = false
      }
    }
    
    return results
  }

  /**
   * Dispatch audio events for instruction audio
   */
  private dispatchAudioEvent(eventType: string, detail: any): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(eventType, { detail })
      window.dispatchEvent(event)
    }
  }

  /**
   * Set volume specifically for instruction audio
   * @param volume - Volume level (0.0 to 1.0)
   */
  setInstructionAudioVolume(volume: number): void {
    this.setVolume(volume)
  }

  /**
   * Get instruction audio volume
   */
  getInstructionAudioVolume(): number {
    return this.getVolume()
  }

  // ========== EXISTING AUDIO METHODS ==========

  async loadAudio(filename: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }

    if (this.audioBuffers.has(filename)) {
      return this.audioBuffers.get(filename)!
    }

    try {
      const base = (import.meta as any).env?.BASE_URL || '/'
      const response = await fetch(`${base}Sounds/${filename}`)
      if (!response.ok) {
        throw new Error(`Failed to load audio file: ${filename}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      this.audioBuffers.set(filename, audioBuffer)
      return audioBuffer
    } catch (error) {
      console.error(`Failed to load audio file ${filename}:`, error)
      throw error
    }
  }

  async preloadAudio(filenames: string[]): Promise<void> {
    const loadPromises = filenames.map(filename => this.loadAudio(filename).catch(error => {
      console.warn(`Failed to preload ${filename}:`, error)
      return null
    }))

    await Promise.all(loadPromises)
  }

  async playAudio(filename: string): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      throw new Error('AudioContext not initialized')
    }

    try {
      this.stopCurrentAudio()
      const audioBuffer = await this.loadAudio(filename)
      
      this.currentSource = this.audioContext.createBufferSource()
      this.currentSource.buffer = audioBuffer
      this.currentSource.connect(this.gainNode)

      return new Promise((resolve) => {
        if (!this.currentSource) {
          resolve()
          return
        }
        this.currentSource.onended = () => {
          this.currentSource = null
          resolve()
        }
        this.currentSource.start(0)
      })
    } catch (error) {
      console.error(`Failed to play audio ${filename}:`, error)
      throw error
    }
  }

  stopCurrentAudio(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch (error) {
        // Audio might already be stopped
      }
      this.currentSource = null
    }
    
    // Reset instruction audio state
    if (this.isPlayingInstruction) {
      this.isPlayingInstruction = false
      this.currentInstructionMode = null
      this.instructionAudioCallbacks.clear()
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume
    }
  }

  getVolume(): number {
    return this.volume
  }

  isPlaying(): boolean {
    return this.currentSource !== null
  }

  getLoadingProgress(): number {
    return this.audioBuffers.size
  }

  clearCache(): void {
    this.audioBuffers.clear()
  }

  getAudioContextState(): string | null {
    return this.audioContext?.state || null
  }

  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  async testAudio(filename: string): Promise<boolean> {
    try {
      await this.playAudio(filename)
      return true
    } catch (error) {
      console.error('Audio test failed:', error)
      return false
    }
  }

  isReady(): boolean {
    return this.isInitialized
  }
}
