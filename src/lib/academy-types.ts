export type AcademyRole = 'student' | 'instructor' | 'academy_admin';

export interface AcademyCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type AccessMode = 'public' | 'free_registered' | 'sumak_exclusive' | 'premium' | 'assigned' | 'hidden';

export interface AcademyCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  cover_image_url: string | null;
  instructor_id: string | null;
  category_id: string | null;
  level: CourseLevel;
  estimated_duration_minutes: number | null;
  status: CourseStatus;
  access_mode: AccessMode;
  price?: number | null;
  prerequisites: string | null;
  passing_percentage: number;
  generates_certificate: boolean;
  diploma_type_id: string | null;
  published_at: string | null;
  sort_order: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Joins
  instructor?: {
    nombre_completo: string;
    username?: string;
  };
  category?: AcademyCategory;
}

export interface AcademyModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  
  // Joins
  lessons?: AcademyLesson[];
}

export type ContentType = 'video' | 'text' | 'pdf' | 'presentation' | 'image' | 'external_link' | 'assessment' | 'mixed';
export type VideoProvider = 'youtube' | 'vimeo' | 'cloudflare' | 'mux' | 'bunny' | 'custom';

export interface AcademyLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  text_content: string | null;
  video_provider: VideoProvider | null;
  video_external_id: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  file_url: string | null;
  file_name: string | null;
  external_url: string | null;
  assessment_id: string | null;
  sort_order: number;
  is_published: boolean;
  is_free_preview: boolean;
  estimated_minutes: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AcademyResource {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  sort_order: number;
  created_at: string;
}

export interface AcademyEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: 'pending' | 'approved' | 'payment_pending' | 'active' | 'completed' | 'expired' | 'rejected' | 'cancelled' | 'dropped' | 'suspended';
  progress_percentage: number;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string | null;
  requested_at?: string;
  approved_at?: string | null;
  activated_at?: string | null;
  expires_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  payment_status?: string;
}

export interface AcademyProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percentage: number;
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string | null;
  playback_seconds: number;
}

export interface AcademyDiplomaIssuance {
  id: string;
  diploma_number: string;
  verification_code: string;
  verification_token: string;
  user_id: string;
  diploma_type_id: string;
  template_id: string;
  course_id: string | null;
  participant_name: string;
  program_name: string;
  status: 'issued' | 'valid' | 'revoked' | 'superseded' | 'invalidated';
  issued_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  
  // Joins
  diploma_type?: {
    name: string;
    internal_code: string;
  };
}
