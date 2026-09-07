# AQLER Timesheet

AQLER Timesheet is an employee timekeeping application built with React, Vite,
Tailwind CSS, and Supabase.

Employees can record time-in and time-out activity. Administrators can review
employee logs, manage scheduled email reminders, export records, and maintain
recurring weekly shifts plus exact-date schedule overrides.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
```

After changing application source files, refresh the exact-code documentation snapshot:

```bash
node docs/generate-source-guide.mjs
```

## Documentation

- [Interactive HTML learning guide](./docs/index.html) is the recommended starting
  point. It provides responsive course navigation, expandable explanations, and
  copyable code examples similar to the DaiDai documentation.
- [Beginner Code Guide source](./docs/BEGINNER_CODE_GUIDE.md) contains the
  text-first Markdown version.
- [Shift Module Guide source](./docs/modules/SHIFT_MODULE.md) summarizes the live
  shift feature, its SQL/RLS reference, and the corresponding guide module.

## Main folders

```text
src/
  components/     Reusable interface pieces
  pages/          Full application pages
  lib/            Shared services such as the Supabase client
  App.jsx         Routes and top-level application flow
docs/             Learning and feature documentation
```

## Security reminder

The browser should only receive the Supabase publishable or anonymous key.
Never put a Supabase service-role key or an email provider secret in React
source code or in a Vite environment variable exposed to the browser.
