/**
 * AudioPlaybackQueue - Sequential audio playback manager
 * 
 * Manages a queue of audio files that are played sequentially with completion tracking.
 * Supports pause/resume functionality and graceful error handling for optional audio files.
 */

import { AudioManager } from './AudioManager'
import { AudioQueueItem, AudioType } from '../types/audio'

/**
 * Manages sequential playback of multiple audio files with completion tracking.
 * 
 * The queue plays audio files in priority order (higher priority first), with
 * support for pause/resume and error handling for optional vs required audio.
 */
export class AudioPlaybackQueue {
  private queue: AudioQueueItem[] = []
  private isPlaying: boolean = false
  private currentIndex: number = 0
  private isPaused: boolean = false
  private audioManager: AudioManager

  /**
   * Creates a new AudioPlaybackQueue instance.
   * 
   * @param audioManager - The AudioManager instance to use for audio playback
   */
  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager
  }

  /**
   * Adds an audio file to the playback queue.
   * 
   * @param audioFile - Path to the audio file (relative to audio base path)
   * @param type - Type of audio content for categorization
   * @param priority - Priority for queue ordering (higher numbers = higher priority, default: 1)
   * @param optional - Whether this audio can be skipped if it fails (default: true for non-announcement audio)
   */
  enqueue(audioFile: string, type: AudioType, priority: number = 1, optional: boolean = true): void {
    // Input validation
    if (!audioFile || typeof audioFile !== 'string') {
      throw new Error('AudioPlaybackQueue: audioFile must be a non-empty string')
    }

    // Set default optional value based on audio type
    const isOptional = type === AudioType.TECHNIQUE_ANNOUNCEMENT ? false : optional

    // Prevent duplicate entries for same file and type
    const existingIndex = this.queue.findIndex(item => 
      item.file === audioFile && item.type === type
    )
    
    if (existingIndex !== -1) {
      // Update existing entry with new priority if higher
      if (priority > this.queue[existingIndex].priority) {
        this.queue[existingIndex].priority = priority
        this.queue[existingIndex].optional = isOptional
        this.sortQueue()
      }
      return
    }

    // Add new item to queue
    const queueItem: AudioQueueItem = {
      file: audioFile,
      type,
      priority,
      optional: isOptional
    }

    this.queue.push(queueItem)
    this.sortQueue()
  }

  /**
   * Sorts the queue by priority (higher priority first).
   * Items with the same priority maintain their insertion order.
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Higher priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      // For same priority, maintain insertion order (stable sort)
      return 0
    })
  }

  /**
   * Plays all audio files in the queue sequentially.
   * 
   * @returns Promise that resolves when all audio completes or rejects on critical error
   */
  async play(): Promise<void> {
    if (this.isPlaying) {
      throw new Error('AudioPlaybackQueue: Already playing')
    }

    if (this.queue.length === 0) {
      return Promise.resolve()
    }

    this.isPlaying = true
    this.isPaused = false
    this.currentIndex = 0

    try {
      await this.playNextItem()
    } catch (error) {
      this.isPlaying = false
      this.isPaused = false
      throw error
    }
  }

  /**
   * Plays the next item in the queue recursively.
   */
  private async playNextItem(): Promise<void> {
    // Check if we've completed all items
    if (this.currentIndex >= this.queue.length) {
      this.isPlaying = false
      this.isPaused = false
      return
    }

    // Check if paused
    if (this.isPaused) {
      return
    }

    const currentItem = this.queue[this.currentIndex]

    try {
      // Play the current audio item
      await this.playAudioItem(currentItem)
      
      // Move to next item
      this.currentIndex++
      
      // Continue with next item
      await this.playNextItem()
      
    } catch (error) {
      // Handle error based on whether audio is optional
      if (currentItem.optional) {
        console.warn(`AudioPlaybackQueue: Optional audio failed, continuing: ${currentItem.file}`, error)
        
        // Skip this item and continue
        this.currentIndex++
        await this.playNextItem()
      } else {
        // Required audio failed - stop queue
        console.error(`AudioPlaybackQueue: Required audio failed, stopping queue: ${currentItem.file}`, error)
        this.isPlaying = false
        this.isPaused = false
        throw error
      }
    }
  }

  /**
   * Plays a single audio item using the AudioManager.
   * 
   * @param item - The audio queue item to play
   * @returns Promise that resolves when audio completes
   */
  private async playAudioItem(item: AudioQueueItem): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Use AudioManager's callback-based method for accurate completion detection
      this.audioManager.playAudioWithCallback(
        item.file,
        () => {
          // Audio completed successfully
          resolve()
        },
        (error: Error) => {
          // Audio failed to play
          reject(error)
        }
      ).catch(reject)
    })
  }

  /**
   * Pauses the current audio playback and saves state.
   */
  pause(): void {
    if (!this.isPlaying || this.isPaused) {
      return
    }

    this.isPaused = true
    
    // Stop current audio playback
    this.audioManager.stopCurrentAudio()
  }

  /**
   * Resumes audio playback from the paused position.
   */
  resume(): void {
    if (!this.isPlaying || !this.isPaused) {
      return
    }

    this.isPaused = false
    
    // Continue playing from current position
    this.playNextItem().catch(error => {
      console.error('AudioPlaybackQueue: Error resuming playback:', error)
      this.isPlaying = false
      this.isPaused = false
    })
  }

  /**
   * Clears the queue and resets all state.
   */
  clear(): void {
    // Stop any current playback
    if (this.isPlaying) {
      this.audioManager.stopCurrentAudio()
    }

    // Reset all state
    this.queue = []
    this.isPlaying = false
    this.isPaused = false
    this.currentIndex = 0
  }

  /**
   * Checks if audio is currently playing.
   * 
   * @returns True if audio is currently playing
   */
  isPlayingAudio(): boolean {
    return this.isPlaying && !this.isPaused
  }

  /**
   * Gets the current audio item being played.
   * 
   * @returns The current audio queue item or null if none
   */
  getCurrentAudio(): AudioQueueItem | null {
    if (this.isPlaying && !this.isPaused && this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex]
    }
    return null
  }

  /**
   * Gets the number of items in the queue.
   * 
   * @returns The queue length
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * Gets the number of remaining items to play.
   * 
   * @returns The number of remaining items
   */
  getRemainingItems(): number {
    return Math.max(0, this.queue.length - this.currentIndex)
  }

  /**
   * Checks if the queue is paused.
   * 
   * @returns True if the queue is paused
   */
  isPausedState(): boolean {
    return this.isPaused
  }
}