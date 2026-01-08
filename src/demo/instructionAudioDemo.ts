/**
 * Demo script to test instruction audio functionality
 * This can be run in the browser console to verify instruction audio works
 */

import { AudioManager } from '../managers/AudioManager'
import { MODES } from '../constants/modes'
import { AUDIO_EVENTS } from '../constants/audio'

/**
 * Demo class for testing instruction audio
 */
export class InstructionAudioDemo {
  private audioManager: AudioManager
  private isInitialized: boolean = false

  constructor() {
    this.audioManager = new AudioManager()
  }

  /**
   * Initialize the audio manager
   */
  async init(): Promise<void> {
    try {
      console.log('🎵 Initializing AudioManager...')
      await this.audioManager.init()
      this.isInitialized = true
      console.log('✅ AudioManager initialized successfully')
      
      // Set up event listeners
      this.setupEventListeners()
      
      // Validate instruction audio files
      await this.validateInstructionAudio()
      
    } catch (error) {
      console.error('❌ Failed to initialize AudioManager:', error)
      throw error
    }
  }

  /**
   * Set up event listeners for instruction audio
   */
  private setupEventListeners(): void {
    window.addEventListener(AUDIO_EVENTS.STARTED, (event: any) => {
      console.log('🔊 Instruction audio started:', event.detail)
    })

    window.addEventListener(AUDIO_EVENTS.COMPLETED, (event: any) => {
      console.log('✅ Instruction audio completed:', event.detail)
    })

    window.addEventListener(AUDIO_EVENTS.ERROR, (event: any) => {
      console.error('❌ Instruction audio error:', event.detail)
    })
  }

  /**
   * Validate instruction audio files
   */
  async validateInstructionAudio(): Promise<void> {
    console.log('\n🔍 Validating instruction audio files...')
    
    try {
      const results = await this.audioManager.validateInstructionAudio()
      
      console.log('Validation results:')
      for (const [mode, isValid] of Object.entries(results)) {
        const status = isValid ? '✅' : '❌'
        console.log(`  ${status} ${mode}: ${isValid ? 'Valid' : 'Invalid'}`)
      }
      
    } catch (error) {
      console.error('❌ Validation failed:', error)
    }
  }

  /**
   * Test instruction audio for PERFORMING mode
   */
  async testPerformingAudio(): Promise<void> {
    if (!this.isInitialized) {
      console.error('❌ AudioManager not initialized. Call init() first.')
      return
    }

    console.log('\n🎭 Testing PERFORMING instruction audio...')
    
    try {
      await this.audioManager.playInstructionAudio(MODES.PERFORMING, () => {
        console.log('🎯 PERFORMING instruction audio completed!')
      })
      
      console.log('🔊 PERFORMING instruction audio started')
      
    } catch (error) {
      console.error('❌ Failed to play PERFORMING instruction audio:', error)
    }
  }

  /**
   * Test instruction audio for RESPONDING mode
   */
  async testRespondingAudio(): Promise<void> {
    if (!this.isInitialized) {
      console.error('❌ AudioManager not initialized. Call init() first.')
      return
    }

    console.log('\n🛡️ Testing RESPONDING instruction audio...')
    
    try {
      await this.audioManager.playInstructionAudio(MODES.RESPONDING, () => {
        console.log('🎯 RESPONDING instruction audio completed!')
      })
      
      console.log('🔊 RESPONDING instruction audio started')
      
    } catch (error) {
      console.error('❌ Failed to play RESPONDING instruction audio:', error)
    }
  }

  /**
   * Test sequential playback (PERFORMING then RESPONDING)
   */
  async testSequentialPlayback(): Promise<void> {
    if (!this.isInitialized) {
      console.error('❌ AudioManager not initialized. Call init() first.')
      return
    }

    console.log('\n🔄 Testing sequential instruction audio playback...')
    
    try {
      // Play PERFORMING first
      await new Promise<void>((resolve) => {
        this.audioManager.playInstructionAudio(MODES.PERFORMING, () => {
          console.log('✅ PERFORMING instruction completed, starting RESPONDING...')
          resolve()
        })
      })
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Play RESPONDING second
      await new Promise<void>((resolve) => {
        this.audioManager.playInstructionAudio(MODES.RESPONDING, () => {
          console.log('✅ RESPONDING instruction completed!')
          resolve()
        })
      })
      
      console.log('🎉 Sequential playback test completed!')
      
    } catch (error) {
      console.error('❌ Sequential playback test failed:', error)
    }
  }

  /**
   * Test volume control
   */
  testVolumeControl(): void {
    if (!this.isInitialized) {
      console.error('❌ AudioManager not initialized. Call init() first.')
      return
    }

    console.log('\n🔊 Testing volume control...')
    
    const originalVolume = this.audioManager.getInstructionAudioVolume()
    console.log(`Original volume: ${originalVolume}`)
    
    // Test different volume levels
    const testVolumes = [0.2, 0.5, 0.8, 1.0]
    
    testVolumes.forEach(volume => {
      this.audioManager.setInstructionAudioVolume(volume)
      const currentVolume = this.audioManager.getInstructionAudioVolume()
      console.log(`Set volume to ${volume}, current: ${currentVolume}`)
    })
    
    // Restore original volume
    this.audioManager.setInstructionAudioVolume(originalVolume)
    console.log(`Restored volume to: ${originalVolume}`)
  }

  /**
   * Test state management
   */
  async testStateManagement(): Promise<void> {
    if (!this.isInitialized) {
      console.error('❌ AudioManager not initialized. Call init() first.')
      return
    }

    console.log('\n📊 Testing state management...')
    
    console.log(`Initial state - Playing: ${this.audioManager.isPlayingInstructionAudio()}, Mode: ${this.audioManager.getCurrentInstructionMode()}`)
    
    // Start playing
    const playPromise = this.audioManager.playInstructionAudio(MODES.PERFORMING, () => {
      console.log('📊 Audio completed, checking final state...')
      console.log(`Final state - Playing: ${this.audioManager.isPlayingInstructionAudio()}, Mode: ${this.audioManager.getCurrentInstructionMode()}`)
    })
    
    // Check state while playing
    setTimeout(() => {
      console.log(`During playback - Playing: ${this.audioManager.isPlayingInstructionAudio()}, Mode: ${this.audioManager.getCurrentInstructionMode()}`)
    }, 100)
    
    await playPromise
  }

  /**
   * Test stop functionality
   */
  async testStopFunctionality(): Promise<void> {
    if (!this.isInitialized) {
      console.error('❌ AudioManager not initialized. Call init() first.')
      return
    }

    console.log('\n⏹️ Testing stop functionality...')
    
    try {
      // Start playing
      this.audioManager.playInstructionAudio(MODES.PERFORMING, () => {
        console.log('⚠️ This callback should not be called after stop')
      })
      
      console.log('🔊 Started instruction audio')
      console.log(`State before stop - Playing: ${this.audioManager.isPlayingInstructionAudio()}`)
      
      // Stop after a short delay
      setTimeout(() => {
        this.audioManager.stopInstructionAudio()
        console.log('⏹️ Stopped instruction audio')
        console.log(`State after stop - Playing: ${this.audioManager.isPlayingInstructionAudio()}, Mode: ${this.audioManager.getCurrentInstructionMode()}`)
      }, 500)
      
    } catch (error) {
      console.error('❌ Stop functionality test failed:', error)
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive instruction audio tests...\n')
    
    try {
      await this.init()
      
      await this.testPerformingAudio()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await this.testRespondingAudio()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      this.testVolumeControl()
      await new Promise(resolve => setTimeout(resolve, 500))
      
      await this.testStateManagement()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await this.testStopFunctionality()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await this.testSequentialPlayback()
      
      console.log('\n🎉 All instruction audio tests completed!')
      
    } catch (error) {
      console.error('❌ Test suite failed:', error)
    }
  }

  /**
   * Get the audio manager instance
   */
  getAudioManager(): AudioManager {
    return this.audioManager
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  const demo = new InstructionAudioDemo()
  
  ;(window as any).instructionAudioDemo = {
    demo,
    init: () => demo.init(),
    testPerforming: () => demo.testPerformingAudio(),
    testResponding: () => demo.testRespondingAudio(),
    testSequential: () => demo.testSequentialPlayback(),
    testVolume: () => demo.testVolumeControl(),
    testState: () => demo.testStateManagement(),
    testStop: () => demo.testStopFunctionality(),
    runAll: () => demo.runAllTests(),
    getAudioManager: () => demo.getAudioManager(),
    MODES
  }
  
  console.log('🎵 Instruction audio demo loaded! Available commands:')
  console.log('   instructionAudioDemo.init() - Initialize audio manager')
  console.log('   instructionAudioDemo.testPerforming() - Test PERFORMING audio')
  console.log('   instructionAudioDemo.testResponding() - Test RESPONDING audio')
  console.log('   instructionAudioDemo.testSequential() - Test sequential playback')
  console.log('   instructionAudioDemo.testVolume() - Test volume control')
  console.log('   instructionAudioDemo.testState() - Test state management')
  console.log('   instructionAudioDemo.testStop() - Test stop functionality')
  console.log('   instructionAudioDemo.runAll() - Run all tests')
}