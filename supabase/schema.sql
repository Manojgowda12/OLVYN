-- ==============================================================================
-- OpenlearnerAI - Supabase PostgreSQL Production Schema & RLS Setup
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. ENUM TYPES
do $$ begin
    create type role_type as enum ('LEARNER', 'CONTRIBUTOR', 'ADMIN');
exception when duplicate_object then null;
end $$;

do $$ begin
    create type course_status as enum ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');
exception when duplicate_object then null;
end $$;

do $$ begin
    create type content_type as enum ('TEXT', 'VIDEO_URL', 'EXTERNAL_LINK', 'DOCUMENT_URL', 'CODE_REPO');
exception when duplicate_object then null;
end $$;

do $$ begin
    create type difficulty_type as enum ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');
exception when duplicate_object then null;
end $$;

-- 3. TABLES

-- Users Table
create table if not exists public."User" (
    id text primary key default gen_random_uuid()::text,
    email text unique not null,
    "passwordHash" text not null,
    name text not null,
    role text not null default 'LEARNER',
    bio text,
    "avatarUrl" text,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Categories Table
create table if not exists public."Category" (
    id text primary key default gen_random_uuid()::text,
    name text unique not null,
    slug text unique not null,
    description text,
    icon text,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tags Table
create table if not exists public."Tag" (
    id text primary key default gen_random_uuid()::text,
    name text unique not null,
    slug text unique not null
);

-- Courses Table
create table if not exists public."Course" (
    id text primary key default gen_random_uuid()::text,
    title text not null,
    slug text unique not null,
    "shortSummary" text not null,
    description text not null,
    difficulty text default 'BEGINNER' not null,
    language text default 'English' not null,
    "estimatedHours" double precision,
    "thumbnailUrl" text,
    status text default 'DRAFT' not null,
    "authorId" text not null references public."User"(id) on delete cascade,
    "categoryId" text references public."Category"(id) on delete set null,
    "rejectionReason" text,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    "publishedAt" timestamp with time zone
);

-- Course Tags Join Table
create table if not exists public."CourseTag" (
    "courseId" text not null references public."Course"(id) on delete cascade,
    "tagId" text not null references public."Tag"(id) on delete cascade,
    primary key ("courseId", "tagId")
);

-- Modules Table
create table if not exists public."Module" (
    id text primary key default gen_random_uuid()::text,
    "courseId" text not null references public."Course"(id) on delete cascade,
    title text not null,
    description text,
    "orderIndex" integer not null default 1,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Lessons Table
create table if not exists public."Lesson" (
    id text primary key default gen_random_uuid()::text,
    "moduleId" text not null references public."Module"(id) on delete cascade,
    title text not null,
    slug text not null,
    description text,
    "contentType" text default 'TEXT' not null,
    "textContent" text,
    "mediaUrl" text,
    "durationMinutes" integer,
    "orderIndex" integer not null default 1,
    "isRequired" boolean default true not null,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Resources Table
create table if not exists public."Resource" (
    id text primary key default gen_random_uuid()::text,
    "lessonId" text not null references public."Lesson"(id) on delete cascade,
    title text not null,
    "resourceType" text default 'EXTERNAL_LINK' not null,
    url text not null,
    description text,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enrollments Table
create table if not exists public."Enrollment" (
    id text primary key default gen_random_uuid()::text,
    "userId" text not null references public."User"(id) on delete cascade,
    "courseId" text not null references public."Course"(id) on delete cascade,
    "enrolledAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    unique ("userId", "courseId")
);

-- Lesson Progress Table
create table if not exists public."LessonProgress" (
    id text primary key default gen_random_uuid()::text,
    "userId" text not null references public."User"(id) on delete cascade,
    "lessonId" text not null references public."Lesson"(id) on delete cascade,
    "isCompleted" boolean default false not null,
    "completedAt" timestamp with time zone,
    "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    unique ("userId", "lessonId")
);

-- Course Progress Table
create table if not exists public."CourseProgress" (
    id text primary key default gen_random_uuid()::text,
    "userId" text not null references public."User"(id) on delete cascade,
    "courseId" text not null references public."Course"(id) on delete cascade,
    "completedLessons" integer default 0 not null,
    "totalLessons" integer default 0 not null,
    percentage double precision default 0.0 not null,
    "isCompleted" boolean default false not null,
    "lastLessonId" text,
    "completedAt" timestamp with time zone,
    "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    unique ("userId", "courseId")
);

-- Course Reviews Table
create table if not exists public."CourseReview" (
    id text primary key default gen_random_uuid()::text,
    "courseId" text not null references public."Course"(id) on delete cascade,
    "reviewerId" text not null references public."User"(id) on delete cascade,
    action text not null,
    comments text,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. PERFORMANCE INDEXES
create index if not exists "idx_course_status" on public."Course"(status);
create index if not exists "idx_course_author" on public."Course"("authorId");
create index if not exists "idx_course_category" on public."Course"("categoryId");
create index if not exists "idx_module_course_order" on public."Module"("courseId", "orderIndex");
create index if not exists "idx_lesson_module_order" on public."Lesson"("moduleId", "orderIndex");
create index if not exists "idx_enrollment_user" on public."Enrollment"("userId");
create index if not exists "idx_lesson_progress_user" on public."LessonProgress"("userId");
create index if not exists "idx_course_progress_user" on public."CourseProgress"("userId", "courseId");

-- 5. ROW LEVEL SECURITY (RLS)
alter table public."User" enable row level security;
alter table public."Category" enable row level security;
alter table public."Tag" enable row level security;
alter table public."Course" enable row level security;
alter table public."CourseTag" enable row level security;
alter table public."Module" enable row level security;
alter table public."Lesson" enable row level security;
alter table public."Resource" enable row level security;
alter table public."Enrollment" enable row level security;
alter table public."LessonProgress" enable row level security;
alter table public."CourseProgress" enable row level security;
alter table public."CourseReview" enable row level security;

-- Public READ for published catalog items
create policy "Public can view published courses" on public."Course"
    for select to anon, authenticated
    using (status = 'PUBLISHED');

create policy "Public can view categories" on public."Category"
    for select to anon, authenticated
    using (true);

create policy "Public can view tags" on public."Tag"
    for select to anon, authenticated
    using (true);

create policy "Public can view modules of published courses" on public."Module"
    for select to anon, authenticated
    using (exists (
        select 1 from public."Course" c 
        where c.id = "Module"."courseId" and c.status = 'PUBLISHED'
    ));

create policy "Public can view lessons of published courses" on public."Lesson"
    for select to anon, authenticated
    using (exists (
        select 1 from public."Module" m
        join public."Course" c on c.id = m."courseId"
        where m.id = "Lesson"."moduleId" and c.status = 'PUBLISHED'
    ));

-- Storage Buckets Configuration (course-assets, avatars)
insert into storage.buckets (id, name, public)
values ('course-assets', 'course-assets', true),
       ('avatars', 'avatars', true)
on conflict (id) do nothing;
