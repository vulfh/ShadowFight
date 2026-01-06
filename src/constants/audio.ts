/**
 * Audio-related constants for the Krav Maga Shadow Fighting Trainer
 */

import { Mode } from '../types'
import { MODES } from './modes'

/**
 * Instruction audio file paths for different fight list modes
 */
export const INSTRUCTION_AUDIO_FILES = {
  [MODES.PERFORMING]: '/Sounds/instruction-for-performer.wav',
  [MODES.RESPONDING]: '/Sounds/instruction-for-responder.wav'
} as const

/**
 * Audio file validation and utility functions
 */
export const AUDIO_CONFIG = {
  /**
   * Base path for all audio files
   */
  BASE_PATH: '/Sounds/',
  
  /**
   * Supported audio formats
   */
  SUPPORTED_FORMATS: ['wav', 'mp3', 'ogg'] as const,
  
  /**
   * Default audio settings
   */
  DEFAULT_VOLUME: 0.8,
  MIN_VOLUME: 0.0,
  MAX_VOLUME: 1.0,
  
  /**
   * Audio loading timeout in milliseconds
   */
  LOAD_TIMEOUT: 5000,
  
  /**
   * Audio preload strategy
   */
  PRELOAD_STRATEGY: 'metadata' as const
} as const

/**
 * Audio error messages
 */
export const AUDIO_ERRORS = {
  FILE_NOT_FOUND: 'Audio file not found',
  LOAD_FAILED: 'Failed to load audio file',
  PLAYBACK_FAILED: 'Audio playback failed',
  UNSUPPORTED_FORMAT: 'Unsupported audio format',
  NETWORK_ERROR: 'Network error while loading audio',
  PERMISSION_DENIED: 'Audio playback permission denied'
} as const

/**
 * Audio event types
 */
export const AUDIO_EVENTS = {
  LOADED: 'audioloaded',
  STARTED: 'audiostarted',
  COMPLETED: 'audiocompleted',
  ERROR: 'audioerror',
  PAUSED: 'audiopaused',
  RESUMED: 'audioresumed'
} as const

/**
 * Get instruction audio file path for a given mode
 * @param mode - The fight list mode (PERFORMING or RESPONDING)
 * @returns The file path for the instruction audio
 */
export function getInstructionAudioPath(mode: Mode): string {
  return INSTRUCTION_AUDIO_FILES[mode]
}

/**
 * Validate if an audio file path exists in the instruction files
 * @param filePath - The file path to validate
 * @returns True if the file path is a valid instruction audio file
 */
export function isValidInstructionAudioPath(filePath: string): boolean {
  return Object.values(INSTRUCTION_AUDIO_FILES).includes(filePath as any)
}

/**
 * Get all instruction audio file paths
 * @returns Array of all instruction audio file paths
 */
export function getAllInstructionAudioPaths(): string[] {
  return Object.values(INSTRUCTION_AUDIO_FILES)
}

/**
 * Get the mode for a given instruction audio file path
 * @param filePath - The file path to get the mode for
 * @returns The mode associated with the file path, or null if not found
 */
export function getModeForInstructionAudio(filePath: string): Mode | null {
  for (const [mode, path] of Object.entries(INSTRUCTION_AUDIO_FILES)) {
    if (path === filePath) {
      return mode as Mode
    }
  }
  return null
}