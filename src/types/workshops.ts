// src/entities/workshop.ts
export interface Workshop {
  id: string;
  title: string;
  description: string;
  category: 'data_analysis' | 'data_science' | 'bi' | 'data_engineering' | 'visualization' | 'other';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  maxParticipants: number;
  prerequisites: string[];
  learningObjectives: string[];
  tags: string[];
  
  // Creator info
  creatorId: string;
  creatorName: string;
  
  // Schedule
  scheduledDate: Date;
  startTime: string; // "14:00"
  endTime: string; // "16:00"
  timezone: string; // "America/Sao_Paulo"
  
  // Meeting info
  meetingType: 'google_meet' | 'teams';
  meetingLink?: string;
  meetingId?: string;
  
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
  category: 'data_analysis' | 'data_science' | 'bi' | 'data_engineering' | 'visualization' | 'other';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  maxParticipants: number;
  prerequisites: string[];
  learningObjectives: string[];
  tags: string[];
  scheduledDate: string; // ISO string from frontend
  startTime: string; // "14:00"
  endTime: string; // "16:00"
  timezone: string; // "America/Sao_Paulo"
  meetingType: 'google_meet' | 'teams';
  autoGenerateCertificate?: boolean;
  sendReminders?: boolean;
  allowWaitlist?: boolean;
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