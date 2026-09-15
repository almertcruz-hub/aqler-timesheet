export const CONCERN_CATEGORIES = [
  {
    value: 'incorrect_salary',
    label: 'Incorrect salary',
  },
  {
    value: 'missing_overtime',
    label: 'Missing overtime',
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
    value: 'late_leave_filing_or_approval',
    label: 'Late leave filing or approval',
  },
  {
    value: 'leave_issue',
    label: 'Leave issue',
  },
  {
    value: 'absence_issue',
    label: 'Absence issue',
  },
  {
    value: 'failed_overtime_approval',
    label: 'Failed overtime approval',
  },
  {
    value: 'missing_time_in',
    label: 'Missing Time In',
  },
  {
    value: 'missing_time_out',
    label: 'Missing Time Out',
  },
  {
    value: 'wrong_punch',
    label: 'Wrong punch',
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

export function getCategoryLabel(categoryValue) {
  const category = CONCERN_CATEGORIES.find(
    (item) => item.value === categoryValue
  )

  return category?.label || categoryValue
}

export function getStatusLabel(statusValue) {
  const status = CONCERN_STATUSES.find(
    (item) => item.value === statusValue
  )

  return status?.label || statusValue
}