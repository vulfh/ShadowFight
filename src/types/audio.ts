/**
 * Audio-related type definitions for the Krav Maga Shadow Fighting Trainer
 * 
 * This module defines types for the extensible audio playback system that supports
 * multiple audio types per technique and sequential audio playback with delay control.
 */

/**
 * Enumeration of audio types that can be played during technique cycles.
 * 
 * This enum is designed to be extensible for future audio enhancements while
 * maintaining backward compatibility with existing technique announcements.
 */
export enum AudioType {
  /** Primary technique announcement audio (current functionality) */
  TECHNIQUE_ANNOUNCEMENT = 'technique_announcement',
  
  /** Detailed technique instruction audio (future enhancement) */
  TECHNIQUE_INSTRUCTION = 'technique_instruction',
  
  /** Performance feedback audio (future enhancement) */
  TECHNIQUE_FEEDBACK = 'technique_feedback',
  
  /** Technique correction guidance audio (future enhancement) */
  TECHNIQUE_CORRECTION = 'technique_correction'
}

/**
 * Represents a single audio item in the playback queue.
 * 
 * Audio items are played sequentially, with higher priority items played first.
 * Optional items can be skipped if they fail to load or play, while required
 * items will stop the queue if they fail.
 */
export interface AudioQueueItem {
  /** Path to the audio file (relative to audio base path) */
  file: string
  
  /** Type of audio content for categorization and handling */
  type: AudioType
  
  /** Priority for queue ordering (higher numbers = higher priority, default: 1) */
  priority: number
  
  /** Whether this audio can be skipped if it fails (default: true for non-announcement audio) */
  optional: boolean
}

/**
 * Configuration for audio playback behavior during technique cycles.
 * 
 * This configuration determines which audio types are enabled, how errors
 * are handled, and retry behavior for failed audio playback.
 */
export interface PlaybackConfig {
  /** Array of audio types that should be played (default: [TECHNIQUE_ANNOUNCEMENT]) */
  enabledAudioTypes: AudioType[]
  
  /** Whether to continue with delay timing if audio fails (default: true) */
  fallbackOnError: boolean
  
  /** Maximum number of retry attempts for failed audio (default: 1) */
  maxRetries: number
}