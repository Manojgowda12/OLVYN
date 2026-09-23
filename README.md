# OLVYN — Open Learning Platform

An open, transparent learning platform where anyone can discover, learn, and contribute legally shareable educational courses with AI-powered tutoring.

---

## 🌟 Core Pillars

1. **DISCOVER**
   - Fast keyword search across titles, summaries, and descriptions.
   - Category filtering across Programming, AI, Design, Business, and Science.
   - Difficulty levels: Beginner, Intermediate, Advanced, All Levels.
   - Complete syllabus transparency prior to enrollment.

2. **LEARN**
   - Immersive course player with collapsible syllabus tree.
   - Non-blocking navigation: explore lessons in any sequence without artificial lock-ins.
   - Rich Markdown notes and external video embeds (YouTube/streams).
   - Real-time lesson completion tracking with automatic progress calculation ($0\%$ to $100\%$).
   - Dedicated Learner Dashboard tracking in-progress and completed courses.

3. **UNDERSTAND (Nova AI)**
   - In-player contextual AI tutoring grounded in current lesson notes.
   - Quick prompts: "Explain simply", "Practice challenge", "Code breakdown".
   - Grounded course recommendations across the catalog.
   - Graceful fallback tutoring mode when offline or without API keys.

4. **CONTRIBUTE & EDITORIAL WORKFLOW**
   - Hierarchical course authoring studio: Courses $\rightarrow$ Modules $\rightarrow$ Lessons.
   - Submission validation pipeline: courses require minimum structural criteria before review.
   - Admin editorial console: review pending submissions, inspect full syllabus, approve to publish, or reject with mandatory feedback.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript (Strict Mode)
- **Database & ORM:** SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **Authentication:** Custom, transparent HTTP-only session cookies with bcrypt password hashing
- **Role-Based Access Control:** Strict server-side guards for `LEARNER`, `CONTRIBUTOR`, and `ADMIN`
- **Validation:** Zod schemas across client and server mutation boundaries
- **Styling:** Tailwind CSS v4 + Lucide Icons + custom dark design system
- **AI Integration:** Google Gemini API (`@google/generative-ai`)

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-32-character-secret-key-here-12345"
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Database Setup & Seeding
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Default Test Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Learner** | `learner@openlearner.ai` | `Learner123!` | Browse, enroll, track progress, use Nova |
| **Contributor** | `contributor@openlearner.ai` | `Contributor123!` | Author courses, manage modules/lessons, submit for review |
| **Admin** | `admin@openlearner.ai` | `Admin123!` | Editorial queue, inspect syllabus, approve & publish, reject with feedback |

*Note: The login page includes quick-fill buttons for these test accounts.*

---

## 🧪 Automated Verification Suite

Run the full domain verification test suite:
```bash
npm run verify
```

Verify production build:
```bash
npm run build
```
