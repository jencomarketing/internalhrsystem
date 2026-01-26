import { User, UserRole, LeaveRequest, AttendanceRecord, LeaveType, LeaveStatus, Entitlement, LeaveDuration, ReplacementClaim, PublicHoliday, AdjustmentLog, Notification } from '../types';

// --- STANDARD CLEAN SEED DATA ---
const SEED_USERS: User[] = [
  {
    id: 'admin-1',
    username: 'admin',
    password: 'password',
    fullName: 'Jenco Director',
    position: 'Director',
    joiningDate: '2020-01-01',
    role: UserRole.ADMIN,
    leaveAdjustments: { annualLeaveAdjustment: 0, replacementLeaveBalance: 0 },
    adjustmentLogs: []
  },
  {
    id: 'staff-1',
    username: 'alex',
    password: 'password',
    fullName: 'Alex Tan',
    position: 'Marketing Exec',
    joiningDate: '2022-05-15',
    role: UserRole.STAFF,
    leaveAdjustments: { annualLeaveAdjustment: 0, replacementLeaveBalance: 0 },
    adjustmentLogs: []
  }
];

export const PUBLIC_HOLIDAYS: PublicHoliday[] = [
  { name: "New Year", date: "Jan 1" },
  { name: "Chinese New Year Day 1", date: "Jan 22", remarks: "Lunar Calendar" },
  { name: "Chinese New Year Day 2", date: "Jan 23", remarks: "Lunar Calendar" },
  { name: "Labour Day", date: "May 1" },
  { name: "National Day", date: "Aug 31" },
  { name: "Malaysia Day", date: "Sep 16" },
  { name: "Christmas", date: "Dec 25" },
];

const STORAGE_KEYS = {
  USERS: 'jenco_users_clean',
  LEAVES: 'jenco_leaves_clean',
  CLAIMS: 'jenco_claims_clean',
  ATTENDANCE: 'jenco_attendance_clean',
  NOTIFICATIONS: 'jenco_notifications_clean',
  CURRENT_USER: 'jenco_current_user_clean'
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class StorageService {
  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify([]));
    }
  }

  getPublicHolidays(): PublicHoliday[] {
    return PUBLIC_HOLIDAYS;
  }

  // --- Utility ---
  calculateWorkingDays(startDateStr: string, endDateStr: string): number {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    let count = 0;
    const cur = new Date(start);

    while (cur <= end) {
      const dayOfWeek = cur.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  // --- Notifications ---
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
    await delay(200);
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.username === username && (u.password === password || password === 'password')); // Relaxed password for demo
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
      if (!updatedUser.adjustmentLogs) {
          updatedUser.adjustmentLogs = users[index].adjustmentLogs || [];
      }
      users[index] = updatedUser;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }

  async adjustUserBalance(adminName: string, userId: string, type: 'Annual Leave' | 'Replacement Credit', amount: number, reason: string): Promise<void> {
    const users = this.getEmployees();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        const user = users[index];
        if (!user.leaveAdjustments) user.leaveAdjustments = { annualLeaveAdjustment: 0, replacementLeaveBalance: 0 };
        if (!user.adjustmentLogs) user.adjustmentLogs = [];

        if (type === 'Annual Leave') {
            user.leaveAdjustments.annualLeaveAdjustment += amount;
        } else {
            user.leaveAdjustments.replacementLeaveBalance += amount;
        }

        const log: AdjustmentLog = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            adminName,
            type,
            amount,
            reason
        };
        user.adjustmentLogs.unshift(log);
        users[index] = user;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        this._createNotification(user.id, `Admin ${adminName} adjusted your ${type} by ${amount > 0 ? '+' : ''}${amount}.`, 'info');
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
    const all = this.getAttendance();
    const todayStr = new Date().toISOString().split('T')[0];
    const recordIndex = all.findIndex(a => a.userId === userId && a.date === todayStr);
    
    if (recordIndex !== -1) {
      const now = new Date();
      all[recordIndex].checkOutTime = now.toISOString();
      all[recordIndex].status = 'Completed'; 
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
    const all = this.getLeaves();
    all.push(request);
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(all));
    this._notifyAdmins(`${request.userName} applied for ${request.type}.`, 'info', request.id, 'LEAVE');
  }

  async updateLeaveStatus(leaveId: string, status: LeaveStatus): Promise<void> {
    const all = this.getLeaves();
    const idx = all.findIndex(l => l.id === leaveId);
    if (idx !== -1) {
      all[idx].status = status;
      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(all));
      this._createNotification(all[idx].userId, `Your leave was ${status}.`, status === LeaveStatus.APPROVED ? 'success' : 'alert');
    }
  }

  // --- Claims ---
  getClaims(userId?: string): ReplacementClaim[] {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLAIMS) || '[]') as ReplacementClaim[];
    const filtered = userId ? all.filter(c => c.userId === userId) : all;
    return filtered.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
  }

  async applyClaim(claim: ReplacementClaim): Promise<void> {
    const all = this.getClaims();
    all.push(claim);
    localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(all));
    this._notifyAdmins(`${claim.userName} submitted a claim.`, 'info', claim.id, 'CLAIM');
  }

  async updateClaimStatus(claimId: string, status: LeaveStatus): Promise<void> {
    const all = this.getClaims();
    const idx = all.findIndex(c => c.id === claimId);
    if (idx !== -1) {
      all[idx].status = status;
      if (status === LeaveStatus.APPROVED) {
        // Auto add balance
        const users = this.getEmployees();
        const uIdx = users.findIndex(u => u.id === all[idx].userId);
        if(uIdx !== -1) {
            users[uIdx].leaveAdjustments!.replacementLeaveBalance += (all[idx].duration === LeaveDuration.FULL ? 1 : 0.5);
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        }
      }
      localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(all));
      this._createNotification(all[idx].userId, `Your claim was ${status}.`, status === LeaveStatus.APPROVED ? 'success' : 'alert');
    }
  }

  // --- Entitlement ---
  calculateEntitlement(user: User): Entitlement {
    const joinDate = new Date(user.joiningDate);
    const now = new Date();
    let yearsOfService = now.getFullYear() - joinDate.getFullYear();
    const m = now.getMonth() - joinDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < joinDate.getDate())) yearsOfService--;

    let annualTotal = 12; 
    if (yearsOfService >= 3 && yearsOfService < 5) annualTotal = 14;
    else if (yearsOfService >= 5 && yearsOfService < 10) annualTotal = 16;
    else if (yearsOfService >= 10) annualTotal = 18;

    const adjustments = user.leaveAdjustments || { annualLeaveAdjustment: 0, replacementLeaveBalance: 0 };
    annualTotal += (adjustments.annualLeaveAdjustment || 0);

    const leaves = this.getLeaves(user.id).filter(l => l.status === LeaveStatus.APPROVED);
    const countDays = (l: LeaveRequest) => (l.duration === LeaveDuration.FULL ? 1 : 0.5);

    return {
      annualTotal,
      sickTotal: 14,
      hospitalizationTotal: 60,
      replacementTotal: adjustments.replacementLeaveBalance || 0,
      birthdayTotal: 0.5,
      annualUsed: leaves.filter(l => l.type === LeaveType.ANNUAL).reduce((acc, l) => acc + countDays(l), 0),
      sickUsed: leaves.filter(l => l.type === LeaveType.SICK).reduce((acc, l) => acc + countDays(l), 0),
      hospitalizationUsed: leaves.filter(l => l.type === LeaveType.HOSPITALIZATION).reduce((acc, l) => acc + countDays(l), 0),
      replacementUsed: leaves.filter(l => l.type === LeaveType.REPLACEMENT).reduce((acc, l) => acc + countDays(l), 0),
      birthdayUsed: leaves.filter(l => l.type === LeaveType.BIRTHDAY).reduce((acc, l) => acc + countDays(l), 0),
      carriedForward: 0
    };
  }
}

export const storageService = new StorageService();
