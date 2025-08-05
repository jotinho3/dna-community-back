// src/entities/workshop.ts
export interface Workshop {
  id: string;
  title: string;
  description: string;
  shortDescription?: string; // 🆕 Added
  category: 'data_analysis' | 'data_science' | 'bi' | 'data_engineering' | 'visualization' | 'other';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  format?: 'online' | 'in_person' | 'hybrid'; // 🆕 Added
  duration: number; // minutes
  maxParticipants: number;
  prerequisites: string[];
  learningObjectives: string[];
  requirements?: string[]; // 🆕 Added
  requiredTools?: string[]; // 🆕 Added
  targetAudience?: string; // 🆕 Added
  tags: string[];
  language?: string; // 🆕 Added
  location?: string; // 🆕 Added
  
  // Creator info
  creatorId: string;
  creatorName: string;
  
  // Schedule
  scheduledDate: Date;
  startTime: string; // "14:00"
  endTime: string; // "16:00"
  timezone: string; // "America/Sao_Paulo"
  enrollmentDeadline?: string; // 🆕 Added
  
  // Meeting info
  meetingType: 'google_meet' | 'teams';
  meetingLink?: string;
  meetingId?: string;
  meetingPassword?: string; // 🆕 Added
  
  // Features
  isRecorded?: boolean; // 🆕 Added
  isInteractive?: boolean; // 🆕 Added
  materialsProvided?: boolean; // 🆕 Added
  autoApproveEnrollments?: boolean; // 🆕 Added
  requiresCompletion?: boolean; // 🆕 Added
  
  // Pricing
  price?: number; // 🆕 Added
  currency?: string; // 🆕 Added
  
  // Media
  thumbnailUrl?: string; // 🆕 Added
  bannerUrl?: string; // 🆕 Added
  
  // Status and metrics
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  enrolledCount: number;
  completedCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Settings
  autoGenerateCertificate: boolean;
  sendReminders: boolean;
  allowWaitlist: boolean;
}

// src/entities/workshopEnrollment.ts
export interface WorkshopEnrollment {
  id: string;
  workshopId: string;
  userId: string;
  userName: string;
  userEmail: string;
  enrolledAt: Date;
  status: 'enrolled' | 'attended' | 'completed' | 'no_show' | 'cancelled' | 'waitlisted';
  completedAt?: Date;
  certificateIssued?: boolean;
  certificateId?: string;
  feedback?: {
    rating: number; // 1-5
    comment: string;
    submittedAt: Date;
  };
}

// src/entities/workshopCertificate.ts
export interface WorkshopCertificate {
  id: string;
  workshopId: string;
  workshopTitle: string;
  userId: string;
  userName: string;
  completedAt: Date;
  issuedAt: Date;
  certificateUrl: string; // PDF download link
  verificationCode: string;
  validUntil?: Date;
}


export interface CreateWorkshopRequest {
  title: string;
  description: string;
  shortDescription?: string; // 🆕 Added
  category: 'data_analysis' | 'data_science' | 'bi' | 'data_engineering' | 'visualization' | 'other';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  format?: 'online' | 'in_person' | 'hybrid'; // 🆕 Added
  duration?: number; // 🔧 Made optional with default in backend
  maxParticipants: number;
  
  // Schedule
  scheduledDate: string; // "2025-08-01"
  startTime: string; // "10:35"
  endTime: string; // "12:35"
  timezone: string; // "America/Sao_Paulo"
  enrollmentDeadline?: string; // 🆕 Added - "2025-08-03"
  
  // Content
  prerequisites?: string[];
  learningObjectives?: string[];
  requirements?: string[]; // 🆕 Added
  requiredTools?: string[]; // 🆕 Added
  targetAudience?: string; // 🆕 Added
  tags?: string[];
  language?: string; // 🆕 Added - "English"
  location?: string; // 🆕 Added - for in-person/hybrid workshops
  
  // Features
  isRecorded?: boolean; // 🆕 Added
  isInteractive?: boolean; // 🆕 Added
  materialsProvided?: boolean; // 🆕 Added
  allowWaitlist?: boolean;
  autoApproveEnrollments?: boolean; // 🆕 Added
  sendReminders?: boolean;
  requiresCompletion?: boolean; // 🆕 Added
  issuesCertificate?: boolean; // 🆕 Added (maps to autoGenerateCertificate)
  
  // Pricing
  price?: number; // 🆕 Added
  currency?: string; // 🆕 Added - "USD"
  
  // Meeting info
  meetingType?: 'google_meet' | 'teams';
  meetingLink?: string; // 🆕 Made optional
  meetingId?: string; // 🆕 Added
  meetingPassword?: string; // 🆕 Added
  
  // Media
  thumbnailUrl?: string; // 🆕 Added
  bannerUrl?: string; // 🆕 Added
  
  // Metadata (these might come from frontend but should be handled by backend)
  creatorId?: string; // 🆕 Should be set from auth, not frontend
  creatorName?: string; // 🆕 Should be set from user data
  currentEnrollments?: number; // 🆕 Should be set to 0
  waitlistCount?: number; // 🆕 Should be set to 0
  status?: 'draft' | 'published'; // 🆕 Should default to 'draft'
  createdAt?: string; // 🆕 Should be set by backend
  updatedAt?: string; // 🆕 Should be set by backend
}

export interface UpdateWorkshopRequest {
  title?: string;
  description?: string;
  category?: 'data_analysis' | 'data_science' | 'bi' | 'data_engineering' | 'visualization' | 'other';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
  maxParticipants?: number;
  prerequisites?: string[];
  learningObjectives?: string[];
  tags?: string[];
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  meetingType?: 'google_meet' | 'teams';
  autoGenerateCertificate?: boolean;
  sendReminders?: boolean;
  allowWaitlist?: boolean;
}

export interface EnrollWorkshopRequest {
  workshopId: string;
  userId: string;
}

export interface CompleteWorkshopRequest {
  workshopId: string;
  userId: string;
  feedback?: {
    rating: number; // 1-5
    comment: string;
  };
}

export interface WorkshopFeedback {
  rating: number;
  comment: string;
  submittedAt: Date;
}

// Response types
export interface WorkshopResponse {
  id: string;
  workshop: Workshop;
  canEnroll?: boolean;
  remainingSpots?: number;
}

export interface WorkshopListResponse {
  workshops: Workshop[];
  pagination: {
    limit: number;
    hasMore: boolean;
    lastCreatedAt: Date | null;
  };
}

export interface EnrollmentResponse {
  message: string;
  enrollment: WorkshopEnrollment;
  xpAwarded?: number;
  status?: 'enrolled' | 'waitlisted';
}

export interface CompletionResponse {
  message: string;
  xpAwarded: number;
  certificate?: WorkshopCertificate;
  feedback?: string;
}