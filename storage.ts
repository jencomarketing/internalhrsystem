import { User, UserRole, LeaveRequest, AttendanceRecord, LeaveType, LeaveStatus, Entitlement, LeaveDuration, ReplacementClaim, PublicHoliday, AdjustmentLog, Notification } from '../types';

// Initial Seed Data
const INITIAL_ADMIN: User = {
  id: 'admin-1',
  username: 'admin',
  password: 'password',
  fullName: 'Jenco Admin',
  position: 'Director',
  joiningDate: '2020-01-01',
  role: UserRole.ADMIN,
  leaveAdjustments: { annualLeaveAdjustment: 0, replacementLeaveBalance: 0 },
  adjustmentLogs: []
};

const INITIAL_STAFF: User = {
  id: 'staff-1',
  username: 'staff',
  password: 'password',
  fullName: 'Alex Tan',
  position: 'Marketing Exec',
  joiningDate: '2022-05-15',
  role: UserRole.STAFF,
  leaveAdjustments: { annualLeaveAdjustment: 0, replacementLeaveBalance: 0 },
  adjustmentLogs: []
};

export const PUBLIC_HOLIDAYS: PublicHoliday[] = [
  { name: "New Year", date: "Jan 1" },
  { name: "Chinese New Year Day 1", date: "Jan/Feb", remarks: "Lunar Calendar" },
  { name: "Chinese New Year Day 2", date: "Jan/Feb", remarks: "Lunar Calendar" },
  { name: "Birthday of DYMM", date: "Dec 11", remarks: "Selangor State Ruler" },
  { name: "Labour Day", date: "May 1" },
  { name: "Hari Raya Puasa Day 1", date: "Date Varies", remarks: "Islamic Calendar" },
  { name: "Hari Raya Puasa Day 2", date: "Date Varies", remarks: "Islamic Calendar" },
  { name: "Hari Raya Haji", date: "Date Varies", remarks: "Islamic Calendar" },
  { name: "National Day", date: "Aug 31" },
  { name: "Malaysia Day", date: "Sep 16" },
  { name: "Deepavali", date: "Oct/Nov", remarks: "Hindu Calendar" },
  { name: "Christmas", date: "Dec 25" },
  { name: "State Holiday", date: "Varies", remarks: "Designated State Holiday" }
];

const STORAGE_KEYS = {
  USERS: 'jenco_users',
  LEAVES: 'jenco_leaves',
  CLAIMS: 'jenco_claims',
  ATTENDANCE: 'jenco_attendance',
  NOTIFICATIONS: 'jenco_notifications',
  CURRENT_USER: 'jenco_current_user'
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class StorageService {
  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([INITIAL_ADMIN, INITIAL_STAFF]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LEAVES)) {
      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLAIMS)) {
      localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    }
  }

  getPublicHolidays(): PublicHoliday[] {
    return PUBLIC_HOLIDAYS;
  }

  // --- Utility ---
  calculateWorkingDays(startDateStr: string, endDateStr: string): number {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    let count = 0;
    const cur = new Date(start);

    while (cur <= end) {
      const dayOfWeek = cur.getDay();
      // Exclude Sunday (0) and Saturday (6)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  // --- Notifications (Internal Helpers) ---
  getAllNotifications(): Notification[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
  }

  getUserNotifications(userId: string): Notification[] {
    const all = this.getAllNotifications();
    return all.filter(n => n.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  markNotificationRead(id: string): void {
    const all = this.getAllNotifications();
    const idx = all.findIndex(n => n.id === id);
    if (idx !== -1) {
      all[idx].isRead = true;
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
    }
  }

  markAllRead(userId: string): void {
    const all = this.getAllNotifications();
    const updated = all.map(n => n.userId === userId ? { ...n, isRead: true } : n);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }

  private _createNotification(userId: string, message: string, type: 'info' | 'success' | 'alert', relatedId?: string, relatedType?: 'LEAVE' | 'CLAIM') {
    const all = this.getAllNotifications();
    const newNote: Notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      userId,
      message,
      type,
      timestamp: new Date().toISOString(),
      isRead: false,
      relatedId,
      relatedType
    };
    all.push(newNote);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
  }

  private _notifyAdmins(message: string, type: 'info' | 'success' | 'alert', relatedId?: string, relatedType?: 'LEAVE' | 'CLAIM') {
    const users = this.getEmployees();
    const admins = users.filter(u => u.role === UserRole.ADMIN);
    admins.forEach(admin => {
      this._createNotification(admin.id, message, type, relatedId, relatedType);
    });
  }

  // --- Auth ---
  async login(username: string, password: string): Promise<User | null> {
    await delay(500);
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    return null;
  }

  logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  getCurrentUser(): User | null {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return stored ? JSON.parse(stored) : null;
  }

  // --- Employees ---
  getEmployees(): User[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  }

  addEmployee(user: User): void {
    const users = this.getEmployees();
    if (!user.leaveAdjustments) user.leaveAdjustments = { annualLeaveAdjustment: 0, replacementLeaveBalance: 0 };
    if (!user.adjustmentLogs) user.adjustmentLogs = [];
    users.push(user);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  updateEmployee(updatedUser: User): void {
    const users = this.getEmployees();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      // Preserve logs if not passed in updatedUser explicitly
      if (!updatedUser.adjustmentLogs) {
          updatedUser.adjustmentLogs = users[index].adjustmentLogs || [];
      }
      users[index] = updatedUser;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }

  // NEW: Audit Log Adjustment + Notification
  async adjustUserBalance(adminName: string, userId: string, type: 'Annual Leave' | 'Replacement Credit', amount: number, reason: string): Promise<void> {
    await delay(300);
    const users = this.getEmployees();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        const user = users[index];
        if (!user.leaveAdjustments) user.leaveAdjustments = { annualLeaveAdjustment: 0, replacementLeaveBalance: 0 };
        if (!user.adjustmentLogs) user.adjustmentLogs = [];

        // Apply Adjustment
        if (type === 'Annual Leave') {
            user.leaveAdjustments.annualLeaveAdjustment += amount;
        } else {
            user.leaveAdjustments.replacementLeaveBalance += amount;
        }

        // Add Log
        const log: AdjustmentLog = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            adminName,
            type,
            amount,
            reason
        };
        user.adjustmentLogs.unshift(log); // Add to top

        users[index] = user;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

        // NOTIFY STAFF
        const msg = `Admin ${adminName} adjusted your ${type} by ${amount > 0 ? '+' : ''}${amount}. Reason: ${reason}`;
        this._createNotification(user.id, msg, 'info');
    }
  }

  deleteEmployee(id: string): void {
    const users = this.getEmployees().filter(u => u.id !== id);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  // --- Attendance ---
  getAttendance(userId?: string): AttendanceRecord[] {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]') as AttendanceRecord[];
    if (userId) return all.filter(a => a.userId === userId);
    return all.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
  }

  async checkIn(userId: string, location: string, coords: { lat: number; lng: number }): Promise<AttendanceRecord> {
    await delay(500);
    const now = new Date();
    
    const record: AttendanceRecord = {
      id: Date.now().toString(),
      userId,
      date: now.toISOString().split('T')[0],
      checkInTime: now.toISOString(),
      location,
      coordinates: coords,
      status: 'Checked In'
    };

    const all = this.getAttendance();
    all.push(record);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
    return record;
  }

  async checkOut(userId: string): Promise<void> {
    await delay(500);
    const all = this.getAttendance();
    const todayStr = new Date().toISOString().split('T')[0];
    const recordIndex = all.findIndex(a => a.userId === userId && a.date === todayStr);
    
    if (recordIndex !== -1) {
      const now = new Date();
      all[recordIndex].checkOutTime = now.toISOString();
      
      const checkIn = new Date(all[recordIndex].checkInTime);
      const durationMs = now.getTime() - checkIn.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      all[recordIndex].status = durationHours >= 9 ? 'Completed' : 'Incomplete Hours';
      
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
    }
  }

  // --- Leaves ---
  getLeaves(userId?: string): LeaveRequest[] {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEAVES) || '[]') as LeaveRequest[];
    const filtered = userId ? all.filter(l => l.userId === userId) : all;
    return filtered.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
  }

  async applyLeave(request: LeaveRequest): Promise<void> {
    await delay(600);
    const all = this.getLeaves();
    all.push(request);
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(all));

    // NOTIFY ADMINS (with ACTIONABLE ID)
    this._notifyAdmins(`${request.userName} applied for ${request.type} (${request.startDate}).`, 'info', request.id, 'LEAVE');
  }

  async updateLeaveStatus(leaveId: string, status: LeaveStatus): Promise<void> {
    await delay(400);
    const all = this.getLeaves();
    const idx = all.findIndex(l => l.id === leaveId);
    if (idx !== -1) {
      all[idx].status = status;
      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(all));

      // NOTIFY STAFF
      const leave = all[idx];
      const msg = `Your ${leave.type} application for ${leave.startDate} has been ${status}.`;
      this._createNotification(leave.userId, msg, status === LeaveStatus.APPROVED ? 'success' : 'alert');
    }
  }

  // --- Replacement Claims ---
  getClaims(userId?: string): ReplacementClaim[] {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLAIMS) || '[]') as ReplacementClaim[];
    const filtered = userId ? all.filter(c => c.userId === userId) : all;
    return filtered.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
  }

  async applyClaim(claim: ReplacementClaim): Promise<void> {
    await delay(600);
    const all = this.getClaims();
    all.push(claim);
    localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(all));

    // NOTIFY ADMINS (with ACTIONABLE ID)
    this._notifyAdmins(`${claim.userName} submitted a replacement credit claim for ${claim.workDate}.`, 'info', claim.id, 'CLAIM');
  }

  async updateClaimStatus(claimId: string, status: LeaveStatus): Promise<void> {
    await delay(400);
    const all = this.getClaims();
    const idx = all.findIndex(c => c.id === claimId);
    if (idx !== -1) {
      const claim = all[idx];
      const oldStatus = claim.status;
      claim.status = status;
      
      // If Approved, automatically add to user's balance
      if (status === LeaveStatus.APPROVED && oldStatus !== LeaveStatus.APPROVED) {
        const users = this.getEmployees();
        const userIdx = users.findIndex(u => u.id === claim.userId);
        if (userIdx !== -1) {
            const addedValue = (claim.duration === LeaveDuration.FULL) ? 1 : 0.5;
            const currentBalance = users[userIdx].leaveAdjustments?.replacementLeaveBalance || 0;
            
            if (!users[userIdx].leaveAdjustments) {
                users[userIdx].leaveAdjustments = { annualLeaveAdjustment: 0, replacementLeaveBalance: 0 };
            }
            // @ts-ignore
            users[userIdx].leaveAdjustments.replacementLeaveBalance = currentBalance + addedValue;
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        }
      }
      localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(all));

      // NOTIFY STAFF
      const msg = `Your Replacement Credit claim for ${claim.workDate} has been ${status}.`;
      this._createNotification(claim.userId, msg, status === LeaveStatus.APPROVED ? 'success' : 'alert');
    }
  }

  // --- Entitlement Logic ---
  calculateEntitlement(user: User): Entitlement {
    const joinDate = new Date(user.joiningDate);
    const now = new Date();
    
    let yearsOfService = now.getFullYear() - joinDate.getFullYear();
    const m = now.getMonth() - joinDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < joinDate.getDate())) {
      yearsOfService--;
    }

    // 1. Annual Leave (Strictly based on policy image)
    let annualTotal = 12; // Less than 3 years
    if (yearsOfService >= 3 && yearsOfService < 5) annualTotal = 14;
    else if (yearsOfService >= 5 && yearsOfService < 10) annualTotal = 16;
    else if (yearsOfService >= 10) annualTotal = 18;

    const adjustments = user.leaveAdjustments || { annualLeaveAdjustment: 0, replacementLeaveBalance: 0 };
    annualTotal += (adjustments.annualLeaveAdjustment || 0);

    // 2. Sick Leave
    let sickTotal = 14;
    if (yearsOfService >= 2 && yearsOfService < 5) sickTotal = 18;
    else if (yearsOfService >= 5) sickTotal = 22;

    const hospitalizationTotal = 60;
    
    const replacementTotal = adjustments.replacementLeaveBalance || 0;

    const birthdayTotal = 0.5;
    
    const carriedForward = 0; 

    const leaves = this.getLeaves(user.id).filter(l => l.status === LeaveStatus.APPROVED);
    
    const countDays = (l: LeaveRequest) => {
      if (l.duration === LeaveDuration.HALF_AM || l.duration === LeaveDuration.HALF_PM) {
        return 0.5;
      }
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    };

    return {
      annualTotal: annualTotal + carriedForward,
      sickTotal,
      hospitalizationTotal,
      replacementTotal,
      birthdayTotal,
      
      annualUsed: leaves.filter(l => l.type === LeaveType.ANNUAL).reduce((acc, l) => acc + countDays(l), 0),
      sickUsed: leaves.filter(l => l.type === LeaveType.SICK).reduce((acc, l) => acc + countDays(l), 0),
      hospitalizationUsed: leaves.filter(l => l.type === LeaveType.HOSPITALIZATION).reduce((acc, l) => acc + countDays(l), 0),
      replacementUsed: leaves.filter(l => l.type === LeaveType.REPLACEMENT).reduce((acc, l) => acc + countDays(l), 0),
      birthdayUsed: leaves.filter(l => l.type === LeaveType.BIRTHDAY).reduce((acc, l) => acc + countDays(l), 0),
      
      carriedForward
    };
  }
}

export const storageService = new StorageService();
