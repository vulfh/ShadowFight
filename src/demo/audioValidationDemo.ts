/**
 * Demo script to test audio validation functionality
 * This can be run in the browser console to verify audio files exist
 */

import { 
  validateAllInstructionAudio, 
  isAudioSupported, 
  validateAudioFormat 
} from '../utils/audioValidation'
import { INSTRUCTION_AUDIO_FILES, getInstructionAudioPath } from '../constants/audio'
import { MODES } from '../constants/modes'

/**
 * Run audio validation demo
 */
export async function runAudioValidationDemo(): Promise<void> {
  console.log('🎵 Audio Validation Demo Starting...')
  
  // Check if audio is supported
  console.log('\n1. Checking audio support...')
  const audioSupported = isAudioSupported()
  console.log(`   Audio supported: ${audioSupported ? '✅' : '❌'}`)
  
  if (!audioSupported) {
    console.log('❌ Audio not supported in this environment')
    return
  }
  
  // Check instruction audio file paths
  console.log('\n2. Instruction audio file paths:')
  console.log(`   PERFORMING: ${getInstructionAudioPath(MODES.PERFORMING)}`)
  console.log(`   RESPONDING: ${getInstructionAudioPath(MODES.RESPONDING)}`)
  
  // Validate audio formats
  console.log('\n3. Validating audio formats...')
  for (const [mode, filePath] of Object.entries(INSTRUCTION_AUDIO_FILES)) {
    const isValidFormat = validateAudioFormat(filePath)
    console.log(`   ${mode}: ${isValidFormat ? '✅' : '❌'} (${filePath})`)
  }
  
  // Validate all instruction audio files
  console.log('\n4. Validating instruction audio files...')
  try {
    const validation = await validateAllInstructionAudio()
    
    console.log(`   Overall validation: ${validation.allValid ? '✅' : '❌'}`)
    console.log(`   Files checked: ${validation.results.length}`)
    console.log(`   Missing files: ${validation.missingFiles.length}`)
    console.log(`   Errors: ${validation.errors.length}`)
    
    if (validation.missingFiles.length > 0) {
      console.log('\n   Missing files:')
      validation.missingFiles.forEach(file => {
        console.log(`   - ${file}`)
      })
    }
    
    if (validation.errors.length > 0) {
      console.log('\n   Errors:')
      validation.errors.forEach(error => {
        console.log(`   - ${error}`)
      })
    }
    
    // Show individual results
    console.log('\n   Individual file results:')
    validation.results.forEach(result => {
      const status = result.isValid ? '✅' : '❌'
      console.log(`   ${status} ${result.filePath}`)
      if (result.error) {
        console.log(`      Error: ${result.error}`)
      }
    })
    
  } catch (error) {
    console.error('❌ Validation failed:', error)
  }
  
  console.log('\n🎵 Audio Validation Demo Complete!')
}

/**
 * Test audio playback (requires user interaction)
 */
export async function testAudioPlayback(mode: typeof MODES.PERFORMING | typeof MODES.RESPONDING): Promise<void> {
  console.log(`🔊 Testing audio playback for ${mode} mode...`)
  
  const filePath = getInstructionAudioPath(mode)
  
  try {
    const audio = new Audio(filePath)
    
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onCanPlay)
        audio.removeEventListener('error', onError)
        audio.removeEventListener('ended', onEnded)
      }
      
      const onCanPlay = () => {
        console.log(`✅ Audio loaded successfully: ${filePath}`)
        audio.play().then(() => {
          console.log(`🔊 Playing audio: ${filePath}`)
        }).catch(error => {
          console.error(`❌ Playback failed: ${error.message}`)
          cleanup()
          reject(error)
        })
      }
      
      const onError = () => {
        console.error(`❌ Audio loading failed: ${filePath}`)
        cleanup()
        reject(new Error('Audio loading failed'))
      }
      
      const onEnded = () => {
        console.log(`✅ Audio playback completed: ${filePath}`)
        cleanup()
        resolve()
      }
      
      audio.addEventListener('canplaythrough', onCanPlay)
      audio.addEventListener('error', onError)
      audio.addEventListener('ended', onEnded)
      
      audio.load()
    })
    
  } catch (error) {
    console.error(`❌ Audio test failed: ${error}`)
    throw error
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).audioValidationDemo = {
    run: runAudioValidationDemo,
    testPlayback: testAudioPlayback,
    MODES
  }
  
  console.log('🎵 Audio validation demo loaded! Use:')
  console.log('   audioValidationDemo.run() - Run validation demo')
  console.log('   audioValidationDemo.testPlayback(audioValidationDemo.MODES.PERFORMING) - Test PERFORMING audio')
  console.log('   audioValidationDemo.testPlayback(audioValidationDemo.MODES.RESPONDING) - Test RESPONDING audio')
}