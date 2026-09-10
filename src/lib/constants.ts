export const ROLES = {
  LEARNER: "LEARNER",
  CONTRIBUTOR: "CONTRIBUTOR",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const COURSE_STATUS = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
} as const;

export type CourseStatus = (typeof COURSE_STATUS)[keyof typeof COURSE_STATUS];

export const CONTENT_TYPE = {
  TEXT: "TEXT",
  VIDEO_URL: "VIDEO_URL",
  EXTERNAL_LINK: "EXTERNAL_LINK",
  DOCUMENT_URL: "DOCUMENT_URL",
  CODE_REPO: "CODE_REPO",
} as const;

export type ContentType = (typeof CONTENT_TYPE)[keyof typeof CONTENT_TYPE];

export const DIFFICULTY = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
  ALL_LEVELS: "ALL_LEVELS",
} as const;

export type Difficulty = (typeof DIFFICULTY)[keyof typeof DIFFICULTY];
