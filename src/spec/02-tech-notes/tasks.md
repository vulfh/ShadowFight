# Technique Modes, Fightlist Constraints, and Voice Notes - Task Breakdown

## Overview
This document breaks down the implementation of technique modes (PERFORMING/RESPONDING), fightlist mode constraints, voice note recording/playback, migration, and accessibility features into specific, actionable tasks organized by phases and priorities.

---

## Phase 1: Foundation - Technique Modes (Week 1)

### 1.1 Type System Extension for Technique Modes
**Priority: High | Estimated Time: 2 days**

#### Task 1.1.1: Add Technique Mode Types
- [X] **Extend Technique interface** (`src/types/index.ts`)
  - [X] Add `TechniqueMode` type: `'PERFORMING' | 'RESPONDING'`
  - [X] Add `modes: TechniqueMode[]` field to `Technique` interface (at least one mode required)
  - [X] Add `TechniqueModeSupport` type for mode validation
  - [X] Add `TechniqueModeValidationResult` type
  - [X] Add JSDoc comments for all new types
- [X] **Update existing Technique type** to include modes
- [X] **Create type guards** for mode validation (`isPerformingMode()`, `isRespondingMode()`, `isTechniqueMode()`)
- [ ] **Create unit tests** for type system

#### Task 1.1.2: Add Fightlist Mode Types
- [X] **Extend FightList interface** (`src/types/index.ts`)
  - [X] Add `mode: 'PERFORMING' | 'RESPONDING'` field to `FightList` interface
  - [X] Add `FightListMode` type
  - [X] Add `FightListModeValidationResult` type
  - [X] Add JSDoc comments
- [ ] **Update FightListTechnique validation** to check mode compatibility
- [X] **Create type guards** for fightlist mode validation (`isFightListMode()`)
- [ ] **Create unit tests** for fightlist mode types

#### Task 1.1.3: Update Constants for Modes
- [X] **Add mode constants** (`src/constants/modes.ts`)
  - [X] Add `TECHNIQUE_MODES` constant with PERFORMING and RESPONDING
  - [X] Add `FIGHTLIST_MODES` constant
  - [X] Add mode validation rules
  - [X] Add error messages for mode mismatches
- [X] **Update existing constants** to reference modes (updated `src/constants/index.ts` and `src/constants/messages.ts`)
- [X] **Add JSDoc documentation** for all constants

### 1.2 Migration System
**Priority: High | Estimated Time: 2 days**

#### Task 1.2.1: Create Migration Framework
- [ ] **Create MigrationService class** (`src/services/MigrationService.ts`)
  - [ ] Implement `migrateFightListsToModes()` method
  - [ ] Implement `migrateTechniquesToModes()` method
  - [ ] Implement `validateMigration()` method
  - [ ] Implement `rollbackMigration()` method
  - [ ] Add version tracking for data structure
- [ ] **Add migration constants** (`src/constants/storage.ts`)
  - [ ] Add `MIGRATION_VERSION_KEY` for tracking migration state
  - [ ] Add `LAST_MIGRATION_TIMESTAMP_KEY`
  - [ ] Add migration version numbers
- [ ] **Create migration data structures**
  - [ ] Define pre-migration fightlist schema
  - [ ] Define post-migration fightlist schema
  - [ ] Create migration mapping logic
- [ ] **Add error handling** for migration failures
- [ ] **Create unit tests** for migration service

#### Task 1.2.2: Implement Fightlist Migration
- [ ] **Migrate existing fightlists to RESPONDING mode**
  - [ ] Set all existing fightlists to `mode: 'RESPONDING'`
  - [ ] Preserve all existing fightlist data (id, name, techniques, timestamps)
  - [ ] Update storage schema version
  - [ ] Add migration timestamp to each migrated fightlist
- [ ] **Add migration validation**
  - [ ] Verify all fightlists have mode assigned
  - [ ] Verify no data loss during migration
  - [ ] Verify backward compatibility where possible
- [ ] **Create migration logging**
  - [ ] Log migration start/end
  - [ ] Log number of fightlists migrated
  - [ ] Log any errors or warnings
- [ ] **Add migration UI feedback**
  - [ ] Show migration progress (if needed)
  - [ ] Show migration completion message
  - [ ] Handle migration errors gracefully
- [ ] **Test migration** with existing data
- [ ] **Create rollback mechanism** (optional, for safety)

#### Task 1.2.3: Implement Technique Migration
- [ ] **Migrate existing techniques to support modes**
  - [ ] Default all existing techniques to support both modes: `modes: ['PERFORMING', 'RESPONDING']`
  - [ ] Preserve all existing technique data
  - [ ] Update technique storage schema
- [ ] **Add technique mode validation**
  - [ ] Ensure all techniques have at least one mode
  - [ ] Validate mode values are valid
- [ ] **Create migration tests**
  - [ ] Test migration with various technique configurations
  - [ ] Test migration with empty technique lists
  - [ ] Test migration error scenarios
- [ ] **Update TechniqueManager** to handle migrated techniques
- [ ] **Test backward compatibility** with existing code

#### Task 1.2.4: Integration and Testing
- [ ] **Integrate migration into app initialization**
  - [ ] Call migration service on app startup
  - [ ] Run migration before loading fightlists
  - [ ] Handle migration errors during startup
- [ ] **Add migration to StorageService**
  - [ ] Check migration version on load
  - [ ] Trigger migration if needed
  - [ ] Save migration state after completion
- [ ] **Create integration tests**
  - [ ] Test full migration flow
  - [ ] Test migration with real data
  - [ ] Test migration idempotency
- [ ] **Document migration process**
  - [ ] Document migration steps
  - [ ] Document rollback procedure
  - [ ] Document troubleshooting

### 1.3 Core Manager Updates for Modes
**Priority: High | Estimated Time: 2 days**

#### Task 1.3.1: Update TechniqueManager
- [ ] **Add mode support to TechniqueManager** (`src/managers/TechniqueManager.ts`)
  - [ ] Add `getTechniquesByMode(mode: TechniqueMode)` method
  - [ ] Add `getTechniqueModes(techniqueId: string)` method
  - [ ] Add `updateTechniqueModes(techniqueId: string, modes: TechniqueMode[])` method
  - [ ] Add `validateTechniqueMode(technique: Technique, mode: TechniqueMode)` method
- [ ] **Update technique loading** to include modes
- [ ] **Add mode validation** when techniques are loaded
- [ ] **Update unit tests** for TechniqueManager
- [ ] **Add JSDoc documentation**

#### Task 1.3.2: Update FightListManager
- [ ] **Add mode support to FightListManager** (`src/managers/FightListManager.ts`)
  - [ ] Add `mode` field to `createFightList()` method
  - [ ] Add `updateFightListMode(id: string, mode: FightListMode)` method
  - [ ] Add `validateFightListMode(fightListId: string)` method
  - [ ] Add `getFightListsByMode(mode: FightListMode)` method
  - [ ] Add `canAddTechniqueToFightList(techniqueId: string, fightListId: string)` method
- [ ] **Update technique addition validation**
  - [ ] Check technique mode compatibility before adding
  - [ ] Show error if technique mode doesn't match fightlist mode
  - [ ] Update error messages for mode mismatches
- [ ] **Update existing methods** to respect mode constraints
- [ ] **Add unit tests** for mode validation
- [ ] **Update JSDoc documentation**

#### Task 1.3.3: Update SessionManager
- [ ] **Add mode support to SessionManager** (`src/managers/SessionManager.ts`)
  - [ ] Update `startSessionWithFightList()` to validate mode
  - [ ] Add mode information to session state
  - [ ] Filter techniques by fightlist mode during session
- [ ] **Update session persistence** to include mode
- [ ] **Add unit tests** for session mode handling
- [ ] **Update JSDoc documentation**

---

## Phase 2: Voice Notes Implementation (Week 2)

### 2.1 Audio Recording Infrastructure
**Priority: High | Estimated Time: 3 days**

#### Task 2.1.1: Create AudioRecordingService
- [ ] **Create AudioRecordingService class** (`src/services/AudioRecordingService.ts`)
  - [ ] Implement `startRecording()` method
  - [ ] Implement `stopRecording()` method
  - [ ] Implement `pauseRecording()` method
  - [ ] Implement `resumeRecording()` method
  - [ ] Implement `getRecordingState()` method
  - [ ] Implement `cancelRecording()` method
- [ ] **Add WebM/Opus recording support**
  - [ ] Configure MediaRecorder with WebM mime type
  - [ ] Handle browser compatibility (fallback to available codecs)
  - [ ] Add error handling for unsupported browsers
- [ ] **Add recording state management**
  - [ ] Track recording status (idle, recording, paused, stopped)
  - [ ] Track recording duration
  - [ ] Track recording file size
- [ ] **Add error handling** for recording failures
- [ ] **Create unit tests** for AudioRecordingService
- [ ] **Add JSDoc documentation**

#### Task 2.1.2: Create AudioPlaybackService
- [ ] **Create AudioPlaybackService class** (`src/services/AudioPlaybackService.ts`)
  - [ ] Implement `playAudio(blob: Blob)` method
  - [ ] Implement `pausePlayback()` method
  - [ ] Implement `resumePlayback()` method
  - [ ] Implement `stopPlayback()` method
  - [ ] Implement `getPlaybackState()` method
  - [ ] Implement `setVolume(volume: number)` method
- [ ] **Add WebM/Opus playback support**
  - [ ] Handle browser compatibility
  - [ ] Add fallback for unsupported formats
- [ ] **Add playback state management**
  - [ ] Track playback status (idle, playing, paused, stopped)
  - [ ] Track playback position
  - [ ] Track playback duration
- [ ] **Add error handling** for playback failures
- [ ] **Create unit tests** for AudioPlaybackService
- [ ] **Add JSDoc documentation**

#### Task 2.1.3: Create VoiceNoteStorageService
- [ ] **Create VoiceNoteStorageService class** (`src/services/VoiceNoteStorageService.ts`)
  - [ ] Implement `saveVoiceNote(techniqueId: string, mode: TechniqueMode, blob: Blob)` method
  - [ ] Implement `getVoiceNote(techniqueId: string, mode: TechniqueMode)` method
  - [ ] Implement `deleteVoiceNote(techniqueId: string, mode: TechniqueMode)` method
  - [ ] Implement `hasVoiceNote(techniqueId: string, mode: TechniqueMode)` method
  - [ ] Implement `getVoiceNoteUrl(techniqueId: string, mode: TechniqueMode)` method
- [ ] **Add IndexedDB storage** for audio files
  - [ ] Create IndexedDB database schema
  - [ ] Implement blob storage in IndexedDB
  - [ ] Add database versioning
  - [ ] Handle storage quota management
- [ ] **Add storage constants** (`src/constants/storage.ts`)
  - [ ] Add `VOICE_NOTES_DB_NAME` constant
  - [ ] Add `VOICE_NOTES_STORE_NAME` constant
  - [ ] Add `VOICE_NOTES_DB_VERSION` constant
- [ ] **Add error handling** for storage failures
- [ ] **Add storage quota management**
  - [ ] Check available storage before saving
  - [ ] Implement cleanup of old/unused notes
  - [ ] Add storage usage tracking
- [ ] **Create unit tests** for VoiceNoteStorageService
- [ ] **Add JSDoc documentation**

### 2.2 Type System for Voice Notes
**Priority: High | Estimated Time: 1 day**

#### Task 2.2.1: Add Voice Note Types
- [ ] **Extend type system** (`src/types/index.ts`)
  - [ ] Add `VoiceNote` interface
    - [ ] `techniqueId: string`
    - [ ] `mode: TechniqueMode`
    - [ ] `blob: Blob` (or reference)
    - [ ] `duration: number`
    - [ ] `fileSize: number`
    - [ ] `createdAt: string`
    - [ ] `lastModified: string`
  - [ ] Add `VoiceNoteMetadata` type
  - [ ] Add `RecordingState` type
  - [ ] Add `PlaybackState` type
  - [ ] Add `VoiceNoteStorageResult` type
- [ ] **Update Technique interface** to include voice note references
  - [ ] Add optional `voiceNotes: Record<TechniqueMode, string>` field (URLs or IDs)
- [ ] **Add JSDoc comments** for all new types
- [ ] **Create type guards** for voice note validation
- [ ] **Create unit tests** for type system

### 2.3 Voice Note Manager
**Priority: High | Estimated Time: 2 days**

#### Task 2.3.1: Create VoiceNoteManager
- [ ] **Create VoiceNoteManager class** (`src/managers/VoiceNoteManager.ts`)
  - [ ] Implement `init()` method (initialize IndexedDB)
  - [ ] Implement `recordVoiceNote(techniqueId: string, mode: TechniqueMode)` method
  - [ ] Implement `saveVoiceNote(techniqueId: string, mode: TechniqueMode, blob: Blob)` method
  - [ ] Implement `getVoiceNote(techniqueId: string, mode: TechniqueMode)` method
  - [ ] Implement `playVoiceNote(techniqueId: string, mode: TechniqueMode)` method
  - [ ] Implement `deleteVoiceNote(techniqueId: string, mode: TechniqueMode)` method
  - [ ] Implement `hasVoiceNote(techniqueId: string, mode: TechniqueMode)` method
  - [ ] Implement `getVoiceNoteMetadata(techniqueId: string, mode: TechniqueMode)` method
- [ ] **Integrate AudioRecordingService** and **AudioPlaybackService**
- [ ] **Integrate VoiceNoteStorageService**
- [ ] **Add error handling** for all operations
- [ ] **Add input validation** for all methods
- [ ] **Create unit tests** for VoiceNoteManager
- [ ] **Add JSDoc documentation**

#### Task 2.3.2: Update TechniqueManager for Voice Notes
- [ ] **Add voice note support to TechniqueManager**
  - [ ] Add `getTechniqueVoiceNotes(techniqueId: string)` method
  - [ ] Add `updateTechniqueVoiceNote(techniqueId: string, mode: TechniqueMode, noteId: string)` method
- [ ] **Update technique loading** to include voice note metadata
- [ ] **Add unit tests** for voice note integration
- [ ] **Update JSDoc documentation**

---

## Phase 3: UI Components for Modes and Voice Notes (Week 3)

### 3.1 Technique Mode UI Components
**Priority: High | Estimated Time: 2 days**

#### Task 3.1.1: Create Technique Mode Editor
- [ ] **Create TechniqueModeEditor component** (`src/components/TechniqueModeEditor.ts`)
  - [ ] Implement mode selection UI (checkboxes or toggle buttons)
  - [ ] Implement mode validation display
  - [ ] Implement save/cancel actions
  - [ ] Add mobile-optimized layout
- [ ] **Add mode selection to technique editor**
  - [ ] Add mode selection controls
  - [ ] Show current mode support
  - [ ] Validate at least one mode is selected
- [ ] **Add accessibility support**
  - [ ] ARIA labels for mode controls
  - [ ] Keyboard navigation
  - [ ] Screen reader announcements
- [ ] **Add responsive design**
  - [ ] Mobile-first layout
  - [ ] Touch-friendly controls
  - [ ] Tablet and desktop optimizations
- [ ] **Create unit tests** for component
- [ ] **Add JSDoc documentation**

#### Task 3.1.2: Create Fightlist Mode Selector
- [ ] **Create FightListModeSelector component** (`src/components/FightListModeSelector.ts`)
  - [ ] Implement mode selection (PERFORMING/RESPONDING radio buttons or dropdown)
  - [ ] Implement mode display in fightlist header
  - [ ] Implement mode change validation
  - [ ] Show warning if techniques need to be removed
- [ ] **Add mode selector to fightlist editor**
  - [ ] Add mode selection when creating fightlist
  - [ ] Add mode editing for existing fightlists
  - [ ] Validate technique compatibility on mode change
- [ ] **Add accessibility support**
  - [ ] ARIA labels for mode selector
  - [ ] Keyboard navigation
  - [ ] Screen reader announcements
- [ ] **Add responsive design**
  - [ ] Mobile-optimized selector
  - [ ] Touch-friendly controls
- [ ] **Create unit tests** for component
- [ ] **Add JSDoc documentation**

#### Task 3.1.3: Update Technique Addition Modal
- [ ] **Update TechniqueAddModal** (`src/components/TechniqueAddModal.ts`)
  - [ ] Filter techniques by fightlist mode
  - [ ] Show mode compatibility indicator
  - [ ] Disable incompatible techniques
  - [ ] Show tooltip explaining mode mismatch
- [ ] **Add mode filtering logic**
  - [ ] Filter available techniques based on fightlist mode
  - [ ] Update search/filter to respect mode constraints
- [ ] **Add visual indicators** for mode compatibility
- [ ] **Update unit tests** for mode filtering
- [ ] **Update JSDoc documentation**

### 3.2 Voice Note UI Components
**Priority: High | Estimated Time: 3 days**

#### Task 3.2.1: Create Voice Note Recorder Component
- [ ] **Create VoiceNoteRecorder component** (`src/components/VoiceNoteRecorder.ts`)
  - [ ] Implement record button with visual feedback
  - [ ] Implement stop button
  - [ ] Implement pause/resume buttons
  - [ ] Implement recording duration display
  - [ ] Implement recording waveform visualization (optional)
  - [ ] Implement save/cancel actions
- [ ] **Add recording state management**
  - [ ] Show recording status
  - [ ] Show recording duration
  - [ ] Show file size estimate
- [ ] **Add error handling UI**
  - [ ] Show error messages for recording failures
  - [ ] Show browser compatibility warnings
  - [ ] Show permission denied messages
- [ ] **Add mobile-optimized UI**
  - [ ] Large touch targets (44px minimum)
  - [ ] Full-screen recording interface on mobile
  - [ ] Touch-friendly controls
- [ ] **Add accessibility support**
  - [ ] ARIA labels for all controls
  - [ ] Keyboard shortcuts
  - [ ] Screen reader announcements
- [ ] **Create unit tests** for component
- [ ] **Add JSDoc documentation**

#### Task 3.2.2: Create Voice Note Player Component
- [ ] **Create VoiceNotePlayer component** (`src/components/VoiceNotePlayer.ts`)
  - [ ] Implement play button
  - [ ] Implement pause button
  - [ ] Implement stop button
  - [ ] Implement progress bar
  - [ ] Implement volume control
  - [ ] Implement playback duration display
- [ ] **Add playback state management**
  - [ ] Show playback status
  - [ ] Show playback position
  - [ ] Show total duration
- [ ] **Add error handling UI**
  - [ ] Show error messages for playback failures
  - [ ] Show loading state
- [ ] **Add mobile-optimized UI**
  - [ ] Large touch targets
  - [ ] Touch-friendly controls
- [ ] **Add accessibility support**
  - [ ] ARIA labels for all controls
  - [ ] Keyboard shortcuts
  - [ ] Screen reader announcements
- [ ] **Create unit tests** for component
- [ ] **Add JSDoc documentation**

#### Task 3.2.3: Integrate Voice Notes into Technique UI
- [ ] **Add voice note controls to technique panel**
  - [ ] Add record button for each mode (PERFORMING and RESPONDING independently)
  - [ ] Add play button for each mode (if note exists for that mode)
  - [ ] Show recording/playback status per mode
  - [ ] Show voice note indicator (icon) when note exists for each mode
  - [ ] Allow recording notes for both modes independently (a technique can have notes for both PERFORMING and RESPONDING modes)
- [ ] **Update technique editor** to include voice notes
  - [ ] Add voice note section with separate controls for each mode
  - [ ] Show mode-specific voice note controls (record/play/delete for PERFORMING, record/play/delete for RESPONDING)
  - [ ] Allow recording/editing/deleting voice notes independently for each mode
  - [ ] Display which modes have voice notes recorded
- [ ] **Add voice note management UI**
  - [ ] Show list of voice notes for technique
  - [ ] Allow deletion of voice notes
  - [ ] Show voice note metadata (duration, size, date)
- [ ] **Add responsive design**
  - [ ] Mobile-optimized layout
  - [ ] Touch-friendly controls
- [ ] **Update unit tests**
- [ ] **Update JSDoc documentation**

### 3.3 Fightlist Playback Integration
**Priority: Medium | Estimated Time: 2 days**

#### Task 3.3.1: Add Voice Note Playback Option
- [ ] **Add checkbox to fightlist playback UI**
  - [ ] "Play voice notes automatically" checkbox
  - [ ] Store preference in session config or user config
  - [ ] Show checkbox in fightlist playback panel
- [ ] **Update SessionManager** to handle voice note playback
  - [ ] Check if voice note playback is enabled (checkbox state)
  - [ ] Get the current fightlist's mode (PERFORMING or RESPONDING)
  - [ ] Retrieve voice note for technique using fightlist's mode (not technique's supported modes)
  - [ ] Play voice note after technique announcement (only if checkbox is checked and note exists for fightlist's mode)
  - [ ] Handle voice note playback errors gracefully
  - [ ] Skip playback silently if voice note doesn't exist for the fightlist's mode
- [ ] **Add voice note playback logic**
  - [ ] Get voice note for technique and fightlist's mode (not technique's mode, but the fightlist's mode)
  - [ ] Determine fightlist mode from current active fightlist
  - [ ] Retrieve voice note using technique ID and fightlist mode: `getVoiceNote(techniqueId, fightlistMode)`
  - [ ] Play voice note after technique name announcement (only if checkbox is checked)
  - [ ] Wait for voice note to finish before next technique (or allow overlap)
  - [ ] Handle missing voice notes gracefully (skip silently if note doesn't exist for fightlist's mode)
- [ ] **Add playback controls**
  - [ ] Allow skipping voice note playback
  - [ ] Allow pausing during voice note playback
- [ ] **Add unit tests** for voice note playback integration
- [ ] **Update JSDoc documentation**

#### Task 3.3.2: Update Session UI for Voice Notes
- [ ] **Update session panel** to show voice note playback status
  - [ ] Show when voice note is playing
  - [ ] Show voice note playback progress (optional)
  - [ ] Show voice note controls during session
- [ ] **Add voice note playback feedback**
  - [ ] Visual indicator when voice note is playing
  - [ ] Audio feedback (if needed)
- [ ] **Add mobile-optimized UI**
  - [ ] Touch-friendly controls
  - [ ] Large indicators
- [ ] **Add accessibility support**
  - [ ] Screen reader announcements
  - [ ] Keyboard controls
- [ ] **Update unit tests**
- [ ] **Update JSDoc documentation**

---

## Phase 4: Storage and Data Management (Week 4)

### 4.1 Storage Schema Updates
**Priority: High | Estimated Time: 2 days**

#### Task 4.1.1: Update FightList Storage Schema
- [ ] **Update StorageService** (`src/services/StorageService.ts`)
  - [ ] Add `mode` field to fightlist storage
  - [ ] Update `saveFightList()` to include mode
  - [ ] Update `getFightList()` to include mode
  - [ ] Update validation to check mode field
- [ ] **Update storage constants** (`src/constants/storage.ts`)
  - [ ] Add version number for schema update
  - [ ] Add migration flag constants
- [ ] **Update storage validation**
  - [ ] Validate mode field exists and is valid
  - [ ] Validate mode compatibility with techniques
- [ ] **Add backward compatibility** handling
- [ ] **Create unit tests** for storage updates
- [ ] **Update JSDoc documentation**

#### Task 4.1.2: Update Technique Storage Schema
- [ ] **Update technique storage** to include modes
  - [ ] Add `modes` field to technique data
  - [ ] Update technique loading to include modes
  - [ ] Update technique saving to include modes
- [ ] **Update storage validation**
  - [ ] Validate modes field exists and is valid
  - [ ] Validate at least one mode is present
- [ ] **Add backward compatibility** handling
- [ ] **Create unit tests** for technique storage updates
- [ ] **Update JSDoc documentation**

#### Task 4.1.3: Implement Voice Note Storage
- [ ] **Integrate IndexedDB** for voice note storage
  - [ ] Create database on first use
  - [ ] Handle database versioning
  - [ ] Implement blob storage
- [ ] **Add storage quota management**
  - [ ] Check available storage before saving
  - [ ] Implement cleanup of old notes
  - [ ] Add storage usage tracking
  - [ ] Show storage warnings to users
- [ ] **Add storage error handling**
  - [ ] Handle quota exceeded errors
  - [ ] Handle corruption scenarios
  - [ ] Implement recovery mechanisms
- [ ] **Create unit tests** for voice note storage
- [ ] **Update JSDoc documentation**

### 4.2 Offline Support
**Priority: Medium | Estimated Time: 2 days**

#### Task 4.2.1: Implement Offline Recording
- [ ] **Ensure recording works offline**
  - [ ] Test recording without network connection
  - [ ] Handle offline recording errors gracefully
  - [ ] Show offline status indicator
- [ ] **Implement offline storage**
  - [ ] Save recordings to IndexedDB immediately
  - [ ] Queue recordings if storage is full
  - [ ] Sync when online (if applicable)
- [ ] **Add offline detection**
  - [ ] Detect online/offline status
  - [ ] Show offline indicator in UI
  - [ ] Handle network state changes
- [ ] **Create unit tests** for offline functionality
- [ ] **Update JSDoc documentation**

#### Task 4.2.2: Implement Offline Playback
- [ ] **Ensure playback works offline**
  - [ ] Load voice notes from IndexedDB
  - [ ] Handle missing notes gracefully
  - [ ] Show offline status if needed
- [ ] **Add offline error handling**
  - [ ] Show appropriate error messages
  - [ ] Provide fallback options
- [ ] **Create unit tests** for offline playback
- [ ] **Update JSDoc documentation**

---

## Phase 5: Accessibility and Mobile Optimization (Week 5)

### 5.1 Accessibility Implementation
**Priority: High | Estimated Time: 2 days**

#### Task 5.1.1: Screen Reader Support
- [ ] **Add ARIA labels** to all new components
  - [ ] Technique mode editor
  - [ ] Fightlist mode selector
  - [ ] Voice note recorder
  - [ ] Voice note player
  - [ ] Mode compatibility indicators
- [ ] **Add ARIA live regions** for dynamic content
  - [ ] Recording status announcements
  - [ ] Playback status announcements
  - [ ] Mode change announcements
- [ ] **Add semantic HTML** where appropriate
  - [ ] Use proper heading hierarchy
  - [ ] Use proper form elements
  - [ ] Use proper button elements
- [ ] **Test with screen readers**
  - [ ] Test with NVDA (Windows)
  - [ ] Test with JAWS (Windows)
  - [ ] Test with VoiceOver (macOS/iOS)
  - [ ] Test with TalkBack (Android)
- [ ] **Create accessibility documentation**

#### Task 5.1.2: Keyboard Navigation
- [ ] **Add keyboard shortcuts** for common actions
  - [ ] Record voice note (R key)
  - [ ] Play voice note (P key)
  - [ ] Stop recording/playback (Space/Escape)
  - [ ] Navigate modes (Arrow keys)
- [ ] **Ensure tab order** is logical
  - [ ] Test tab navigation through all new components
  - [ ] Ensure focus indicators are visible
  - [ ] Ensure focus trap in modals
- [ ] **Add keyboard event handlers**
  - [ ] Handle Enter/Space for button activation
  - [ ] Handle Escape for closing modals
  - [ ] Handle Arrow keys for navigation
- [ ] **Test keyboard navigation** thoroughly
- [ ] **Create keyboard navigation documentation**

#### Task 5.1.3: Visual Accessibility
- [ ] **Ensure high contrast** support
  - [ ] Test with high contrast mode
  - [ ] Ensure all text is readable
  - [ ] Ensure all controls are visible
- [ ] **Ensure scalable text** (up to 200%)
  - [ ] Test with browser zoom
  - [ ] Test with system font scaling
  - [ ] Ensure layout doesn't break
- [ ] **Ensure color is not the only indicator**
  - [ ] Add icons or text labels
  - [ ] Add patterns or shapes
  - [ ] Ensure sufficient contrast ratios
- [ ] **Add focus indicators**
  - [ ] Ensure all interactive elements have visible focus
  - [ ] Ensure focus indicators meet WCAG standards
- [ ] **Test visual accessibility** with various settings
- [ ] **Create visual accessibility documentation**

### 5.2 Mobile-First Optimization
**Priority: High | Estimated Time: 2 days**

#### Task 5.2.1: Mobile UI Optimization
- [ ] **Optimize technique mode editor for mobile**
  - [ ] Single column layout
  - [ ] Large touch targets (44px minimum)
  - [ ] Full-screen modal on mobile
  - [ ] Swipe gestures where appropriate
- [ ] **Optimize voice note recorder for mobile**
  - [ ] Full-screen recording interface
  - [ ] Large record/stop buttons
  - [ ] Touch-friendly controls
  - [ ] Optimize for portrait orientation
- [ ] **Optimize voice note player for mobile**
  - [ ] Large play/pause buttons
  - [ ] Touch-friendly progress bar
  - [ ] Mobile-optimized layout
- [ ] **Test on various mobile devices**
  - [ ] Test on iOS devices
  - [ ] Test on Android devices
  - [ ] Test on various screen sizes
- [ ] **Create mobile optimization documentation**

#### Task 5.2.2: Touch Interaction Optimization
- [ ] **Add touch event handlers**
  - [ ] Optimize touch targets
  - [ ] Add touch feedback
  - [ ] Prevent accidental touches
- [ ] **Add swipe gestures** where appropriate
  - [ ] Swipe to dismiss modals
  - [ ] Swipe to navigate (if applicable)
- [ ] **Optimize for touch accuracy**
  - [ ] Ensure buttons are large enough
  - [ ] Ensure adequate spacing between controls
  - [ ] Test with various finger sizes
- [ ] **Test touch interactions** on real devices
- [ ] **Create touch interaction documentation**

#### Task 5.2.3: Mobile Performance Optimization
- [ ] **Optimize audio recording for mobile**
  - [ ] Reduce memory usage
  - [ ] Optimize file sizes
  - [ ] Handle low-memory scenarios
- [ ] **Optimize audio playback for mobile**
  - [ ] Efficient audio loading
  - [ ] Smooth playback
  - [ ] Handle battery optimization
- [ ] **Optimize storage operations**
  - [ ] Batch operations where possible
  - [ ] Reduce storage overhead
  - [ ] Handle storage quota efficiently
- [ ] **Test performance** on various mobile devices
- [ ] **Create performance optimization documentation**

---

## Phase 6: Integration and Testing (Week 6)

### 6.1 Integration Testing
**Priority: High | Estimated Time: 2 days**

#### Task 6.1.1: Mode Integration Testing
- [ ] **Test technique mode assignment**
  - [ ] Test assigning PERFORMING mode
  - [ ] Test assigning RESPONDING mode
  - [ ] Test assigning both modes
  - [ ] Test validation (at least one mode required)
- [ ] **Test fightlist mode assignment**
  - [ ] Test creating PERFORMING fightlist
  - [ ] Test creating RESPONDING fightlist
  - [ ] Test changing fightlist mode
- [ ] **Test mode compatibility validation**
  - [ ] Test adding compatible technique to fightlist
  - [ ] Test preventing incompatible technique addition
  - [ ] Test mode change with existing techniques
- [ ] **Test migration integration**
  - [ ] Test migration on app startup
  - [ ] Test migration with existing data
  - [ ] Test migration error handling
- [ ] **Create integration test suite**

#### Task 6.1.2: Voice Note Integration Testing
- [ ] **Test voice note recording**
  - [ ] Test recording for PERFORMING mode
  - [ ] Test recording for RESPONDING mode
  - [ ] Test recording for both modes
  - [ ] Test recording errors
- [ ] **Test voice note playback**
  - [ ] Test playback during session
  - [ ] Test automatic playback option
  - [ ] Test manual playback
  - [ ] Test playback errors
- [ ] **Test voice note storage**
  - [ ] Test saving voice notes
  - [ ] Test loading voice notes
  - [ ] Test deleting voice notes
  - [ ] Test storage quota handling
- [ ] **Test offline functionality**
  - [ ] Test offline recording
  - [ ] Test offline playback
  - [ ] Test offline storage
- [ ] **Create integration test suite**

### 6.2 End-to-End Testing
**Priority: High | Estimated Time: 2 days**

#### Task 6.2.1: User Flow Testing
- [ ] **Test complete user flows**
  - [ ] Create fightlist with mode
  - [ ] Add techniques compatible with mode
  - [ ] Record voice notes for techniques
  - [ ] Start session with voice note playback
  - [ ] Complete full training session
- [ ] **Test error scenarios**
  - [ ] Test mode mismatch errors
  - [ ] Test recording failures
  - [ ] Test playback failures
  - [ ] Test storage quota errors
- [ ] **Test edge cases**
  - [ ] Test with no voice notes
  - [ ] Test with missing voice notes
  - [ ] Test with corrupted data
  - [ ] Test with maximum data limits
- [ ] **Create E2E test suite**

#### Task 6.2.2: Cross-Browser Testing
- [ ] **Test on Chrome**
  - [ ] Test all features
  - [ ] Test audio recording/playback
  - [ ] Test IndexedDB storage
- [ ] **Test on Firefox**
  - [ ] Test all features
  - [ ] Test audio recording/playback
  - [ ] Test IndexedDB storage
- [ ] **Test on Safari**
  - [ ] Test all features
  - [ ] Test audio recording/playback
  - [ ] Test IndexedDB storage
- [ ] **Test on Edge**
  - [ ] Test all features
  - [ ] Test audio recording/playback
  - [ ] Test IndexedDB storage
- [ ] **Document browser compatibility**

#### Task 6.2.3: Device Testing
- [ ] **Test on mobile devices**
  - [ ] Test on iOS devices (various models)
  - [ ] Test on Android devices (various models)
  - [ ] Test touch interactions
  - [ ] Test audio recording/playback
- [ ] **Test on tablets**
  - [ ] Test on iPad
  - [ ] Test on Android tablets
  - [ ] Test responsive layouts
- [ ] **Test on desktop**
  - [ ] Test on Windows
  - [ ] Test on macOS
  - [ ] Test on Linux
- [ ] **Document device compatibility**

### 6.3 Performance Testing
**Priority: Medium | Estimated Time: 1 day**

#### Task 6.3.1: Performance Benchmarks
- [ ] **Test recording performance**
  - [ ] Measure recording start time
  - [ ] Measure recording memory usage
  - [ ] Measure file size
- [ ] **Test playback performance**
  - [ ] Measure playback start time
  - [ ] Measure playback memory usage
  - [ ] Measure audio quality
- [ ] **Test storage performance**
  - [ ] Measure save time
  - [ ] Measure load time
  - [ ] Measure storage usage
- [ ] **Test with large datasets**
  - [ ] Test with many techniques
  - [ ] Test with many voice notes
  - [ ] Test with large fightlists
- [ ] **Create performance benchmarks**

#### Task 6.3.2: Memory and Storage Optimization
- [ ] **Optimize memory usage**
  - [ ] Profile memory usage
  - [ ] Identify memory leaks
  - [ ] Optimize audio handling
- [ ] **Optimize storage usage**
  - [ ] Profile storage usage
  - [ ] Optimize blob storage
  - [ ] Implement compression if needed
- [ ] **Test storage limits**
  - [ ] Test with maximum fightlists
  - [ ] Test with maximum voice notes
  - [ ] Test quota handling
- [ ] **Create optimization documentation**

---

## Testing Checklist

### Unit Tests
- [ ] Technique mode type system
- [ ] Fightlist mode type system
- [ ] Migration service
- [ ] AudioRecordingService
- [ ] AudioPlaybackService
- [ ] VoiceNoteStorageService
- [ ] VoiceNoteManager
- [ ] TechniqueManager mode support
- [ ] FightListManager mode support
- [ ] SessionManager mode support
- [ ] UI components

### Integration Tests
- [ ] Mode assignment and validation
- [ ] Mode compatibility checking
- [ ] Voice note recording and storage
- [ ] Voice note playback
- [ ] Migration flow
- [ ] Offline functionality
- [ ] Storage operations

### E2E Tests
- [ ] Complete user flows
- [ ] Error scenarios
- [ ] Edge cases
- [ ] Cross-browser compatibility
- [ ] Device compatibility

### Performance Tests
- [ ] Recording performance
- [ ] Playback performance
- [ ] Storage performance
- [ ] Memory usage
- [ ] Large dataset handling

### Accessibility Tests
- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] High contrast mode
- [ ] Scalable text
- [ ] Focus indicators
- [ ] Color contrast compliance

### Device Tests
- [ ] Mobile devices (iOS/Android)
- [ ] Tablets (iPad/Android)
- [ ] Desktop (Windows/macOS/Linux)
- [ ] Various screen sizes
- [ ] Touch and mouse interactions

---

## Success Criteria

### Technical Requirements
- [ ] All techniques support at least one mode
- [ ] All fightlists have a mode assigned
- [ ] Mode compatibility validation works correctly
- [ ] Voice notes record in WebM/Opus format
- [ ] Voice notes play on all supported browsers
- [ ] Voice notes stored in IndexedDB
- [ ] Migration completes successfully
- [ ] Offline functionality works
- [ ] Storage quota handled gracefully

### User Experience Requirements
- [ ] Mode selection is intuitive
- [ ] Voice note recording is easy to use
- [ ] Voice note playback works smoothly
- [ ] Mobile experience is optimized
- [ ] Accessibility standards met (WCAG 2.1)
- [ ] Performance is acceptable (< 200ms for operations)

### Quality Requirements
- [ ] Zero critical bugs
- [ ] Comprehensive test coverage (> 80%)
- [ ] Documentation completeness
- [ ] Code review approval
- [ ] Performance benchmarks met
- [ ] Accessibility standards met

---

This task breakdown provides a comprehensive roadmap for implementing technique modes, fightlist constraints, voice notes, migration, and accessibility features with clear priorities, time estimates, and success criteria for each phase.

