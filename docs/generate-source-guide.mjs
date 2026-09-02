import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { extname, relative, resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const outputPath = resolve(import.meta.dirname, 'assets', 'source-guide-data.js')

const moduleFiles = {
  startup: [
    'index.html',
    'package.json',
    'vite.config.js',
    'eslint.config.js',
    'vercel.json',
    'src/main.jsx',
    'src/lib/supabase.js',
    'src/App.jsx',
  ],
  auth: ['src/pages/Login.jsx', 'src/pages/Register.jsx'],
  navbar: ['src/components/Navbar.jsx'],
  timekeeping: [
    'src/pages/Home.jsx',
    'src/components/TimeButtons.jsx',
    'src/components/AlertMessage.jsx',
  ],
  worklog: ['src/components/WorkLog.jsx'],
  adminlogs: ['src/pages/Admin.jsx'],
  reminders: ['src/pages/Admin.jsx'],
  processor: ['supabase/functions/process-email-reminders/index.ts'],
  shifts: [
    'src/pages/Shift.jsx',
    'src/App.jsx',
    'src/components/Navbar.jsx',
    'docs/modules/SHIFT_SCHEMA.sql',
  ],
  database: [
    'supabase/migrations/20260813181500_create_timesheet_schema.sql',
    'supabase/migrations/20260813190000_add_admin_access.sql',
    'supabase/migrations/20260813193000_link_logs_to_profiles.sql',
    'supabase/migrations/20260813200000_add_email_reminders.sql',
    'supabase/migrations/20260813203000_make_reminders_recurring.sql',
    'supabase/migrations/20260813210000_remove_cancelled_reminders.sql',
  ],
  styling: [
    'postcss.config.js',
    'tailwind.config.js',
    'src/index.css',
    'src/App.css',
  ],
}

function explainHtml(trimmed) {
  if (!trimmed) return 'Blank line: separates the document head from the visible page body.'
  if (/^<!doctype/i.test(trimmed)) return 'Tells the browser to interpret this document using modern HTML standards.'
  if (/^<html/i.test(trimmed)) return 'Opens the HTML document and declares its language for browsers and assistive technology.'
  if (/^<head/i.test(trimmed)) return 'Opens metadata that configures the page but is not rendered as page content.'
  if (/^<meta charset/i.test(trimmed)) return 'Uses UTF-8 text encoding so ordinary and international characters display correctly.'
  if (/^<meta name="viewport"/i.test(trimmed)) return 'Makes CSS sizing and responsive layouts behave correctly on mobile devices.'
  if (/^<title/i.test(trimmed)) return 'Sets the text shown in the browser tab.'
  if (/^<body/i.test(trimmed)) return 'Opens the visible document body.'
  if (/id="root"/i.test(trimmed)) return 'Creates the empty root container where main.jsx mounts the complete React application.'
  if (/^<script/i.test(trimmed)) return 'Loads src/main.jsx as a JavaScript module, which starts React and its imports.'
  if (/^<\//.test(trimmed)) return 'Closes the current HTML element.'
  return 'Defines part of the small HTML shell that hosts the React application.'
}

function explainJson(trimmed) {
  if (!trimmed) return 'Blank line: visually separates configuration sections.'
  if (trimmed === '{' || trimmed === '[') return 'Opens a JSON object or array containing configuration values.'
  if (/^[}\]],?$/.test(trimmed)) return 'Closes the current JSON object or array; a comma means another sibling value follows.'
  if (/"scripts"/.test(trimmed)) return 'Opens the named npm commands used to develop, validate, build, and preview the app.'
  if (/"dependencies"/.test(trimmed)) return 'Lists libraries required when the application runs or builds.'
  if (/"devDependencies"/.test(trimmed)) return 'Lists tools used during development, linting, and bundling.'
  if (/"dev"/.test(trimmed)) return 'Maps npm run dev to the Vite development server.'
  if (/"build"/.test(trimmed)) return 'Maps npm run build to Vite’s optimized production build.'
  if (/"lint"/.test(trimmed)) return 'Maps npm run lint to ESLint’s static code checks.'
  if (/"preview"/.test(trimmed)) return 'Maps npm run preview to a local server for inspecting the production build.'
  if (/"source"/.test(trimmed) && /destination/.test(trimmed)) return 'Rewrites every Vercel path to index.html so React Router can handle direct page visits.'
  if (/^"?[A-Za-z@]/.test(trimmed)) return 'Defines a named project setting, dependency version, command, or deployment value.'
  return 'Continues the current JSON configuration structure.'
}

function explainSql(trimmed) {
  if (!trimmed) return 'Blank line: visually separates SQL operations so the migration is easier to scan.'
  if (trimmed.startsWith('--')) return 'SQL comment: documents the purpose of the statement that follows.'
  if (/^create table/i.test(trimmed)) return 'Creates the named table if it does not already exist; the following parenthesized lines define its columns and constraints.'
  if (/^create (unique )?index/i.test(trimmed)) return 'Creates an index. An index speeds matching queries; a unique index also rejects duplicate indexed values.'
  if (/^create or replace function/i.test(trimmed)) return 'Defines or replaces a Postgres function that can be executed by a trigger or query.'
  if (/^create trigger/i.test(trimmed)) return 'Creates a trigger that automatically calls a function after the specified table event.'
  if (/^create policy/i.test(trimmed)) return 'Creates a Row Level Security policy. The following USING or WITH CHECK expression decides when it passes.'
  if (/^drop policy/i.test(trimmed)) return 'Removes an older policy with this name first, which makes the migration safe to rerun without duplicate-policy errors.'
  if (/^drop trigger/i.test(trimmed)) return 'Removes the previous trigger definition before recreating it.'
  if (/^drop index/i.test(trimmed)) return 'Removes the older index because the reminder design or lookup condition changed.'
  if (/^alter table/i.test(trimmed)) return 'Changes an existing table. The indented lines specify the column, constraint, or security change.'
  if (/^grant /i.test(trimmed)) return 'Allows the authenticated database role to attempt these table operations; RLS still decides which rows each user may access.'
  if (/^insert into/i.test(trimmed)) return 'Begins an INSERT that creates rows in the named table.'
  if (/^select /i.test(trimmed)) return 'Selects the listed values or columns for the current SQL operation.'
  if (/^update /i.test(trimmed)) return 'Begins an UPDATE of existing rows in the named table.'
  if (/^delete from/i.test(trimmed)) return 'Permanently deletes rows from the named table when they satisfy the following WHERE condition.'
  if (/^where /i.test(trimmed)) return 'Filters the SQL operation so it affects only rows satisfying this condition.'
  if (/^using /i.test(trimmed)) return 'RLS USING condition: decides which existing rows may be selected, updated, or deleted.'
  if (/^with check/i.test(trimmed)) return 'RLS WITH CHECK condition: validates a row produced by INSERT or UPDATE.'
  if (/^on conflict/i.test(trimmed)) return 'Handles a duplicate key by updating the existing profile instead of failing the insert.'
  if (/^references /i.test(trimmed) || / references /i.test(trimmed)) return 'Defines a foreign-key relationship: this value must refer to a valid row in the named table.'
  if (/^constraint /i.test(trimmed)) return 'Names a database constraint so invalid data is rejected and errors identify the rule.'
  if (/^check \(/i.test(trimmed) || / check \(/i.test(trimmed)) return 'Adds a CHECK constraint; Postgres rejects rows for which this expression is false.'
  if (/^foreign key/i.test(trimmed)) return 'Marks the listed column as the foreign-key value that connects to another table.'
  if (/^on delete cascade/i.test(trimmed)) return 'Deletes dependent rows automatically when their referenced parent row is deleted.'
  if (/^language /i.test(trimmed)) return 'Declares the programming language used by this database function.'
  if (/^security definer/i.test(trimmed)) return 'Runs the function with its owner privileges and fixes the search path, allowing the auth trigger to write public profiles safely.'
  if (/^returns trigger/i.test(trimmed)) return 'Declares that this function returns a trigger result rather than ordinary query rows.'
  if (/^begin$/i.test(trimmed)) return 'Begins the executable body of the Postgres trigger function.'
  if (/^end;?$/i.test(trimmed)) return 'Ends the executable body of the Postgres function.'
  if (/^return new/i.test(trimmed)) return 'Returns the new auth row so the triggering INSERT or UPDATE can finish normally.'
  if (/^notify pgrst/i.test(trimmed)) return 'Asks PostgREST to reload its schema cache so the new foreign-key relationship is discoverable by Supabase queries.'
  if (/^(id|user_id|type|time|date|duration|created_at|updated_at|time_in|time_out|full_name|email|scheduled_at|subject|message|status|sent_at|error|created_by|days_of_week|day_of_week|reminder_time|timezone|last_sent_on|shift_date|start_time|end_time|is_day_off|notes)\b/i.test(trimmed)) return 'Defines or changes this column, including its data type, null rule, default, relationship, or validation rule.'
  if (/^\);?$/.test(trimmed)) return 'Closes the current table, index, policy, function call, or grouped SQL definition.'
  if (/^\($/.test(trimmed)) return 'Opens a grouped SQL expression whose condition continues on the following lines.'
  return 'Continues the current SQL statement by supplying one of its values, conditions, columns, or clauses.'
}

function explainCss(trimmed) {
  if (!trimmed) return 'Blank line: separates related CSS rules for readability.'
  if (trimmed.startsWith('/*') || trimmed.startsWith('*')) return 'CSS comment: describes the group of styles that follows.'
  if (trimmed.startsWith('@import')) return 'Imports Tailwind CSS so its utilities and theme system are available to the application.'
  if (trimmed.startsWith('@theme')) return 'Opens Tailwind theme configuration containing reusable design tokens.'
  if (trimmed.startsWith('@layer')) return 'Places the following rules in Tailwind’s base layer so utilities can override them predictably.'
  if (trimmed.endsWith('{')) return 'Opens a CSS rule or nested selector. Declarations inside apply to the selected elements or state.'
  if (trimmed === '}') return 'Closes the current CSS rule or nested selector.'
  if (trimmed.startsWith('--')) return 'Defines a reusable custom color token for Tailwind or CSS.'
  if (trimmed.includes(':')) return 'Sets this CSS property for the currently open selector.'
  return 'Continues the current CSS selector or declaration.'
}

function explainJavaScript(trimmed) {
  if (!trimmed) return 'Blank line: separates logical sections of the file for readability.'
  if (trimmed.startsWith('//') || trimmed.startsWith('{/*')) return 'Comment: labels or temporarily documents this section; it does not execute.'
  if (/^import /.test(trimmed)) return 'Imports a library function, React hook, component, asset, or shared client so this file can use it.'
  if (/^export default /.test(trimmed)) return 'Exports this component as the file’s default value so another module can import it without braces.'
  if (/^export const /.test(trimmed)) return 'Creates and exports a named value so other modules can import the same configured object.'
  const namedFunction = trimmed.match(/^(?:async )?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/)
  if (namedFunction) return `Defines the ${namedFunction[1]} function with parameters ${namedFunction[2] || 'none'}. JavaScript stores its body now; it runs only when another line calls ${namedFunction[1]}(...).`
  const arrowFunction = trimmed.match(/^const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/)
  if (arrowFunction) return `Creates the ${arrowFunction[1]} function with parameters ${arrowFunction[2] || 'none'}. The right side creates a function value rather than running its body immediately.`
  const stateDeclaration = trimmed.match(/^const\s+\[([A-Za-z0-9_]+),\s*([A-Za-z0-9_]+)\]\s*=\s*useState\(/)
  if (stateDeclaration) {
    const [, value, setter] = stateDeclaration
    return `${stateMeaning(value)} ${setter} is the function this component calls when it needs to replace ${value}; React then renders again using the new value.`
  }
  if (/useRef\(/.test(trimmed)) return 'Creates a persistent ref. Changing its current value does not cause React to render again.'
  if (/useEffect\(/.test(trimmed)) return 'Registers side-effect work for React to run after rendering, subject to the dependency array.'
  if (/useCallback\(/.test(trimmed)) return 'Stores a function identity between renders until one of its dependencies changes; calling the function still requires parentheses.'
  if (/useMemo\(/.test(trimmed)) return 'Asks React to recompute and cache a derived value only when one of its dependencies changes.'
  if (/createClient\(/.test(trimmed)) return 'Creates a Supabase client using the project URL and key supplied by the surrounding lines.'
  if (/^if\s*\(.*\)\s*return\s*;?$/.test(trimmed)) return 'Tests the condition and immediately stops the current function or callback when it is true. Because nothing follows return, the result is undefined. In a useEffect callback, undefined means React received no cleanup function.'
  if (/^if \(/.test(trimmed)) return 'Tests a condition. The following block runs only when the condition is true.'
  if (/^else\b/.test(trimmed)) return 'Runs this alternative branch when the preceding if condition was false.'
  if (/^return \($/.test(trimmed)) return 'Begins the JSX interface returned by this React component.'
  if (/^return\b/.test(trimmed)) return 'Returns a value or stops the current function immediately; later lines in this function do not run.'
  if (/^await /.test(trimmed) || / = await /.test(trimmed)) return 'Waits for an asynchronous Auth, database, or HTTP operation and stores or uses its completed result.'
  if (/\.from\(/.test(trimmed)) return 'Chooses the Supabase database table for the query being constructed.'
  if (/\.select\(/.test(trimmed)) return 'Requests the listed columns and returns permitted rows after filters and RLS are applied.'
  if (/\.insert\(/.test(trimmed)) return 'Adds a new database row using the object supplied here or on the following lines.'
  if (/\.update\(/.test(trimmed)) return 'Changes matching database rows using the supplied values.'
  if (/\.delete\(\)/.test(trimmed)) return 'Marks this Supabase query as a permanent row deletion.'
  if (/\.(eq|is|or)\(/.test(trimmed)) return 'Adds a database filter so the query affects only rows satisfying this condition.'
  if (/\.order\(/.test(trimmed)) return 'Sorts returned rows by the named column and direction.'
  if (/\.limit\(/.test(trimmed)) return 'Limits how many rows the database returns in this request.'
  if (/\.maybeSingle\(\)/.test(trimmed)) return 'Requests zero or one result and returns one object instead of an array when a row exists.'
  if (/\.single\(\)/.test(trimmed)) return 'Requires exactly one result and returns it as an object rather than an array.'
  if (/^set[A-Z]\w*\(/.test(trimmed)) return 'Calls a React state setter, scheduling another render with the supplied value or updater result.'
  if (/\.setDate\(/.test(trimmed)) return 'Changes the calendar day stored in this Date object. getDate() reads its current day number, the arithmetic calculates the target day, and setDate() applies it while automatically handling month or year boundaries.'
  if (/\.setHours\(/.test(trimmed)) return 'Changes the local hour, minute, second, and millisecond fields of this Date object using the supplied arguments.'
  if (/\.map\(/.test(trimmed)) return 'Transforms every array item into a new value or JSX element and returns the new array.'
  if (/\.filter\(/.test(trimmed)) return 'Creates a new array containing only items whose callback condition is true.'
  if (/\.some\(/.test(trimmed)) return 'Returns true when at least one array item satisfies the callback condition.'
  if (/setTimeout\(/.test(trimmed)) return 'Schedules a callback to run later after the specified number of milliseconds.'
  if (/clearTimeout\(/.test(trimmed)) return 'Cancels the previously scheduled timeout identified by this timer ID.'
  if (/fetch\(/.test(trimmed)) return 'Starts an HTTP request to the supplied URL; surrounding options define method, headers, and body.'
  if (/^for \(/.test(trimmed)) return 'Begins a loop that processes each reminder in the schedules array one at a time.'
  if (/continue$/.test(trimmed)) return 'Skips the remainder of the current loop iteration and moves to the next reminder.'
  const declaration = trimmed.match(/^(const|let)\s+([A-Za-z0-9_]+)\s*=\s*(.+)/)
  if (declaration) return `${declaration[1] === 'const' ? 'Creates' : 'Creates a reassignable'} local variable named ${declaration[2]}. JavaScript immediately evaluates “${declaration[3]}” and stores that resulting value in ${declaration[2]}.`
  const destructuredDeclaration = trimmed.match(/^const\s+\{([^}]+)\}\s*=\s*(.+)/)
  if (destructuredDeclaration) return `Evaluates “${destructuredDeclaration[2]}”, then extracts the named properties ${destructuredDeclaration[1].replace(/\s+/g, ' ').trim()} into separate local variables.`
  if (/className=/.test(trimmed)) return 'Applies Tailwind utility classes that control layout, spacing, color, typography, breakpoints, and interaction states.'
  if (/on(Change|Click|Submit)=/.test(trimmed)) return 'Registers an event handler for React to call later when the user performs this action.'
  if (/disabled=/.test(trimmed)) return 'Disables the control when this expression is true, preventing an invalid or duplicate user action.'
  if (/^<\/?[A-Za-z]/.test(trimmed) || /^&lt;/.test(trimmed)) return 'Renders, opens, closes, or configures a JSX element in the browser interface.'
  if (/^\},?\)?$|^\)$|^}$|^\]$|^\);?$/.test(trimmed)) return 'Closes the block, callback, array, object, JSX expression, or function call opened by the preceding lines. No new value is created on this line.'
  return 'Continues the current JavaScript, TypeScript, or JSX instruction with a value, condition, property, or nested element.'
}

function explainLine(line, extension) {
  const trimmed = line.trim()
  if (extension === '.sql') return explainSql(trimmed)
  if (extension === '.css') return explainCss(trimmed)
  if (extension === '.html') return explainHtml(trimmed)
  if (extension === '.json') return explainJson(trimmed)
  return explainJavaScript(trimmed)
}

function titleChunk(code, extension) {
  const trimmed = code.trim()
  if (!trimmed) return 'Separate logical sections'
  if (extension === '.sql') {
    const objectName = trimmed.match(/(?:table|policy|index|function|trigger)\s+(?:if\s+(?:not\s+)?exists\s+)?["']?([^\s("']+)/i)?.[1]
    if (/^create table/i.test(trimmed)) return `Create the ${objectName || 'database'} table`
    if (/^create policy/i.test(trimmed)) return `Define the ${objectName || 'RLS'} policy`
    if (/^create (unique )?index/i.test(trimmed)) return `Create the ${objectName || 'lookup'} index`
    if (/^create or replace function/i.test(trimmed)) return `Define the ${objectName || 'trigger'} function`
    if (/^create trigger/i.test(trimmed)) return `Attach the ${objectName || 'database'} trigger`
    if (/^alter table/i.test(trimmed)) return 'Change an existing table definition'
    if (/^drop /i.test(trimmed)) return 'Remove an older database definition'
    if (/^insert into/i.test(trimmed)) return 'Backfill existing user profiles'
    if (/^delete from/i.test(trimmed)) return 'Remove paused reminder rows'
    if (/^grant /i.test(trimmed)) return 'Grant table operations to signed-in users'
    if (/^notify /i.test(trimmed)) return 'Refresh the Supabase schema cache'
    return 'Continue the database migration'
  }
  if (extension === '.css') {
    if (trimmed.startsWith('@import')) return 'Load Tailwind CSS'
    if (trimmed.startsWith('@theme')) return 'Define reusable theme colors'
    if (trimmed.startsWith('@layer')) return 'Set global body defaults'
    const selector = trimmed.match(/^([^\n{]+)\s*\{/)?.[1]?.trim()
    return selector ? `Style ${selector}` : 'Continue the stylesheet'
  }
  if (extension === '.html') {
    if (/<head/i.test(trimmed)) return 'Configure the browser document'
    if (/<body/i.test(trimmed)) return 'Create the React mounting point'
    return 'Define the application HTML shell'
  }
  if (extension === '.json') {
    if (/"scripts"/.test(trimmed)) return 'Define project commands and packages'
    if (/"rewrites"/.test(trimmed)) return 'Configure Vercel route rewriting'
    return 'Configure the project'
  }
  if (/^(import .*\n?)+$/m.test(trimmed) && trimmed.split('\n').every((line) => line.startsWith('import '))) return 'Load required tools and components'
  if (/createRoot\(/.test(trimmed)) return 'Mount the React application'
  if (/createClient\(/.test(trimmed)) return 'Create the shared Supabase client'
  if (/^const WEEKDAYS/m.test(trimmed)) return 'Define weekday display and database values'
  const functionName = trimmed.match(/(?:function|const)\s+([A-Za-z0-9_]+)/)?.[1]
  const knownTitles = {
    App: 'Control authentication and application routes',
    Login: 'Define the login page',
    Register: 'Define the registration page',
    Navbar: 'Define the shared navigation bar',
    Home: 'Define the employee timesheet page',
    TimeButtons: 'Define the Time In and Time Out controls',
    AlertMessage: 'Define temporary alert feedback',
    WorkLog: 'Define the employee work-log display',
    Admin: 'Define the administrator page',
    Shift: 'Define recurring and date-specific shift scheduling',
    createEmptyBaseline: 'Create the seven editable baseline-day objects',
    getWeekStart: 'Find the Monday that begins a displayed week',
    addDays: 'Create a date a chosen number of days away',
    toDateString: 'Convert a Date into a local YYYY-MM-DD value',
    formatDate: 'Format a schedule date for Philippine readers',
    buildWeekSchedule: 'Merge overrides over the recurring baseline',
    loadSchedule: 'Load the employee baseline and selected-week overrides',
    toggleBaselineDay: 'Select or deselect a baseline weekday',
    applyBaselineTime: 'Apply one time range to selected baseline days',
    updateBaselineDay: 'Change one field on one recurring weekday',
    saveBaseline: 'Upsert working weekdays and delete recurring days off',
    changeWeek: 'Move the specific-date view by seven days',
    toggleOverrideDate: 'Select or deselect a specific calendar date',
    applyOverrideTime: 'Apply one custom time to selected dates',
    updateWeekDay: 'Change one field on one displayed date',
    saveSpecificWeek: 'Upsert date exceptions and restore chosen baselines',
    handleLogin: 'Submit the login credentials',
    handleRegister: 'Validate and submit registration',
    fetchData: 'Load employee logs and the open session',
    showAlert: 'Show and automatically clear feedback',
    timeIn: 'Start a work session and record Time In',
    timeOut: 'End the session and record its duration',
    handleSignOut: 'Sign the current user out',
    scheduleReminder: 'Validate and save a recurring reminder',
    cancelReminder: 'Delete an active reminder schedule',
    formatDuration: 'Convert decimal hours into hours and minutes',
    exportLogs: 'Build and download the filtered CSV export',
  }
  if (functionName && knownTitles[functionName]) return knownTitles[functionName]
  if (/useState\(/.test(trimmed) || /useRef\(/.test(trimmed)) return 'Initialize the component’s changing values'
  if (/useEffect\(/.test(trimmed)) return 'Run initial asynchronous loading after render'
  if (/useMemo\(/.test(trimmed)) return 'Derive the searched employee logs'
  if (/Deno\.env\.get/.test(trimmed)) return 'Read protected Edge Function secrets'
  if (/Deno\.serve/.test(trimmed)) return 'Handle an incoming reminder-processing request'
  if (/for \(const reminder/.test(trimmed)) return 'Process every active reminder schedule'
  if (/fetch\('https:\/\/api\.brevo\.com/.test(trimmed)) return 'Send the due email through Brevo'
  if (/^return \(/m.test(trimmed) || /<[A-Za-z]/.test(trimmed)) return 'Render this part of the interface'
  if (/\.from\('logs'\)/.test(trimmed)) return 'Query the work-log table'
  if (/\.from\('email_reminders'\)/.test(trimmed)) return 'Query recurring reminder schedules'
  if (/\.from\('active_sessions'\)/.test(trimmed)) return 'Query the employee’s active session'
  if (/const csv =/.test(trimmed)) return 'Convert export rows into CSV text'
  if (/new Blob/.test(trimmed)) return 'Create and trigger the CSV browser download'
  if (functionName) return `Calculate or define ${functionName}`
  if (/\.setDate\(/.test(trimmed)) return 'Move a Date to the required calendar day'
  const setter = trimmed.match(/(?:^|\n)\s*set([A-Z][A-Za-z0-9_]*)\(/)?.[1]
  if (setter) return `Update ${setter.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()} state`
  const chainedMethod = trimmed.match(/^\.?([A-Za-z][A-Za-z0-9_]*)\(/)?.[1]
  if (chainedMethod) return `Apply ${chainedMethod} to the preceding value`
  if (/^[}\])]/.test(trimmed)) return 'Finish the block opened in the preceding cell'
  const firstTag = trimmed.match(/<([A-Za-z][A-Za-z0-9]*)/)?.[1]
  if (firstTag) return `Render the ${firstTag} interface element`
  return 'Complete the current expression and pass its result onward'
}

function explainChunk(code, extension, title) {
  const parts = []
  const trimmed = code.trim()

  if (extension === '.sql') {
    if (/create table/i.test(trimmed)) parts.push('Creates durable database structure with the columns, defaults, relationships, and validation rules shown in this cell.')
    if (/create policy/i.test(trimmed)) parts.push('Defines which authenticated rows or operations pass Row Level Security.')
    if (/auth\.uid\(\)/.test(trimmed)) parts.push('The signed-in user UUID must match the row owner.')
    if (/auth\.jwt\(\)/.test(trimmed)) parts.push('The JWT app metadata must identify an administrator.')
    if (/with check/i.test(trimmed)) parts.push('New or updated row values are validated before Postgres accepts them.')
    if (/foreign key|references/i.test(trimmed)) parts.push('The foreign key both validates the referenced ID and creates a relationship Supabase can join.')
    if (/unique index/i.test(trimmed)) parts.push('The unique index prevents duplicate valid states while also accelerating matching lookups.')
    if (/grant /i.test(trimmed)) parts.push('GRANT opens the operation to the authenticated role; RLS remains the row-level security gate.')
    if (/trigger/i.test(trimmed)) parts.push('The trigger connects a table event to a function, so Postgres runs that function automatically whenever the specified INSERT or UPDATE occurs.')
    if (/insert into public\.profiles/i.test(trimmed)) parts.push('Existing or newly changed Auth identity fields are copied into the public profile used by application relationships.')
    if (/alter table/i.test(trimmed)) parts.push('This changes a table created by an earlier timestamped migration.')
    if (/delete from/i.test(trimmed)) parts.push('Rows matching the WHERE condition are permanently removed.')
  } else if (extension === '.css') {
    if (/@import/.test(trimmed)) parts.push('Loads Tailwind so utility classes used throughout JSX can be generated.')
    if (/@theme/.test(trimmed)) parts.push('Defines reusable project color tokens.')
    if (/@layer base/.test(trimmed)) parts.push('Places global element defaults in Tailwind’s base layer.')
    if (/{/.test(trimmed)) parts.push('The selector chooses elements or states; declarations inside its braces control their appearance.')
    if (/&:/.test(trimmed)) parts.push('The ampersand represents the parent selector for hover or focus state styling.')
  } else if (extension === '.html') {
    parts.push('This is the small browser shell. It supplies metadata, an empty #root element, and the module script that starts React.')
  } else if (extension === '.json') {
    if (/"scripts"/.test(trimmed)) parts.push('The scripts are the commands used for development, validation, production building, and previewing.')
    if (/"dependencies"/.test(trimmed)) parts.push('Dependencies are installed packages used by the app and its build system.')
    if (/"rewrites"/.test(trimmed)) parts.push('The rewrite sends direct page visits to index.html so React Router can choose the page in the browser.')
  } else {
    if (/^import /m.test(trimmed)) parts.push('Input: named libraries and local modules. Importing makes them available in this file; it does not by itself perform the feature.')
    if (/useState\(/.test(trimmed)) parts.push('React state stores values that change on screen. Each setter schedules another render with the new value.')
    if (/useRef\(/.test(trimmed)) parts.push('Refs keep mutable values across renders without causing a render when they change.')
  if (/useEffect\(/.test(trimmed)) parts.push('React runs this effect after rendering. Its dependency array controls when it repeats, and its returned function performs cleanup.')
    if (/useCallback\(/.test(trimmed)) parts.push('React keeps this function identity stable until a listed dependency changes; the function body runs only when code calls it.')
    if (/useMemo\(/.test(trimmed)) parts.push('React recalculates this derived value only when the listed dependencies change.')
    if (/supabase\.auth/.test(trimmed)) parts.push('This calls Supabase Authentication and uses its returned session or error.')
    if (/\.from\(/.test(trimmed)) {
      const tables = [...trimmed.matchAll(/\.from\('([^']+)'\)/g)].map((match) => match[1])
      const actions = ['select', 'insert', 'update', 'delete'].filter((action) => new RegExp(`\\.${action}\\(`).test(trimmed))
      parts.push(`Database work: ${actions.join(' and ') || 'query'} ${[...new Set(tables)].join(', ')}; chained filters, ordering, and result-shaping methods refine the same request.`)
    }
    if (/(?:^|\n)\s*set[A-Z]\w*\(/.test(trimmed)) parts.push('Result: one or more React values are updated, so dependent interface output is rendered again.')
    if (/return \(/.test(trimmed) || /<[A-Za-z]/.test(trimmed)) parts.push('Output: JSX describes the elements React should display. Props and state expressions fill in dynamic values.')
    if (/className=/.test(trimmed)) parts.push('Tailwind class names control responsive layout, spacing, color, typography, and interaction states.')
    if (/on(Change|Click|Submit)=/.test(trimmed)) parts.push('Event props store callbacks for React to run later when the user interacts.')
    if (/if \(/.test(trimmed)) parts.push('Guard conditions stop invalid work early or select the correct branch.')
    if (/new Blob|createObjectURL/.test(trimmed)) parts.push('The browser turns generated CSV text into a temporary downloadable file, clicks a temporary link, then releases its memory.')
    if (/Deno\.env\.get/.test(trimmed)) parts.push('These secrets come from the server environment and must never be exposed to React.')
    if (/fetch\(/.test(trimmed)) parts.push('An HTTP request is sent using the specified method, headers, and serialized body.')
  }

  const declaredNames = [...trimmed.matchAll(/\b(?:const|let|function)\s+([A-Za-z0-9_]+)/g)].map((match) => match[1])
  const calledNames = [...trimmed.matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\s*\(/g)]
    .map((match) => match[1])
    .filter((name) => !['if', 'for', 'while', 'switch', 'function'].includes(name))
  const uniqueCalls = [...new Set(calledNames)].slice(0, 6)
  if (declaredNames.length) parts.push(`It creates or defines ${declaredNames.map((name) => `“${name}”`).join(', ')}; later lines in the same scope can read these names.`)
  if (uniqueCalls.length) parts.push(`It invokes or configures ${uniqueCalls.map((name) => `${name}(...)`).join(', ')}. Parentheses mean those callable values are used here rather than merely referenced.`)
  if (/^[}\])]/.test(trimmed)) parts.push('Its leading closing characters finish a block or expression opened in the preceding cell; execution then resumes in the enclosing function or component.')
  if (parts.length === 0) parts.push(`This cell’s exact job is to ${title.charAt(0).toLowerCase()}${title.slice(1)}. Its individual lines are decoded below, including declarations, conditions, values, and closing syntax.`)
  return parts.join(' ')
}

function explainContinuation(line, previousLine, nextLine, extension) {
  const trimmed = line.trim()
  const previous = previousLine?.trim() || 'the preceding line'
  const next = nextLine?.trim() || 'the end of this cell'

  if (extension === '.sql') {
    if (/^(and|or)\b/i.test(trimmed)) return `Adds another boolean requirement to the preceding SQL condition. “${trimmed}” is combined with the earlier expression before Postgres decides whether the row matches.`
    if (/^(for|to|on|before|after|execute)\b/i.test(trimmed)) return `Supplies the “${trimmed}” clause to the SQL statement opened above, specifying its operation, database role, table event, or function target.`
    return `Supplies the SQL fragment “${trimmed}” to the statement opened by “${previous}”. Postgres reads it as part of the same statement until the terminating semicolon.`
  }

  if (extension === '.json') return `Assigns or continues the JSON configuration value “${trimmed}”. JSON uses the surrounding braces or brackets to determine which object or array owns it.`
  if (extension === '.css') return `Continues the selector or declaration with “${trimmed}”. It belongs to the CSS rule opened above and is interpreted before the closing brace.`
  if (extension === '.html') return `Adds “${trimmed}” to the HTML element or document section opened above; the browser combines it with the surrounding tags when building the DOM.`

  const objectProperty = trimmed.match(/^([A-Za-z_$][\w$]*):\s*(.+?)(?:,)?$/)
  if (objectProperty) return `Defines the object property “${objectProperty[1]}”. JavaScript evaluates “${objectProperty[2].replace(/,$/, '')}” and stores that result under this key in the object being built.`
  const jsxProperty = trimmed.match(/^([A-Za-z][\w-]*)=(.+)/)
  if (jsxProperty) return `Sets the JSX prop “${jsxProperty[1]}” to ${jsxProperty[2]}. React passes that value or callback to the element when this component renders.`
  const chainedCall = trimmed.match(/^\.([A-Za-z_$][\w$]*)\((.*)/)
  if (chainedCall) return `Continues the value or query from the previous line by calling .${chainedCall[1]}(...). Its arguments begin with “${chainedCall[2] || 'the values on following lines'}”, and its return value becomes the input to the next chained method.`
  const strictComparison = trimmed.match(/^([A-Za-z_$][\w$.[\]]*)\s*===\s*(.+)/)
  if (strictComparison) return `Compares the current value of ${strictComparison[1]} with ${strictComparison[2]}. It produces true when both value and type match, otherwise false; it does not change ${strictComparison[1]}.`
  const assignment = trimmed.match(/^([A-Za-z_$][\w$.[\]]*)\s*=(?!=)\s*(.+)/)
  if (assignment) return `Evaluates “${assignment[2]}” and assigns the result to ${assignment[1]}. This changes that existing variable or property for later statements in the same scope.`
  if (/^(try|finally)\s*\{?$/.test(trimmed)) return `${trimmed.startsWith('try') ? 'Begins protected work whose thrown errors can be handled by the following catch block' : 'Begins cleanup that runs whether the preceding Promise or try block succeeded or failed'}.`
  if (/^}\s*catch/.test(trimmed) || /^catch/.test(trimmed)) return 'Closes the protected try block and begins error handling. A thrown value is placed in the catch parameter for this block to inspect.'
  if (/^throw\b/.test(trimmed)) return `Stops normal execution by throwing “${trimmed.replace(/^throw\s+/, '')}”. Control moves to the nearest matching catch block or rejects the current async function’s Promise.`
  if (/^(&&|\|\|)/.test(trimmed)) return `Combines “${trimmed}” with the preceding boolean expression. JavaScript short-circuits: it evaluates the right side only when the operator requires it.`
  if (/^\?/.test(trimmed)) return `Begins the true branch of a ternary expression. JavaScript uses this value when the condition immediately before “?” is truthy; the later “:” supplies the false branch.`
  if (/^:/.test(trimmed)) return `Begins the false branch of a ternary expression. JavaScript uses this value when the condition before the matching “?” is falsy.`
  if (/^\.\.\./.test(trimmed)) return `Spreads the items or properties from “${trimmed.replace(/^\.\.\./, '').replace(/,$/, '')}” into the new array, object, or function arguments without nesting the original container.`
  if (/^["'`]/.test(trimmed)) return `Provides the text value ${trimmed.replace(/,$/, '')} to the surrounding array, object, function call, or expression.`
  if (/^(true|false|null|undefined|\d)/.test(trimmed)) return `Provides the literal value “${trimmed.replace(/,$/, '')}” to the surrounding expression. It is data, not a function call.`
  if (/^[A-Za-z_$][\w$]*,?$/.test(trimmed)) return `Passes the current value of “${trimmed.replace(/,$/, '')}” into the surrounding array, object shorthand, destructuring pattern, or function call.`
  if (/^\(/.test(trimmed)) return `Opens a grouped expression or function argument list. JavaScript evaluates the contained expression as one unit before continuing at “${next}”.`
  if (/^\{/.test(trimmed)) return 'Opens an object, block, or JSX expression. The surrounding syntax determines which kind, and the following lines supply its contents.'
  if (/^\[/.test(trimmed)) return 'Opens an array, destructuring pattern, or React dependency list. The following comma-separated items become its contents.'
  return `Evaluates the exact continuation “${trimmed}” as part of the expression begun by “${previous}”. Its resulting value or syntax is consumed by the following “${next}” before the complete statement runs.`
}

function lineDetails(code, extension, startLine) {
  const lines = code.split('\n')
  return lines.flatMap((line, index) => {
    if (!line.trim()) return []
    let explanation = explainLine(line, extension)
    if (/^(Continues the current|Continues the current SQL|Continues the current CSS)/.test(explanation)) {
      explanation = explainContinuation(line, lines[index - 1], lines[index + 1], extension)
    }
    const notes = syntaxNotes(line, extension)
    if (notes.length) {
      explanation += ` Syntax used here: ${notes.map((note) => `${note.term} — ${note.explanation}`).join(' ')}`
    }
    return [{
      line: startLine + index,
      code: line.trim(),
      explanation,
    }]
  })
}

function syntaxNotes(code, extension) {
  const notes = []
  const add = (term, explanation) => {
    if (!notes.some((note) => note.term === term)) notes.push({ term, explanation })
  }

  if (extension === '.sql') {
    if (/auth\.uid\(\)/.test(code)) add('auth.uid()', 'Returns the UUID from the signed-in user’s access token. In an RLS policy it is compared with the row owner ID.')
    if (/auth\.jwt\(\)/.test(code)) add('auth.jwt()', 'Returns the signed-in user’s JWT claims as JSON so a policy can inspect authorization metadata.')
    if (/->>/.test(code)) add('JSON ->>', 'Reads a JSON property and converts the final value to SQL text, which allows comparison with a string such as admin.')
    if (/->(?!>)/.test(code)) add('JSON ->', 'Reads a JSON property while keeping the result as JSON, allowing another JSON operator to continue deeper.')
    if (/coalesce\(/i.test(code)) add('coalesce(a, b)', 'Returns the first argument that is not NULL. It is commonly used to replace missing metadata with an empty JSON object.')
    if (/\|\|/.test(code)) add('JSONB ||', 'Merges two JSONB objects. When both contain the same key, the value from the right-hand object wins.')
    if (/using \(/i.test(code)) add('USING', 'Chooses which existing rows may be selected, updated, or deleted by this policy.')
    if (/with check \(/i.test(code)) add('WITH CHECK', 'Validates the new row produced by an INSERT or UPDATE before Postgres accepts it.')
    if (/on delete cascade/i.test(code)) add('ON DELETE CASCADE', 'Automatically deletes dependent rows when the referenced parent row is deleted.')
    if (/where .* is null/is.test(code)) add('Partial index WHERE', 'Indexes only rows matching the WHERE condition, which is useful for enforcing one currently open session.')
    if (/cardinality\(/i.test(code)) add('cardinality(array)', 'Returns how many items are stored in a Postgres array.')
    if (/<@/.test(code)) add('Array <@', 'Returns true when every item in the left array is contained in the right array.')
    if (/excluded\./i.test(code)) add('excluded', 'Inside ON CONFLICT, represents the row that was proposed for insertion and can supply replacement values.')
    if (/new\./i.test(code)) add('NEW', 'Inside a trigger function, represents the Auth row that caused the trigger to run.')
    return notes
  }

  if (/\breturn\s*(?:;|$)/m.test(code)) add('return without a value', 'Stops the current function immediately and produces undefined. Inside useEffect, undefined is allowed and means the effect did not provide a cleanup function.')

  if (extension === '.css') {
    if (/@import/.test(code)) add('@import', 'Loads rules from another stylesheet or framework into this stylesheet.')
    if (/@theme/.test(code)) add('@theme', 'Tailwind directive that turns custom values into reusable design tokens and utilities.')
    if (/@layer/.test(code)) add('@layer base', 'Places global element rules in Tailwind’s base layer so utility classes can override them predictably.')
    if (/&:/.test(code)) add('&', 'In nested CSS, means “the current parent selector”; &:hover styles the parent while it is hovered.')
    if (/var\(/.test(code)) add('var(--name)', 'Reads a CSS custom property so the same design value can be reused.')
    if (/transition:/.test(code)) add('transition', 'Animates changes to selected CSS properties instead of switching instantly.')
    if (/transform:/.test(code)) add('transform', 'Moves, rotates, scales, or changes the visual perspective without changing document layout.')
    return notes
  }

  if (extension === '.html') {
    if (/type="module"/.test(code)) add('type="module"', 'Loads JavaScript using ES module rules, enabling import/export and deferred execution after HTML parsing.')
    if (/id="root"/.test(code)) add('#root', 'The DOM container passed to ReactDOM.createRoot; React owns everything rendered inside it.')
    if (/viewport/.test(code)) add('viewport meta', 'Makes one CSS pixel correspond sensibly to a device screen pixel and enables responsive mobile layouts.')
    return notes
  }

  if (extension === '.json') {
    if (/"type"\s*:\s*"module"/.test(code)) add('"type": "module"', 'Treats project .js files as ES modules, so import and export syntax works in Node-based tools.')
    if (/\^/.test(code)) add('Version ^', 'Allows compatible package updates that do not change the leftmost non-zero version number.')
    if (/"scripts"/.test(code)) add('npm scripts', 'Named terminal shortcuts executed with npm run followed by the script name.')
    return notes
  }

  if (/\.then\s*\(/.test(code)) add('.then(callback)', 'Registers work to run after a Promise succeeds. The resolved value is passed into the callback. Unlike await, it does not pause the surrounding function; the callback runs later.')
  if (/\.catch\s*\(/.test(code)) add('.catch(callback)', 'Registers a callback for a rejected Promise. The rejection error becomes the callback argument.')
  if (/\.finally\s*\(/.test(code)) add('.finally(callback)', 'Runs after a Promise settles, whether it fulfilled or rejected; it is useful for shared cleanup such as ending loading state.')
  if (/async\s+(?:function|\(|\w)/.test(code) || /=\s*async\s*/.test(code)) add('async', 'Makes the function return a Promise and permits await inside it.')
  if (/\bawait\b/.test(code)) add('await', 'Pauses this async function until the Promise settles, then gives the completed value or throws its error.')
  if (/=>/.test(code)) add('=> arrow function', 'Creates a function. Before => are its parameters; after => is the returned expression or braced function body.')
  if (/\{\s*data\s*:\s*\{/.test(code)) add('Nested destructuring', 'Extracts a property inside another object in one pattern. { data: { session } } reads result.data.session into a local session variable.')
  else if (/const\s*\{[^}]+\}\s*=/.test(code)) add('Object destructuring', 'Extracts named properties from an object into local variables instead of reading each property separately.')
  if (/error\s*:/.test(code) && /const\s*\{/.test(code)) add('Destructuring rename', 'A pattern such as error: insertError reads the error property but stores it under the clearer local name insertError.')
  if (/\?\./.test(code)) add('?. optional chaining', 'Continues property access only when the value on the left exists; otherwise the whole expression becomes undefined instead of throwing.')
  if (/\?\?/.test(code)) add('?? nullish coalescing', 'Uses the right-hand fallback only when the left value is null or undefined, not for 0, false, or an empty string.')
  if (/\.\.\./.test(code)) add('... spread', 'Copies items from an array or properties from an object into a new array or object.')
  if (/\?[^.?][\s\S]*:/.test(code)) add('condition ? a : b', 'Ternary expression: returns a when the condition is true and b when it is false.')
  if (/&&/.test(code)) add('&& logical AND', 'The right expression is evaluated only when the left side is truthy. React uses this to render something conditionally.')
  if (/\|\|/.test(code)) add('|| logical OR', 'Uses the left value when it is truthy; otherwise evaluates and returns the right-hand fallback.')
  if (/!!/.test(code)) add('!! boolean conversion', 'The first ! negates truthiness and the second negates again, producing an actual true or false value.')
  if (/useState\(/.test(code)) add('useState(initial)', 'Gives a component persistent state and a setter. Calling the setter schedules a render with the updated state.')
  if (/useRef\(/.test(code)) add('useRef(initial)', 'Returns a persistent object with a current property. Changing current does not trigger a render.')
  if (/useEffect\(/.test(code)) add('useEffect(callback, dependencies)', 'Runs side-effect work after rendering. The dependency array controls repetition; a returned function is cleanup before rerun or unmount.')
  if (/useCallback\(/.test(code)) add('useCallback(callback, dependencies)', 'Keeps the same function object between renders until a dependency changes. It does not run the function; later parentheses such as loadSchedule() perform the call.')
  if (/\},\s*\[[^\]]*\]\)/.test(code) || /\],?\s*\)/.test(code) && /useEffect/.test(code)) add('Dependency array', 'An empty array means once after the first render. Listed values cause the effect to rerun when their identity or value changes.')
  if (/useMemo\(/.test(code)) add('useMemo(callback, dependencies)', 'Caches a calculated value and recalculates it only when a dependency changes. It does not fetch or store data by itself.')
  if (/Promise\.all\(/.test(code)) add('Promise.all([...])', 'Starts or collects several Promises and waits until all succeed. Results preserve the array order; one rejection rejects the combined Promise.')
  if (/\.map\(/.test(code)) add('.map(callback)', 'Takes an existing list, visits every item once, and builds a new list from the returned results. The new list has the same number of positions. Example: [1, 2].map(number => number * 10) produces [10, 20] without changing [1, 2].')
  if (/\.filter\(/.test(code)) add('.filter(callback)', 'Takes an existing list and builds a new, possibly shorter list. An item is kept only when the callback returns true. Example: [1, 2, 3].filter(number => number > 1) produces [2, 3].')
  if (/\.some\(/.test(code)) add('.some(callback)', 'Asks a yes-or-no question about a list: “Does at least one item pass this test?” It stops at the first match and returns true; if nothing matches, it returns false.')
  if (/\.includes\(/.test(code)) add('.includes(value)', 'Checks whether a string or array contains the supplied value and returns true or false.')
  if (/\.slice\(/.test(code)) add('.slice(start, end)', 'Returns a copied portion without changing the original. The start position is included and the end position is excluded.')
  if (/\.trim\(/.test(code)) add('.trim()', 'Returns the string without whitespace at its beginning or end.')
  if (/\.toLowerCase\(/.test(code)) add('.toLowerCase()', 'Returns a lowercase copy so text comparisons can ignore letter case.')
  if (/\.toUpperCase\(/.test(code)) add('.toUpperCase()', 'Returns an uppercase copy of a string; the original string is unchanged.')
  if (/\.charAt\(/.test(code)) add('.charAt(index)', 'Returns the character at a zero-based position. charAt(0) reads the first character.')
  if (/\.split\(/.test(code)) add('.split(separator)', 'Breaks a string into an array wherever the separator occurs. split(" ")[0] selects the first word.')
  if (/\.join\(/.test(code)) add('.join(separator)', 'Combines array items into one string with the supplied separator between them.')
  if (/\.replaceAll\(/.test(code)) add('.replaceAll(search, replacement)', 'Returns a string with every matching substring replaced. CSV escapes a quote by replacing it with two quotes.')
  if (/\.find\(/.test(code)) add('.find(callback)', 'Searches a list from the beginning and returns the first complete item whose test is true. If no item matches, the answer is undefined. Unlike filter, find returns one item, not another list.')
  if (/\.padStart\(/.test(code)) add('.padStart(length, text)', 'Adds characters to the beginning until the requested length is reached. The date helper turns 8 into 08.')
  if (/\.indexOf\(/.test(code)) add('.indexOf(value)', 'Returns the zero-based position of a value, or -1 if the value is absent.')
  if (/\.push\(/.test(code)) add('.push(value)', 'Adds an item to the end of the existing array and returns the array’s new length.')
  if (/set[A-Z]\w*\(\s*\([^)]*\)\s*=>|set[A-Z]\w*\(\s*\w+\s*=>/.test(code)) add('Functional state update', 'The setter callback receives the latest state and returns its replacement, avoiding stale values during queued updates.')
  if (/`[^`]*\$\{/.test(code)) add('Template literal', 'Backticks create a string that can insert evaluated JavaScript expressions inside ${...}.')
  if (/event\.preventDefault\(\)/.test(code)) add('event.preventDefault()', 'Stops the browser’s built-in form submission reload so React can handle the save asynchronously.')
  if (/new Date\(/.test(code)) add('new Date()', 'Creates a date/time object. With no argument it represents now; with a timestamp it parses that stored instant.')
  if (/\.toISOString\(\)/.test(code)) add('.toISOString()', 'Converts a Date to a standard UTC timestamp string suitable for timestamptz storage.')
  if (/\.toLocaleTimeString\(/.test(code)) add('.toLocaleTimeString()', 'Formats a Date’s time using the user’s locale and local timezone for display.')
  if (/\.toLocaleDateString\(/.test(code)) add('.toLocaleDateString()', 'Formats a Date’s calendar date using the user’s locale for display.')
  if (/\.getDay\(/.test(code)) add('.getDay()', 'Asks a JavaScript Date which weekday it represents. JavaScript’s built-in numbering is Sunday = 0, Monday = 1, Tuesday = 2, Wednesday = 3, Thursday = 4, Friday = 5, Saturday = 6. The numbers are labels chosen by JavaScript; they are not dates of the month.')
  if (/\.getDate\(/.test(code)) add('.getDate()', 'Returns the local day number within the month, such as 26.')
  if (/\.setDate\(/.test(code)) add('.setDate(value)', 'Changes a Date object’s local calendar day. JavaScript automatically crosses month and year boundaries when necessary.')
  if (/\.setHours\(/.test(code)) add('.setHours(h, m, s, ms)', 'Sets local clock parts. Four zeros normalize the Date to the start of that local day.')
  if (/\.toFixed\(/.test(code)) add('.toFixed(n)', 'Rounds a number to n decimal places and returns the result as a string.')
  if (/Math\.round\(/.test(code)) add('Math.round(number)', 'Rounds to the nearest whole number; this app uses it to convert decimal hours into whole minutes.')
  if (/Math\.floor\(/.test(code)) add('Math.floor(number)', 'Rounds downward to the nearest integer; dividing minutes by 60 and flooring gives complete hours.')
  if (/parseFloat\(/.test(code)) add('parseFloat(value)', 'Parses the beginning of a value as a decimal number; invalid input becomes NaN.')
  if (/Number\(/.test(code)) add('Number(value)', 'Converts a value to JavaScript’s number type; nonnumeric input becomes NaN.')
  if (/String\(/.test(code)) add('String(value)', 'Converts a value into text, including numbers, null-like fallbacks, and time values.')
  if (/%/.test(code)) add('% remainder operator', 'Returns the remainder after division. totalMinutes % 60 gives minutes left after complete hours are removed.')
  if (/===/.test(code)) add('=== strict equality', 'Compares value and type without automatic conversion; the result is true or false.')
  if (/!==/.test(code)) add('!== strict inequality', 'Returns true when the values or their types differ, without automatic conversion.')
  if (/\.select\(/.test(code)) add('.select(columns)', 'In Supabase, requests returned columns. After insert or update, adding select asks the server to return the changed row.')
  if (/\.from\(/.test(code)) add('.from(table)', 'Begins a Supabase query against the named table. Later chained methods choose the operation and filters.')
  if (/\.insert\(/.test(code)) add('.insert(values)', 'Requests creation of one or more rows using the supplied object or array of objects.')
  if (/\.update\(/.test(code)) add('.update(values)', 'Requests changes to rows selected by the chained filters.')
  if (/\.upsert\(/.test(code)) add('.upsert(values, options)', 'Inserts rows that do not exist and updates rows that conflict with the named unique key. It combines create and edit behavior.')
  if (/\.delete\(\)/.test(code)) add('.delete()', 'Requests permanent deletion of rows selected by the filters that follow.')
  if (/\.eq\(/.test(code)) add('.eq(column, value)', 'Adds an equality filter, like SQL WHERE column = value.')
  if (/\.gte\(/.test(code)) add('.gte(column, value)', 'Keeps rows whose column is greater than or equal to the supplied value. The shift page uses it for the first date of a week.')
  if (/\.lte\(/.test(code)) add('.lte(column, value)', 'Keeps rows whose column is less than or equal to the supplied value. The shift page uses it for the final date of a week.')
  if (/\.is\(/.test(code)) add('.is(column, null)', 'Tests SQL values such as NULL using IS rather than ordinary equality.')
  if (/\.maybeSingle\(/.test(code)) add('.maybeSingle()', 'Accepts zero or one matching row and returns one object instead of an array when present.')
  if (/\.single\(/.test(code)) add('.single()', 'Requires exactly one matching row and returns it as an object rather than an array.')
  if (/\.order\(/.test(code)) add('.order(column, options)', 'Adds database sorting; ascending false means highest or newest values first.')
  if (/\.limit\(/.test(code)) add('.limit(count)', 'Caps the number of rows returned by the database request.')
  if (/\.or\(/.test(code)) add('.or(filterText)', 'Groups alternative Supabase filters so a row may match either condition.')
  if (/signInWithPassword\(/.test(code)) add('signInWithPassword()', 'Sends email and password to Supabase Auth and returns a Promise containing a session or authentication error.')
  if (/signUp\(/.test(code)) add('signUp()', 'Creates a Supabase Auth user using credentials and optional user metadata, subject to project confirmation settings.')
  if (/signOut\(/.test(code)) add('signOut()', 'Clears the current Supabase Auth session and notifies registered auth-state listeners.')
  if (/getSession\(/.test(code)) add('getSession()', 'Returns a Promise containing the currently stored Supabase session or null when nobody is signed in.')
  if (/onAuthStateChange\(/.test(code)) add('onAuthStateChange()', 'Registers a callback for login, logout, and token events and returns a subscription that should be unsubscribed during cleanup.')
  if (/\.unsubscribe\(/.test(code)) add('.unsubscribe()', 'Detaches a previously registered listener so it stops receiving events and can be released.')
  if (/Array\.isArray\(/.test(code)) add('Array.isArray(value)', 'Reliably checks whether a value is an array before choosing array-specific access.')
  if (/for\s*\(const .* of /.test(code)) add('for...of', 'Loops through iterable values one at a time, allowing await and continue inside the loop body.')
  if (/\bcontinue\b/.test(code)) add('continue', 'Stops the current loop iteration immediately and proceeds with the next item.')
  if (/!\s*$|\)!/.test(code)) add('TypeScript !', 'After a value expression, the non-null assertion tells TypeScript the developer expects the value to exist; it adds no runtime check.')
  if (/:\s*(string|number|boolean)\b/.test(code)) add('Type annotation', 'Declares the value type for TypeScript’s development-time checks; it is removed when code runs.')
  if (/new Blob\(/.test(code)) add('Blob', 'Packages generated text or bytes as a browser file-like object with a MIME type.')
  if (/URL\.createObjectURL\(/.test(code)) add('Object URL', 'Creates a temporary browser URL pointing to a Blob; revokeObjectURL releases it afterward.')
  if (/URL\.revokeObjectURL\(/.test(code)) add('URL.revokeObjectURL(url)', 'Releases the browser memory associated with a temporary object URL after the download is triggered.')
  if (/document\.getElementById\(/.test(code)) add('document.getElementById(id)', 'Finds the existing HTML element with this id; main.jsx uses it as React’s mounting container.')
  if (/document\.createElement\(/.test(code)) add('document.createElement(tag)', 'Creates a DOM element in memory. The CSV exporter creates a temporary anchor element.')
  if (/\.appendChild\(/.test(code)) add('.appendChild(element)', 'Inserts a DOM element as the last child of the selected parent.')
  if (/\.click\(\)/.test(code)) add('.click()', 'Programmatically triggers the element’s click behavior; on a download anchor this starts the file download.')
  if (/\.remove\(\)/.test(code)) add('.remove()', 'Removes the DOM element from the document after it is no longer needed.')
  if (/ReactDOM\.createRoot\(/.test(code)) add('ReactDOM.createRoot()', 'Creates a React root attached to a real DOM element, enabling React to manage everything rendered inside it.')
  if (/\.render\(/.test(code)) add('.render(element)', 'Tells the React root which top-level component tree should appear inside the mounting element.')
  if (/setTimeout\(/.test(code)) add('setTimeout(callback, ms)', 'Schedules a callback for no earlier than the given milliseconds and returns a timer ID used for cancellation.')
  if (/clearTimeout\(/.test(code)) add('clearTimeout(timer)', 'Cancels a scheduled timeout using the ID returned by setTimeout.')
  if (/JSON\.stringify\(/.test(code)) add('JSON.stringify(value)', 'Serializes a JavaScript value into JSON text suitable for an HTTP request body.')
  if (/Response\.json\(/.test(code)) add('Response.json(value)', 'Creates an HTTP response whose body is JSON and whose Content-Type is set appropriately.')
  if (/\.text\(\)/.test(code)) add('response.text()', 'Returns a Promise containing the HTTP response body decoded as text.')
  if (/fetch\(/.test(code)) add('fetch(url, options)', 'Starts an HTTP request and returns a Promise for the response. Options define method, headers, and serialized body.')
  if (/Deno\.serve\(/.test(code)) add('Deno.serve(handler)', 'Starts the Edge Function HTTP server and calls the handler for each incoming request.')
  if (/Deno\.env\.get\(/.test(code)) add('Deno.env.get(name)', 'Reads a server environment variable by name. Secrets stay in the Edge Function environment rather than the browser.')
  if (/Intl\.DateTimeFormat\(/.test(code)) add('Intl.DateTimeFormat', 'Creates a locale-aware formatter; the timeZone option calculates date/time parts for the schedule’s configured timezone.')
  if (/\.formatToParts\(/.test(code)) add('.formatToParts(date)', 'Returns the formatted date as labeled pieces such as year, month, weekday, hour, and minute instead of one combined string.')
  if (/Array\.isArray\(/.test(code)) add('Array.isArray(value)', 'Reliably checks whether a value is an array before choosing array-specific access.')
  if (/\.length\b/.test(code)) add('.length', 'For arrays and strings, reports how many items or characters are present.')
  if (/function\s+\w+\s*\(\s*\{/.test(code)) add('Destructured props parameter', 'A component can extract named props directly in its parameter list instead of reading props.name repeatedly.')
  if (/=\s*false\s*\}/.test(code) || /\w+\s*=\s*false\s*\)/.test(code)) add('Default parameter value', 'Uses this fallback when the caller omits the argument or passes undefined.')
  if (/value=\{[^}]+\}[\s\S]*onChange=/.test(code)) add('Controlled input', 'React state supplies the input value, and onChange writes user edits back into state, keeping both synchronized.')
  if (/key=\{/.test(code)) add('React key', 'A stable identity used by React to match list items between renders and update the correct DOM element.')
  if (/\.map\(\([^)]*,\s*index\)/.test(code) || /\.map\(\(\w+,\s*index\)/.test(code)) add('map index', 'The second value supplied by map is the item’s zero-based position in the list: first item = 0, second = 1, third = 2. It is separate from a weekday’s stored value. In the Monday-first WEEKDAYS list, index 0 means “first displayed item, Monday,” while Monday’s day.value is 1.')
  if (/WEEKDAYS|day_of_week|dayOfWeek/.test(code)) add('weekday number', 'This app stores weekday labels using JavaScript’s convention: Sunday 0, Monday 1, Tuesday 2, Wednesday 3, Thursday 4, Friday 5, Saturday 6. WEEKDAYS is displayed Monday-first for people, so its list position is different: Monday is at index 0 but has value 1; Sunday is at index 6 but has value 0.')
  if (/className=/.test(code)) add('className', 'JSX name for the HTML class attribute. This project fills it with Tailwind utility classes.')
  if (/\bmd:/.test(code)) add('md: responsive prefix', 'Applies the following Tailwind utility at the medium breakpoint and wider; unprefixed utilities define the mobile default.')
  return notes
}

const chapterNames = {
  startup: ['Project setup', 'React startup', 'Authentication state', 'Routes and page selection'],
  auth: ['Form state', 'Input handling', 'Supabase authentication', 'Feedback and rendering'],
  navbar: ['Component inputs', 'Responsive navigation', 'Role-based links', 'User actions'],
  timekeeping: ['State and current session', 'Loading saved activity', 'Time In workflow', 'Time Out and rendering'],
  worklog: ['Component inputs', 'Visible-row calculation', 'Log formatting', 'List controls and rendering'],
  adminlogs: ['Admin state and loading', 'Search and derived rows', 'CSV export', 'Tables and reminder controls'],
  reminders: ['Reminder form state', 'Loading schedules', 'Creating schedules', 'Removing and displaying schedules'],
  processor: ['Server setup and helpers', 'Load due schedules', 'Claim and send email', 'Record results and respond'],
  shifts: ['Date helpers and state', 'Load employees and schedules', 'Edit and save baseline', 'Overrides, views, routes, and security'],
  database: ['Tables and relationships', 'Constraints and indexes', 'Triggers and automation', 'Permissions and RLS policies'],
  styling: ['Build configuration', 'Theme and global styles', 'Reusable component styles', 'Responsive and interaction states'],
}

function chapterFor(moduleId, _fileIndex, chunkIndex, chunkCount) {
  const names = chapterNames[moduleId] || ['Setup', 'Load data', 'Change data', 'Render results']
  const progress = chunkCount <= 1 ? 0 : chunkIndex / chunkCount
  const chapterIndex = Math.min(names.length - 1, Math.floor(progress * names.length))
  return `${chapterIndex + 1}. ${names[chapterIndex]}`
}

function workflowFor(moduleId, code, extension) {
  if (extension === '.sql') {
    if (/create table|references|constraint/i.test(code)) return 'Database structure'
    if (/function|trigger/i.test(code)) return 'Database automation'
    if (/policy|row level security|grant|revoke/i.test(code)) return 'Security / RLS'
    return 'Database migration'
  }
  if (extension === '.css') return /@|config|plugin/i.test(code) ? 'Styling setup' : 'Rendering / layout'
  if (/supabase\.auth|signIn|signUp|signOut|getSession|onAuthStateChange/.test(code)) return 'Authentication'
  if (/exportLogs|Blob|createObjectURL/.test(code)) return 'CSV export'
  if (/saveBaseline|upsertBaseline|baseline/i.test(code) && moduleId === 'shifts') return 'Baseline save'
  if (/override|selectedWeek|weekDates/i.test(code) && moduleId === 'shifts') return 'Specific-week save'
  if (/load|select\(/i.test(code) && /await|\.from\(/.test(code)) return 'Loading data'
  if (/insert\(|update\(|delete\(|upsert\(|handleSubmit|handleTime/i.test(code)) return 'Saving data'
  if (/return \(|className=|<[A-Za-z]/.test(code)) return 'Rendering UI'
  if (/useState|useMemo|useCallback|useEffect|const \[/.test(code)) return 'State and derived values'
  if (/fetch\(|Deno\.serve|Response/.test(code)) return 'HTTP / email delivery'
  return 'Setup and helpers'
}

function readAloud(code, extension, title) {
  const trimmed = code.trim()
  if (extension === '.sql') {
    if (/create table/i.test(trimmed)) return `Read this as: “Create a table, then require every future row to follow the listed columns and constraints.”`
    if (/create policy/i.test(trimmed)) return `Read this as: “Create a security rule; a request is allowed only when this policy condition passes.”`
    if (/using \(/i.test(trimmed)) return `Read this as: “For an existing row, allow access when the USING expression is true.”`
    if (/with check/i.test(trimmed)) return `Read this as: “For a new or changed row, accept it only when WITH CHECK is true.”`
    return `Read this as: “Ask Postgres to ${title.toLowerCase()}, using each following clause to narrow the exact behavior.”`
  }
  if (/useState\(/.test(trimmed)) return 'Read this as: “Create a remembered React value and a setter; calling the setter changes the next render.”'
  if (/useEffect\(/.test(trimmed)) return 'Read this as: “After React renders, run this side effect; rerun it when a listed dependency changes, and run returned cleanup first.”'
  if (/useCallback\(/.test(trimmed)) return 'Read this as: “Remember this function definition until a dependency changes; do not execute it until code calls it with parentheses.”'
  if (/\.from\(/.test(trimmed)) return 'Read this as: “Build one Supabase request from top to bottom: choose a table, choose an operation, add filters, then await its result.”'
  if (/^(async )?function |^const \w+ = (async )?\(/.test(trimmed)) return `Read this as: “Define ${title.toLowerCase()} now; its body runs later when the function is called.”`
  if (/return \(|<[A-Za-z]/.test(trimmed)) return 'Read this as: “Describe the interface React should show now, inserting current JavaScript values wherever braces appear.”'
  if (/^import /m.test(trimmed)) return 'Read this as: “Make these exported tools available in this file; importing alone does not run the feature.”'
  return `Read this as: “${title}; evaluate the right-hand expressions now and pass their results to the surrounding code.”`
}

function beginnerNotes(code, moduleId) {
  const notes = []
  const add = (title, explanation, example) => {
    if (!notes.some((note) => note.title === title)) notes.push({ title, explanation, example })
  }

  if (/WEEKDAYS|day_of_week|dayOfWeek|\.getDay\(/.test(code)) {
    add(
      'Weekday numbers are labels, not dates',
      'Computers need a consistent way to store a weekday. This app follows JavaScript: Sunday is 0, Monday is 1, and so on through Saturday as 6. The screen intentionally lists Monday first, but rearranging the display does not change the stored labels.',
      'Displayed order: Monday, Tuesday, …, Sunday\nList positions:  0,      1,       …, 6\nStored values:   1,      2,       …, 0',
    )
  }
  if (/\.map\(/.test(code)) {
    add(
      '.map means “do this once for every item”',
      'Imagine a row of seven weekday cards. map picks up the first card, calls the small function, saves its returned result, then repeats for every remaining card. The results form a new list; the original WEEKDAYS list is not changed.',
      `['Monday', 'Tuesday'].map((day) => day + ' shift')\n// New result: ['Monday shift', 'Tuesday shift']`,
    )
  }
  if (/\.map\(\([^)]*,\s*index\)|\.map\(\(\w+,\s*index\)/.test(code)) {
    add(
      'index means the item’s position in this particular list',
      'index starts at 0 because JavaScript counts list positions from zero. In a Monday-first list, Monday has index 0, Tuesday index 1, and Sunday index 6. That index is used here to add 0–6 days to Monday. It is not the same thing as the saved weekday value.',
      'Monday: index 0, stored weekday value 1\nTuesday: index 1, stored weekday value 2\nSunday: index 6, stored weekday value 0',
    )
  }
  if (/WEEKDAYS\.map\(\(weekday,\s*index\)/.test(code)) {
    add(
      'What this exact weekday map produces',
      'The function starts with the Monday date stored in weekStart. For each displayed weekday, index tells it how many days to add. It then creates one complete schedule object for that date. After all seven turns, map returns seven schedule objects that the page can display.',
      'Turn 1: weekday = Monday, index = 0 → Monday + 0 days\nTurn 2: weekday = Tuesday, index = 1 → Monday + 1 day\n…\nTurn 7: weekday = Sunday, index = 6 → Monday + 6 days',
    )
  }
  if (/WEEKDAYS\.map\(\(day\)\s*=>\s*\(\{/.test(code)) {
    add(
      'What this exact baseline map produces',
      'For each weekday definition, this creates a separate editable schedule object. Every new object starts disabled, uses 09:00–17:00 as its draft time, and has no note or database ID yet. Seven weekday inputs therefore become seven editable baseline rows.',
      'Monday definition → Monday editable row\nTuesday definition → Tuesday editable row\n…\nSunday definition → Sunday editable row',
    )
  }
  if (/=>/.test(code)) {
    add(
      'The arrow creates a small unnamed function',
      'The name before => is a temporary label for the current input. Code after => says what to do with that input. The function is handed to map, filter, an event handler, or another API so that API can call it at the correct time.',
      '(day) => day.label\n// For one day object, return its label.',
    )
  }
  if (/useState\(/.test(code)) {
    add(
      'State is the component’s memory',
      'A normal local variable is recreated whenever React renders the component. State is React-managed memory that survives those renders. The first name reads the current value; the set... function requests a new value and another render.',
      "const [employees, setEmployees] = useState([])\n// employees = current list\n// setEmployees(newList) = replace it and redraw",
    )
  }
  if (/\.(from|select|insert|update|delete|upsert)\(/.test(code)) {
    add(
      'The dotted lines build one database request',
      'Read the chain from top to bottom as one sentence. from chooses the table, select/insert/update/delete chooses the action, filters such as eq narrow the rows, and await waits for Supabase to return the answer.',
      "from('shifts') → choose shifts\nselect('*') → ask for columns\neq('user_id', id) → only this employee",
    )
  }
  if (/\?[^.?][\s\S]*:/.test(code)) {
    add(
      'The question mark chooses between two values',
      'This is a compact if/else called a ternary. Read it as: “If the condition is true, use the value after ?, otherwise use the value after :.” It produces one value.',
      "isAdmin ? 'Admin view' : 'Employee view'",
    )
  }
  if (/<[A-Za-z]|className=/.test(code)) {
    add(
      'JSX describes what should appear on the screen',
      'Tags such as div and button describe visible browser elements. Curly braces temporarily switch from markup into JavaScript so current data can be inserted. className controls appearance; event props such as onClick store work for later.',
      '<p>{employee.full_name}</p>\n// Show a paragraph containing the employee’s current name.',
    )
  }
  if (moduleId === 'database' && /policy|using|with check/i.test(code)) {
    add(
      'A policy is a database permission question',
      'For every requested row, Postgres evaluates the policy condition as true or false. USING checks an existing row being read, changed, or deleted. WITH CHECK checks the new version that an insert or update wants to save.',
      'user_id = auth.uid()\n// true for your own row; false for another employee’s row',
    )
  }
  return notes
}

function plainExplanation(code, title, extension) {
  if (extension === '.sql') return `This database instruction tells Supabase’s database to ${title.toLowerCase()}. It changes how information is stored or who is allowed to use it; it does not draw anything on the screen.`
  if (extension === '.css') return `This appearance instruction tells the browser how ${title.toLowerCase()}. It changes what the page looks like, not the saved employee information.`
  if (extension === '.json') return `This is a settings section. It tells a development or deployment tool how to ${title.toLowerCase()}; an employee never interacts with it directly.`
  if (/^import /m.test(code.trim())) return 'This brings in tools made somewhere else so this file may use them. Think of taking tools out of a toolbox; simply taking them out does not perform any work yet.'
  const stateMatches = [...code.matchAll(/const\s+\[([A-Za-z0-9_]+),\s*([A-Za-z0-9_]+)\]\s*=\s*useState\(/g)]
  if (stateMatches.length) {
    const purposes = stateMatches.map(([, value, setter]) => `${stateMeaning(value)} ${setter}(...) is how this component replaces ${value}.`)
    return `This cell sets up React memory used by this particular screen. ${purposes.join(' ')}`
  }
  if (/useEffect\(/.test(code)) return 'This schedules work that must happen after the page appears, such as loading saved information. React uses the final dependency list to decide when that work should happen again.'
  if (/\.map\(/.test(code)) return 'This takes a list, handles every item one at a time, and collects one new result for each item. Nothing is skipped, and the original list stays unchanged.'
  if (/\.filter\(/.test(code)) return 'This examines every item in a list and creates a shorter list containing only the items that pass the stated test.'
  if (/\.find\(/.test(code)) return 'This searches a list and stops at the first matching item. The answer is that complete item, or “nothing found” when there is no match.'
  if (/\.from\(/.test(code)) return 'This prepares one request to Supabase. Read the dotted lines from top to bottom as instructions choosing the table, action, permitted rows, and returned information.'
  if (/return \(|<[A-Za-z]/.test(code)) return 'This describes what the person using the app should see. React replaces values inside curly braces with the current information before showing the result.'
  if (/^(async )?function |^const \w+ = (async )?\(/m.test(code.trim())) return `This creates a reusable set of instructions for “${title}.” Creating it does not run it; another line must call it later.`
  return `This small section helps ${title.toLowerCase()}. Read it as one part of the larger job named at the top of this cell; the detailed rows below show what each line contributes.`
}

function timingFor(code, extension) {
  const trimmed = code.trim()
  if (extension === '.sql') return 'Runs when this SQL is executed in Supabase or applied as a migration.'
  if (extension === '.css') return 'Applied by the browser whenever an on-screen element matches this style rule.'
  if (extension === '.json') return 'Read by npm, Vite, ESLint, or Vercel during development, checking, building, or deployment.'
  if (/^import /m.test(trimmed)) return 'Runs once when the browser first loads this JavaScript module.'
  const stateMatch = trimmed.match(/const\s+\[([A-Za-z0-9_]+),\s*[A-Za-z0-9_]+\]\s*=\s*useState\(/)
  if (stateMatch) return `React reads this state line whenever the component renders. On the first render it uses the supplied starting value for ${stateMatch[1]}; on later renders React returns the value it already remembered.`
  if (/useEffect\(/.test(trimmed)) return 'Registered while React renders; its callback runs after the render and repeats when a dependency changes.'
  if (/on(Click|Change|Submit)=/.test(trimmed)) return 'The JSX is evaluated during rendering; the handler function runs later only when the person performs the named action.'
  if (/await |\.from\(/.test(trimmed)) return 'Runs only after the surrounding async function is called; it pauses that function until the server answers.'
  if (/^(async )?function |^const \w+ = (async )?\(/.test(trimmed)) return 'The function is defined when this file/component runs; its body waits until another line calls it.'
  if (/return \(|<[A-Za-z]/.test(trimmed)) return 'Evaluated whenever React renders this component, including after relevant state changes.'
  return 'Runs in order when JavaScript reaches it inside the surrounding file, function, callback, or component render.'
}

function humanizeName(name) {
  return name.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
}

const stateMeanings = {
  activeTab: "activeTab is the Shift page’s view selector. For an administrator, 'baseline' shows the recurring weekly editor, 'week' shows exact-date overrides, and 'view' shows the selected employee’s read-only schedule. An employee starts on 'week' because the administrator tabs are not available.",
  session: 'session holds the currently signed-in Supabase user and access token. App uses it to decide whether to show protected pages or the login screen.',
  employees: 'employees holds the profile rows used in employee pickers and administrator displays.',
  logs: 'logs holds the work-log rows currently loaded from Supabase for the employee or administrator screen.',
  search: 'search holds exactly what the administrator has typed into the employee-log search field.',
  reminders: 'reminders holds the active scheduled-email rows shown in the administrator reminder list.',
  reminder: 'reminder holds the values currently entered in the new scheduled-email form before they are saved.',
  selectedEmployeeId: 'selectedEmployeeId identifies which employee the administrator is currently editing or previewing on the Shift page.',
  baseline: 'baseline holds seven editable recurring weekday rows for the selected employee.',
  weekSchedule: 'weekSchedule holds the seven displayed calendar dates after recurring shifts and exact-date overrides have been combined.',
  weekStart: 'weekStart holds the Monday Date used to decide which seven-day week the Shift page displays.',
  selectedBaselineDays: 'selectedBaselineDays holds the weekday numbers selected for applying one shared baseline time.',
  selectedOverrideDates: 'selectedOverrideDates holds the exact YYYY-MM-DD dates selected for applying one shared override time.',
  loading: 'loading tells the current page whether required information is still being fetched, so it can show a loading state instead of incomplete content.',
  isLoading: 'isLoading tells the employee timesheet page that a database action is still running, which helps prevent duplicate clicks.',
  saving: 'saving tells the Shift page that a save request is in progress, so the save control can be disabled and show progress.',
  savingReminder: 'savingReminder tells the reminder form that its Supabase save request is in progress.',
  cancellingId: 'cancellingId stores the ID of the reminder currently being deleted, allowing only that row to show its cancelling state.',
  error: 'error holds a message describing the latest failed operation so the page can show it to the user.',
  message: 'message holds the latest Shift page success or error feedback shown after an action.',
  reminderMessage: 'reminderMessage holds feedback produced while creating or removing an email reminder.',
  email: 'email holds the current text entered in the email field.',
  password: 'password holds the current text entered in the password field.',
  confirmPassword: 'confirmPassword holds the repeated password so registration can verify that both password entries match.',
  fullName: 'fullName holds the person’s name entered in the registration form.',
  activeSession: 'activeSession holds the employee’s open timekeeping row, or null when the employee is not currently timed in.',
  activeTimeIn: 'activeTimeIn holds the visible starting time of the employee’s current work session.',
  alertMessage: 'alertMessage holds temporary success or error feedback on the employee timesheet page.',
  limit: 'limit controls how many work-log rows the employee page displays.',
}

function stateMeaning(name) {
  return stateMeanings[name] || `${name} is React-managed memory used by this component to control data or something visible on the page.`
}

function variableCards(code) {
  const cards = []
  const add = (name, type, example, meaning) => {
    if (!cards.some((card) => card.name === name)) cards.push({ name, type, example, meaning })
  }
  for (const match of code.matchAll(/const\s+\[([A-Za-z0-9_]+),\s*([A-Za-z0-9_]+)\]\s*=\s*useState\(([^)]*)\)/g)) {
    const [, value, setter, initial] = match
    const type = initial.trim().startsWith('[') ? 'list (array)' : initial.trim().startsWith("'") ? 'text (string)' : /true|false/.test(initial) ? 'true/false (boolean)' : 'React state value'
    add(value, type, initial || 'empty', stateMeaning(value))
    add(setter, 'function', `${setter}(newValue)`, `Replaces ${value} with a new value. React then runs the component again so every condition and element that reads ${value} can update.`)
  }
  for (const match of code.matchAll(/\bconst\s+([A-Za-z0-9_]+)\s*=\s*([^\n]+)/g)) {
    const [, name, rawValue] = match
    if (cards.some((card) => card.name === name)) continue
    const value = rawValue.replace(/,$/, '').trim()
    let type = 'calculated value'
    if (value.startsWith('[')) type = 'list (array)'
    else if (value.startsWith('{')) type = 'object (group of named values)'
    else if (/^['"`]/.test(value)) type = 'text (string)'
    else if (/^(true|false)/.test(value)) type = 'true/false (boolean)'
    else if (/^new Date|Date\(/.test(value)) type = 'Date object'
    else if (/\.map\(/.test(value)) type = 'new list (array)'
    else if (/\.find\(/.test(value)) type = 'one item or undefined'
    else if (/=>|function/.test(value)) type = 'function'
    else if (/^\d/.test(value)) type = 'number'
    add(name, type, value.slice(0, 90), `Stores the ${humanizeName(name)} so later lines can refer to it by this shorter name.`)
  }
  if (/\bindex\b/.test(code)) add('index', 'number', '0 for first item, 1 for second', 'The current item’s position in this particular list. It is not the saved weekday value.')
  if (/\bweekday\b/.test(code)) add('weekday', 'object', `{ value: 1, label: 'Monday', short: 'M' }`, 'The complete weekday object currently being handled by the loop.')
  return cards.slice(0, 8)
}

const knownContracts = {
  createEmptyBaseline: { input: 'Nothing.', work: 'Visits all seven weekday definitions and creates one editable row for each.', output: 'A new list of seven baseline schedule objects.' },
  getWeekStart: { input: 'Any calendar Date.', work: 'Copies the date, reads its weekday, and moves backward to Monday.', output: 'A new Date representing Monday at the start of that week.' },
  addDays: { input: 'A starting Date and a number of days.', work: 'Copies the date and moves the copy forward or backward.', output: 'A new Date; the original input Date is not changed.' },
  toDateString: { input: 'A JavaScript Date.', work: 'Reads year, month, and day and pads single digits.', output: 'Text in YYYY-MM-DD form, such as 2026-08-26.' },
  buildWeekSchedule: { input: 'Monday of the week, recurring baseline rows, and exact-date overrides.', work: 'Builds seven dates, prefers an override, otherwise uses the matching weekday baseline.', output: 'Seven complete day objects ready for the screen.' },
  loadSchedule: { input: 'Selected employee and displayed week from current state.', work: 'Requests baseline and override rows from Supabase and converts them into editable screen values.', output: 'Updated baseline and selected-week React state.' },
  saveBaseline: { input: 'Edited weekday rows.', work: 'Validates times, saves enabled days, and deletes rows representing recurring days off.', output: 'Updated shifts rows plus success/error feedback.' },
  saveSpecificWeek: { input: 'Seven edited exact dates.', work: 'Saves custom/day-off exceptions and deletes exceptions marked Use baseline.', output: 'Updated shift_overrides rows and refreshed schedule.' },
}

function functionContract(code) {
  const match = code.match(/(?:function|const)\s+([A-Za-z0-9_]+)\s*(?:=\s*(?:async\s*)?)?\(([^)]*)\)/)
  if (!match) return null
  const [, name, parameters] = match
  return knownContracts[name] || {
    input: parameters.trim() ? `Values supplied through: ${parameters.trim()}.` : 'No values are supplied directly.',
    work: `Performs the instructions grouped inside ${name}.`,
    output: /return\b/.test(code) ? 'The value following return.' : 'No direct return value in this cell; it may instead update state, the database, or the screen.',
  }
}

function changesFor(code, extension) {
  if (extension === '.sql') return { before: 'The earlier database structure or row permissions.', action: 'Postgres applies this SQL instruction.', after: 'The schema, stored rows, automation, or permissions reflect the new rule.' }
  if (/\.map\(/.test(code)) return { before: 'An existing list of items.', action: 'Run the callback once for every item.', after: 'A new list containing one returned result per original item; the original list is unchanged.' }
  if (/\.filter\(/.test(code)) return { before: 'An existing list that may include unwanted items.', action: 'Test every item for true or false.', after: 'A new list containing only the items whose test was true.' }
  if (/\.find\(/.test(code)) return { before: 'A list that may contain a matching item.', action: 'Test items from the beginning until one matches.', after: 'The first matching item, or undefined when none matches.' }
  if (/(?:^|\n)\s*set[A-Z]\w*\(/.test(code)) return { before: 'The component’s current remembered state.', action: 'Call a React setter with a replacement value.', after: 'React stores the value and renders the affected interface again.' }
  if (/\.(insert|update|delete|upsert)\(/.test(code)) return { before: 'The permitted rows currently stored in Supabase.', action: 'Send the requested database change.', after: 'Matching rows are created, changed, or removed if RLS and constraints allow it.' }
  if (/\.from\([^)]*\)[\s\S]*\.select\(/.test(code)) return { before: 'Information exists in Supabase but is not yet in this component.', action: 'Request permitted rows and wait for the answer.', after: 'The returned data can be checked and copied into React state.' }
  if (/return \(|<[A-Za-z]/.test(code)) return { before: 'Current props, state, and calculated values.', action: 'React evaluates this JSX description.', after: 'The user sees elements filled with the current values.' }
  return null
}

function playbackFor(code) {
  if (/WEEKDAYS\.map\(\(weekday,\s*index\)/.test(code)) return {
    title: 'Build the seven displayed dates',
    steps: [
      { label: 'Turn 1 of 7', values: 'weekday = Monday\nindex = 0', result: 'addDays(Monday, 0) → Monday' },
      { label: 'Turn 2 of 7', values: 'weekday = Tuesday\nindex = 1', result: 'addDays(Monday, 1) → Tuesday' },
      { label: 'Turn 3 of 7', values: 'weekday = Wednesday\nindex = 2', result: 'addDays(Monday, 2) → Wednesday' },
      { label: 'Turn 7 of 7', values: 'weekday = Sunday\nindex = 6', result: 'addDays(Monday, 6) → Sunday\nFinal output: seven schedule objects' },
    ],
  }
  if (/WEEKDAYS\.map\(\(day\)/.test(code)) return {
    title: 'Create one editable baseline row per weekday',
    steps: [
      { label: 'Input 1', values: `day = { value: 1, label: 'Monday' }`, result: 'Create Monday row: disabled, 09:00–17:00' },
      { label: 'Input 2', values: `day = { value: 2, label: 'Tuesday' }`, result: 'Create Tuesday row: disabled, 09:00–17:00' },
      { label: 'After all inputs', values: 'Seven weekday definitions processed', result: 'Output: seven separate editable rows' },
    ],
  }
  if (/\.map\(/.test(code)) return { title: 'Watch map build a new list', steps: [{ label: 'First item', values: 'currentItem = first list item\nindex = 0', result: 'Callback returns first new result' }, { label: 'Next item', values: 'currentItem = second list item\nindex = 1', result: 'Callback returns second new result' }, { label: 'Finished', values: 'Every item was visited once', result: 'map returns the complete new list' }] }
  if (/\.filter\(/.test(code)) return { title: 'Watch filter decide what stays', steps: [{ label: 'Test one item', values: 'callback(item) returns true', result: 'Keep this item' }, { label: 'Test another item', values: 'callback(item) returns false', result: 'Leave this item out' }, { label: 'Finished', values: 'Every item was tested', result: 'Return the new shorter list' }] }
  if (/\.find\(/.test(code)) return { title: 'Watch find stop at a match', steps: [{ label: 'Start', values: 'Check the first item', result: 'No match → continue' }, { label: 'Match', values: 'A test returns true', result: 'Stop and return this complete item' }, { label: 'No match case', values: 'Every test returned false', result: 'Return undefined' }] }
  return null
}

function comparisonFor(code) {
  if (/getDay\(|getDate\(|day_of_week|dayOfWeek|\bindex\b/.test(code)) return [
    ['index', 'Position in the current list', '0 for the first displayed item'],
    ['weekday.value / day_of_week', 'Saved weekday label', 'Monday = 1; Sunday = 0'],
    ['date.getDay()', 'Weekday label read from a Date', 'Monday = 1'],
    ['date.getDate()', 'Day number inside the month', '26 for August 26'],
  ]
  return []
}

function glossaryFor(code) {
  const definitions = {
    array: 'A list of values kept in order.', object: 'One value containing named properties.', callback: 'A function given to other code so it can call it later.', parameter: 'A temporary input name written in a function definition.', argument: 'The actual value supplied when calling a function.', expression: 'Code that produces a value.', Promise: 'A placeholder for work that will finish later.', render: 'React calculating what the screen should show.', query: 'A request to read or change database information.', row: 'One saved record in a database table.', policy: 'A database rule that decides whether an operation is allowed.', index: 'A zero-based position in a JavaScript list.',
  }
  const terms = []
  const add = (term) => { if (!terms.some((item) => item.term === term)) terms.push({ term, definition: definitions[term] }) }
  if (/\[|\.map\(|\.filter\(|\.find\(/.test(code)) add('array')
  if (/\{|\.[A-Za-z_]+/.test(code)) add('object')
  if (/=>|useEffect|useCallback|\.map\(|\.filter\(/.test(code)) add('callback')
  if (/function\s+\w+\([^)]/.test(code)) add('parameter')
  if (/\w+\([^)]/.test(code)) add('argument')
  if (/Promise|await|\.then\(/.test(code)) add('Promise')
  if (/return \(|<[A-Za-z]/.test(code)) add('render')
  if (/\.from\(/.test(code)) add('query')
  if (/insert|update|delete|select/.test(code)) add('row')
  if (/policy|using|with check/i.test(code)) add('policy')
  if (/\bindex\b/.test(code)) add('index')
  return terms
}

function cellExercise(code) {
  if (/WEEKDAYS\.map\(\(weekday,\s*index\)/.test(code)) return { question: 'If weekStart is Monday and index is 3, which date is produced?', hint: 'Start at Monday and move forward three times.', answer: 'Thursday. Monday + 0 is Monday, +1 Tuesday, +2 Wednesday, and +3 Thursday.' }
  if (/\.map\(/.test(code)) return { question: 'If the input list contains 7 items, how many results does map return?', hint: 'map returns one result for every input item.', answer: '7 results. map keeps the same number of positions unless the callback itself returns nested values.' }
  if (/\.filter\(/.test(code)) return { question: 'Can filter return fewer items than it receives?', hint: 'Items whose callback returns false are left out.', answer: 'Yes. It may return every item, some items, or an empty list.' }
  if (/\.find\(/.test(code)) return { question: 'What does find return when nothing matches?', hint: 'It does not return an empty list because find looks for one item.', answer: 'undefined.' }
  return null
}

const functionStories = {
  createEmptyBaseline: {
    purpose: 'Prepare a fresh seven-day weekly schedule form before saved shifts are added.',
    analogy: 'Like printing a blank weekly planner with one row already prepared for every day.',
    steps: ['Read the seven weekday definitions.', 'Create one editable schedule object for each weekday.', 'Start every day as disabled with 09:00–17:00 draft times.', 'Return the new seven-row list.'],
    example: 'No input → seven editable rows from Monday through Sunday.',
  },
  getWeekStart: {
    purpose: 'Turn any selected date into the Monday that begins the same displayed week.',
    analogy: 'Like opening a calendar on any day, then moving your finger backward to that week’s Monday.',
    steps: ['Copy the supplied Date so the original is safe.', 'Reset its clock to midnight.', 'Read its weekday number.', 'Calculate how far Monday is from that weekday.', 'Move the copy by that distance and return it.'],
    example: 'Wednesday, August 26 → Monday, August 24.',
  },
  addDays: {
    purpose: 'Create another calendar date a chosen number of days before or after a starting date.',
    analogy: 'Like making a photocopy of a calendar page and moving only the copy forward.',
    steps: ['Copy the starting Date.', 'Add the requested number to its calendar-day number.', 'Let JavaScript handle month/year boundaries.', 'Return the changed copy.'],
    example: 'Monday + 3 days → Thursday.',
  },
  toDateString: {
    purpose: 'Convert a Date object into the exact YYYY-MM-DD text format used by database date columns.',
    analogy: 'Like rewriting a handwritten date into one standard form every system agrees on.',
    steps: ['Read the year.', 'Read the month and add 1 because JavaScript months start at 0.', 'Read the day of the month.', 'Pad month/day to two digits.', 'Join them with hyphens.'],
    example: 'August 6, 2026 → 2026-08-06.',
  },
  buildWeekSchedule: {
    purpose: 'Create the seven final day cards shown for a week by combining normal shifts with exact-date exceptions.',
    analogy: 'Start with the normal weekly planner, then place special sticky notes over dates that are different.',
    steps: ['Visit Monday through Sunday.', 'Create the exact calendar date for the current list position.', 'Find the normal baseline for that weekday.', 'Find any override for the exact date.', 'Use the override when present; otherwise use the baseline.', 'Return seven complete display objects.'],
    example: 'Friday baseline 09:00–17:00 + Friday override “day off” → displayed Friday is off.',
  },
  loadSchedule: {
    purpose: 'Load the selected employee’s normal weekly shifts and exceptions for the currently displayed week.',
    analogy: 'Like collecting the employee’s normal planner and all sticky notes for one week before drawing the screen.',
    steps: ['Stop if no employee is selected.', 'Calculate the week’s first and last date.', 'Request baseline rows from shifts.', 'Request exact-date rows from shift_overrides.', 'Convert database rows into editable screen values.', 'Store them in React state and finish loading.'],
    example: 'Employee u1 + week Aug 24–30 → baseline rows and overrides for those dates.',
  },
  saveBaseline: {
    purpose: 'Save the administrator’s normal repeating weekly schedule for one employee.',
    analogy: 'Like replacing the employee’s standard weekly planner, not changing one special date.',
    steps: ['Validate every enabled day has sensible times.', 'Turn enabled days into database rows.', 'Upsert those working-day rows.', 'Delete old baseline rows for days now marked off.', 'Reload the saved schedule and show feedback.'],
    example: 'Enable Monday–Friday 09:00–17:00 → five shifts rows.',
  },
  saveSpecificWeek: {
    purpose: 'Save exceptions that affect exact calendar dates without rewriting the normal weekly baseline.',
    analogy: 'Like adding or removing sticky notes on individual dates.',
    steps: ['Inspect each displayed date.', 'Build rows for custom shifts and date-specific days off.', 'Upsert those exception rows.', 'Delete exceptions marked “Use baseline.”', 'Reload the week and show feedback.'],
    example: 'Aug 28 day off → one shift_overrides row for 2026-08-28.',
  },
  timeIn: {
    purpose: 'Start an employee’s current work session and record a permanent Time In activity row.',
    analogy: 'Open today’s time card, then stamp the arrival time into history.',
    steps: ['Prevent a duplicate or overlapping click.', 'Capture the current time.', 'Create the active session row.', 'Create the IN log row.', 'Update React state and show success or an error.'],
    example: 'No active session + click at 08:00 → active session and IN log at 08:00.',
  },
  timeOut: {
    purpose: 'Finish the current work session, calculate its length, and store the Time Out history.',
    analogy: 'Close the open time card, calculate elapsed work, and stamp the departure time.',
    steps: ['Require an active session.', 'Capture the current time.', 'Calculate elapsed hours from Time In.', 'Create the OUT log.', 'Remove/finish the active session and update the screen.'],
    example: 'Time In 08:00 + Time Out 17:00 → approximately 9 hours recorded.',
  },
  exportLogs: {
    purpose: 'Turn the currently filtered employee logs into a CSV file the browser can download.',
    analogy: 'Like copying the visible report into a spreadsheet-shaped text file.',
    steps: ['Create a heading row.', 'Convert every filtered log into export columns.', 'Escape commas and quotation marks safely.', 'Join rows into CSV text.', 'Create a temporary browser file link, click it, then remove it.'],
    example: 'Three filtered logs → one CSV header plus three CSV data rows.',
  },
  scheduleReminder: {
    purpose: 'Validate and save an administrator’s recurring email reminder rule.',
    analogy: 'Write instructions for the alarm clock; this function does not itself wait and send the email.',
    steps: ['Stop the form from reloading the page.', 'Validate employee, days, time, and message.', 'Insert the recurring rule into email_reminders.', 'Add the returned row to the visible list.', 'Reset the form and show feedback.'],
    example: 'Monday–Friday at 17:00 → one recurring reminder row containing five weekday values.',
  },
}

function findClosingBrace(source, openingIndex) {
  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let index = openingIndex; index < source.length; index += 1) {
    const character = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (character === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (character === '*' && next === '/') { blockComment = false; index += 1 }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === '/' && next === '/') { lineComment = true; index += 1; continue }
    if (character === '/' && next === '*') { blockComment = true; index += 1; continue }
    if (character === "'" || character === '"' || character === '`') { quote = character; continue }
    if (character === '{') depth += 1
    if (character === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return source.length - 1
}

function automaticFunctionSteps(code) {
  const candidates = []
  const add = (pattern, text) => {
    const index = code.search(pattern)
    if (index >= 0) candidates.push({ index, text })
  }
  add(/if \(/, 'Check a condition and stop or choose a different path when needed.')
  add(/useState\(/, 'Create React memory for information that changes on the screen.')
  add(/useEffect\(/, 'Schedule loading, subscription, or synchronization work after rendering.')
  add(/\.from\([^)]*\)[\s\S]*\.select\(/, 'Request permitted saved information from Supabase.')
  add(/\.(insert|upsert)\(/, 'Create new database information, or update a row when its unique identity already exists.')
  add(/\.update\(/, 'Change matching saved database rows.')
  add(/\.delete\(/, 'Remove matching saved database rows.')
  add(/set[A-Z]\w*\(/, 'Store a new React state value so the screen can update.')
  add(/return \(|<[A-Za-z]/, 'Describe or return the final result for the caller or screen.')
  return candidates.sort((a, b) => a.index - b.index).map((item) => item.text)
}

function extractFunctionGuides(source, extension) {
  if (!['.js', '.jsx', '.ts', '.tsx', '.sql'].includes(extension)) return []
  if (extension === '.sql') {
    return [...source.matchAll(/create or replace function\s+([A-Za-z0-9_.]+)\s*\(([^)]*)\)[\s\S]*?\$\$;/gi)].map((match) => {
      const startLine = source.slice(0, match.index).split('\n').length
      const lineCount = match[0].split('\n').length
      return {
        name: match[1], signature: `${match[1]}(${match[2].replace(/\s+/g, ' ').trim()})`, startLine, endLine: startLine + lineCount - 1,
        purpose: 'Run a reusable database procedure, usually automatically through a trigger.',
        analogy: 'A stored instruction card kept inside the database so Postgres can perform the same job consistently.',
        steps: ['Receive the database values or trigger row.', 'Run the statements between BEGIN and END.', 'Return the declared result so the database operation can continue.'],
        example: 'A matching table event occurs → Postgres runs this function automatically.',
        contract: { input: 'Database arguments or the trigger’s NEW/OLD row.', work: 'Execute the PL/pgSQL statements in order.', output: 'The declared SQL result or trigger row.' },
        timing: 'Runs when SQL calls it or when its attached trigger fires.', variables: [], calls: [], changes: 'May change database rows or return a trigger result.', oversized: lineCount > 120,
      }
    })
  }

  const found = []
  const pattern = /(?:export\s+default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{|const\s+([A-Za-z0-9_]+)\s*=\s*(?:useCallback\(\s*)?(?:async\s*)?\(([^)]*)\)\s*=>\s*\{/g
  for (const match of source.matchAll(pattern)) {
    const name = match[1] || match[3]
    const parameters = (match[2] ?? match[4] ?? '').replace(/\s+/g, ' ').trim()
    const openingIndex = match.index + match[0].lastIndexOf('{')
    const closingIndex = findClosingBrace(source, openingIndex)
    const startLine = source.slice(0, match.index).split('\n').length
    const functionCode = source.slice(match.index, closingIndex + 1)
    const lineCount = functionCode.split('\n').length
    const story = functionStories[name]
    const contract = knownContracts[name] || functionContract(functionCode) || {
      input: parameters ? `Values supplied as ${parameters}.` : 'No direct input values.', work: 'Run the grouped instructions in order.', output: /return\b/.test(functionCode) ? 'A returned value.' : 'A state, database, or screen change.',
    }
    const calls = [...new Set([...functionCode.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((item) => item[1]))]
      .filter((call) => !['if', 'for', 'while', 'switch', 'function', name].includes(call)).slice(0, 14)
    found.push({
      name,
      signature: `${name}(${parameters})`,
      startLine,
      endLine: startLine + lineCount - 1,
      purpose: story?.purpose || (name[0] === name[0].toUpperCase() ? `Build and control the ${name} area of the application.` : `Perform the complete “${humanizeName(name)}” task when another part of the app asks for it.`),
      analogy: story?.analogy || 'Think of this function as one named recipe: it receives ingredients, follows steps, and produces a result or change.',
      steps: story?.steps || automaticFunctionSteps(functionCode),
      example: story?.example || `${name} is called → its instructions run from top to bottom → the caller receives its result or visible change.`,
      contract,
      timing: timingFor(functionCode, extension),
      variables: variableCards(functionCode).slice(0, 10),
      calls,
      changes: changesFor(functionCode, extension)?.after || 'It calculates a value or coordinates work described in its steps.',
      oversized: lineCount > 120,
    })
  }
  const denoMatch = source.match(/Deno\.serve\(async\s*\(([^)]*)\)\s*=>\s*\{/)
  if (denoMatch) {
    const openingIndex = denoMatch.index + denoMatch[0].lastIndexOf('{')
    const closingIndex = findClosingBrace(source, openingIndex)
    const functionCode = source.slice(denoMatch.index, closingIndex + 1)
    const startLine = source.slice(0, denoMatch.index).split('\n').length
    const lineCount = functionCode.split('\n').length
    found.push({
      name: 'processEmailReminders', signature: `processEmailReminders(${denoMatch[1]})`, startLine, endLine: startLine + lineCount - 1,
      purpose: 'Handle one Cron request, find reminders that are due, and ask Brevo to send their emails safely.',
      analogy: 'Cron rings the bell; this worker checks every instruction card, delivers only the due messages, and writes down what happened.',
      steps: ['Receive the HTTP request from Cron.', 'Load active reminder schedules.', 'Calculate each schedule’s current local weekday and time.', 'Skip rows that are not due or were already sent today.', 'Claim a due row before sending to avoid duplicates.', 'Call Brevo and record success or failure.', 'Return a JSON summary.'],
      example: 'Three active rules → two skipped, one due → one Brevo request and one sent_at update.',
      contract: { input: 'An HTTP request from Supabase Cron plus server-side secrets.', work: 'Check due schedules, claim each due row, send through Brevo, and record results.', output: 'A JSON processing summary and updated reminder rows.' },
      timing: 'Runs only when Cron or another caller sends an HTTP request to this Edge Function.',
      variables: variableCards(functionCode).slice(0, 10),
      calls: [...new Set([...functionCode.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((item) => item[1]))].filter((call) => !['if', 'for', 'while'].includes(call)).slice(0, 14),
      changes: 'May send email through Brevo and update last_sent_on, sent_at, or error.', oversized: lineCount > 120,
    })
  }
  return found
}

function makeChunks(lines, extension, moduleId, fileIndex) {
  const chunks = []
  let start = 0

  const addChunk = (rangeStart, rangeEnd) => {
    const slice = lines.slice(rangeStart, rangeEnd)
    const code = slice.join('\n')
    if (!code.trim()) return
    const title = titleChunk(code, extension)
    chunks.push({
      startLine: rangeStart + 1,
      endLine: rangeEnd,
      code,
      title,
      plainExplanation: plainExplanation(code, title, extension),
      explanation: explainChunk(code, extension, title),
      lineDetails: lineDetails(code, extension, rangeStart + 1),
      syntax: syntaxNotes(code, extension),
      workflow: workflowFor(moduleId, code, extension),
      readAloud: readAloud(code, extension, title),
      beginnerNotes: beginnerNotes(code, moduleId),
      timing: timingFor(code, extension),
      variables: variableCards(code),
      contract: functionContract(code),
      changes: changesFor(code, extension),
      playback: playbackFor(code),
      comparison: comparisonFor(code),
      glossary: glossaryFor(code),
      exercise: cellExercise(code),
    })
  }

  const pushChunk = (endExclusive) => {
    if (endExclusive <= start) return
    const maximumLines = 14
    let rangeStart = start
    while (endExclusive - rangeStart > maximumLines) {
      if (lines.slice(rangeStart + maximumLines, endExclusive).every((line) => !line.trim())) break
      let rangeEnd = rangeStart + maximumLines
      for (let candidate = rangeEnd; candidate > rangeStart + 8; candidate -= 1) {
        if (/[,;{})(>]\s*$/.test(lines[candidate - 1].trim())) {
          rangeEnd = candidate
          break
        }
      }
      addChunk(rangeStart, rangeEnd)
      rangeStart = rangeEnd
    }
    addChunk(rangeStart, endExclusive)
    start = endExclusive
  }

  lines.forEach((line, index) => {
    const isLastBlankBeforeCode = line.trim() === ''
      && (index === lines.length - 1 || lines[index + 1].trim() !== '')
    if (isLastBlankBeforeCode && lines.slice(start, index).some((value) => value.trim())) {
      pushChunk(index + 1)
    }
  })
  pushChunk(lines.length)
  chunks.forEach((chunk, chunkIndex) => {
    chunk.chapter = chapterFor(moduleId, fileIndex, chunkIndex, chunks.length)
  })
  return chunks
}

const modules = Object.fromEntries(
  Object.entries(moduleFiles).map(([moduleId, files]) => [
    moduleId,
    files.map((file, fileIndex) => {
      const absolutePath = resolve(projectRoot, file)
      const source = readFileSync(absolutePath, 'utf8').replace(/\r\n/g, '\n')
      const extension = extname(file)
      const lines = (source.endsWith('\n') ? source.slice(0, -1) : source).split('\n')
      const chunks = makeChunks(lines, extension, moduleId, fileIndex)
      const functions = extractFunctionGuides(source, extension)

      if (chunks.map((chunk) => chunk.code).join('\n') !== lines.join('\n')) {
        throw new Error(`Notebook chunks do not reconstruct the complete source: ${file}`)
      }

      return {
        path: relative(projectRoot, absolutePath).replaceAll('\\', '/'),
        lineCount: lines.length,
        chunks,
        functions,
      }
    }),
  ]),
)

const fileCount = Object.values(modules).reduce((total, files) => total + files.length, 0)
const lineCount = Object.values(modules).flat().reduce((total, file) => total + file.lineCount, 0)
const chunkCount = Object.values(modules).flat().reduce((total, file) => total + file.chunks.length, 0)
const sourceHash = createHash('sha256')
  .update(JSON.stringify(modules))
  .digest('hex')
  .slice(0, 12)
const metadata = {
  sourceHash,
  moduleCount: Object.keys(modules).length,
  fileCount,
  chunkCount,
  lineCount,
}
const output = `// Generated by docs/generate-source-guide.mjs. Do not edit manually.\nwindow.AQLER_SOURCE_GUIDE_META = ${JSON.stringify(metadata, null, 2)}\nwindow.AQLER_SOURCE_GUIDE = ${JSON.stringify(modules, null, 2)}\n`

if (process.argv.includes('--check')) {
  let existing = ''
  try {
    existing = readFileSync(outputPath, 'utf8')
  } catch {
    // A missing generated file is stale by definition.
  }
  if (existing !== output) {
    console.error('The learning guide is stale. Run npm run guide:generate and commit the regenerated file.')
    process.exitCode = 1
  } else {
    console.log(`Guide is current for source snapshot ${sourceHash}.`)
  }
} else {
  writeFileSync(outputPath, output, 'utf8')
  console.log(`Generated ${relative(projectRoot, outputPath)} with ${fileCount} module-file entries, ${chunkCount} notebook cells, and ${lineCount} covered lines. Snapshot ${sourceHash}.`)
}
