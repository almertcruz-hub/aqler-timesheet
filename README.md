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

## Password reset setup

The login page links to `/forgot-password`. Supabase emails a recovery link back
to `/reset-password`, where the user enters and confirms a new password.

In Supabase **Authentication → URL Configuration**, set your production Site URL
and add these allowed Redirect URLs (use your actual domain and development port):

- `http://localhost:5173/reset-password`
- `https://your-domain.com/reset-password`

Keep the reset-password email template's link pointing to `{{ .ConfirmationURL }}`
so Supabase verifies the recovery token before redirecting to the application.
Configure email delivery for production in Supabase. The app uses the existing
public Supabase client; no service-role key is needed.

To verify, request a reset for a test account, open the email link, save matching
passwords, and confirm the new password works at sign-in. Also check mismatched
passwords and an expired or reused link. Supabase enforces the project's password
policy; the form shares registration's six-character minimum.

See [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords).

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
