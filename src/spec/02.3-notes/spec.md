# Specification: Voice Notes for Techniques

## Overview
This feature introduces the ability to record and play voice notes associated with specific techniques in specific modes. These notes enhance the training experience by providing additional context or instructions for each technique.

## Functional Requirements

1. **Voice Note Recording**
   - Users can record voice notes for specific techniques in specific modes.
   - Multiple notes can be recorded for a single technique in each mode.

2. **Note Association**
   - Notes are bound to the technique itself, not the fight list.
   - When a technique is added to another fight list, its associated notes are carried over.
   - The mode of the note aligns with the fight list to which the technique currently belongs.

3. **Playback Control**
   - A "Play Notes" checkbox is added to the playlist UI.
   - If the checkbox is selected, notes are played immediately after the technique declaration, one by one.

4. **State Persistence**
   - The state of the "Play Notes" checkbox is stored in the local storage state object.

## User Scenarios

1. **Recording Notes**
   - A user selects a technique and a mode, then records multiple voice notes.
   - The notes are saved and associated with the selected technique and mode.

2. **Playing Notes**
   - A user enables the "Play Notes" checkbox.
   - During training, after a technique is announced, its associated notes are played sequentially.

3. **Technique Reuse**
   - A user adds a technique with notes to a new fight list.
   - The notes are carried over and played in the context of the new fight list's mode.

## Success Criteria

- Users can record, save, and associate multiple voice notes with techniques in specific modes.
- Notes are consistently carried over when techniques are reused in different fight lists.
- The "Play Notes" checkbox functions correctly, and its state persists across sessions.
- Notes play sequentially after technique announcements when the checkbox is enabled.

## Assumptions

- The application has access to the device's microphone for recording.
- Local storage is used to persist the "Play Notes" checkbox state.
- The Web Audio API is used for note playback.

## Constraints

- Notes must not exceed a predefined duration (e.g., 2 minutes per note).
- The total number of notes per technique may be limited to ensure performance.

## Open Questions

1. What is the maximum duration for a single voice note?
2. Should there be a limit on the total number of notes per technique?
3. How should the UI indicate the association between notes and techniques/modes?

## UI Requirements

1. **Add Note Button**
   - Each technique in the UI will have an "Add Note" button.
   - When the user clicks the "Add Note" button, a popup window appears with the message: "Click Start when ready. Click Cancel to cancel recording."

2. **Popup Window Behavior**
   - If the user clicks "Cancel" in the popup window, the recording process is canceled, and the popup closes.
   - If the user clicks "Start":
     - A countdown window appears, counting down from 5 to 1.
     - The window includes a "Cancel" button. If the user clicks "Cancel" during the countdown, the recording process is canceled, and the window closes.
     - Once the countdown reaches 0, the message "Recording started..." appears in the same window.
     - The "Cancel" button is replaced by a "Stop" button, allowing the user to stop the recording.

### Note Approval Process

Once the user clicks "Stop" during the recording process, the recording should be stopped. The current window should close, and a new window called "Note Approval" should open.

#### Note Approval Window
1. The "Note Approval" window will include the following elements:
   - An empty text box with the placeholder: "Note name" - this is note's title.
   - A play button below the text box, accompanied by the title "Play the note".
   - At the bottom of the window, two buttons will be displayed: "Approve" and "Dismiss".

2. **Approve Button**
   - If the user clicks "Approve":
     - The note will be saved and bound to the technique in the current Fight List mode.
     - If the text box for the note title is empty, an error message will be displayed: "Note title cannot be empty".

3. **Dismiss Button**
   - If the user clicks "Dismiss" or the "X" button to close the window:
     - The window will close, and the note will be dismissed.

### Additional Requirements
- Each note must have a title that is unique to the mode of the associated technique.