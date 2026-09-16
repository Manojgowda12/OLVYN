# OpenLearnerAI — Production PostgreSQL Database Specification

---

## 1. Executive Summary & Architecture

OpenLearnerAI utilizes a modern, resilient, high-throughput database architecture combining **Next.js 15 App Router**, **Prisma ORM (v6)**, and **Supabase-hosted PostgreSQL** with managed connection pooling via Supavisor.

### Core Architectural Decisions
- **ORM & Data Layer**: Prisma ORM with strict type-safety, client generation, and declarative schema migrations.
- **Production Host**: Managed PostgreSQL on Supabase (`ap-south-1`).
- **Connection Strategy**:
  - `DATABASE_URL`: Supavisor Transaction Pooler (Port `6543`, `pgbouncer=true`) for serverless Next.js API routes and server actions.
  - `DIRECT_URL`: Direct PostgreSQL connection (Port `5432`) for schema migrations (`prisma migrate deploy`).
- **Authentication**: Native JWT session cookies (`jose`) with bcrypt password hashing and application-level RBAC (`LEARNER`, `CONTRIBUTOR`, `ADMIN`).

---

## 2. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o{ Course : "authors"
    User ||--o{ Enrollment : "enrolls"
    User ||--o{ LessonProgress : "tracks"
    User ||--o{ CourseProgress : "maintains"
    User ||--o{ SavedCourse : "bookmarks"
    User ||--o{ CourseReview : "reviews"
    User ||--o{ AuditLog : "triggers"
    User ||--o{ ContentReport : "reports"
    User ||--o{ AIConversation : "participates"
    User ||--o{ FileAsset : "uploads"

    Category ||--o{ Course : "classifies"
    Course ||--o{ CourseTag : "has"
    Tag ||--o{ CourseTag : "categorizes"

    Course ||--|{ Module : "contains"
    Module ||--|{ Lesson : "contains"
    Lesson ||--o{ Resource : "attaches"

    Course ||--o{ Enrollment : "has_students"
    Course ||--o{ CourseProgress : "tracks_students"
    Course ||--o{ SavedCourse : "saved_by"
    Course ||--o{ CourseReview : "moderation_history"
    Course ||--o{ ContentReport : "reported_under"

    Lesson ||--o{ LessonProgress : "progress_tracked"
    Lesson ||--o{ ContentReport : "reported_under"

    AIConversation ||--|{ AIMessage : "contains"
```

---

## 3. Data Models & Entity Dictionary

### User Domain
- **`User`**: Core user accounts.
  - `id`: CUID Primary Key.
  - `email`: Normalized unique login email.
  - `normalizedEmail`: Lowercase indexed unique email.
  - `passwordHash`: Salted bcrypt hash.
  - `role`: `Role` (`LEARNER`, `CONTRIBUTOR`, `ADMIN`).
  - `status`: `AccountStatus` (`ACTIVE`, `SUSPENDED`, `DELETED`).
  - `avatarUrl`, `bio`, `lastLoginAt`, `createdAt`, `updatedAt`.

### Catalog & Course Structure
- **`Category`**: Dynamic course taxonomy (`name`, `slug`, `icon`, `description`).
- **`Tag` & `CourseTag`**: Many-to-many topic tagging.
- **`Course`**: Course header and metadata.
  - `status`: `CourseStatus` (`DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `REJECTED`, `ARCHIVED`).
  - `difficulty`: `Difficulty` (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `ALL_LEVELS`).
  - `license`: Open course license (e.g. `CC-BY-4.0`, `MIT`).
  - `contentOwnership`: `ContentOwnership` (`OWNED`, `OPEN_LICENSE`, `EXTERNAL_CURATED`).
- **`Module`**: Section groupings. Unique `[courseId, orderIndex]`.
- **`Lesson`**: Pedagogical unit. Unique `[moduleId, orderIndex]` and `[moduleId, slug]`.
  - `contentType`: `TEXT`, `VIDEO_URL`, `EXTERNAL_LINK`, `DOCUMENT_URL`, `CODE_REPO`.
- **`Resource`**: Supplementary external links or downloaded files attached to lessons.

### Learning & Progress
- **`Enrollment`**: Unique `[userId, courseId]`. Tracks student enrollments and `lastAccessedAt`.
- **`LessonProgress`**: Atomic source of truth for lesson completion. Unique `[userId, lessonId]`.
- **`CourseProgress`**: Denormalized fast-read cache updated in atomic transactions during lesson completion. Unique `[userId, courseId]`.
- **`SavedCourse`**: Course bookmarks. Unique `[userId, courseId]`.

### Governance & Moderation
- **`CourseReview`**: Audit trail of review actions (`SUBMITTED`, `APPROVED`, `REJECTED`, `RESUBMITTED`) with admin feedback.
- **`AuditLog`**: System-level administrative audit trail (`entityType`, `entityId`, `actorId`, `metadata`).
- **`ContentReport`**: User moderation reporting (`status`: `OPEN`, `IN_REVIEW`, `RESOLVED`, `DISMISSED`).

### AI & Media Domain
- **`AIConversation` & `AIMessage`**: Nova AI grounding and chat histories (`DISCOVERY`, `TUTORING`, `LEARNING_PATH`).
- **`FileAsset`**: Metadata catalog for objects stored in Supabase Storage buckets.

---

## 4. Key Constraints, Indexes & Cascades

### Primary & Unique Constraints
- `User(email)`, `User(normalizedEmail)`
- `Course(slug)`
- `Category(slug)`, `Category(name)`
- `Tag(slug)`, `Tag(name)`
- `Module(courseId, orderIndex)`
- `Lesson(moduleId, orderIndex)`, `Lesson(moduleId, slug)`
- `Enrollment(userId, courseId)`
- `LessonProgress(userId, lessonId)`
- `CourseProgress(userId, courseId)`
- `SavedCourse(userId, courseId)`
- `FileAsset(objectPath)`

### Optimized Query Indexes
- `Course(status, publishedAt)`: Fast catalog filtering and sorting.
- `Course(authorId, status)`: Contributor dashboard views.
- `Course(categoryId, status)`: Category catalog discovery.
- `Module(courseId, orderIndex)`: Deterministic curriculum rendering.
- `Lesson(moduleId, orderIndex)`: Deterministic lesson navigation.
- `Enrollment(userId, enrolledAt)`: Learner dashboard queries.
- `LessonProgress(userId, isCompleted)`: Fast completed count aggregations.
- `AuditLog(entityType, entityId)` & `AuditLog(actorId, createdAt)`: Governance queries.

### Cascading Rules (`onDelete`)
- **`Cascade`**: `Course` ➔ `Module` ➔ `Lesson` ➔ `Resource`.
- **`Cascade`**: `User` ➔ `Enrollment`, `LessonProgress`, `CourseProgress`, `SavedCourse`.
- **`Restrict`**: `Course.authorId` (prevents deleting active authors with live courses).
- **`Restrict`**: `CourseReview.reviewerId` (preserves historical review audit records).
- **`SetNull`**: `Course.categoryId`, `AuditLog.actorId`, `ContentReport.reviewedById`.

---

## 5. Migration, Backup & Seed Workflows

### Pre-Migration Backup Strategy
- **Location**: `prisma/backups/sqlite-backup.json`
- **Runner**: `npx tsx scripts/backup-sqlite.ts`
- **Integrity**: Full JSON serialization verifying row counts before schema changes.

### Running Migrations against Supabase
1. Configure credentials in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres.[REF]:[PASS]@[POOLER_HOST]:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres:[PASS]@db.[REF].supabase.co:5432/postgres"
   ```
2. Apply migrations:
   ```powershell
   npx.cmd prisma migrate deploy
   ```
3. Check status:
   ```powershell
   npx.cmd prisma migrate status
   ```

### Data Migration Runner
To hydrate PostgreSQL from the verified backup:
```powershell
npx.cmd tsx scripts/migrate-to-postgres.ts
```

### Deterministic Seeding
```powershell
npm.cmd run db:seed
```

---

## 6. Future RAG & Vector Search Readiness

The schema is partitioned to attach vector embeddings for semantic search in a future phase without schema redesign:
```prisma
// Planned extension (deferred until full RAG phase):
// model DocumentChunk {
//   id        String   @id @default(cuid())
//   lessonId  String
//   content   String
//   embedding Unsupported("vector(768)")?
//   lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
// }
```
