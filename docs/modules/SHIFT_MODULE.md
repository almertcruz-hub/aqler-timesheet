# Shift Module Guide

The maintained shift walkthrough is module 9 of the complete guide:

`docs/index.html#shifts`

It contains:

- The complete current `src/pages/Shift.jsx` source.
- The `/shifts` route in `src/App.jsx`.
- The shared Shifts navigation link.
- The complete recurring `shifts` schema.
- The complete exact-date `shift_overrides` schema.
- Employee and administrator RLS policies.
- Notebook-style code cells with syntax explanations.
- The override-first and baseline-second execution flow.
- A saved `is_overnight` flag for shifts that finish on the following day.
- Bulk weekday/date selection and individual-day editing.
- Date-specific day-off notes and `+1 day` end-time labels.

The old one-row-per-calendar-date design is no longer used. The current design stores the normal weekly pattern in `shifts` and only exceptional calendar dates in `shift_overrides`. Overnight status is stored explicitly rather than guessed from the two clock values.
