export const CONCERN_CATEGORIES = [
  {
    value: 'sick_leave',
    label: 'Sick Leave',
  },
  {
    value: 'vacation_leave',
    label: 'Vacation Leave',
  },
  {
    value: 'file_overtime',
    label: 'File Overtime',
  },
  {
    value: 'incorrect_salary',
    label: 'Incorrect salary',
  },
  {
    value: 'missing_overtime',
    label: 'Overtime concern',
  },
  {
    value: 'incorrect_deduction',
    label: 'Incorrect deduction',
  },
  {
    value: 'missing_hours',
    label: 'Missing hours',
  },
  {
    value: 'missing_allowance',
    label: 'Missing allowance',
  },
  {
    value: 'leave_issue',
    label: 'Leave concern',
  },
  {
    value: 'absence_issue',
    label: 'Absence issue',
  },
  {
    value: 'missing_time_in',
    label: 'Missing Time In',
  },
  {
    value: 'late_time_in',
    label: 'Late Time In',
  },
  {
    value: 'missing_time_out',
    label: 'Missing Time Out',
  },
  {
    value: 'wrong_punch',
    label: 'Incorrect time entry',
  },
  {
    value: 'wrong_schedule',
    label: 'Wrong schedule',
  },
  {
    value: 'other',
    label: 'Other',
  },
]

export const CONCERN_STATUSES = [
  {
    value: 'open',
    label: 'Open',
  },
  {
    value: 'in_review',
    label: 'In review',
  },
  {
    value: 'resolved',
    label: 'Resolved',
  },
]

// Group older submissions under the current categories without rewriting records.
export function normalizeCategory(categoryValue) {
  if (categoryValue === 'late_leave_filing_or_approval') return 'leave_issue'
  if (categoryValue === 'failed_overtime_approval') return 'missing_overtime'
  return categoryValue
}

export function getCategoryLabel(categoryValue) {
  const category = CONCERN_CATEGORIES.find(
    (item) => item.value === normalizeCategory(categoryValue)
  )

  return category?.label || categoryValue
}

export function getStatusLabel(statusValue) {
  const status = CONCERN_STATUSES.find(
    (item) => item.value === statusValue
  )

  return status?.label || statusValue
}
