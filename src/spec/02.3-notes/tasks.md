# Tasks: Voice Notes for Techniques

## Feature Name
Voice Notes for Techniques

## Phase 1: Setup Tasks (Project Initialization)
- [ ] T001 Ensure the development environment is set up and all dependencies are installed.
- [ ] T002 Review the existing `ConfirmModal` component and identify reusable functionality.

## Phase 2: Foundational Tasks
- [ ] T004 Refactor the `ConfirmModal` component to extract shared functionality into a base `Modal` class.
- [ ] T005 Create a new `NoteApprovalModal` class that extends the base `Modal` class.
- [ ] T006 Update the `ConfirmModal` component to use the new base `Modal` class.

## Phase 3: Voice Note Recording
- [ ] T007 Implement microphone access using the Web Audio API.
- [ ] T008 Add error handling for microphone unavailability, displaying an error message with system error details.
- [ ] T009 Create a popup window for recording notes with the following elements:
  - "Click Start when ready. Click Cancel to cancel recording."
  - Countdown timer (5 to 1) with a "Cancel" button.
  - "Recording started..." message with a "Stop" button.
- [ ] T010 Implement recording start, stop, and cancel functionality.

## Phase 4: Note Approval Process
- [ ] T011 Create a "Note Approval" window with the following elements:
  - Text box for note title (with validation for uniqueness and non-empty input).
  - Play button to preview the recorded note.
  - "Approve" and "Dismiss" buttons.
- [ ] T012 Implement functionality to save or discard the note based on user action.

## Phase 5: Note Association
- [ ] T013 Update the data model to associate notes with techniques and modes.
- [ ] T014 Ensure notes are carried over when techniques are added to new fight lists.
- [ ] T015 Implement local storage for persisting notes and the "Play Notes" checkbox state.
- [ ] T016 Enforce a storage limit of 100MB per user.

## Phase 6: Playback Control
- [ ] T017 Add a "Play Notes" checkbox to the fightlist UI.
- [ ] T018 Implement functionality to play notes sequentially after technique announcements when the checkbox is enabled.
- [ ] T019 Handle scenarios where notes fail to play, displaying appropriate error messages.

## Phase 7: Fight List UI Component
- [ ] T020 Add an expandable list of notes for each technique in the Fight List UI.
- [ ] T021 Filter notes to display only those associated with the specific mode of the Fight List.
- [ ] T022 Add "Play" and "Delete" buttons for each note in the list.
- [ ] T023 Implement functionality for playing and deleting notes.
- [ ] T024 Create a delete confirmation window with the following elements:
  - Message: "Are you sure you want to delete this note? This action cannot be undone."
  - "Confirm" and "Cancel" buttons.
- [ ] T025 Implement functionality to delete the note or cancel the action based on user input.

## Phase 8: Logging and Analytics
- [ ] T026 Log note-related actions (e.g., recording, deleting, playing) for debugging and analytics purposes.
- [ ] T027 Collect metrics on note usage, such as the number of notes recorded, played, and deleted.

## Dependencies
- Phase 1 must be completed before starting Phase 2.
- Phase 2 must be completed before starting Phase 3.
- Phase 3 and Phase 4 can be developed in parallel.
- Phase 5 depends on the completion of Phase 3 and Phase 4.
- Phase 6 depends on the completion of Phase 5.
- Phase 7 depends on the completion of Phase 6.
- Phase 8 can be developed in parallel with other phases.

## Parallel Execution Opportunities
- Phase 3 and Phase 4 can be developed in parallel.
- Phase 8 can be developed in parallel with other phases.

## Independent Test Criteria
- Each phase includes unit tests, integration tests, and performance tests to ensure functionality and performance.
- User Acceptance Testing (UAT) will validate the feature against the success criteria.

## Suggested MVP Scope
- Complete Phases 1 through 4 to deliver the core functionality of recording, approving, and associating voice notes with techniques.

## Format Validation
- All tasks follow the checklist format with Task IDs, labels, and file paths where applicable.