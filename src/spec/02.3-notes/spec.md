# Specification: Voice Notes for Techniques

## Overview
This feature introduces the ability to record and play voice notes associated with specific techniques in specific modes.
These notes enhance the training experience by providing additional context or instructions for each technique.

## Functional Requirements

1. **Voice Note Recording**
   - Users can record voice notes for specific techniques in specific modes.
   - Multiple notes can be recorded for a single technique in each mode.

2. **Note Association**
   - Notes are bound to the technique itself, not the fight list.
   - When a technique is added to another fight list, its associated notes are carried over.
   - The mode of the note aligns with the fight list to which the technique currently belongs.

3. **Playback Control**
   - A "Play Notes" checkbox is added to the fightlist UI.
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
   - The delay between techniques starts once note playing has been finished.

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

## Answers to Open Questions

1. **What is the maximum duration for a single voice note?**
   - The maximum duration for a single voice note is **1 minute**.

2. **Should there be a limit on the total number of notes per technique?**
   - Yes, the maximum number of notes per mode in a technique is **15**.

3. **How should the UI indicate the association between notes and techniques/modes?**
   - The UI will indicate the association by displaying the mode of the Fight List and the mode of the note in the technique.

## Clarifications

1. **What happens to the notes associated with a technique if the technique is deleted?**
   - The notes are also deleted.

2. **What happens if there are no notes for a technique in the Fight List UI?**
   - Display a message: "No notes available."

3. **How should the system handle microphone unavailability during recording?**
   - Display an error message and disable recording. Include the original system error message if available.

4. **Should there be a limit on the total storage size for all notes?**
   - Yes, limit to 100MB per user.

5. **Should the system log note-related actions (e.g., recording, deleting, playing)?**
   - Yes, for debugging and analytics.

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

## Updated Requirements

### Fight List UI Component

1. **Expandable List of Notes**
   - The Fight List UI component will include an expandable list of notes for each technique.
   - The list will display only the notes associated with the specific mode of the Fight List.
     - For example, if Fight List A is in "Performance Mode":
       - Technique T has 2 notes for "Performance Mode" and 3 notes for "Responding Mode".
       - The list of notes for Technique T in Fight List A will display only the 2 notes associated with "Performance Mode".

2. **Note Options**
   - Each note in the list will have the following options:
     - **Play Button**: Allows the user to play the selected note.
     - **Delete Button**: Allows the user to delete the selected note.

3. **Delete Confirmation Window**
   - When the user clicks the "Delete" button for a note:
     - A delete confirmation window will appear.
     - The window will display the message: "Are you sure you want to delete this note? This action cannot be undone."
     - The window will include two buttons:
       - **Confirm**: Deletes the note and removes it from the list.
       - **Cancel**: Closes the confirmation window without deleting the note.

### Updated Note Recording Window Design

The design of the note recording window will now align with the design of the "Add New Fight List" window. This includes:

1. **Header Section**:
   - A title bar with the text "Record Note".
   - A close button ("X") in the top-right corner.

2. **Main Section**:
   - A centered text box with the placeholder: "Enter note title here".
   - A large record button below the text box, labeled "Start Recording".
   - A cancel button next to the record button, labeled "Cancel".

3. **Recording State**:
   - When recording starts, the "Start Recording" button changes to "Stop Recording".
   - A progress bar appears below the buttons to indicate the recording duration.

4. **Footer Section**:
   - Once recording is stopped, the footer displays two buttons:
     - "Approve" to save the note.
     - "Dismiss" to discard the note.

This updated design ensures consistency across the application and improves the user experience.