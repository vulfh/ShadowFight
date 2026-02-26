# Implementation Plan: Voice Notes for Techniques

## Overview
This document outlines the implementation plan for the "Voice Notes for Techniques" feature as described in the specification document. The feature enables users to record, play, and manage voice notes associated with specific techniques in specific modes.

## Phases of Implementation

### Phase 1: Voice Note Recording
1. **Setup Microphone Access**
   - Integrate Web Audio API for microphone access.
   - Implement error handling for microphone unavailability, displaying an error message with the system error details.

2. **Recording Functionality**
   - Create a popup window with the following elements:
     - "Click Start when ready. Click Cancel to cancel recording."
     - Countdown timer (5 to 1) with a "Cancel" button.
     - "Recording started..." message with a "Stop" button.
   - Implement recording start, stop, and cancel functionality.

3. **Note Approval Process**
   - Create a "Note Approval" window with the following elements:
     - Text box for note title (with validation for uniqueness and non-empty input).
     - Play button to preview the recorded note.
     - "Approve" and "Dismiss" buttons.
   - Implement functionality to save or discard the note based on user action.

### Phase 2: Note Association
1. **Data Model Updates**
   - Update the data model to associate notes with techniques and modes.
   - Ensure notes are carried over when techniques are added to new fight lists.

2. **Storage Management**
   - Implement local storage for persisting notes and the "Play Notes" checkbox state.
   - Enforce a storage limit of 100MB per user.

### Phase 3: Playback Control
1. **UI Updates**
   - Add a "Play Notes" checkbox to the fightlist UI.
   - Implement functionality to play notes sequentially after technique announcements when the checkbox is enabled.

2. **Error Handling**
   - Handle scenarios where notes fail to play, displaying appropriate error messages.

### Phase 4: Fight List UI Component
1. **Expandable List of Notes**
   - Add an expandable list of notes for each technique in the Fight List UI.
   - Filter notes to display only those associated with the specific mode of the Fight List.

2. **Note Options**
   - Add "Play" and "Delete" buttons for each note in the list.
   - Implement functionality for playing and deleting notes.

3. **Delete Confirmation Window**
   - Create a delete confirmation window with the following elements:
     - Message: "Are you sure you want to delete this note? This action cannot be undone."
     - "Confirm" and "Cancel" buttons.
   - Implement functionality to delete the note or cancel the action based on user input.

### Phase 5: Logging and Analytics
1. **Action Logging**
   - Log note-related actions (e.g., recording, deleting, playing) for debugging and analytics purposes.

2. **Metrics Collection**
   - Collect metrics on note usage, such as the number of notes recorded, played, and deleted.

## Reuse of Existing Components

The application already includes a `ConfirmModal` component, which can be reused or extended to implement the new popup windows required for the "Voice Notes for Techniques" feature. The `ConfirmModal` component provides the following features that align with the new requirements:

1. **Customizable Options**:
   - Configurable title, message, confirm button text, cancel button text, and button styles via the `ConfirmModalOptions` interface.
   - Callback functions for `onConfirm` and `onCancel` actions.

2. **Event Handling**:
   - Handles close, cancel, and confirm actions.
   - Supports keyboard interaction (e.g., Escape key to cancel).
   - Includes touch event handling for mobile devices.

3. **Accessibility**:
   - ARIA attributes for accessibility.
   - Automatically focuses on the confirm button when the modal is shown.

4. **Styling**:
   - Uses a dedicated CSS file (`confirmModal.css`) for consistent styling.

### Plan for Reuse and Extension

1. **Analyze Requirements**:
   - Compare the new popup requirements with the existing `ConfirmModal` functionality.
   - Identify any gaps or additional features needed (e.g., countdown timer, dynamic content updates).

2. **Extract Shared Functionality**:
   - Create a base `Modal` class to encapsulate shared functionality (e.g., event handling, ARIA attributes, touch events).
   - Refactor the `ConfirmModal` class to extend the base `Modal` class.

3. **Extend for New Requirements**:
   - Extend the base `Modal` class or the `ConfirmModal` class to implement the new popup requirements.
   - Add support for features like countdown timers and dynamic content updates.

4. **Testing**:
   - Test the refactored `ConfirmModal` component to ensure existing functionality is not broken.
   - Test the new popup windows to ensure they meet the specified requirements.

5. **Documentation**:
   - Update the documentation for the `ConfirmModal` component and the new popup windows.
   - Include usage examples for developers to understand how to use the components effectively.

## Testing Plan

1. **Unit Tests**
   - Test microphone access and error handling.
   - Test recording, stopping, and canceling functionality.
   - Test note approval and dismissal workflows.
   - Test data model updates for note association and storage.
   - Test playback functionality, including sequential playback and error handling.
   - Test UI components, including the expandable list of notes and note options.

2. **Integration Tests**
   - Test end-to-end workflows for recording, saving, and playing notes.
   - Test note association and persistence across different fight lists and modes.

3. **Performance Tests**
   - Test the system's performance with the maximum number of notes (15 per mode per technique) and maximum storage size (100MB per user).

4. **User Acceptance Testing (UAT)**
   - Conduct UAT sessions with end-users to validate the feature against the success criteria.

## Deployment Plan

1. **Staging Environment**
   - Deploy the feature to a staging environment for testing.
   - Monitor logs and metrics for any issues.

2. **Production Deployment**
   - Deploy the feature to the production environment during a scheduled maintenance window.
   - Monitor the system for any issues post-deployment.

## Maintenance Plan

1. **Monitoring**
   - Set up monitoring for note-related actions and storage usage.
   - Alert the team if storage usage approaches the 100MB limit for any user.

2. **Bug Fixes and Updates**
   - Address any bugs or issues reported by users.
   - Release updates to improve performance and add new features as needed.

## Updated Plan for Note Recording Window

To ensure consistency in the user interface, the note recording window will adopt the same design principles as the "Add New Fight List" window. This includes:

1. **UI Components**:
   - A header with a title and close button.
   - A main section with input fields and action buttons.
   - A footer for additional actions.

2. **Behavior**:
   - The "Start Recording" button transitions to "Stop Recording" during recording.
   - A progress bar is displayed to show the recording duration.
   - The footer displays "Approve" and "Dismiss" buttons after recording stops.

3. **Implementation Steps**:
   - Update the UI layout to match the "Add New Fight List" window.
   - Reuse existing styles and components where possible.
   - Test the updated design to ensure functionality and usability.

This plan ensures a cohesive design language across the application.