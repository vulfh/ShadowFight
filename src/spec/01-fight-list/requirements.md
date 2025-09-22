# Fight List Feature Requirements

## Overview
The Fight List feature allows users to create, store, and manage custom collections of techniques for training sessions. This replaces the current "Technique Selection" with "Fight List Selection" functionality.

## Design Principles
- **Mobile-First**: All interfaces must be designed for mobile devices first, then enhanced for larger screens
- **Responsive**: Must work seamlessly across all device sizes (mobile, tablet, desktop)
- **Touch-Friendly**: All interactive elements must be optimized for touch input
- **Accessibility**: Must support screen readers and keyboard navigation

---

## 1. Fight List Management

### 1.1 Fight List Definition
- A fight list is a named collection of techniques (preset) selected from all available techniques
- Each fight list has a unique name (user-defined)
- Fight lists are stored in local storage
- Maximum of 50 fight lists per user
- Default fight list "My Techniques" is created on first use

### 1.2 Fight List Display
- Fight lists are displayed in an expandable/collapsible list format
- Each fight list shows: name, technique count, and status (active/inactive)
- "Collapse All" button at the top to collapse all fight lists
- "Expand All" button to expand all fight lists
- Smooth animations for expand/collapse actions

### 1.3 Fight List Actions
Each fight list has the following action buttons:

#### Start Button
- Starts training session with techniques from the selected fight list
- Stores the fight list ID in local storage as "current"
- Only selected techniques within the fight list will be used
- If no techniques are selected, shows toast: "Please select at least one technique in [Fight List Name]"

#### Stop Button
- Stops the current training session
- Clears the "current" fight list from local storage

#### Delete Button
- Deletes the entire fight list with confirmation prompt
- Confirmation: "Are you sure you want to delete the fight list '[Fight List Name]'?"
- If deleted fight list was current, clears the current session
- Cannot delete the last remaining fight list

#### Add Button
- Opens technique selection modal to add new techniques to the fight list
- Shows only techniques not already in the current fight list

#### Edit Button (NEW)
- Allows renaming the fight list
- Validates name uniqueness
- Shows error if name already exists

---

## 2. Training Session Integration

### 2.1 Session Start
- Start button in training session panel starts the current active fight list
- If no current fight list exists, shows prompt: "There is no selected fight list. Do you want to run over all available techniques?"
- If user chooses "Yes": starts session with all available techniques
- If user chooses "No": returns to fight list selection

### 2.2 Session Controls
- **Stop**: Stops current session and clears current fight list
- **Pause**: Pauses current session (maintains state)
- **Resume**: Resumes paused session

---

## 3. Fight List Structure

### 3.1 Technique Panel
- Each fight list contains technique panels similar to current implementation
- Additional "Remove" button (trash icon) for each technique
- Clicking remove button removes technique from the fight list
- Confirmation for removal: "Remove [Technique Name] from [Fight List Name]?"

### 3.2 Technique Selection
- "Select All" and "Deselect All" buttons within each fight list
- Selection state is independent for each fight list
- Shuffle only occurs among selected techniques within the fight list
- If no techniques selected, shows toast: "Please select at least one technique in [Fight List Name]"

### 3.3 Priority System
- Each technique in a fight list can have a priority level (1-5)
- Priority affects the likelihood of technique selection during training
- Default priority is 3 (medium)
- Priority can be adjusted via dropdown in technique panel

---

## 4. Fight List Creation

### 4.1 New Fight List Button
- Replaces current "Select All"/"Deselect All" buttons in technique selection
- Shows prompt: "Please provide name for the new fight list"
- Validates name uniqueness
- Creates new fight list with currently selected techniques
- Automatically sets as current fight list

### 4.2 Name Validation
- Names must be 1-50 characters
- No special characters except spaces, hyphens, and underscores
- Case-insensitive uniqueness check
- Shows error message for invalid names

---

## 5. Technique Addition Modal

### 5.1 Modal Display
- Floating modal window (mobile: full screen, desktop: centered overlay)
- Shows all available techniques not already in the current fight list
- Search/filter functionality for large technique lists
- Close button and backdrop click to dismiss

### 5.2 Technique Selection
- Each technique shows: name, description, and priority dropdown
- "Add" button for each technique (instead of checkbox)
- Priority dropdown with values: 1 (Lowest) to 5 (Highest)
- "Add All" button to add all visible techniques
- "Cancel" button to close without changes

---

## 6. Data Management

### 6.1 Local Storage
- All fight lists stored in localStorage with key "fightLists"
- Current active fight list stored with key "currentFightList"
- Data structure:
```json
{
  "fightLists": [
    {
      "id": "unique-id",
      "name": "Fight List Name",
      "techniques": [
        {
          "id": "technique-id",
          "priority": 3,
          "selected": true
        }
      ],
      "createdAt": "timestamp",
      "lastModified": "timestamp"
    }
  ],
  "currentFightList": "fight-list-id"
}
```

### 6.2 Data Persistence
- Automatic save on all changes
- Backup/restore functionality (export/import JSON)
- Data validation on load
- Graceful handling of corrupted data

---

## 7. Responsive Design Requirements

### 7.1 Mobile (320px - 768px)
- Single column layout
- Full-width buttons with adequate touch targets (44px minimum)
- Swipe gestures for expand/collapse
- Bottom sheet for technique addition modal
- Large, readable fonts (16px minimum)
- Adequate spacing between interactive elements

### 7.2 Tablet (768px - 1024px)
- Two-column layout for fight lists
- Larger touch targets
- Side panel for technique addition
- Optimized for landscape and portrait orientations

### 7.3 Desktop (1024px+)
- Multi-column layout
- Hover states for interactive elements
- Keyboard shortcuts for common actions
- Drag-and-drop for technique reordering
- Right-click context menus

---

## 8. Accessibility Requirements

### 8.1 Screen Reader Support
- All buttons and interactive elements have proper ARIA labels
- Fight list state (expanded/collapsed) announced
- Technique selection state announced
- Modal focus management

### 8.2 Keyboard Navigation
- Tab order follows logical flow
- Enter/Space to activate buttons
- Escape to close modals
- Arrow keys for technique selection

### 8.3 Visual Accessibility
- High contrast mode support
- Scalable text (up to 200%)
- Color is not the only indicator of state
- Focus indicators clearly visible

---

## 9. Error Handling

### 9.1 Validation Errors
- Real-time validation feedback
- Clear error messages
- Non-blocking error states
- Recovery suggestions

### 9.2 Storage Errors
- Graceful degradation if localStorage is full
- Data export before cleanup
- User notification of storage issues
- Automatic cleanup of old data

---

## 10. Performance Requirements

### 10.1 Loading Performance
- Fight lists load within 200ms
- Smooth animations (60fps)
- Lazy loading for large technique lists
- Efficient re-rendering

### 10.2 Memory Management
- Cleanup of unused event listeners
- Efficient DOM updates
- Minimal memory footprint
- Garbage collection optimization


