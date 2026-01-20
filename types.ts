
export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export enum LeaveType {
  ANNUAL = 'Annual Leave',
  SICK = 'Sick Leave',
  HOSPITALIZATION = 'Hospitalization Leave',
  EMERGENCY = 'Emergency Leave',
  NO_PAY = 'No Pay Leave',
  REPLACEMENT = 'Replacement Leave',
  BIRTHDAY = 'Birthday Leave'
}

export enum LeaveDuration {
  FULL = 'Full Day',
  HALF_AM = 'Half Day (AM)',
  HALF_PM = 'Half Day (PM)'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface AdjustmentLog {
  id: string;
  date: string;
  adminName: string;
  type: 'Annual Leave' | 'Replacement Credit';
  amount: number; // e.g., +1, -2
  reason: string;
}

export interface Notification {
  id: string;
  userId: string; // Receiver ID
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'info' | 'success' | 'alert';
  // New fields for actionable notifications
  relatedId?: string; 
  relatedType?: 'LEAVE' | 'CLAIM';
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  position: string;
  joiningDate: string;
  role: UserRole;
  avatarUrl?: string;
  // Admin adjustable balances
  leaveAdjustments?: {
    annualLeaveAdjustment: number;
    replacementLeaveBalance: number;
  };
  adjustmentLogs?: AdjustmentLog[];
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO
  checkOutTime?: string; // ISO
  location: string;
  coordinates: { lat: number; lng: number };
  status: 'Checked In' | 'Completed' | 'Incomplete Hours';
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  type: LeaveType;
  duration: LeaveDuration;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
  status: LeaveStatus;
  appliedAt: string;
}

export interface ReplacementClaim {
  id: string;
  userId: string;
  userName: string;
  workDate: string; // The date they worked extra
  duration: LeaveDuration; // Full or Half day earned
  description: string;
  status: LeaveStatus;
  appliedAt: string;
}

export interface PublicHoliday {
  name: string;
  date: string; // Description or Date
  remarks?: string;
}

export interface Entitlement {
  annualTotal: number;
  sickTotal: number;
  hospitalizationTotal: number;
  replacementTotal: number; // Dynamic based on claims + manual adjustment
  birthdayTotal: number;
  
  annualUsed: number;
  sickUsed: number;
  hospitalizationUsed: number;
  replacementUsed: number;
  birthdayUsed: number;
  
  carriedForward: number;
}
