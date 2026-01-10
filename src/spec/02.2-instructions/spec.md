# Specification: Instruction Audio for Fight Lists

This document outlines the feature definitions for playing instruction audio files before fight list sessions begin.

## 1. Feature Overview

This feature introduces audio instructions that play automatically at the start of fight list sessions. The purpose is to provide clear audio guidance to users about their role in the upcoming training session, helping them understand whether they should actively perform techniques or respond to prompts.

## 2. Feature Definitions

### 2.1. Audio File Requirements

- **Audio Files**: Two specific audio instruction files must be available in the system:
  - `instruction-for-performer.wav`: Played for PERFORMING fight lists
  - `instruction-for-responder.wav`: Played for RESPONDING fight lists

- **File Location**: Audio files should be stored in the `public/Sounds/` directory alongside other technique audio files.

### 2.2. Playback Behavior

- **Timing**: Audio instructions must play at the start of a fight list session, immediately before the first technique is presented.

- **Mode-Based Selection**: 
  - For `PERFORMING` fight lists: Play `instruction-for-performer.wav`
  - For `RESPONDING` fight lists: Play `instruction-for-responder.wav`

- **Sequential Playback**: The instruction audio must complete playing entirely before the first technique audio begins. The system must wait for the instruction audio to finish (including any fade-out or silence) before starting the first technique selection and playback cycle.

- **User Experience**: The instruction audio should complete playing before the first technique audio begins, ensuring users receive clear guidance about their expected role. There should be no overlap between instruction audio and technique audio.

### 2.3. Integration Points

- **Session Start**: The audio instruction system must integrate with the existing fight list session management to trigger at the appropriate time.

- **Audio Management**: The instruction audio should use the same audio playback system as technique sounds for consistency.

- **Sequential Audio Flow**: The system must implement proper audio sequencing to ensure:
  1. Instruction audio plays first and completes entirely
  2. System waits for instruction audio completion event
  3. First technique is selected from the fight list
  4. First technique audio begins playing only after instruction audio has finished
  5. Normal technique cycle continues with configured delays

- **Error Handling**: If instruction audio files are missing or fail to load, the system should gracefully continue with the fight list session without blocking the user experience. In this case, the first technique should be selected and played immediately.

## 3. Technical Considerations

- **Audio Format**: WAV format for consistency with existing technique audio files.

- **Playback Control**: Users should be able to hear the instruction audio clearly, with appropriate volume levels matching other system sounds.

- **Performance**: Audio files should be preloaded or cached to ensure smooth playback without delays at session start.

- **Audio Completion Detection**: The system must implement reliable audio completion detection to know when instruction audio has finished playing before starting the first technique.

- **Timing Synchronization**: Proper event-driven architecture must be implemented to ensure the first technique selection and playback only occurs after instruction audio completion, maintaining the integrity of the training session flow.