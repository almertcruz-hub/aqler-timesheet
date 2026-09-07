# AQLER Timesheet Beginner Code Guide

This guide explains the code patterns used in AQLER Timesheet. It is written for
someone learning JavaScript, React, and Supabase while working on the app.

## How to use this guide

When changing a feature:

1. Find the page or component that displays it.
2. Identify the state that stores its changing data.
3. Find the event handler that changes that state.
4. Find the Supabase query that reads or writes the database.
5. Check the related Row Level Security policies.
6. Test as both an employee and an administrator.

## How the application works

```text
User action
   ↓
React event handler
   ↓
Supabase JavaScript query
   ↓
Postgres table + RLS policy
   ↓
Query result or error
   ↓
React state changes
   ↓
The screen renders again
```

React controls what appears in the browser. Supabase provides authentication
and the Postgres database. RLS is the database security layer that decides which
rows the signed-in user may read or change.

In the current timekeeping design, one `logs` row represents one whole work
session. Time In inserts the row with `time_out` still `null`. Time Out updates
that same row. This is why the employee and administrator interfaces can show
the shift date, Time In, Time Out, duration, and status together.

## Important project folders

```text
src/
  components/     Smaller reusable interface sections
  pages/          Full pages shown by the router
  lib/            Shared configuration and services
  App.jsx         Main application component and routes
  main.jsx        Starts React
supabase/          Supabase-related local files
docs/              Project documentation
```

## JavaScript foundations

### Variables

Use `const` when the variable will not be assigned a different value:

```js
const pageSize = 20
```

Use `let` when it must be assigned a new value later:

```js
let currentPage = 1
currentPage = 2
```

An important detail: JavaScript evaluates the right side immediately.

```js
const timer = setTimeout(loadLogs, 400)
```

Declaring `timer` does not make the timeout run. Calling `setTimeout(...)` makes
it run and returns an ID. `timer` stores that returned ID.

### Arrays and objects

An array is an ordered list:

```js
const days = ['Monday', 'Tuesday', 'Wednesday']
```

An object groups named values:

```js
const employee = {
  id: 'abc-123',
  full_name: 'Glenda Cruz',
  email: 'glenda@aqler.tech',
}
```

Read an object property with a dot:

```js
employee.full_name
```

### Functions and arrow functions

A named function is:

```js
function loadLogs() {
  // work happens here
}
```

The arrow-function version stored in a variable is:

```js
const loadLogs = () => {
  // work happens here
}
```

An anonymous arrow function has no name:

```js
() => {
  // work happens here
}
```

React often accepts a function as an argument. That is why you see an anonymous
function inside `useEffect`, event handlers, `map`, and `filter`.

### `map` and `filter`

`map` transforms every item and returns a new array:

```js
const employeeIds = profiles.map((profile) => profile.id)
```

If `profiles` contains three objects, `employeeIds` contains the three IDs.

To retain several values, return an object:

```js
const employees = profiles.map((profile) => ({
  id: profile.id,
  full_name: profile.full_name,
  email: profile.email,
}))
```

`filter` keeps only items for which the condition is true:

```js
const activeSchedules = schedules.filter(
  (schedule) => schedule.status === 'active'
)
```

### Destructuring

Supabase returns an object. Destructuring extracts named properties:

```js
const { data, count, error } = await query
```

This is a shorter form of:

```js
const result = await query
const data = result.data
const count = result.count
const error = result.error
```

### `async` and `await`

Database and network operations take time. An `async` function can pause at
`await` until the Promise finishes:

```js
async function loadLogs() {
  const { data, error } = await supabase.from('logs').select('*')

  if (error) {
    console.error(error)
    return
  }

  console.log(data)
}
```

## React foundations

### Components

A React component is a JavaScript function that returns JSX:

```jsx
function EmployeeName({ name }) {
  return <p>{name}</p>
}
```

JSX looks like HTML, but it is written inside JavaScript. A `div` is a general
container. Multiple child elements become side by side when the parent uses
Tailwind's `flex` class:

```jsx
<div className="flex items-center gap-2">
  <div>Avatar</div>
  <div>Email</div>
</div>
```

The outer `div` controls the arrangement. The two inner `div` elements are its
children. `flex` uses a horizontal row by default.

### Props

Props pass data from a parent component to a child:

```jsx
<EmployeeName name="Glenda Cruz" />
```

The child receives `name` through its props.

### State

State stores information that can change while the page is open:

```jsx
const [page, setPage] = useState(1)
```

- `page` is the current value.
- `setPage` changes the value.
- Calling `setPage(2)` asks React to render the component again.

### Effects

`useEffect` runs work after React renders:

```jsx
useEffect(() => {
  loadLogs()
}, [page])
```

The dependency array `[page]` tells React to run the effect after the first
render and whenever `page` changes.

The function inside `useEffect` describes what React should run. Calling
`useEffect` itself only registers that work with React.

### Debounced search

Without a debounce, every typed character can run another database query. A
debounce waits briefly for the user to stop typing:

```jsx
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(search)
    setPage(1)
  }, 400)

  return () => clearTimeout(timer)
}, [search])
```

What happens:

1. `search` changes.
2. React runs this effect.
3. `setTimeout` schedules the inner function for 400 milliseconds later.
4. If `search` changes again first, React calls the cleanup function.
5. `clearTimeout(timer)` cancels the old scheduled function.
6. Only the latest search normally reaches `setDebouncedSearch`.

The cleanup return is optional. Effects return a cleanup function only when
they have something to cancel, unsubscribe, or remove.

### Conditional rendering

Show something only when a condition is true:

```jsx
{isAdmin && <button>Edit shift</button>}
```

If `isAdmin` is true, React renders the button. If false, it renders nothing in
that location. This improves the interface, but RLS must still enforce security.

### Responsive Tailwind prefixes

Tailwind classes without a prefix apply to every screen size. `md:` means the
class starts applying at Tailwind's medium breakpoint and above:

```jsx
<div className="flex flex-col md:flex-row">
```

This is a vertical column on small screens and a horizontal row on medium and
larger screens.

## Supabase query foundations

### Selecting rows

```js
const { data, error } = await supabase
  .from('logs')
  .select('*')
```

- `.from('logs')` chooses the table.
- `.select('*')` requests all columns the user is allowed to read.
- `data` contains returned rows.
- `error` contains the error or `null`.

`*` means all columns, not all rows. Filters and RLS still decide which rows are
returned.

### Exact counts and pagination

```js
const { data, count, error } = await supabase
  .from('admin_work_logs')
  .select('*', { count: 'exact' })
  .range(from, to)
```

`data` contains only the requested page. `count` contains the exact number of
matching rows before the page range is applied. For example, if 87 rows match
and the page requests rows 0 through 19:

```js
data.length // 20
count       // 87
```

The interface can calculate `Math.ceil(count / pageSize)` to find the total
number of pages. Each Next or Previous click changes page state; an effect that
depends on `page` runs the query again.

### Filters and `or`

Filters are similar to SQL `WHERE` conditions:

```js
.eq('status', 'active')
```

This is similar to:

```sql
where status = 'active'
```

Supabase `.or(...)` groups alternative filter conditions:

```js
.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
```

This means the name may match **or** the email may match. It is easiest when the
searchable fields are columns in the same table or view.

### Why a database view helps search

`logs` stores work-session fields, while names and emails live in `profiles`. A
regular related select can display profile values, but applying one `.or(...)`
across the main table and a nested related table is awkward and unreliable.

A database view can present joined values as one flat result:

```text
id | user_id | full_name | email | shift_date | time_in | time_out | search_text
```

Then both searchable fields are columns of the selected view:

```js
supabase
  .from('admin_work_logs')
  .select('*', { count: 'exact' })
  .ilike('search_text', `%${search}%`)
```

The view does not make one search box behave differently. It makes the database
result easier and safer to filter, paginate, and export.

The Admin page requests only one 20-row page for the table. Export cannot reuse
that small `logs` state or it would export only the visible page, so `exportLogs`
performs a separate query in batches of 1,000 until every matching row has been
collected.

### Shift baseline, overrides, and overnight

The shift module uses two levels:

```text
shifts          = normal repeating weekday pattern
shift_overrides = one exceptional calendar date
```

For every displayed date, React looks for an override first. If none exists, it
uses the baseline row with the matching weekday number. A working row stores
`is_overnight` explicitly. For example, 17:00 to 05:00 with `is_overnight = true`
means the 05:00 end belongs to the following day, so the interface adds
`+1 day`. A date-specific day off has null times, `is_day_off = true`, and
`is_overnight = false`; it may still have a note.

The bulk overnight controls are drafts. `overrideOvernight` is copied into
`day.overnight` for selected dates when Apply is pressed. `saveSpecificWeek`
later maps `day.overnight` into the database field `is_overnight`.

## Authentication and authorization

### `auth.uid()`

Inside an RLS policy, `auth.uid()` returns the UUID of the signed-in user:

```sql
user_id = (select auth.uid())
```

That condition permits the user only when the row belongs to their account.

### `auth.jwt()`

`auth.jwt()` provides the signed-in user's token claims. An administrator check
can read a role stored in app metadata:

```sql
(select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
```

- `->` retrieves a JSON object.
- `->>` retrieves a JSON value as text.

App metadata is appropriate for authorization because ordinary users cannot
change it through normal client profile updates.

### `jsonb`, `coalesce`, and `||`

Supabase auth metadata uses Postgres `jsonb`, a searchable binary JSON format.

```sql
coalesce(raw_app_meta_data, '{}'::jsonb)
|| '{"role":"admin"}'::jsonb
```

- `coalesce(value, fallback)` returns the first value that is not `null`.
- `'{}'::jsonb` is an empty JSON object converted to `jsonb`.
- `||` merges the two JSON objects.
- If `role` already exists, the value on the right replaces it.

### GRANT versus RLS

These are two security gates:

1. `GRANT` permits a database role to attempt an operation on a table.
2. RLS policies decide which rows that signed-in user may operate on.

```sql
grant select, insert, update, delete on public.shifts to authenticated;
```

This does not automatically give every signed-in user unrestricted access when
RLS is enabled. They must also satisfy the applicable policy.

### `USING` and `WITH CHECK`

- `USING` decides which existing rows can be seen, updated, or deleted.
- `WITH CHECK` validates the new row created by an insert or produced by an
  update.

For an update, both can matter: the old row must pass `USING`, and the resulting
new row must pass `WITH CHECK`.

### Permissive and restrictive policies

Permissive policies for the same command combine with `OR`: passing any one can
allow the row. Restrictive policies combine with `AND`: every applicable
restrictive condition must pass in addition to at least one permissive policy.

Use separate policies when employee and administrator rules differ. This is
usually easier to read, test, and maintain than one large condition.

## Safe feature workflow

Before coding, write the permissions in plain language:

```text
Employee: can view their own shift.
Administrator: can view and manage all shifts.
```

Then build in this order:

1. Create the table and relationships.
2. Enable RLS and add policies.
3. Test SQL permissions.
4. Add React state and loading queries.
5. Add forms and event handlers.
6. Hide administrator controls from employees.
7. Test employee and administrator accounts again.
8. Run `npm run lint` and `npm run build`.

## How feature documentation should be written

Each feature guide should contain:

- what the feature does;
- which files it uses;
- its database schema and permissions;
- its React state, queries, and event handlers;
- the complete user flow;
- employee and administrator tests;
- common errors and fixes;
- a checklist showing what is already implemented.

The shift feature follows this format in
[`docs/modules/SHIFT_MODULE.md`](./modules/SHIFT_MODULE.md).
