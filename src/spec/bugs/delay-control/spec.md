# Delay Control Bug Fix Specification

## Problem Statement

There is a timing issue in the technique announcement system where the delay between techniques starts counting immediately when a technique is announced, rather than waiting for the technique audio to finish playing. This causes problems when:

1. The technique announcement audio is long
2. The configured delay is short
3. The delay duration is equal to or shorter than the audio duration

In these cases, the next technique announcement begins immediately after the previous audio finishes, effectively ignoring the intended delay period.

## Current Behavior

```
Technique 1 Audio Starts → Delay Timer Starts (simultaneously)
Technique 1 Audio Playing... (e.g., 4 seconds)
Delay Timer Expires (e.g., 3 seconds) → Next technique queued
Technique 1 Audio Ends → Technique 2 Audio Starts IMMEDIATELY
```

## Expected Behavior

```
Technique 1 Audio Starts
Technique 1 Audio Playing... (e.g., 4 seconds)
Technique 1 Audio Ends → Delay Timer Starts
Delay Timer Running... (e.g., 3 seconds)
Delay Timer Expires → Technique 2 Audio Starts
```

## Requirements

### Requirement 1: Audio-Aware Delay Timing

**User Story:** As a user, I want the delay between techniques to start counting only after the current technique audio finishes playing, so that I have the intended rest period between techniques.

#### Acceptance Criteria

1. WHEN a technique audio starts playing THEN the delay timer SHALL NOT start until the audio completes
2. WHEN a technique audio finishes playing THEN the delay timer SHALL start immediately
3. WHEN the delay timer expires THEN the next technique SHALL be announced
4. WHEN a technique has no audio file or audio fails to play THEN the delay timer SHALL start immediately after the technique announcement

### Requirement 2: Session State Management

**User Story:** As a user, I want the session to handle pause/resume correctly with the new delay timing, so that my training session remains consistent.

#### Acceptance Criteria

1. WHEN a session is paused during technique audio playback THEN both audio and delay timer SHALL be paused
2. WHEN a session is paused during delay countdown THEN the delay timer SHALL be paused
3. WHEN a session is resumed THEN the audio or delay timer SHALL continue from where it was paused
4. WHEN a session is stopped THEN all audio playback and delay timers SHALL be cleared

### Requirement 3: Audio Integration

**User Story:** As a developer, I want the SessionManager to integrate properly with the AudioManager, so that technique timing is synchronized with audio playback.

#### Acceptance Criteria

1. WHEN a technique is announced THEN the SessionManager SHALL use AudioManager to play the technique audio
2. WHEN technique audio completes THEN the AudioManager SHALL notify the SessionManager
3. WHEN technique audio fails to play THEN the SessionManager SHALL handle the error gracefully and continue with delay timing
4. WHEN no AudioManager is available THEN the SessionManager SHALL fall back to immediate delay timing

### Requirement 4: Backward Compatibility

**User Story:** As a user, I want the existing session functionality to continue working, so that my current training experience is not disrupted.

#### Acceptance Criteria

1. WHEN no audio files are configured THEN the delay timing SHALL work as before
2. WHEN audio is disabled THEN the delay timing SHALL work as before
3. WHEN using fight lists without audio THEN the delay timing SHALL work as before
4. WHEN the AudioManager is not initialized THEN the session SHALL continue with text-only announcements and normal delay timing

## Technical Design

### Architecture Changes

1. **SessionManager Enhancement**: Modify the technique announcement flow to wait for audio completion before starting delay timer
2. **Audio Callback Integration**: Use AudioManager's completion callbacks to trigger delay timer start
3. **State Management**: Track audio playback state alongside delay timer state
4. **Error Handling**: Graceful fallback when audio fails or is unavailable

### Key Components

1. **SessionManager.announceTechnique()**: Modified to handle audio-aware delay timing
2. **AudioManager Integration**: Enhanced callback system for technique audio completion
3. **Timer Management**: Separate audio completion tracking from delay timing
4. **Session State**: Extended to include audio playback state

### Data Flow

```
1. Technique Selected
2. Technique Audio Starts → Audio State: PLAYING
3. Audio Completion Callback → Audio State: COMPLETED
4. Delay Timer Starts → Delay State: COUNTING
5. Delay Timer Expires → Delay State: COMPLETED
6. Next Technique Selected (repeat)
```

### Error Handling

- Audio load failure → Immediate delay timer start
- Audio playback failure → Immediate delay timer start
- AudioManager unavailable → Immediate delay timer start
- Session pause during audio → Pause both audio and delay
- Session stop → Clear all timers and audio

## Implementation Notes

### Affected Files

- `src/managers/SessionManager.ts` - Core delay timing logic
- `src/managers/AudioManager.ts` - Audio completion callbacks (if needed)
- `src/types/index.ts` - Session state types (if needed)

### Testing Considerations

- Unit tests for audio completion timing
- Integration tests for pause/resume during audio playback
- Edge case tests for audio failures
- Performance tests for rapid technique switching

### Migration Strategy

- Changes are backward compatible
- No data migration required
- Existing sessions continue to work
- New behavior activates automatically when audio is available

## Success Criteria

1. Delay timer starts only after technique audio completes
2. Pause/resume works correctly during both audio and delay phases
3. Error handling maintains session continuity
4. Backward compatibility preserved for non-audio scenarios
5. No performance degradation in session management