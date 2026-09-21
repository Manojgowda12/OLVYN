import { z } from "zod";

// Authentication Schemas
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Course Creation & Update Schema
export const courseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  shortSummary: z.string().min(10, "Summary must be at least 10 characters").max(200),
  description: z.string().min(20, "Detailed description must be at least 20 characters"),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"]).default("BEGINNER"),
  language: z.string().default("English"),
  estimatedHours: z.coerce.number().min(0.1).max(200).optional().nullable(),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional().or(z.literal("")),
  categoryId: z.string().min(1, "Category is required"),
});

// Module Schema
export const moduleSchema = z.object({
  title: z.string().min(3, "Module title must be at least 3 characters").max(100),
  description: z.string().max(300).optional().or(z.literal("")),
  orderIndex: z.coerce.number().int().min(1),
});

// Lesson Schema
export const lessonSchema = z.object({
  title: z.string().min(3, "Lesson title must be at least 3 characters").max(100),
  description: z.string().max(300).optional().or(z.literal("")),
  contentType: z.enum(["TEXT", "VIDEO_URL", "EXTERNAL_LINK", "DOCUMENT_URL", "CODE_REPO"]).default("TEXT"),
  textContent: z.string().optional().or(z.literal("")),
  mediaUrl: z.string().url("Invalid media or resource URL").optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(1).max(300).optional().nullable(),
  orderIndex: z.coerce.number().int().min(1),
  isRequired: z.boolean().default(true),
});

// Review Schema (Admin)
export const reviewSchema = z.object({
  action: z.enum(["PUBLISHED", "REJECTED"]),
  comments: z.string().optional(),
}).refine((data) => {
  if (data.action === "REJECTED" && (!data.comments || data.comments.trim().length < 5)) {
    return false;
  }
  return true;
}, {
  message: "Feedback comments (at least 5 characters) are required when rejecting a course.",
  path: ["comments"],
});

// Update Module Schema
export const updateModuleSchema = z.object({
  title: z.string().min(3, "Module title must be at least 3 characters").max(100),
  description: z.string().max(300).optional().or(z.literal("")),
});

// Update Lesson Schema
export const updateLessonSchema = z.object({
  title: z.string().min(3, "Lesson title must be at least 3 characters").max(100),
  description: z.string().max(300).optional().or(z.literal("")),
  contentType: z.enum(["TEXT", "VIDEO_URL", "EXTERNAL_LINK", "DOCUMENT_URL", "CODE_REPO"]).default("TEXT"),
  textContent: z.string().optional().or(z.literal("")),
  mediaUrl: z.string().url("Invalid media or resource URL").optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(1).max(300).optional().nullable(),
  isRequired: z.boolean().default(true),
});

// Curriculum Reorder Schema
export const reorderSchema = z.object({
  type: z.enum(["MODULES", "LESSONS"]),
  moduleId: z.string().optional(),
  orderedIds: z.array(z.string().min(1)).min(1, "orderedIds must contain at least one ID"),
});

// Resource Schema
export const resourceSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(100),
  resourceType: z.enum(["EXTERNAL_LINK", "FILE", "PDF", "CODE_REPO"]).default("EXTERNAL_LINK"),
  url: z.string().min(1, "URL is required").refine((val) => {
    const trimmed = val.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        const u = new URL(trimmed);
        return ["http:", "https:"].includes(u.protocol);
      } catch {
        return false;
      }
    }
    if (trimmed.startsWith("/")) return true;
    if (trimmed.startsWith("data:application/pdf") || trimmed.startsWith("data:image/")) return true;
    return false;
  }, "Invalid or unsafe resource URL. Must use HTTP or HTTPS protocol."),
  description: z.string().max(300).optional().or(z.literal("")),
  isInternal: z.boolean().default(false),
});
