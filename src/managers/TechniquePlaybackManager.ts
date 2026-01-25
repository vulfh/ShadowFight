/**
 * TechniquePlaybackManager - Centralized technique playback orchestration
 * 
 * Manages the complete playback cycle for a technique, including all associated audio files.
 * Integrates with AudioPlaybackQueue for sequential audio playback and provides completion
 * callbacks to SessionManager for proper delay timing.
 */

import { AudioManager } from './AudioManager'
import { AudioPlaybackQueue } from './AudioPlaybackQueue'
import { Technique, AudioType, AudioQueueItem, PlaybackConfig } from '../types'

/**
 * Orchestrates complete technique playback cycle including all associated audio files.
 * 
 * This manager handles the complexity of playing multiple audio types per technique
 * while providing a simple interface to SessionManager. It ensures that the delay
 * timer only starts after all technique-related audio has completed.
 */
export class TechniquePlaybackManager {
  private audioQueue: AudioPlaybackQueue
  private audioManager: AudioManager | null = null
  private isActive: boolean = false

  /**
   * Creates a new TechniquePlaybackManager instance.
   * 
   * @param audioManager - The AudioManager instance to use for audio playback
   */
  constructor(audioManager?: AudioManager) {
    if (audioManager) {
      this.audioManager = audioManager
      this.audioQueue = new AudioPlaybackQueue(audioManager)
    } else {
      // Create a placeholder queue that will be initialized when AudioManager is set
      this.audioQueue = null as any
    }
  }

  /**
   * Sets the AudioManager instance and initializes the audio queue.
   * 
   * @param audioManager - The AudioManager instance to use
   */
  setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager
    this.audioQueue = new AudioPlaybackQueue(audioManager)
  }

  /**
   * Plays a technique with all its associated audio files.
   * 
   * This method orchestrates the complete playback cycle:
   * 1. Clears any existing audio queue
   * 2. Builds audio queue based on technique and config
   * 3. Starts sequential audio playback
   * 4. Returns promise that resolves when all audio completes
   * 
   * @param technique - The technique to play
   * @param config - Playback configuration determining which audio types to play
   * @returns Promise that resolves when all technique audio completes
   */
  async playTechniqueWithAudio(technique: Technique, config: PlaybackConfig): Promise<void> {
    if (!this.audioManager || !this.audioQueue) {
      throw new Error('TechniquePlaybackManager: AudioManager not initialized')
    }

    if (this.isActive) {
      throw new Error('TechniquePlaybackManager: Already playing a technique')
    }

    try {
      this.isActive = true

      // Clear existing audio queue
      this.audioQueue.clear()

      // Build audio queue based on technique and config
      this.buildAudioQueue(technique, config)

      // Start audio queue playback
      await this.audioQueue.play()

    } catch (error) {
      console.error('TechniquePlaybackManager: Playback failed:', error)
      throw error
    } finally {
      this.isActive = false
    }
  }

  /**
   * Builds the audio queue for a technique based on the playback configuration.
   * 
   * This method determines which audio files should be played for the technique
   * and adds them to the queue in the correct priority order.
   * 
   * @param technique - The technique to build audio queue for
   * @param config - Configuration determining which audio types are enabled
   */
  private buildAudioQueue(technique: Technique, config: PlaybackConfig): void {
    // Check if technique has a primary audio file (announcement)
    if (technique.file && config.enabledAudioTypes.includes(AudioType.TECHNIQUE_ANNOUNCEMENT)) {
      this.audioQueue.enqueue(
        technique.file,
        AudioType.TECHNIQUE_ANNOUNCEMENT,
        10, // High priority for announcements
        false // Required - announcements should not be optional
      )
    }

    // Future: Add support for additional audio types
    // This is where we would add instruction audio, feedback audio, etc.
    // when those features are implemented
    
    // Example of future audio types (commented out for now):
    /*
    if (technique.instructionFile && config.enabledAudioTypes.includes(AudioType.TECHNIQUE_INSTRUCTION)) {
      this.audioQueue.enqueue(
        technique.instructionFile,
        AudioType.TECHNIQUE_INSTRUCTION,
        5, // Medium priority
        true // Optional - instructions can be skipped if they fail
      )
    }

    if (technique.feedbackFile && config.enabledAudioTypes.includes(AudioType.TECHNIQUE_FEEDBACK)) {
      this.audioQueue.enqueue(
        technique.feedbackFile,
        AudioType.TECHNIQUE_FEEDBACK,
        3, // Lower priority
        true // Optional
      )
    }
    */
  }

  /**
   * Checks if technique playback is currently active.
   * 
   * @returns True if a technique is currently being played
   */
  isPlaybackActive(): boolean {
    return this.isActive || (this.audioQueue?.isPlayingAudio() ?? false)
  }

  /**
   * Stops the current technique playback.
   * 
   * This method immediately stops all audio playback and resets the manager state.
   * It should be called when a session is stopped or when switching techniques.
   */
  stopPlayback(): void {
    if (this.audioQueue) {
      this.audioQueue.clear()
    }
    this.isActive = false
  }

  /**
   * Pauses the current technique playback.
   * 
   * This method pauses the audio queue, preserving the current position
   * so that playback can be resumed later.
   */
  pausePlayback(): void {
    if (this.audioQueue && this.isActive) {
      this.audioQueue.pause()
    }
  }

  /**
   * Resumes technique playback from the paused position.
   * 
   * This method continues audio playback from where it was paused.
   */
  resumePlayback(): void {
    if (this.audioQueue && this.isActive) {
      this.audioQueue.resume()
    }
  }

  /**
   * Gets the current audio item being played.
   * 
   * @returns The current audio queue item or null if none
   */
  getCurrentAudio(): AudioQueueItem | null {
    return this.audioQueue?.getCurrentAudio() ?? null
  }

  /**
   * Gets the number of audio items remaining in the queue.
   * 
   * @returns The number of remaining audio items
   */
  getRemainingAudioCount(): number {
    return this.audioQueue?.getRemainingItems() ?? 0
  }

  /**
   * Checks if the manager is ready for playback.
   * 
   * @returns True if AudioManager is initialized and ready
   */
  isReady(): boolean {
    return this.audioManager !== null && this.audioQueue !== null
  }

  /**
   * Creates a default playback configuration for backward compatibility.
   * 
   * This configuration enables only technique announcements, which matches
   * the current behavior of the system.
   * 
   * @returns Default PlaybackConfig with only announcements enabled
   */
  static createDefaultConfig(): PlaybackConfig {
    return {
      enabledAudioTypes: [AudioType.TECHNIQUE_ANNOUNCEMENT],
      fallbackOnError: true,
      maxRetries: 1
    }
  }

  /**
   * Creates a comprehensive playback configuration with all audio types enabled.
   * 
   * This configuration can be used when all audio enhancements are implemented
   * and the user wants the full audio experience.
   * 
   * @returns PlaybackConfig with all audio types enabled
   */
  static createFullConfig(): PlaybackConfig {
    return {
      enabledAudioTypes: [
        AudioType.TECHNIQUE_ANNOUNCEMENT,
        AudioType.TECHNIQUE_INSTRUCTION,
        AudioType.TECHNIQUE_FEEDBACK,
        AudioType.TECHNIQUE_CORRECTION
      ],
      fallbackOnError: true,
      maxRetries: 2
    }
  }
}