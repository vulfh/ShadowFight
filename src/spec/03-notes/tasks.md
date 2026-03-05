# Tasks: Voice Notes for Techniques

**Input**: [spec.md](./spec.md), [plan.md](./plan.md) (same directory)  
**Prerequisites**: plan.md, spec.md

**Tests**: Not requested in spec; no test tasks included.

**Organization**: Tasks grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story (US1, US2, US3)
- File paths are in task descriptions

---

## Phase 1: Setup

**Purpose**: Ensure feature has a clear place in the repo; no new project init (existing TypeScript app).

- [X] T001 Ensure design artifacts are in place: spec.md and plan.md in src/spec/03-notes/

---

## Phase 2: Foundational (Data Model & Storage)

**Purpose**: Core types, storage keys, VoiceNoteService, and playNotes persistence. MUST be complete before any user story.

**Checkpoint**: Foundation ready — user story implementation can begin.

- [X] T002 [P] Add `VoiceNote` type and extend state for `playNotes` in src/types/index.ts
- [X] T003 [P] Add storage key(s) for voice notes and playNotes in src/constants/storage.ts
- [X] T004 Implement VoiceNoteService: CRUD, IndexedDB for audio blobs, enforce 100MB total and 15 notes per (techniqueId, mode), unique title per (techniqueId, mode) in src/services/VoiceNoteService.ts
- 
- [X] T006 [P] Persist and load "Play Notes" checkbox in existing config/state (e.g. extend ConfigManager or add key in src/constants/storage.ts and src/managers/ConfigManager.ts)

---

## Phase 3: User Story 1 – Recording Notes (P1) – MVP

**Goal**: User can add a voice note to a technique in a fight list: Add Note → Record (countdown, 1 min max) → Approval (title, preview, Approve/Dismiss).

**Independent Test**: From a fight list, click Add Note on a technique, complete countdown, record, enter title, Approve; note appears in list after refresh; duplicate title is rejected.

- [X] T007 [P] [US1] Add "Add Note" button per technique in the fight list view in src/managers/FightListUIManager.ts
- [X] T008 [P] [US1] Create VoiceNoteRecordModal: header "Record Note", title input "Enter note title here", Start Recording / Cancel; countdown 5→1 then "Recording started...", Stop; 1 min max with progress bar; align with "Add New Fight List" window style in src/components/VoiceNoteRecordModal.ts
- [X] T009 [US1] Add Note Approval step to VoiceNoteRecordModal: "Note name" text box, "Play the note" button, Approve (validate non-empty title, unique per technique+mode) / Dismiss; show "Note title cannot be empty" when empty on Approve in src/components/VoiceNoteRecordModal.ts
- [ ] T010 [US1] Wire Add Note to open VoiceNoteRecordModal with techniqueId and fight list mode; on Approve save via VoiceNoteService and refresh fight list notes in src/managers/FightListUIManager.ts

**Checkpoint**: User Story 1 complete — recording and saving notes works.

---

## Phase 4: User Story 2 – Fight List Notes List & Actions (P2)

**Goal**: Expandable list of notes per technique (for current list mode only); Play and Delete per note; delete confirmation.

**Independent Test**: Expand a technique; see notes for that mode; play a note; delete with confirmation; list updates; "No notes available." when empty.

- [ ] T011 [US2] Add expandable list of notes per technique in fight list view; show only notes for that fight list's mode; show "No notes available." when empty in src/managers/FightListUIManager.ts
- [ ] T012 [US2] Add Play and Delete button per note in the expandable list in src/managers/FightListUIManager.ts
- [ ] T013 [US2] Implement delete confirmation modal: "Are you sure you want to delete this note? This action cannot be undone." with Confirm and Cancel; on Confirm delete via VoiceNoteService and refresh list in src/managers/FightListUIManager.ts

**Checkpoint**: User Stories 1 and 2 work — record notes and manage them in the list.

---

## Phase 5: User Story 3 – Play Notes in Session (P3)

**Goal**: "Play Notes" checkbox in fight list/session UI; during training, after each technique announcement, play that technique's notes for the current list mode sequentially, then start the inter-technique delay.

**Independent Test**: Enable Play Notes, start session; after each technique audio, voice notes play in order; delay countdown starts only after notes finish.

- [ ] T014 [US3] Add "Play Notes" checkbox to fight list/session UI and persist its state in the same state object as other session prefs in src/managers/FightListUIManager.ts (or session UI location)
- [ ] T015 [US3] In startTechniqueAnnouncementLoop after announceTechniqueWithAudio: if playNotes is checked and session has a fight list, load notes for (currentTechnique, fightList.mode) and play sequentially (Web Audio or blob URL); when all done, start delay (setTimeout for next technique) in src/app.ts

**Checkpoint**: All three user stories work — record, list/play/delete, and play during session.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Microphone errors and logging.

- [ ] T016 Handle microphone unavailable in recording: show error message (include system message if available) and disable recording in src/components/VoiceNoteRecordModal.ts
- [ ] T017 [P] Log note actions (record, delete, play) for debugging/analytics in src/services/VoiceNoteService.ts and where playback is triggered (app or AudioManager)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: None.
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2 (and US1 for full flow).
- **Phase 5 (US3)**: Depends on Phase 2 and checkbox/state (T006) and playback capability (VoiceNoteService).
- **Phase 6 (Polish)**: Depends on US1/US2 for recording and list.

### Task Dependencies Within Phases

- **Phase 2**: T002, T003, T006 can run in parallel; T004 needs T002/T003; T005 needs T004.
- **Phase 3**: T007, T008 in parallel; T009 after T008; T010 after T007, T008, T009.
- **Phase 4**: T011 then T012 then T013 (or T012 and T013 in parallel after T011).
- **Phase 5**: T014 then T015.
- **Phase 6**: T016, T017 can run in parallel.

### Parallel Opportunities

- Phase 2: T002, T003, T006 [P]
- Phase 3: T007, T008 [P]
- Phase 6: T017 [P]

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (Recording).
3. Validate: Add a note from a technique, approve with title, see it stored and limit enforced.

### Incremental Delivery

1. Phase 1 + 2 → foundation.
2. Phase 3 → MVP (record and save notes).
3. Phase 4 → manage notes in list (play/delete).
4. Phase 5 → play notes during session.
5. Phase 6 → edge cases and logging.

### Suggested MVP Scope

- Phases 1–3 (Setup + Foundational + US1 Recording). Delivers: add, record, approve, and persist voice notes per technique per mode.
