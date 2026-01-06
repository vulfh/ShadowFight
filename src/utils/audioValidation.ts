/**
 * Audio file validation utilities
 */

import { INSTRUCTION_AUDIO_FILES, AUDIO_CONFIG, AUDIO_ERRORS } from '../constants/audio'
import { Mode } from '../types'

/**
 * Result of audio file validation
 */
export interface AudioValidationResult {
  isValid: boolean
  exists: boolean
  error?: string
  filePath?: string
}

/**
 * Check if instruction audio files exist and are accessible
 * @param mode - Optional mode to check specific file, or undefined to check all
 * @returns Promise resolving to validation result
 */
export async function validateInstructionAudioFiles(mode?: Mode): Promise<AudioValidationResult[]> {
  const filesToCheck = mode 
    ? [INSTRUCTION_AUDIO_FILES[mode]]
    : Object.values(INSTRUCTION_AUDIO_FILES)

  const results: AudioValidationResult[] = []

  for (const filePath of filesToCheck) {
    try {
      const result = await validateAudioFile(filePath)
      results.push(result)
    } catch (error) {
      results.push({
        isValid: false,
        exists: false,
        error: error instanceof Error ? error.message : AUDIO_ERRORS.LOAD_FAILED,
        filePath
      })
    }
  }

  return results
}

/**
 * Validate a single audio file
 * @param filePath - Path to the audio file
 * @returns Promise resolving to validation result
 */
export async function validateAudioFile(filePath: string): Promise<AudioValidationResult> {
  return new Promise((resolve) => {
    const audio = new Audio()
    let timeoutId: number

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      audio.removeEventListener('canplaythrough', onCanPlay)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('loadstart', onLoadStart)
    }

    const onCanPlay = () => {
      cleanup()
      resolve({
        isValid: true,
        exists: true,
        filePath
      })
    }

    const onError = () => {
      cleanup()
      resolve({
        isValid: false,
        exists: false,
        error: AUDIO_ERRORS.FILE_NOT_FOUND,
        filePath
      })
    }

    const onLoadStart = () => {
      // File exists and started loading
      // We don't need to wait for full load, just confirm it exists
    }

    const onTimeout = () => {
      cleanup()
      resolve({
        isValid: false,
        exists: false,
        error: AUDIO_ERRORS.LOAD_FAILED,
        filePath
      })
    }

    // Set up event listeners
    audio.addEventListener('canplaythrough', onCanPlay)
    audio.addEventListener('error', onError)
    audio.addEventListener('loadstart', onLoadStart)

    // Set timeout for validation
    timeoutId = window.setTimeout(onTimeout, AUDIO_CONFIG.LOAD_TIMEOUT)

    // Set preload strategy and start loading
    audio.preload = AUDIO_CONFIG.PRELOAD_STRATEGY
    audio.src = filePath
  })
}

/**
 * Check if browser supports audio playback
 * @returns True if audio is supported
 */
export function isAudioSupported(): boolean {
  try {
    return !!(window.Audio && new Audio())
  } catch {
    return false
  }
}

/**
 * Check if a specific audio format is supported
 * @param format - Audio format to check (e.g., 'wav', 'mp3')
 * @returns True if format is supported
 */
export function isAudioFormatSupported(format: string): boolean {
  if (!isAudioSupported()) {
    return false
  }

  try {
    const audio = new Audio()
    const mimeTypes: Record<string, string> = {
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg'
    }

    const mimeType = mimeTypes[format.toLowerCase()]
    if (!mimeType) {
      return false
    }

    const canPlay = audio.canPlayType(mimeType)
    return canPlay === 'probably' || canPlay === 'maybe'
  } catch {
    return false
  }
}

/**
 * Get audio file format from file path
 * @param filePath - Path to audio file
 * @returns File format or null if not found
 */
export function getAudioFormat(filePath: string): string | null {
  const match = filePath.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : null
}

/**
 * Validate audio format compatibility
 * @param filePath - Path to audio file
 * @returns True if format is supported
 */
export function validateAudioFormat(filePath: string): boolean {
  const format = getAudioFormat(filePath)
  if (!format) {
    return false
  }

  return AUDIO_CONFIG.SUPPORTED_FORMATS.includes(format as any) && 
         isAudioFormatSupported(format)
}

/**
 * Create fallback behavior when audio files are unavailable
 * @param mode - The mode for which audio failed
 * @returns Fallback configuration
 */
export function createAudioFallback(mode: Mode) {
  return {
    mode,
    skipInstructionAudio: true,
    fallbackMessage: `Instruction audio for ${mode} mode is not available. Proceeding with technique session.`,
    proceedWithSession: true
  }
}

/**
 * Batch validate all instruction audio files
 * @returns Promise resolving to overall validation status
 */
export async function validateAllInstructionAudio(): Promise<{
  allValid: boolean
  results: AudioValidationResult[]
  missingFiles: string[]
  errors: string[]
}> {
  const results = await validateInstructionAudioFiles()
  
  const allValid = results.every(result => result.isValid)
  const missingFiles = results
    .filter(result => !result.exists)
    .map(result => result.filePath || 'unknown')
  const errors = results
    .filter(result => result.error)
    .map(result => result.error || 'unknown error')

  return {
    allValid,
    results,
    missingFiles,
    errors
  }
}