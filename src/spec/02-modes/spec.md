# Specification: Technique and Fight List Modes

This document outlines the feature definitions for Technique and Fight List modes.

## 1. Feature Overview

This feature introduces a mode system for both individual techniques and Fight Lists. The purpose is to create a distinction between actively using a technique (`PERFORMING`) and using it as a reaction (`RESPONDING`). This will allow for more structured and specialized training sessions.

## 2. Feature Definitions

### 2.1. Technique Modes

- **Modes**: Every technique will be associated with one or both of the following modes:
  - `PERFORMING`: The player actively initiates the technique.
  - `RESPONDING`: The player uses the technique as a reaction to a prompt or another action.

- **Association**: Each technique must be playable in at least one of these modes.

### 2.2. Fight List Modes

- **Modes**: Every Fight List will be designated as either a `PERFORMING` Fight List or a `RESPONDING` Fight List.

- **Constraint**: The mode of a Fight List dictates which techniques can be included:
  - A `PERFORMING` Fight List can only contain techniques that support the `PERFORMING` mode.
  - A `RESPONDING` Fight List can only contain techniques that support the `RESPONDING` mode.

### 2.3. User Interface and Experience

- **Fight List Creation**: 
  - In the fight list creation window, users can select the mode for the new fight list.
  - Once at least one technique is added to the fight list, the mode selection will be disabled and grayed out.

- **Technique Selection**: 
  - The list of techniques available for selection will be filtered based on the fight list's mode. Only techniques that support the selected mode will be displayed.

- **Fight List Display**: 
  - In the list of fight lists, each entry will be marked with its mode (`PERFORMING` or `RESPONDING`).

## 3. Data Migration

- **Objective**: To ensure backward compatibility, all existing Fight Lists in the system will be updated.

- **Action**: All current Fight Lists will be automatically assigned the `RESPONDING` mode.
