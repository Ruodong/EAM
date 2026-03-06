// ============================================================
// Shared TypeScript types for EAM (Enterprise Architecture Management)
// ============================================================

// --- User ---
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'admin' | 'reviewer' | 'user';
  itCode?: string;
}

// --- Project ---
export interface Project {
  id: number;
  projectId: string;
  projectName: string;
  pm: string;
  dtLead: string;
  itLead: string;
  aiRelated: string;
  comments?: string;
  highFocus: boolean;
  requestStatus?: string;
  createdBy: string;
  createdAt: string;
  changedBy?: string;
  changedAt?: string;
}

// --- EA Review Request ---
export type RequestStatus = 'Draft' | 'Submitted' | 'In Progress' | 'Completed';
export type ReviewResult = 'Approved' | 'Approved with Actions' | 'Accepted by EA' | 'Rejected' | '';
export type ReviewScope = 'All' | 'Part of Project';

export interface EARequest {
  id: number;
  requestId: string;
  requestName: string;
  requestStatus: RequestStatus;
  reviewResult: ReviewResult;
  reviewScope: ReviewScope;
  projectId: string;
  projectName: string;
  wsName?: string;
  requestor: string;
  assignedReviewer?: string;
  pm: string;
  dtLead?: string;
  itLead?: string;
  organization?: string;
  changedBy: string;
  changedAt: string;
  createdBy: string;
  createdAt: string;
}

// --- Meeting ---
export interface Meeting {
  id: number;
  meetingNo: number;
  requestName: string;
  projectId: string;
  projectName: string;
  meetingTitle: string;
  meetingAgent?: string;
  startTime: string;
  endTime: string;
  createdBy: string;
  createdAt: string;
}

// --- Action ---
export type ActionStatus = 'Open' | 'In Validation' | 'Closed';
export type ActionType = 'Mandatory' | 'Optional';
export type ActionPriority = 'High' | 'Medium' | 'Low';

export interface Action {
  id: number;
  actionId: number;
  requestName: string;
  projectId: string;
  projectName: string;
  actionTitle: string;
  type: ActionType;
  priority: ActionPriority;
  requestedBy: string;
  assignee: string;
  startDate?: string;
  closeDate?: string;
  applicableDomain?: string;
  actionDescription?: string;
  dueDate?: string;
  status: ActionStatus;
  createdBy: string;
  createdAt: string;
}

// --- Schedule (EA Calendar) ---
export type ScheduleStatus = 'Available' | 'Booked' | 'Expired' | 'Completed';

export interface Schedule {
  id: number;
  scheduleNo: number;
  status: ScheduleStatus;
  scheduleTitle: string;
  startTime: string;
  endTime: string;
  duration: number;
  owner: string;
  createdBy: string;
  createdAt: string;
}

// --- Application (Business Capability Mapping) ---
export interface Application {
  id: number;
  applicationId: string;
  applicationName: string;
  applicationOwnership: string;
  applicationSolutionOwner: string;
  applicationDTOwner: string;
  applicationStatus: string;
  bcId: string;
  bcName?: string;
  applicationClassification?: string;
  functionValueChain?: string;
  domainL1?: string;
  subDomainL2?: string;
  version?: string;
}

// --- BCPF Master Data ---
export interface BCPFMasterData {
  id: number;
  bcId: string;
  bcName: string;
  domainL1: string;
  subDomainL2: string;
  capabilityGroupL3: string;
  level: number;
  version: string;
}

// --- Technology Stack ---
export interface TechnologyStack {
  id: number;
  name: string;
  category: string;
  vendor: string;
  version: string;
  status: string;
  description?: string;
  owner?: string;
}

// --- EA Review Log ---
export interface EAReviewLog {
  id: number;
  projectId: string;
  projectName: string;
  user: string;
  operationTime: string;
  action: string;
  comments?: string;
}

// --- Certification ---
export interface Certification {
  id: number;
  certificationId: string;
  name: string;
  status: string;
  type: string;
  applicant: string;
  approvedBy?: string;
  validFrom?: string;
  validTo?: string;
}

// --- Dashboard Stats ---
export interface DashboardStats {
  totalProjects: number;
  inProgressProjects: number;
  completedProjects: number;
  meetings: number;
  totalActions: number;
  pendingActions: number;
  scopeCheckList: number;
  scopeOfChange: number;
}

export interface HomeStats {
  myProjects: number;
  myRequests: number;
  myActions: number;
  requestQueue: number;
}

// --- Pagination ---
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Search/Filter ---
export interface SearchParams {
  [key: string]: string | number | undefined;
}
