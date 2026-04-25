export const BookingType = {
  FIXED_WEEK: 'FIXED_WEEK',
  REQUESTED: 'REQUESTED',
} as const
export type BookingType = typeof BookingType[keyof typeof BookingType]

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const
export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus]

export const ApprovalDecision = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
} as const
export type ApprovalDecision = typeof ApprovalDecision[keyof typeof ApprovalDecision]
