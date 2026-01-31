import { Mode } from '../types'
import { 
  INSTRUCTION_AUDIO_FILES, 
  AUDIO_ERRORS, 
  AUDIO_EVENTS,
  AUDIO_ERROR_TYPES,
  AUDIO_CONFIG,
  AudioError,
  getInstructionAudioPath,
  retryOperation,
  createAudioError
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
      // Check if AudioContext is supported
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        throw new AudioError(
          'AudioContext not supported in this browser',
          AUDIO_ERROR_TYPES.INITIALIZATION
        )
      }

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Handle suspended context
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume()
        } catch (error) {
          throw new AudioError(
            AUDIO_ERRORS.SUSPENDED_CONTEXT,
            AUDIO_ERROR_TYPES.INITIALIZATION,
            undefined,
            error instanceof Error ? error : undefined
          )
        }
      }

      // Create gain node with error handling
      try {
        this.gainNode = this.audioContext.createGain()
        this.gainNode.connect(this.audioContext.destination)
        this.gainNode.gain.value = this.volume
      } catch (error) {
        throw new AudioError(
          AUDIO_ERRORS.GAIN_NODE_FAILED,
          AUDIO_ERROR_TYPES.INITIALIZATION,
          undefined,
          error instanceof Error ? error : undefined
        )
      }

      this.isInitialized = true
      
      // Preload instruction audio files with retry logic
      await this.preloadInstructionAudio()
    } catch (error) {
      const audioError = createAudioError(error)
      console.error('Failed to initialize AudioManager:', audioError)
      throw audioError
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
      throw new AudioError(
        AUDIO_ERRORS.CONTEXT_NOT_INITIALIZED,
        AUDIO_ERROR_TYPES.INITIALIZATION
      )
    }

    try {
      // Stop any currently playing audio
      this.stopCurrentAudio()
      
      // Get the instruction audio file path
      const filePath = getInstructionAudioPath(mode)
      const filename = filePath.replace('/Sounds/', '')
      
      // Load and play the instruction audio with retry logic
      const audioBuffer = await this.loadAudio(filename)
      
      // Create buffer source with error handling
      try {
        this.currentSource = this.audioContext.createBufferSource()
        this.currentSource.buffer = audioBuffer
        this.currentSource.connect(this.gainNode)
      } catch (error) {
        throw new AudioError(
          AUDIO_ERRORS.BUFFER_SOURCE_FAILED,
          AUDIO_ERROR_TYPES.PLAYBACK,
          filename,
          error instanceof Error ? error : undefined
        )
      }
      
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
      
      // Start playing with error handling
      try {
        this.currentSource.start(0)
      } catch (error) {
        this.isPlayingInstruction = false
        this.currentInstructionMode = null
        this.currentSource = null
        
        throw new AudioError(
          AUDIO_ERRORS.PLAYBACK_FAILED,
          AUDIO_ERROR_TYPES.PLAYBACK,
          filename,
          error instanceof Error ? error : undefined
        )
      }
      
    } catch (error) {
      this.isPlayingInstruction = false
      this.currentInstructionMode = null
      
      const audioError = createAudioError(error)
      console.error(`Failed to play instruction audio for ${mode}:`, audioError)
      
      // Dispatch error event with enhanced error information
      this.dispatchAudioEvent(AUDIO_EVENTS.ERROR, { 
        mode, 
        error: audioError.message,
        errorType: audioError.type,
        filename: audioError.filename,
        userMessage: audioError.getUserMessage()
      })
      
      throw audioError
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
      throw new AudioError(
        AUDIO_ERRORS.CONTEXT_NOT_INITIALIZED,
        AUDIO_ERROR_TYPES.INITIALIZATION,
        filename
      )
    }

    // Return cached buffer if available
    if (this.audioBuffers.has(filename)) {
      return this.audioBuffers.get(filename)!
    }

    // Use retry logic for loading audio
    const audioBuffer = await retryOperation(async () => {
      try {
        const base = (import.meta as any).env?.BASE_URL || '/'
        const url = `${base}Sounds/${filename}`
        
        // Add timeout to fetch request
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), AUDIO_CONFIG.LOAD_TIMEOUT)
        
        const response = await fetch(url, { 
          signal: controller.signal 
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new AudioError(
              `${AUDIO_ERRORS.FILE_NOT_FOUND}: ${filename}`,
              AUDIO_ERROR_TYPES.NETWORK,
              filename
            )
          } else {
            throw new AudioError(
              `${AUDIO_ERRORS.NETWORK_ERROR}: HTTP ${response.status}`,
              AUDIO_ERROR_TYPES.NETWORK,
              filename
            )
          }
        }

        const arrayBuffer = await response.arrayBuffer()
        
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new AudioError(
            `${AUDIO_ERRORS.LOAD_FAILED}: Empty audio file`,
            AUDIO_ERROR_TYPES.DECODE,
            filename
          )
        }

        const decodedBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)
        
        if (!decodedBuffer || decodedBuffer.length === 0) {
          throw new AudioError(
            AUDIO_ERRORS.DECODE_FAILED,
            AUDIO_ERROR_TYPES.DECODE,
            filename
          )
        }

        return decodedBuffer
      } catch (error) {
        if (error instanceof AudioError) {
          throw error
        }
        
        // Handle AbortError (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new AudioError(
            AUDIO_ERRORS.TIMEOUT,
            AUDIO_ERROR_TYPES.TIMEOUT,
            filename,
            error
          )
        }
        
        throw createAudioError(error, filename)
      }
    })

    // Cache the successfully loaded buffer
    this.audioBuffers.set(filename, audioBuffer)
    return audioBuffer
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
      throw new AudioError(
        AUDIO_ERRORS.CONTEXT_NOT_INITIALIZED,
        AUDIO_ERROR_TYPES.INITIALIZATION,
        filename
      )
    }

    try {
      this.stopCurrentAudio()
      const audioBuffer = await this.loadAudio(filename)
      
      // Create buffer source with error handling
      try {
        this.currentSource = this.audioContext.createBufferSource()
        this.currentSource.buffer = audioBuffer
        this.currentSource.connect(this.gainNode)
      } catch (error) {
        throw new AudioError(
          AUDIO_ERRORS.BUFFER_SOURCE_FAILED,
          AUDIO_ERROR_TYPES.PLAYBACK,
          filename,
          error instanceof Error ? error : undefined
        )
      }
      
      // Start playing with error handling
      try {
        this.currentSource.start(0)
      } catch (error) {
        this.currentSource = null
        throw new AudioError(
          AUDIO_ERRORS.PLAYBACK_FAILED,
          AUDIO_ERROR_TYPES.PLAYBACK,
          filename,
          error instanceof Error ? error : undefined
        )
      }
    } catch (error) {
      const audioError = createAudioError(error, filename)
      console.error(`Failed to play audio ${filename}:`, audioError)
      throw audioError
    }
  }

  /**
   * Play audio with completion and error callbacks
   * @param filename - The audio file to play
   * @param onComplete - Callback when audio completes successfully
   * @param onError - Optional callback when audio fails to play
   * @returns Promise that resolves when audio starts playing
   */
  async playAudioWithCallback(
    filename: string, 
    onComplete: () => void, 
    onError?: (error: Error) => void
  ): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      const error = new AudioError(
        AUDIO_ERRORS.CONTEXT_NOT_INITIALIZED,
        AUDIO_ERROR_TYPES.INITIALIZATION,
        filename
      )
      if (onError) {
        onError(error)
      }
      throw error
    }

    try {
      this.stopCurrentAudio()
      const audioBuffer = await this.loadAudio(filename)
      
      // Create buffer source with error handling
      try {
        this.currentSource = this.audioContext.createBufferSource()
        this.currentSource.buffer = audioBuffer
        this.currentSource.connect(this.gainNode)
      } catch (error) {
        const audioError = new AudioError(
          AUDIO_ERRORS.BUFFER_SOURCE_FAILED,
          AUDIO_ERROR_TYPES.PLAYBACK,
          filename,
          error instanceof Error ? error : undefined
        )
        if (onError) {
          onError(audioError)
        }
        throw audioError
      }
      
      // Set up completion callback
      this.currentSource.onended = () => {
        this.currentSource = null
        onComplete()
      }
      
      // Start playing with error handling
      try {
        this.currentSource.start(0)
      } catch (error) {
        this.currentSource = null
        const audioError = new AudioError(
          AUDIO_ERRORS.PLAYBACK_FAILED,
          AUDIO_ERROR_TYPES.PLAYBACK,
          filename,
          error instanceof Error ? error : undefined
        )
        if (onError) {
          onError(audioError)
        }
        throw audioError
      }
      
    } catch (error) {
      const audioError = createAudioError(error, filename)
      console.error(`Failed to play audio ${filename}:`, audioError)
      
      if (onError) {
        onError(audioError)
      }
      
      throw audioError
    }
  }

  /**
   * Get the duration of an audio file in seconds
   * @param filename - The audio file to get duration for
   * @returns Promise that resolves to duration in seconds, or 0 if unknown
   */
  async getAudioDuration(filename: string): Promise<number> {
    if (!this.audioContext) {
      console.warn('AudioContext not initialized, returning 0 duration')
      return 0
    }

    try {
      // Load the audio buffer (this will use cache if already loaded)
      const audioBuffer = await this.loadAudio(filename)
      return audioBuffer.duration
    } catch (error) {
      const audioError = createAudioError(error, filename)
      console.warn(`Failed to get duration for audio file ${filename}:`, audioError)
      return 0
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
    // Validate volume range
    if (typeof volume !== 'number' || isNaN(volume)) {
      throw new AudioError(
        `${AUDIO_ERRORS.INVALID_VOLUME}: Volume must be a number`,
        AUDIO_ERROR_TYPES.VALIDATION
      )
    }
    
    if (volume < AUDIO_CONFIG.MIN_VOLUME || volume > AUDIO_CONFIG.MAX_VOLUME) {
      throw new AudioError(
        `${AUDIO_ERRORS.INVALID_VOLUME}: Volume must be between ${AUDIO_CONFIG.MIN_VOLUME} and ${AUDIO_CONFIG.MAX_VOLUME}`,
        AUDIO_ERROR_TYPES.VALIDATION
      )
    }

    this.volume = volume
    if (this.gainNode) {
      try {
        this.gainNode.gain.value = this.volume
      } catch (error) {
        console.warn('Failed to set gain node volume:', error)
        // Don't throw here as this is not critical
      }
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
    if (!this.audioContext) {
      throw new AudioError(
        AUDIO_ERRORS.CONTEXT_NOT_INITIALIZED,
        AUDIO_ERROR_TYPES.INITIALIZATION
      )
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
      } catch (error) {
        const audioError = new AudioError(
          AUDIO_ERRORS.SUSPENDED_CONTEXT,
          AUDIO_ERROR_TYPES.INITIALIZATION,
          undefined,
          error instanceof Error ? error : undefined
        )
        console.error('Failed to resume AudioContext:', audioError)
        throw audioError
      }
    }
  }

  async testAudio(filename: string): Promise<boolean> {
    try {
      await this.playAudio(filename)
      return true
    } catch (error) {
      const audioError = createAudioError(error, filename)
      console.error('Audio test failed:', audioError)
      return false
    }
  }

  isReady(): boolean {
    return this.isInitialized
  }
}
