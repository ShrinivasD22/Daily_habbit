# Feature: Quick Complete, Multi-Complete & Activity Calendar

**Branch:** `feature/multi-complete-calendar`
**Date:** 2026-02-14

## 1. Quick Complete (Single Tap)
- **Single tap** on a habit card instantly completes it (no mood modal popup)
- A **"..." detail button** on each card opens the mood/note modal for adding mood emoji + note
- The detail button works on both completed and incomplete habits (edit mood after completing)
- **Uncomplete** by tapping the check circle when a habit is already completed

## 2. Multi-Complete / Batch Complete
- **"Select" toggle** button in the toolbar header
- When active, checkboxes appear on each **incomplete** habit card
- Tapping a card in select mode toggles its checkbox instead of completing
- **"Complete Selected (N)"** floating button at the bottom batch-completes all selected habits
- After batch complete, select mode automatically disables

## 3. Activity Calendar (Fitness Rings)
- **Calendar grid** at the top of the Today page showing the current month
- Each day displays an **SVG ring** that fills based on habit completion percentage
- Color: `#FF6B4A` brand color
- Empty ring = 0%, partial arc = partial completion, full ring = 100%
- Today highlighted with bold orange text
- Future days greyed out with no ring fill
- **Month navigation** with prev/next arrows
- Pure CSS/SVG — no external library

## Technical Changes
- **HabitService**: Added `getCompletionRateForDate(date: Date): number` helper method
- **TodayPage**: Refactored tap handling — `onCardTap()` for quick complete, `onCheckCircleTap()` for uncomplete, `openMoodModal()` for detail button
- **TodayPage**: Added `selectMode`, `selectedIds` signals and `batchComplete()` method
- **TodayPage**: Added calendar section with `calendarMonth`, `calendarDays` computed signals and `getRingDash()` for SVG arc calculation
