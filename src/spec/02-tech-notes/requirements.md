# Requirements: Technique Modes, Fightlists, and Voice Notes

## Introduction
This document specifies the requirements for implementing technique modes (PERFORMING, RESPONDING), fightlist constraints, voice note recording/playback, migration, and accessibility for the ShadowFight application. The requirements are based on the provided story and clarifications.

## Functional Requirements

### 1. Technique Modes
- Each technique must support at least one mode: PERFORMING or RESPONDING.
  - **PERFORMING:** The player actively uses the technique to achieve an effect.
  - **RESPONDING:** The player uses the technique to react to or counter an effect.
- Techniques may support both modes, but must support at least one.

### 2. Fightlist Types and Constraints
- Each fightlist is either a PERFORMING fightlist or a RESPONDING fightlist.
- All techniques in a fightlist must be playable in the corresponding mode.
  - Techniques exclusive to PERFORMING cannot be included in a RESPONDING fightlist, and vice versa.

### 3. Voice Notes for Techniques
- For each mode a technique supports, the user can record a voice note.
  - A technique that supports both PERFORMING and RESPONDING modes can have separate voice notes for each mode.
  - Each mode-specific voice note is recorded and stored independently.
- Voice notes are recorded in-app only (no upload at this stage).
- Audio format: WebM (Opus codec) for efficient, high-quality, browser-compatible recording and playback.
- Voice notes must be playable on both desktop and mobile browsers.

### 4. Fightlist Playback Options
- When playing a fightlist, provide a checkbox option:
  - If checked, play the technique's voice note immediately after announcing the technique name.
  - If unchecked, skip automatic playback of the note.
- **Mode-Specific Playback**: The voice note played during fightlist playback must match the fightlist's mode.
  - For a PERFORMING fightlist, play the PERFORMING mode voice note for each technique.
  - For a RESPONDING fightlist, play the RESPONDING mode voice note for each technique.
  - If a voice note for the fightlist's mode is not available, skip playback gracefully (no error).

### 5. Offline Support
- Users must be able to record and play back voice notes while offline.
- Store audio files locally (browser storage) and sync with the server when online (if applicable).

### 6. Accessibility & Mobile-First Design
- The UI must be responsive and mobile-first.
- All features must comply with WCAG 2.1 accessibility standards:
  - Voiceover/screen reader support
  - Captions or transcripts for voice notes (where feasible)
  - Keyboard navigation

### 7. Migration
- All existing fightlists will be defined as RESPONDING fightlists during migration.
- Migration process can be brief at this stage; details to be refined in planning.

## UI Mockups/Descriptions
- Technique editor: Mode selection, voice note recording button, playback button.
- Fightlist editor: Mode selection, technique inclusion validation.
- Fightlist playback: Checkbox for note playback, technique name display, voice note playback button.
- All UI elements must be touch-friendly and accessible.

## Open Questions & Suggestions
- Should transcripts for voice notes be auto-generated or user-provided?
- Should there be a limit on voice note duration or file size?
- Future: Consider allowing users to upload pre-recorded notes.

---
This requirements document is based on the story and your clarifications. Please review and suggest any changes or additions.
