/**
 * Audio Types and Interfaces for Shadow Fight Training App
 * 
 * This module defines the type system for audio playback functionality,
 * including audio types, queue items, and playback configuration.
 */

/**
 * Enumeration of different audio types used in the application.
 * Each type represents a different category of audio content with
 * specific playback characteristics and priorities.
 */
export enum AudioType {
  /** Audio announcing the technique name or description */
  TECHNIQUE_ANNOUNCEMENT = 'technique_announcement',
  
  /** Audio providing detailed instructions for performing the technique */
  TECHNIQUE_INSTRUCTION = 'technique_instruction',
  
  /** Audio providing feedback on technique performance */
  TECHNIQUE_FEEDBACK = 'technique_feedback',
  
  /** Audio providing corrections or adjustments to technique */
  TECHNIQUE_CORRECTION = 'technique_correction'
}

/**
 * Represents a single audio item in the playback queue.
 * Contains all necessary information for audio playback and queue management.
 */
export interface AudioQueueItem {
  /** Path to the audio file to be played */
  file: string;
  
  /** Type of audio content, determines playback behavior and priority */
  type: AudioType;
  
  /** Priority level for queue ordering (higher numbers play first) */
  priority: number;
  
  /** Whether this audio is optional (can be skipped on error) or required */
  optional: boolean;
}

/**
 * Configuration for audio playback behavior.
 * Controls which audio types are enabled and how errors are handled.
 */
export interface PlaybackConfig {
  /** Array of audio types that are enabled for playback (default: [TECHNIQUE_ANNOUNCEMENT]) */
  enabledAudioTypes: AudioType[];
  
  /** Whether to continue session if audio playback fails (default: true) */
  fallbackOnError: boolean;
  
  /** Maximum number of retry attempts for failed audio (default: 1) */
  maxRetries: number;
}