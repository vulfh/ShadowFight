# Delay Control Bug Fix - Task Breakdown

## Overview

This task breakdown implements the delay control bug fix as specified in `spec.md` and detailed in `plan.md`. The tasks are organized into phases with granular, actionable items that can be executed independently.

**Reference Documents:**
- Specification: `src/spec/bugs/delay-control/spec.md`
- Implementation Plan: `src/spec/bugs/delay-control/plan.md`

## Phase 1: Core Infrastructure Setup

### Task 1.1: Create Audio Type Definitions ✅

- [x] 1.1.1 Create new audio types file
  - Create `src/types/audio.ts`
  - Define `AudioType` enum with current and future audio types
  - Add `TECHNIQUE_ANNOUNCEMENT`, `TECHNIQUE_INSTRUCTION`, `TECHNIQUE_FEEDBACK`, `TECHNIQUE_CORRECTION`
  - _Validates: Requirement 3 (Audio Integration) - extensible audio system_

- [x] 1.1.2 Define AudioQueueItem interface
  - Add `AudioQueueItem` interface in `src/types/audio.ts`
  - Include fields: `file: string`, `type: AudioType`, `priority: number`, `optional: boolean`
  - Add JSDoc documentation for each field
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - structured audio handling_

- [x] 1.1.3 Define PlaybackConfig interface
  - Add `PlaybackConfig` interface in `src/types/audio.ts`
  - Include fields: `enabledAudioTypes: AudioType[]`, `fallbackOnError: boolean`, `maxRetries: number`
  - Set default values in JSDoc comments
  - _Validates: Requirement 4 (Backward Compatibility) - configurable behavior_

- [x] 1.1.4 Export audio types from main types file
  - Update `src/types/index.ts` to export from `./audio`
  - Add re-export statement: `export * from './audio'`
  - Verify no circular dependencies
  - _Validates: Requirement 3 (Audio Integration) - proper module structure_

### Task 1.2: Create AudioPlaybackQueue Class ✅

- [x] 1.2.1 Create AudioPlaybackQueue class file
  - Create `src/managers/AudioPlaybackQueue.ts`
  - Add class declaration with private properties
  - Include: `queue: AudioQueueItem[]`, `isPlaying: boolean`, `currentIndex: number`
  - Add constructor with AudioManager dependency injection
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - sequential audio management_

- [x] 1.2.2 Implement enqueue method
  - Add `enqueue(audioFile: string, type: AudioType, priority?: number, optional?: boolean): void`
  - Sort queue by priority (higher priority first)
  - Prevent duplicate entries for same file and type
  - Add input validation for audioFile parameter
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - proper audio queuing_

- [x] 1.2.3 Implement play method
  - Add `play(): Promise<void>` method
  - Iterate through queue sequentially
  - Use AudioManager to play each audio file
  - Handle completion callbacks for each audio item
  - Set `isPlaying` state correctly
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - sequential playback_

- [x] 1.2.4 Implement pause/resume methods
  - Add `pause(): void` method to stop current audio and save state
  - Add `resume(): void` method to continue from paused position
  - Track paused state and current audio position
  - Handle AudioManager pause/resume integration
  - _Validates: Requirement 2 (Session State Management) - pause/resume support_

- [x] 1.2.5 Implement utility methods
  - Add `clear(): void` to empty queue and reset state
  - Add `isPlaying(): boolean` getter
  - Add `getCurrentAudio(): AudioQueueItem | null` getter
  - Add `getQueueLength(): number` getter
  - _Validates: Requirement 2 (Session State Management) - state visibility_

- [x] 1.2.6 Add error handling
  - Wrap audio playback in try-catch blocks
  - Handle optional audio failures gracefully (skip and continue)
  - Handle required audio failures (stop queue and callback with error)
  - Log errors with appropriate detail level
  - _Validates: Requirement 3 (Audio Integration) - graceful error handling_

### Task 1.3: Create TechniquePlaybackManager Class ✅

- [x] 1.3.1 Create TechniquePlaybackManager class file
  - Create `src/managers/TechniquePlaybackManager.ts`
  - Add class declaration with dependencies: AudioManager, AudioPlaybackQueue
  - Include private properties: `audioQueue`, `audioManager`, `isActive: boolean`
  - Add constructor with dependency injection
  - _Validates: Requirement 3 (Audio Integration) - centralized technique playback_

- [x] 1.3.2 Implement playTechniqueWithAudio method
  - Add `playTechniqueWithAudio(technique: Technique, config: PlaybackConfig): Promise<void>`
  - Clear existing audio queue
  - Build audio queue based on technique and config
  - Start audio queue playback
  - Return promise that resolves when all audio completes
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - complete audio playback before delay_

- [x] 1.3.3 Implement buildAudioQueue method
  - Add private `buildAudioQueue(technique: Technique, config: PlaybackConfig): void`
  - Check if technique has audio file (`technique.file`)
  - Add technique announcement audio to queue if available
  - Apply PlaybackConfig filters for enabled audio types
  - Handle missing audio files gracefully
  - _Validates: Requirement 4 (Backward Compatibility) - handle techniques without audio_

- [x] 1.3.4 Implement state management methods
  - Add `isPlaybackActive(): boolean` method
  - Add `stopPlayback(): void` method to stop current playback
  - Add `pausePlayback(): void` method
  - Add `resumePlayback(): void` method
  - Update internal state flags appropriately
  - _Validates: Requirement 2 (Session State Management) - playback state control_

- [x] 1.3.5 Add error handling and fallbacks
  - Wrap playback operations in try-catch blocks
  - Provide fallback behavior when AudioManager unavailable
  - Handle individual audio file failures
  - Emit appropriate error events or callbacks
  - _Validates: Requirement 3 (Audio Integration) - graceful error handling_

## Phase 2: SessionManager Integration

### Task 2.1: Modify SessionManager Audio Integration ✅

- [x] 2.1.1 Add TechniquePlaybackManager dependency
  - Update `src/managers/SessionManager.ts` imports
  - Add private property: `techniquePlaybackManager: TechniquePlaybackManager | null`
  - Add setter method: `setTechniquePlaybackManager(manager: TechniquePlaybackManager): void`
  - Initialize in constructor or init method
  - _Validates: Requirement 3 (Audio Integration) - proper dependency injection_

- [x] 2.1.2 Add delay timer state management
  - Add private properties: `delayTimer: number | null`, `delayRemainingTime: number`
  - Add private property: `isDelayActive: boolean`
  - Initialize delay state in constructor
  - Reset delay state in session cleanup methods
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - separate delay timing_

- [x] 2.1.3 Create startDelayTimer method
  - Add private `startDelayTimer(config: SessionConfig): void` method
  - Set `isDelayActive = true`
  - Store delay duration in `delayRemainingTime`
  - Create setTimeout with config.delay * 1000 milliseconds
  - Call `onDelayComplete()` when timer expires
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - delay starts after audio_

- [x] 2.1.4 Create delay timer control methods
  - Add private `stopDelayTimer(): void` method
  - Add private `pauseDelayTimer(): void` method
  - Add private `resumeDelayTimer(): void` method
  - Handle timer cleanup and state management
  - Store remaining time for pause/resume functionality
  - _Validates: Requirement 2 (Session State Management) - delay timer control_

- [x] 2.1.5 Create onDelayComplete callback
  - Add private `onDelayComplete(): void` method
  - Set `isDelayActive = false`
  - Clear `currentTechnique = null`
  - Call `scheduleNextTechnique(config)` to continue cycle
  - Handle session completion if time expired
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - proper cycle continuation_

### Task 2.2: Refactor announceTechnique Method ✅

- [x] 2.2.1 Update method signature
  - Change `announceTechnique` from void to `async Promise<void>`
  - Keep existing parameters: `technique: Technique`, `config: SessionConfig`
  - Add error handling wrapper around entire method
  - Maintain backward compatibility for callers
  - _Validates: Requirement 4 (Backward Compatibility) - non-breaking changes_

- [x] 2.2.2 Remove immediate delay timer start
  - Remove existing `setTimeout` call that starts delay immediately
  - Remove direct assignment to `this.techniqueTimer`
  - Keep technique state updates (currentTechnique, techniquesUsed, stats)
  - Preserve all existing technique announcement logic
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - fix core bug_

- [x] 2.2.3 Add audio playback integration
  - Check if `techniquePlaybackManager` is available
  - Create PlaybackConfig with current session settings
  - Call `techniquePlaybackManager.playTechniqueWithAudio(technique, config)`
  - Await completion of audio playback
  - Handle playback success and error cases
  - _Validates: Requirement 3 (Audio Integration) - SessionManager uses AudioManager_

- [x] 2.2.4 Add fallback for no audio manager
  - Add conditional check for `techniquePlaybackManager` availability
  - If unavailable, start delay timer immediately (current behavior)
  - Log warning about missing audio manager
  - Ensure session continues normally without audio
  - _Validates: Requirement 4 (Backward Compatibility) - fallback behavior_

- [x] 2.2.5 Add audio completion handling
  - On successful audio playback completion, call `startDelayTimer(config)`
  - On audio playback error, call `startDelayTimer(config)` as fallback
  - Log audio errors appropriately
  - Increment audio failure counter if needed
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - delay after audio completion_

### Task 2.3: Update Pause/Resume Logic ✅

- [x] 2.3.1 Enhance pauseSession method
  - Update existing `pauseSession()` method in SessionManager
  - Add check for active technique playback
  - Call `techniquePlaybackManager.pausePlayback()` if playback active
  - Call `pauseDelayTimer()` if delay timer active
  - Preserve existing session timer and state management
  - _Validates: Requirement 2 (Session State Management) - pause during audio/delay_

- [x] 2.3.2 Enhance resumeSession method
  - Update existing `resumeSession()` method in SessionManager
  - Add check for paused technique playback
  - Call `techniquePlaybackManager.resumePlayback()` if needed
  - Call `resumeDelayTimer()` if delay timer was paused
  - Preserve existing session timer and state management
  - _Validates: Requirement 2 (Session State Management) - resume from pause_

- [x] 2.3.3 Update stopSession method
  - Update existing `stopSession()` method in SessionManager
  - Add call to `techniquePlaybackManager.stopPlayback()` if available
  - Add call to `stopDelayTimer()` to clear delay timer
  - Preserve existing cleanup logic
  - Reset all new state variables to initial values
  - _Validates: Requirement 2 (Session State Management) - clean session stop_

## Phase 3: State Management Enhancement

### Task 3.1: Extend SessionStatus Interface ✅

- [x] 3.1.1 Update SessionStatus type definition
  - Edit `src/types/index.ts` SessionStatus interface
  - Add `isPlayingTechniqueAudio: boolean` field
  - Add `currentAudioType: AudioType | null` field
  - Add `audioQueueLength: number` field
  - Add `isDelayActive: boolean` field
  - _Validates: Requirement 2 (Session State Management) - extended state visibility_

- [x] 3.1.2 Add delayRemainingTime field
  - Add `delayRemainingTime: number` to SessionStatus interface
  - Document field as "remaining delay time in seconds"
  - Set default value to 0 in implementation
  - Update JSDoc comments for the interface
  - _Validates: Requirement 2 (Session State Management) - delay timing visibility_

### Task 3.2: Update getSessionStatus Method ✅

- [x] 3.2.1 Add technique playback status
  - Update `getSessionStatus()` method in SessionManager
  - Set `isPlayingTechniqueAudio` from `techniquePlaybackManager.isPlaybackActive()`
  - Set `currentAudioType` from current audio queue item
  - Set `audioQueueLength` from audio queue length
  - Handle null techniquePlaybackManager gracefully
  - _Validates: Requirement 2 (Session State Management) - accurate status reporting_

- [x] 3.2.2 Add delay timer status
  - Set `isDelayActive` from internal delay timer state
  - Set `delayRemainingTime` from current delay timer remaining time
  - Calculate remaining time accurately for paused timers
  - Ensure values are consistent with actual timer state
  - _Validates: Requirement 2 (Session State Management) - delay status visibility_

### Task 3.3: Add PlaybackConfig Management ✅

- [x] 3.3.1 Create default PlaybackConfig
  - Add private `createDefaultPlaybackConfig(): PlaybackConfig` method
  - Set `enabledAudioTypes: [AudioType.TECHNIQUE_ANNOUNCEMENT]`
  - Set `fallbackOnError: true`
  - Set `maxRetries: 1`
  - Make configurable through session config in future
  - _Validates: Requirement 4 (Backward Compatibility) - sensible defaults_

- [x] 3.3.2 Add PlaybackConfig to session state
  - Add private property `playbackConfig: PlaybackConfig`
  - Initialize in constructor with default config
  - Use in technique playback calls
  - Allow future configuration through session settings
  - _Validates: Requirement 3 (Audio Integration) - configurable audio behavior_

## Phase 4: AudioManager Integration

### Task 4.1: Enhance AudioManager for Callbacks

- [x] 4.1.1 Add playAudioWithCallback method
  - Update `src/managers/AudioManager.ts`
  - Add `playAudioWithCallback(filename: string, onComplete: () => void, onError?: (error: Error) => void): Promise<void>`
  - Implement completion callback using `currentSource.onended`
  - Implement error callback in catch blocks
  - Maintain existing playAudio functionality
  - _Validates: Requirement 3 (Audio Integration) - audio completion callbacks_

- [x] 4.1.2 Add audio duration detection
  - Add `getAudioDuration(filename: string): Promise<number>` method
  - Load audio buffer and return duration in seconds
  - Cache duration information for performance
  - Handle errors gracefully (return 0 for unknown duration)
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - duration awareness_

- [ ] 4.1.3 Enhance error handling
  - Improve error messages in existing audio methods
  - Add specific error types for different failure modes
  - Ensure all audio operations have proper error handling
  - Add retry logic for transient failures
  - _Validates: Requirement 3 (Audio Integration) - robust error handling_

### Task 4.2: Update Audio Event System

- [ ] 4.2.1 Add new audio events
  - Update `src/constants/audio.ts` AUDIO_EVENTS
  - Add `TECHNIQUE_AUDIO_STARTED: 'techniqueaudiostarted'`
  - Add `TECHNIQUE_AUDIO_COMPLETED: 'techniqueaudiocompleted'`
  - Add `DELAY_TIMER_STARTED: 'delaytimerstarted'`
  - Add `DELAY_TIMER_COMPLETED: 'delaytimercompleted'`
  - _Validates: Requirement 2 (Session State Management) - event-driven state updates_

- [ ] 4.2.2 Dispatch events from TechniquePlaybackManager
  - Add event dispatching in TechniquePlaybackManager
  - Dispatch TECHNIQUE_AUDIO_STARTED when playback begins
  - Dispatch TECHNIQUE_AUDIO_COMPLETED when playback ends
  - Include technique information in event details
  - _Validates: Requirement 2 (Session State Management) - external state monitoring_

- [ ] 4.2.3 Dispatch events from SessionManager
  - Add event dispatching in SessionManager delay methods
  - Dispatch DELAY_TIMER_STARTED when delay begins
  - Dispatch DELAY_TIMER_COMPLETED when delay ends
  - Include timing information in event details
  - _Validates: Requirement 2 (Session State Management) - delay timing events_

## Phase 5: Testing Implementation

### Task 5.1: Unit Tests for AudioPlaybackQueue

- [ ] 5.1.1 Create AudioPlaybackQueue test file
  - Create `src/tests/AudioPlaybackQueue.test.ts`
  - Set up test environment with mocked AudioManager
  - Add test setup and teardown methods
  - Import necessary testing utilities and types
  - _Validates: Testing requirement from spec_

- [ ] 5.1.2 Test enqueue functionality
  - Test adding single audio item to queue
  - Test priority-based queue ordering
  - Test duplicate prevention
  - Test input validation for invalid parameters
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - proper queuing_

- [ ] 5.1.3 Test sequential playback
  - Test playing queue with multiple audio items
  - Test completion callbacks for each item
  - Test queue progression through all items
  - Mock AudioManager playback and completion
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - sequential audio_

- [ ] 5.1.4 Test pause/resume functionality
  - Test pausing during audio playback
  - Test resuming from paused state
  - Test state consistency during pause/resume
  - Test multiple pause/resume cycles
  - _Validates: Requirement 2 (Session State Management) - pause/resume_

- [ ] 5.1.5 Test error handling
  - Test behavior when audio file fails to load
  - Test optional vs required audio failure handling
  - Test queue continuation after optional failures
  - Test queue stopping after required failures
  - _Validates: Requirement 3 (Audio Integration) - error handling_

### Task 5.2: Unit Tests for TechniquePlaybackManager

- [ ] 5.2.1 Create TechniquePlaybackManager test file
  - Create `src/tests/TechniquePlaybackManager.test.ts`
  - Set up test environment with mocked dependencies
  - Create sample Technique objects for testing
  - Create sample PlaybackConfig objects
  - _Validates: Testing requirement from spec_

- [ ] 5.2.2 Test playTechniqueWithAudio method
  - Test successful technique playback with audio
  - Test technique playback without audio file
  - Test playback completion promise resolution
  - Test playback with different PlaybackConfig settings
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - complete playback_

- [ ] 5.2.3 Test state management
  - Test isPlaybackActive during different states
  - Test stopPlayback method functionality
  - Test pausePlayback and resumePlayback methods
  - Test state consistency across operations
  - _Validates: Requirement 2 (Session State Management) - state management_

- [ ] 5.2.4 Test error scenarios
  - Test behavior when AudioManager is unavailable
  - Test behavior when audio files are missing
  - Test error propagation to calling code
  - Test fallback behavior configuration
  - _Validates: Requirement 4 (Backward Compatibility) - graceful degradation_

### Task 5.3: Integration Tests for SessionManager

- [ ] 5.3.1 Create SessionManager delay timing tests
  - Create `src/tests/SessionManager.delayTiming.test.ts`
  - Set up complete test environment with all dependencies
  - Create integration test scenarios
  - Mock timing functions for deterministic tests
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - end-to-end timing_

- [ ] 5.3.2 Test audio-aware delay timing
  - Test delay starts only after audio completion
  - Test delay timing with different audio durations
  - Test delay timing with audio failures
  - Test delay timing without audio (backward compatibility)
  - _Validates: Requirement 1 (Audio-Aware Delay Timing) - core bug fix_

- [ ] 5.3.3 Test session pause/resume during audio
  - Test pausing session during technique audio playback
  - Test pausing session during delay countdown
  - Test resuming session from both states
  - Test state consistency after pause/resume cycles
  - _Validates: Requirement 2 (Session State Management) - pause/resume integration_

- [ ] 5.3.4 Test backward compatibility
  - Test sessions without TechniquePlaybackManager
  - Test sessions with disabled audio
  - Test sessions with missing audio files
  - Test that existing functionality is preserved
  - _Validates: Requirement 4 (Backward Compatibility) - no regressions_

### Task 5.4: End-to-End Integration Tests

- [ ] 5.4.1 Create complete session flow tests
  - Create `src/tests/SessionManager.integration.test.ts`
  - Test complete technique cycle with audio and delay
  - Test multiple technique cycles in sequence
  - Test session completion with new timing
  - Use real audio files in test environment
  - _Validates: All requirements - complete integration_

- [ ] 5.4.2 Test error recovery scenarios
  - Test session continuation after audio failures
  - Test session behavior with intermittent audio issues
  - Test graceful degradation scenarios
  - Test error reporting and logging
  - _Validates: Requirement 3 (Audio Integration) - robust error handling_

- [ ] 5.4.3 Test performance characteristics
  - Test memory usage with large audio queues
  - Test timing accuracy under load
  - Test audio loading and caching performance
  - Test session responsiveness during audio playback
  - _Validates: Performance requirements from spec_

## Phase 6: Future-Proofing Implementation

### Task 6.1: Extensible Audio Configuration

- [ ] 6.1.1 Create TechniqueAudioConfig interface
  - Add to `src/types/audio.ts`
  - Define structure for multiple audio types per technique
  - Include enabled/disabled flags for each audio type
  - Add required/optional flags for each audio type
  - _Validates: Future extensibility requirement_

- [ ] 6.1.2 Extend Technique interface
  - Update `src/types/index.ts` Technique interface
  - Add optional `audioConfig?: TechniqueAudioConfig` field
  - Maintain backward compatibility with existing `file` field
  - Add migration logic for existing techniques
  - _Validates: Requirement 4 (Backward Compatibility) - extensible structure_

- [ ] 6.1.3 Update TechniquePlaybackManager for multiple audio types
  - Modify `buildAudioQueue` to handle TechniqueAudioConfig
  - Add support for multiple audio files per technique
  - Maintain backward compatibility with single file techniques
  - Add configuration validation logic
  - _Validates: Future extensibility requirement_

### Task 6.2: Plugin Architecture Foundation

- [ ] 6.2.1 Create AudioTypeHandler interface
  - Add to `src/types/audio.ts`
  - Define plugin interface for audio type handlers
  - Include methods: `canHandle`, `getAudioFile`, `isRequired`
  - Add registration and discovery mechanisms
  - _Validates: Future extensibility requirement_

- [ ] 6.2.2 Create AudioTypeRegistry
  - Create `src/managers/AudioTypeRegistry.ts`
  - Implement handler registration system
  - Add handler discovery and selection logic
  - Provide default handlers for current audio types
  - _Validates: Future extensibility requirement_

- [ ] 6.2.3 Integrate plugin system with TechniquePlaybackManager
  - Update TechniquePlaybackManager to use AudioTypeRegistry
  - Replace hardcoded audio type logic with plugin system
  - Maintain backward compatibility with existing behavior
  - Add plugin configuration options
  - _Validates: Future extensibility requirement_

## Phase 7: Documentation and Finalization

### Task 7.1: Code Documentation

- [ ] 7.1.1 Add JSDoc comments to all new classes
  - Document AudioPlaybackQueue class and methods
  - Document TechniquePlaybackManager class and methods
  - Document all new interfaces and types
  - Include usage examples in documentation
  - _Validates: Code quality requirement_

- [ ] 7.1.2 Update existing class documentation
  - Update SessionManager JSDoc for modified methods
  - Update AudioManager JSDoc for new methods
  - Document new configuration options
  - Add migration notes for breaking changes
  - _Validates: Code quality requirement_

### Task 7.2: Integration Documentation

- [ ] 7.2.1 Create integration guide
  - Document how to integrate new audio types
  - Provide examples of PlaybackConfig usage
  - Document event system for external monitoring
  - Create troubleshooting guide for common issues
  - _Validates: Future extensibility requirement_

- [ ] 7.2.2 Update API documentation
  - Document new SessionStatus fields
  - Document new audio events
  - Update session lifecycle documentation
  - Add timing diagram for new audio-delay flow
  - _Validates: Code quality requirement_

## Validation Checklist

Each completed task should validate against the original requirements:

### Requirement 1: Audio-Aware Delay Timing
- [ ] Delay timer starts only after technique audio completes
- [ ] Delay timer starts immediately if no audio or audio fails
- [ ] Next technique announced only after delay expires
- [ ] Timing is accurate and consistent

### Requirement 2: Session State Management
- [ ] Pause/resume works during audio playback
- [ ] Pause/resume works during delay countdown
- [ ] Session state is consistent after pause/resume
- [ ] All timers and audio are cleared on session stop

### Requirement 3: Audio Integration
- [ ] SessionManager uses AudioManager for technique audio
- [ ] AudioManager notifies SessionManager on completion
- [ ] Error handling is graceful and maintains session continuity
- [ ] Fallback behavior when AudioManager unavailable

### Requirement 4: Backward Compatibility
- [ ] Sessions without audio work as before
- [ ] Disabled audio works as before
- [ ] Fight lists without audio work as before
- [ ] Uninitialized AudioManager handled gracefully

## Success Criteria

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Performance benchmarks meet requirements
- [ ] Backward compatibility verified
- [ ] Code review completed
- [ ] Documentation updated