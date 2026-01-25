# Delay Control Bug Fix - Implementation Plan

## Overview

This plan addresses the delay control bug where the delay timer starts immediately when a technique is announced, rather than waiting for all audio playbacks to complete. The solution is designed to be extensible for future audio playbacks beyond just technique announcements.

## Architecture Design

### Core Concept: Audio Playback Queue System

Instead of directly managing individual audio callbacks, we'll implement a **Playback Queue System** that can handle multiple sequential audio playbacks before starting the delay timer.

```
Technique Cycle:
1. Technique Selected
2. Audio Queue: [Technique Audio, Future Audio 1, Future Audio 2, ...]
3. Play Audio Queue Sequentially
4. All Audio Complete → Start Delay Timer
5. Delay Complete → Next Technique
```

### Key Components

#### 1. TechniquePlaybackManager (New)
A dedicated manager to handle the complete playback cycle for a technique, including all associated audio files.

```typescript
interface TechniquePlaybackManager {
  playTechniqueWithAudio(technique: Technique, config: PlaybackConfig): Promise<void>
  addAudioToQueue(audioFile: string, type: AudioType): void
  isPlaybackActive(): boolean
  stopPlayback(): void
  pausePlayback(): void
  resumePlayback(): void
}
```

#### 2. AudioPlaybackQueue (New)
Manages sequential playback of multiple audio files with completion tracking.

```typescript
interface AudioPlaybackQueue {
  enqueue(audioFile: string, type: AudioType): void
  play(): Promise<void>
  pause(): void
  resume(): void
  clear(): void
  isPlaying(): boolean
  getCurrentAudio(): AudioQueueItem | null
}
```

#### 3. Enhanced SessionManager
Modified to use the new playback system instead of direct audio calls.

## Implementation Strategy

### Phase 1: Core Infrastructure

#### Step 1.1: Create Audio Playback Queue System
- **File**: `src/managers/AudioPlaybackQueue.ts`
- **Purpose**: Handle sequential audio playback with completion tracking
- **Features**:
  - Queue multiple audio files
  - Sequential playback with callbacks
  - Pause/resume support
  - Error handling and fallback

#### Step 1.2: Create Technique Playback Manager
- **File**: `src/managers/TechniquePlaybackManager.ts`
- **Purpose**: Orchestrate complete technique playback cycle
- **Features**:
  - Integrate with AudioPlaybackQueue
  - Handle technique-specific audio logic
  - Provide completion callbacks to SessionManager
  - Support for future audio types

#### Step 1.3: Define Audio Types and Configuration
- **File**: `src/types/audio.ts` (new)
- **Purpose**: Type definitions for extensible audio system
- **Content**:
```typescript
export enum AudioType {
  TECHNIQUE_ANNOUNCEMENT = 'technique_announcement',
  TECHNIQUE_INSTRUCTION = 'technique_instruction', // Future
  TECHNIQUE_FEEDBACK = 'technique_feedback',       // Future
  TECHNIQUE_CORRECTION = 'technique_correction'    // Future
}

export interface AudioQueueItem {
  file: string
  type: AudioType
  priority: number
  optional: boolean // Can be skipped if fails
}

export interface PlaybackConfig {
  enabledAudioTypes: AudioType[]
  fallbackOnError: boolean
  maxRetries: number
}
```

### Phase 2: SessionManager Integration

#### Step 2.1: Modify SessionManager.announceTechnique()
- **File**: `src/managers/SessionManager.ts`
- **Changes**:
  - Replace direct audio calls with TechniquePlaybackManager
  - Remove immediate delay timer start
  - Add playback completion callback handling

```typescript
// Current (problematic):
private announceTechnique(technique: Technique, config: SessionConfig): void {
  this.currentTechnique = technique
  this.techniquesUsed++
  this.updateSessionStats(technique)

  // BUG: Delay starts immediately
  this.techniqueTimer = window.setTimeout(() => {
    this.currentTechnique = null
    this.scheduleNextTechnique(config)
  }, config.delay * 1000)
}

// New (fixed):
private async announceTechnique(technique: Technique, config: SessionConfig): Promise<void> {
  this.currentTechnique = technique
  this.techniquesUsed++
  this.updateSessionStats(technique)

  try {
    // Play all technique audio through playback manager
    await this.techniquePlaybackManager.playTechniqueWithAudio(technique, this.playbackConfig)
    
    // Start delay timer only after all audio completes
    this.startDelayTimer(config)
  } catch (error) {
    console.error('Technique playback failed:', error)
    // Fallback: start delay immediately
    this.startDelayTimer(config)
  }
}
```

#### Step 2.2: Add Delay Timer Management
- **Purpose**: Separate delay timing from technique announcement
- **Features**:
  - Dedicated delay timer methods
  - Pause/resume support
  - State tracking

```typescript
private startDelayTimer(config: SessionConfig): void {
  this.delayTimer = window.setTimeout(() => {
    this.currentTechnique = null
    this.scheduleNextTechnique(config)
  }, config.delay * 1000)
}

private stopDelayTimer(): void {
  if (this.delayTimer) {
    clearTimeout(this.delayTimer)
    this.delayTimer = null
  }
}
```

### Phase 3: State Management Enhancement

#### Step 3.1: Enhanced Session State
- **File**: `src/types/index.ts`
- **Changes**: Extend SessionStatus to include playback state

```typescript
export interface SessionStatus {
  // ... existing fields
  isPlayingTechniqueAudio: boolean
  currentAudioType: AudioType | null
  audioQueueLength: number
  isDelayActive: boolean
  delayRemainingTime: number
}
```

#### Step 3.2: Pause/Resume Logic Enhancement
- **Purpose**: Handle pause/resume during different playback phases
- **Implementation**:

```typescript
pauseSession(): void {
  if (!this._isActive) return

  this._isPaused = true
  this.stopSessionTimer()
  
  // Pause technique playback if active
  if (this.techniquePlaybackManager.isPlaybackActive()) {
    this.techniquePlaybackManager.pausePlayback()
  }
  
  // Pause delay timer if active
  this.pauseDelayTimer()
}

resumeSession(): void {
  if (!this._isActive || !this._isPaused) return

  this._isPaused = false
  this.startSessionTimer()
  
  // Resume technique playback if it was paused
  if (this.techniquePlaybackManager.isPlaybackActive()) {
    this.techniquePlaybackManager.resumePlayback()
  }
  
  // Resume delay timer if it was paused
  this.resumeDelayTimer()
}
```

### Phase 4: AudioManager Integration

#### Step 4.1: Enhanced AudioManager Methods
- **File**: `src/managers/AudioManager.ts`
- **Purpose**: Add support for playback completion callbacks
- **Changes**:
  - Add `playAudioWithCallback()` method
  - Enhance error handling
  - Support for audio queue integration

```typescript
async playAudioWithCallback(filename: string, onComplete: () => void, onError?: (error: Error) => void): Promise<void> {
  try {
    await this.playAudio(filename)
    
    // Set up completion callback
    if (this.currentSource) {
      this.currentSource.onended = () => {
        onComplete()
      }
    }
  } catch (error) {
    if (onError) {
      onError(error as Error)
    } else {
      throw error
    }
  }
}
```

### Phase 5: Future-Proofing for Additional Audio

#### Step 5.1: Extensible Audio Configuration
- **Purpose**: Allow easy addition of new audio types
- **Implementation**:

```typescript
// Configuration for different audio types per technique
export interface TechniqueAudioConfig {
  announcement: {
    enabled: boolean
    file: string
    required: boolean
  }
  instruction?: {
    enabled: boolean
    file: string
    required: boolean
  }
  feedback?: {
    enabled: boolean
    file: string
    required: boolean
  }
}

// Usage in TechniquePlaybackManager
class TechniquePlaybackManager {
  async playTechniqueWithAudio(technique: Technique, config: PlaybackConfig): Promise<void> {
    const audioConfig = this.buildAudioConfig(technique, config)
    
    // Queue all enabled audio types
    if (audioConfig.announcement.enabled) {
      this.audioQueue.enqueue(audioConfig.announcement.file, AudioType.TECHNIQUE_ANNOUNCEMENT)
    }
    
    if (audioConfig.instruction?.enabled) {
      this.audioQueue.enqueue(audioConfig.instruction.file, AudioType.TECHNIQUE_INSTRUCTION)
    }
    
    if (audioConfig.feedback?.enabled) {
      this.audioQueue.enqueue(audioConfig.feedback.file, AudioType.TECHNIQUE_FEEDBACK)
    }
    
    // Play all queued audio sequentially
    await this.audioQueue.play()
  }
}
```

#### Step 5.2: Plugin Architecture for Audio Types
- **Purpose**: Allow easy extension without modifying core code
- **Implementation**:

```typescript
interface AudioTypeHandler {
  type: AudioType
  canHandle(technique: Technique, config: PlaybackConfig): boolean
  getAudioFile(technique: Technique): string | null
  isRequired(): boolean
}

// Example: Future instruction audio handler
class InstructionAudioHandler implements AudioTypeHandler {
  type = AudioType.TECHNIQUE_INSTRUCTION
  
  canHandle(technique: Technique, config: PlaybackConfig): boolean {
    return config.enabledAudioTypes.includes(this.type) && 
           technique.instructionFile !== undefined
  }
  
  getAudioFile(technique: Technique): string | null {
    return technique.instructionFile || null
  }
  
  isRequired(): boolean {
    return false // Optional by default
  }
}
```

## Implementation Timeline

### Week 1: Core Infrastructure
- [ ] Create AudioPlaybackQueue class
- [ ] Create TechniquePlaybackManager class
- [ ] Define audio types and interfaces
- [ ] Unit tests for new components

### Week 2: SessionManager Integration
- [ ] Modify SessionManager.announceTechnique()
- [ ] Add delay timer management
- [ ] Update pause/resume logic
- [ ] Integration tests

### Week 3: State Management & AudioManager
- [ ] Enhance session state tracking
- [ ] Update AudioManager integration
- [ ] Add error handling and fallbacks
- [ ] End-to-end testing

### Week 4: Future-Proofing & Polish
- [ ] Implement extensible audio configuration
- [ ] Add plugin architecture foundation
- [ ] Performance optimization
- [ ] Documentation and final testing

## Testing Strategy

### Unit Tests
- AudioPlaybackQueue sequential playback
- TechniquePlaybackManager error handling
- SessionManager delay timing accuracy
- Pause/resume state management

### Integration Tests
- Complete technique cycle with audio
- Session pause during different phases
- Audio failure fallback scenarios
- Multiple audio types per technique

### Performance Tests
- Memory usage with large audio queues
- Timing accuracy under load
- Audio loading and caching efficiency

## Backward Compatibility

### Existing Functionality Preservation
- Sessions without audio continue to work
- Current delay timing preserved when no audio
- Existing AudioManager methods unchanged
- No breaking changes to public APIs

### Migration Strategy
- New functionality is opt-in
- Graceful degradation when components unavailable
- Existing sessions automatically benefit from fix
- No user configuration changes required

## Success Metrics

1. **Timing Accuracy**: Delay starts only after all audio completes
2. **Extensibility**: Easy addition of new audio types
3. **Performance**: No degradation in session management
4. **Reliability**: Graceful handling of audio failures
5. **Compatibility**: All existing functionality preserved

## Risk Mitigation

### Technical Risks
- **Audio loading delays**: Implement preloading and caching
- **Memory usage**: Limit queue size and implement cleanup
- **Timing precision**: Use high-resolution timers where available
- **Browser compatibility**: Fallback for older audio APIs

### Implementation Risks
- **Complexity increase**: Maintain clear separation of concerns
- **Testing coverage**: Comprehensive test suite for all scenarios
- **Performance impact**: Profile and optimize critical paths
- **Regression potential**: Extensive backward compatibility testing