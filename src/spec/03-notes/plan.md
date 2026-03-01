# Implementation Plan: Voice Notes for Techniques

**Spec**: [spec.md](./spec.md) (same directory)  
**Date**: 2026-02-26

## Summary

Add voice note recording and playback for techniques, keyed by technique and fight-list mode. Notes are stored locally in the browser (no sync). Users can record multiple notes per technique per mode, play them in the Fight List UI or during training (optional “Play Notes” checkbox). Recording flows: Add Note → Record (with countdown) → Approval (title, preview, Approve/Dismiss). Playback during session runs after each technique announcement and before the inter-technique delay.

## Technical Context

| Item | Choice |
|------|--------|
| **Language/Version** | TypeScript (existing) |
| **Primary dependencies** | Web Audio API, MediaRecorder, existing managers (FightList, Session, Audio) |
| **Storage** | Voice note audio: IndexedDB (or blob storage key) per browser; metadata + “Play Notes” flag in existing localStorage state / `StorageService` |
| **Testing** | Existing Vitest; unit for note service, integration for UI flows |
| **Target platform** | Browser (existing PWA) |
| **Project type** | Single frontend app (existing) |
| **Constraints** | Max 1 min per note, 15 notes per technique per mode, 100MB total per device |
| **Scale** | Local only; no backend |

## Data Model

- **VoiceNote** (in-memory / persisted):
  - `id`: string (unique per note)
  - `techniqueId`: string (matches technique identity used in fight lists)
  - `mode`: Mode (e.g. PERFORMING | RESPONDING)
  - `title`: string (unique per technique + mode)
  - `audioBlob` or storage key for blob (implementation choice: IndexedDB key or base64 in a separate store to respect 100MB and avoid localStorage limits)
- **Indexing**: Notes are keyed by `(techniqueId, mode)`; list of notes per technique per mode.
- **Lifecycle**: Create on Approve after record; delete on user Delete (with confirm) or when the technique is removed from all fight lists (notes deleted with technique per spec).
- **Play Notes preference**: Boolean stored in the same local state object used for session/fight list (e.g. extend existing config or a small state object) so it persists across sessions.

## Architecture and Integration

- **Existing touchpoints**:
  - **Fight list / techniques**: `FightListUIManager`, `FightListManager`, `StorageService`, `src/types` (FightList, Technique, Mode, FightListTechnique).
  - **Session / announcement**: `SessionManager.announceTechniqueWithAudio`, `app.ts` `startTechniqueAnnouncementLoop`: after technique audio completes, if “Play Notes” is on, play notes for current technique + current fight list mode sequentially, then start delay.
- **New / extended**:
  - **Note storage**: New module (e.g. `VoiceNoteService` or extend `StorageService`) to persist/load note metadata + audio (IndexedDB recommended for blobs; key schema e.g. by techniqueId+mode+noteId).
  - **Recording**: Use `MediaRecorder` + `getUserMedia`; enforce 1 min max; handle microphone errors (message + disable record per spec).
  - **Playback**: Use Web Audio API (or `Audio` element from blob URL) for consistency with existing audio.
- **UI**: All modals/windows align with existing “Add New Fight List” style (header with title + close, main content, footer buttons). Fight list view: per-technique expandable section showing notes for that list’s mode only; Add Note, Play, Delete; delete confirmation modal.

## Project Structure (relevant to this feature)

```text
src/
├── types/index.ts              # Add VoiceNote, extend state for playNotes
├── constants/storage.ts        # Add key(s) for notes + playNotes state
├── services/
│   ├── StorageService.ts        # Optional: extend or keep notes in dedicated service
│   └── VoiceNoteService.ts     # New: CRUD notes, storage abstraction, 100MB limit, 15/mode limit
├── managers/
│   ├── FightListUIManager.ts   # Add Note button, expandable notes list, play/delete, delete confirm
│   ├── FightListManager.ts     # Optional: hooks when technique removed (delete notes for that technique)
│   ├── SessionManager.ts       # Optional: expose method to “play notes for technique in mode” (or in app)
│   └── AudioManager.ts         # Optional: play note from blob/URL (or dedicated helper)
├── components/                  # Or inline in manager
│   └── VoiceNoteRecordModal.ts # New: Record flow (countdown, record, stop), Approval (title, play, Approve/Dismiss)
└── app.ts                      # After announceTechniqueWithAudio: if playNotes, play notes then delay

src/spec/03-notes/
├── spec.md
└── plan.md                     # This file
```

## Implementation Phases

### Phase 1: Data model and storage

- Define `VoiceNote` type and storage key(s); add “Play Notes” boolean to persisted state (e.g. config or dedicated key).
- Implement `VoiceNoteService`: save/load/delete notes; store audio in IndexedDB (or equivalent); enforce 100MB total and 15 notes per (techniqueId, mode); unique title per (techniqueId, mode).
- On technique removal from fight lists: delete all notes for that technique (FightListManager or StorageService when list is saved).

### Phase 2: Recording UI

- Add “Add Note” entry point per technique in Fight List UI (when a fight list and its mode are known).
- Implement recording modal: title input, Start Recording / Cancel; countdown 5→1 then “Recording started…”, Stop; 1 min max with progress; on Stop close and open Approval.
- Approval step: title (pre-filled from input if any), “Play the note”, Approve (validate non-empty title, unique per mode) / Dismiss; on Approve persist via VoiceNoteService.

### Phase 3: Fight List UI – notes list and actions

- Expandable list of notes per technique in the fight list view; show only notes for that fight list’s mode; show “No notes available.” when empty.
- Per note: Play, Delete. Delete opens confirmation (“Are you sure… This action cannot be undone.”); Confirm deletes via service and refreshes list.

### Phase 4: Play Notes in session

- Add “Play Notes” checkbox to fight list/session UI; persist state in same state object as other session prefs.
- In `startTechniqueAnnouncementLoop`: after `announceTechniqueWithAudio` completes, if “Play Notes” is checked and current session has a fight list, get notes for (currentTechnique, currentFightList.mode) and play them sequentially (Web Audio or blob URL); when all done, start the inter-technique delay (existing `setTimeout(announceNextTechnique, sessionConfig.delay * 1000)`).

### Phase 5: Edge cases and logging

- Microphone unavailable: show error (with system message if available), disable recording.
- Log note actions (record, delete, play) for debugging/analytics as per spec.

## Consistency with Spec

- **Recording**: 1 min max, 15 per technique per mode, title unique per technique+mode.
- **Association**: Notes bound to technique+mode; when technique is added to another list, notes already on the technique for that mode appear there (no extra copy).
- **Playback order**: After technique declaration, notes play one by one; delay starts after notes finish.
- **Persistence**: “Play Notes” checkbox and note data stored locally; notes not synced across devices (clarification: Option A).

## Definition of Done (per phase)

- Phase 1: Notes persist across reload; 100MB and 15-note limits enforced; playNotes state persists.
- Phase 2: User can add a note from a technique in a fight list; countdown, record, approval flow work; duplicate title rejected.
- Phase 3: Expandable notes list shows correct mode; play/delete and delete confirmation work.
- Phase 4: Checkbox toggles and persists; during session, notes play after technique and delay starts after notes.
- Phase 5: Mic error handled; logging in place for note actions.
