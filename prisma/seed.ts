import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Open Learning Platform database...");

  // 1. Clean existing records in reverse dependency order
  await prisma.courseReview.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.courseProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.courseTag.deleteMany();
  await prisma.course.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned existing database records.");

  // 2. Hash passwords with configured Permanent Admin credentials
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@openlearner.ai").toLowerCase();
  const adminRawPassword = process.env.ADMIN_PASSWORD || "AdminSecure2026!";

  const adminPasswordHash = await bcrypt.hash(adminRawPassword, 10);
  const contributorPasswordHash = await bcrypt.hash("Contributor123!", 10);
  const learnerPasswordHash = await bcrypt.hash("Learner123!", 10);

  // 3. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      normalizedEmail: adminEmail.toLowerCase(),
      passwordHash: adminPasswordHash,
      name: "Platform Administrator",
      role: "ADMIN",
      bio: "Chief editorial lead and platform moderator.",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    },
  });

  const contributorUser = await prisma.user.create({
    data: {
      email: "contributor@openlearner.ai",
      normalizedEmail: "contributor@openlearner.ai",
      passwordHash: contributorPasswordHash,
      name: "Sarah Jenkins",
      role: "CONTRIBUTOR",
      bio: "Senior Software Engineer & Open Source Educator with 8+ years of teaching experience.",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
    },
  });

  const learnerUser = await prisma.user.create({
    data: {
      email: "learner@openlearner.ai",
      normalizedEmail: "learner@openlearner.ai",
      passwordHash: learnerPasswordHash,
      name: "Alex Chen",
      role: "LEARNER",
      bio: "Lifelong learner curious about programming and user experience.",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    },
  });

  console.log("👤 Created initial users (Admin, Contributor, Learner).");

  // 4. Create Categories
  const categoriesData = [
    {
      name: "Programming & Technology",
      slug: "programming-technology",
      description: "Learn coding, web development, software architecture, and systems.",
      icon: "Code",
    },
    {
      name: "Data Science & AI",
      slug: "data-science-ai",
      description: "Explore machine learning, neural networks, analytics, and data engineering.",
      icon: "Cpu",
    },
    {
      name: "Design & UX",
      slug: "design-ux",
      description: "Master user research, interface aesthetics, typography, and wireframing.",
      icon: "Palette",
    },
    {
      name: "Business & Finance",
      slug: "business-finance",
      description: "Build startups, manage products, understand accounting, and make smart investments.",
      icon: "TrendingUp",
    },
    {
      name: "Mathematics & Science",
      slug: "mathematics-science",
      description: "Develop deep analytical thinking through calculus, linear algebra, and physics.",
      icon: "Compass",
    },
  ];

  const categories: Record<string, any> = {};
  for (const cat of categoriesData) {
    categories[cat.slug] = await prisma.category.create({ data: cat });
  }
  console.log("📁 Created course categories.");

  // 5. Create Tags
  const tagNames = ["Python", "JavaScript", "TypeScript", "React", "Next.js", "UI/UX", "Beginner", "Open Source"];
  const tags: Record<string, any> = {};
  for (const name of tagNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    tags[slug] = await prisma.tag.create({
      data: { name, slug },
    });
  }

  // 6. Create Seed Course 1: Python Fundamentals for Beginners (PUBLISHED)
  const pythonCourse = await prisma.course.create({
    data: {
      title: "Python Fundamentals for Beginners",
      slug: "python-fundamentals-for-beginners",
      shortSummary: "A gentle, project-driven introduction to Python programming from variables to functions.",
      description: `# Python Fundamentals for Beginners

Welcome to the most beginner-friendly guide to learning Python. Whether your goal is to automate daily tasks, analyze datasets, build web applications, or venture into Artificial Intelligence, Python is the gold standard starter language.

### What You Will Learn
- Fundamental programming syntax and core data types
- Conditional logic, decision trees, and looping mechanisms
- Functions, scope, modular code organization, and return values
- How to write clean, idiomatic Python code

### Prerequisites
None! No prior programming experience required.`,
      difficulty: "BEGINNER",
      language: "English",
      estimatedHours: 4.5,
      thumbnailUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&auto=format&fit=crop&q=80",
      status: "PUBLISHED",
      authorId: contributorUser.id,
      categoryId: categories["programming-technology"].id,
      publishedAt: new Date(),
    },
  });

  // Attach Tags
  await prisma.courseTag.createMany({
    data: [
      { courseId: pythonCourse.id, tagId: tags["python"].id },
      { courseId: pythonCourse.id, tagId: tags["beginner"].id },
      { courseId: pythonCourse.id, tagId: tags["open-source"].id },
    ],
  });

  // Modules for Python Course
  const pyMod1 = await prisma.module.create({
    data: {
      courseId: pythonCourse.id,
      title: "Module 1: Getting Started with Python",
      description: "Installation, execution environments, and writing your very first code.",
      orderIndex: 1,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: pyMod1.id,
      title: "Introduction & What is Python?",
      slug: "introduction-what-is-python",
      description: "An overview of Python's design philosophy, history, and why it's chosen worldwide.",
      contentType: "TEXT",
      orderIndex: 1,
      isRequired: true,
      durationMinutes: 10,
      textContent: `## Welcome to Python!

Python was created by **Guido van Rossum** in the late 1980s. Its core philosophy is summarized in the famous *Zen of Python*:

> *"Beautiful is better than ugly. Explicit is better than implicit. Simple is better than complex."*

### Why Learn Python?
1. **Readable Syntax:** Python looks remarkably like plain English.
2. **Huge Ecosystem:** Millions of packages available for web development, data science, and AI.
3. **Cross-Platform:** Runs seamlessly on Windows, macOS, and Linux.

\`\`\`python
# Your very first Python script
print("Hello, Open Learner World!")
\`\`\`

Take a moment to read this code. Notice that there are no semicolons or complex boilerplates. You simply invoke \`print()\`!`,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: pyMod1.id,
      title: "Variables and Data Types",
      slug: "variables-and-data-types",
      description: "How computers store information in memory: numbers, strings, and booleans.",
      contentType: "TEXT",
      orderIndex: 2,
      isRequired: true,
      durationMinutes: 15,
      textContent: `## Understanding Variables

In programming, a **variable** is a named container that holds a value in memory.

### The 4 Basic Primitive Types in Python:
1. **Integers (\`int\`):** Whole numbers without decimals, e.g., \`age = 24\`
2. **Floats (\`float\`):** Real numbers with decimals, e.g., \`price = 19.99\`
3. **Strings (\`str\`):** Text surrounded by quotes, e.g., \`name = "Alex"\`
4. **Booleans (\`bool\`):** True or False flags, e.g., \`is_enrolled = True\`

\`\`\`python
# Examples
course_name = "Python Fundamentals"
total_students = 1500
course_rating = 4.92
is_active = True

print(f"Course: {course_name} (Rating: {course_rating})")
\`\`\`

### Dynamic Typing
Python automatically detects the data type based on the assigned value. You don't need to specify types manually!`,
    },
  });

  const pyMod2 = await prisma.module.create({
    data: {
      courseId: pythonCourse.id,
      title: "Module 2: Logic & Control Flow",
      description: "Making decisions with if statements and repeating tasks with loops.",
      orderIndex: 2,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: pyMod2.id,
      title: "Conditional Statements (if / elif / else)",
      slug: "conditional-statements",
      description: "Teach your program how to make decisions based on runtime conditions.",
      contentType: "TEXT",
      orderIndex: 1,
      isRequired: true,
      durationMinutes: 15,
      textContent: `## Making Decisions in Python

Programs are not static; they react to user inputs and variables. We use \`if\`, \`elif\`, and \`else\` keywords.

\`\`\`python
score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "Needs Improvement"

print(f"Your grade is: {grade}")
\`\`\`

### Indentation Matters!
In Python, indentation (typically 4 spaces) defines code blocks. Unlike languages that use curly braces \`{}\`, Python relies on visual indentation.`,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: pyMod2.id,
      title: "Loops: for and while",
      slug: "loops-for-and-while",
      description: "Iterate through lists, count through ranges, and execute code repeatedly.",
      contentType: "TEXT",
      orderIndex: 2,
      isRequired: true,
      durationMinutes: 20,
      textContent: `## Repeating Actions with Loops

Instead of writing the same line 100 times, computers excel at automated repetition.

### The \`for\` Loop:
Used when you know the sequence or collection you want to iterate through.

\`\`\`python
fruits = ["apple", "banana", "blueberry", "mango"]

for fruit in fruits:
    print(f"I enjoy eating {fruit}!")
\`\`\`

### The \`range()\` Function:
\`\`\`python
# Prints numbers 1 through 5
for i in range(1, 6):
    print(f"Step {i}")
\`\`\`

### The \`while\` Loop:
Repeats as long as a boolean condition remains \`True\`. Be careful not to create infinite loops!`,
    },
  });

  const pyMod3 = await prisma.module.create({
    data: {
      courseId: pythonCourse.id,
      title: "Module 3: Functions & Reusable Code",
      description: "Packaging code into modular, reusable blocks with arguments and return values.",
      orderIndex: 3,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: pyMod3.id,
      title: "Defining and Calling Functions",
      slug: "defining-and-calling-functions",
      description: "The DRY (Don't Repeat Yourself) principle and writing custom functions.",
      contentType: "TEXT",
      orderIndex: 1,
      isRequired: true,
      durationMinutes: 20,
      textContent: `## Reusable Functions with \`def\`

A function is a named block of code that performs a specific task and only runs when called.

\`\`\`python
def calculate_progress(completed_lessons, total_lessons):
    """Calculates the completion percentage for a course."""
    if total_lessons == 0:
        return 0.0
    return round((completed_lessons / total_lessons) * 100, 1)

# Calling our function
my_progress = calculate_progress(4, 6)
print(f"Progress: {my_progress}%") # Outputs: Progress: 66.7%
\`\`\`

### Key Parts of a Function:
1. **Header:** \`def function_name(parameters):\`
2. **Docstring:** Explanation of what the function does
3. **Body:** Code block indented 4 spaces
4. **Return:** Sends the resulting value back to the caller`,
    },
  });

  // 7. Create Seed Course 2: UI/UX Design Fundamentals (PUBLISHED)
  const uxCourse = await prisma.course.create({
    data: {
      title: "Foundations of UI/UX Design",
      slug: "foundations-of-ui-ux-design",
      shortSummary: "Master visual hierarchy, color theory, typography, and human-centered design principles.",
      description: `# Foundations of UI/UX Design

Good design is invisible. Great digital products don't just look visually pleasing—they make complex tasks effortless for users.

### Course Highlights:
- Learn the difference between User Interface (UI) and User Experience (UX)
- Master the laws of Visual Hierarchy (Fitts's Law, Hick's Law, Gestalt Principles)
- Understand color harmony, typography pairing, and accessibility standards (WCAG 2.1)
- Wireframing and rapid prototyping concepts`,
      difficulty: "ALL_LEVELS",
      language: "English",
      estimatedHours: 3.0,
      thumbnailUrl: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80",
      status: "PUBLISHED",
      authorId: contributorUser.id,
      categoryId: categories["design-ux"].id,
      publishedAt: new Date(),
    },
  });

  await prisma.courseTag.createMany({
    data: [
      { courseId: uxCourse.id, tagId: tags["ui-ux"].id },
      { courseId: uxCourse.id, tagId: tags["beginner"].id },
    ],
  });

  const uxMod1 = await prisma.module.create({
    data: {
      courseId: uxCourse.id,
      title: "Module 1: Principles of Interaction Design",
      description: "How humans perceive digital screens and interact with interfaces.",
      orderIndex: 1,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: uxMod1.id,
      title: "Visual Hierarchy & Layout Spacing",
      slug: "visual-hierarchy-and-layout-spacing",
      description: "Guiding the user's eye using size, contrast, proximity, and whitespace.",
      contentType: "TEXT",
      orderIndex: 1,
      isRequired: true,
      durationMinutes: 15,
      textContent: `## Visual Hierarchy: Guiding the Human Eye

Visual hierarchy is the arrangement and presentation of elements in order of their importance.

### The 4 Core Levers:
1. **Size:** Larger elements command attention first (e.g., \`<h1>\` headlines vs body text).
2. **Contrast:** High-contrast elements pop out from the background (e.g., a primary action button).
3. **Proximity:** Elements placed close together are perceived as belonging to the same group.
4. **Whitespace:** Giving elements breathing room enhances legibility and reduces cognitive overload.`,
    },
  });

  // 8. Create Seed Course 3: Web Development Essentials (HTML, CSS & JS) (PUBLISHED)
  const webDevCourse = await prisma.course.create({
    data: {
      title: "Web Development Essentials: HTML, CSS & JavaScript",
      slug: "web-development-essentials",
      shortSummary: "Master semantic HTML5, modern CSS flexbox layouts, and core JavaScript DOM manipulation.",
      description: `# Web Development Essentials
Master the fundamental trio of web technologies that power modern internet experiences: HTML5 for document structure, CSS3 for responsive styling and flexbox grids, and modern JavaScript (ES6+) for interactive DOM manipulation and asynchronous data fetching.

### Learning Objectives:
- Structure accessible web documents with semantic HTML5 tags
- Create responsive layouts using Flexbox, CSS Grid, and media queries
- Manipulate the browser Document Object Model (DOM) dynamically with JavaScript
- Fetch remote JSON data via REST APIs using async/await`,
      difficulty: "BEGINNER",
      language: "English",
      estimatedHours: 5.0,
      thumbnailUrl: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&auto=format&fit=crop&q=80",
      status: "PUBLISHED",
      authorId: contributorUser.id,
      categoryId: categories["programming-technology"].id,
      publishedAt: new Date(),
    },
  });

  const webMod1 = await prisma.module.create({
    data: {
      courseId: webDevCourse.id,
      title: "Module 1: Semantic HTML5 & Document Structure",
      description: "Building accessible and machine-readable page foundations.",
      orderIndex: 1,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: webMod1.id,
      title: "HTML5 Document Tree & Semantic Elements",
      slug: "html5-document-tree-semantic-elements",
      description: "Header, main, section, article, and footer semantics.",
      contentType: "TEXT",
      orderIndex: 1,
      isRequired: true,
      durationMinutes: 15,
      textContent: `## Semantic HTML5 Foundations
Semantic elements clearly describe their meaning to both browser and developer.

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Semantic Page</title>
</head>
<body>
  <header>
    <nav>...</nav>
  </header>
  <main>
    <article>
      <h1>Open Learning</h1>
      <p>Semantic markup enhances accessibility (a11y) and search visibility.</p>
    </article>
  </main>
  <footer>
    <p>&copy; 2026 OpenLearner</p>
  </footer>
</body>
</html>
\`\`\``,
    },
  });

  const webMod2 = await prisma.module.create({
    data: {
      courseId: webDevCourse.id,
      title: "Module 2: Modern CSS Layouts & Flexbox",
      description: "Visual alignment, spacing, and fluid responsive design.",
      orderIndex: 2,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: webMod2.id,
      title: "Mastering the CSS Box Model & Flexbox",
      slug: "mastering-css-box-model-flexbox",
      description: "Margin, padding, border, and flex containers.",
      contentType: "TEXT",
      orderIndex: 1,
      isRequired: true,
      durationMinutes: 20,
      textContent: `## CSS Flexbox in Practice
Flexbox makes horizontal and vertical alignment predictable across device sizes.

\`\`\`css
.card-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}
\`\`\``,
    },
  });

  // 9. Create Seed Course 4: Applied Data Science & ML with Python (PUBLISHED)
  const dataScienceCourse = await prisma.course.create({
    data: {
      title: "Applied Data Science & Machine Learning with Python",
      slug: "applied-data-science-machine-learning",
      shortSummary: "Wrangle real-world data with Pandas & NumPy, plot trends, and train scikit-learn models.",
      description: `# Applied Data Science & Machine Learning
Turn raw data into actionable insights and predictive models. Learn data cleansing, exploratory data analysis (EDA), statistical visualization, and core supervised learning algorithms.

### Curriculum Overview:
- Vectorized computing and matrix algebra with NumPy
- Dataframe wrangling, filtering, and aggregation with Pandas
- Visualizing distributions with Matplotlib & Seaborn
- Building classification and regression models with Scikit-Learn`,
      difficulty: "INTERMEDIATE",
      language: "English",
      estimatedHours: 6.5,
      thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
      status: "PUBLISHED",
      authorId: contributorUser.id,
      categoryId: categories["data-science-ai"].id,
      publishedAt: new Date(),
    },
  });

  const dsMod1 = await prisma.module.create({
    data: {
      courseId: dataScienceCourse.id,
      title: "Module 1: Data Wrangling with Pandas",
      description: "Cleaning messy datasets and feature engineering.",
      orderIndex: 1,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: dsMod1.id,
      title: "DataFrames, Indexing & Aggregations",
      slug: "dataframes-indexing-aggregations",
      description: "Filtering rows, grouping categories, and handling missing values.",
      contentType: "TEXT",
      orderIndex: 1,
      isRequired: true,
      durationMinutes: 25,
      textContent: `## Data Exploration with Pandas

\`\`\`python
import pandas as pd

# Load dataset
df = pd.read_csv("student_scores.csv")

# Quick statistical overview
print(df.describe())

# Grouping by course and calculating average completion
completion_summary = df.groupby("course_name")["progress_pct"].mean()
print(completion_summary)
\`\`\``,
    },
  });

  // 10. Create Seed Course 5: Discrete Mathematics & Algorithm Design (PUBLISHED)
  const mathCourse = await prisma.course.create({
    data: {
      title: "Discrete Mathematics & Algorithm Design",
      slug: "discrete-mathematics-algorithms",
      shortSummary: "Logic, set theory, combinatorics, and asymptotic complexity analysis for computer scientists.",
      description: `# Discrete Mathematics & Algorithm Design
The mathematical foundation behind computer algorithms, data structures, and cryptography.

### Topics Covered:
- Propositional and predicate logic, truth tables, and boolean algebra
- Sets, relations, functions, and graph theory basics
- Asymptotic analysis: Big-O, Big-Theta, and Big-Omega
- Recursive relations and divide-and-conquer algorithms`,
      difficulty: "INTERMEDIATE",
      language: "English",
      estimatedHours: 4.0,
      thumbnailUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80",
      status: "PUBLISHED",
      authorId: contributorUser.id,
      categoryId: categories["mathematics-science"].id,
      publishedAt: new Date(),
    },
  });

  const mathMod1 = await prisma.module.create({
    data: {
      courseId: mathCourse.id,
      title: "Module 1: Logic & Asymptotic Complexity",
      description: "Mathematical rigor and analyzing algorithm runtime efficiency.",
      orderIndex: 1,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: mathMod1.id,
      title: "Understanding Big-O Time & Space Complexity",
      slug: "understanding-big-o-complexity",
      description: "O(1), O(log n), O(n), O(n log n), and O(n^2) scaling characteristics.",
      contentType: "TEXT",
      orderIndex: 1,
      isRequired: true,
      durationMinutes: 20,
      textContent: `## Asymptotic Runtime Complexity
Big-O notation characterizes how algorithm execution time grows as the input size $n$ approaches infinity.

- **$O(1)$ Constant Time:** Hash map lookups
- **$O(\\log n)$ Logarithmic Time:** Binary Search
- **$O(n)$ Linear Time:** Single loop scan
- **$O(n \\log n)$ Linearithmic Time:** MergeSort and QuickSort average case
- **$O(n^2)$ Quadratic Time:** Nested loops (BubbleSort)`,
    },
  });

  // 11. Create Seed Course 6: Tech Startup Strategy & Product Management (PUBLISHED)
  const businessCourse = await prisma.course.create({
    data: {
      title: "Tech Startup Strategy & Product Management",
      slug: "tech-startup-product-management",
      shortSummary: "Validate ideas, build Minimum Viable Products (MVPs), and define product-market fit.",
      description: `# Tech Startup Strategy & Product Management
Learn how top tech founders validate problem-solution fit, conduct unbiased customer discovery interviews, build low-fidelity prototypes, and define north-star growth metrics.

### Key Takeaways:
- Customer discovery frameworks (The Mom Test)
- Creating prioritized feature roadmaps with RICE scoring
- Setting up actionable product analytics and retention loops`,
      difficulty: "BEGINNER",
      language: "English",
      estimatedHours: 3.5,
      thumbnailUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop&q=80",
      status: "PUBLISHED",
      authorId: contributorUser.id,
      categoryId: categories["business-finance"].id,
      publishedAt: new Date(),
    },
  });

  const bizMod1 = await prisma.module.create({
    data: {
      courseId: businessCourse.id,
      title: "Module 1: Finding Problem-Solution Fit",
      description: "Customer research and rapid prototyping principles.",
      orderIndex: 1,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: bizMod1.id,
      title: "Conducting Actionable User Discovery",
      slug: "conducting-actionable-user-discovery",
      description: "How to validate problems before writing a single line of code.",
      contentType: "TEXT",
      orderIndex: 1,
      isRequired: true,
      durationMinutes: 15,
      textContent: `## The Customer Discovery Framework
Great products solve acute, urgent, and pervasive problems.

### Golden Rules of Discovery:
1. Talk about their life and specific past behaviors, not your hypothetical idea.
2. Ask for concrete examples of how they currently solve the problem.
3. Listen 80% of the time, talk 20% of the time.`,
    },
  });

  // 12. Create Seed Course 7: PENDING REVIEW Course (For Admin Review Testing!)
  const pendingCourse = await prisma.course.create({
    data: {
      title: "Modern Web Development with Next.js 15 & React 19",
      slug: "modern-web-development-nextjs15",
      shortSummary: "Comprehensive masterclass on React Server Components, App Router, and server actions.",
      description: `Build full-stack, scalable web applications with the modern Next.js 15 App Router architecture. Includes deep dives into React Server Components, dynamic streaming, and server actions.`,
      difficulty: "INTERMEDIATE",
      language: "English",
      estimatedHours: 6.0,
      thumbnailUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
      status: "PENDING_REVIEW",
      authorId: contributorUser.id,
      categoryId: categories["programming-technology"].id,
    },
  });

  const pendingMod = await prisma.module.create({
    data: {
      courseId: pendingCourse.id,
      title: "Module 1: The React Server Component Paradigm",
      description: "Understand the split between server and client components.",
      orderIndex: 1,
    },
  });

  await prisma.lesson.create({
    data: {
      moduleId: pendingMod.id,
      title: "Server Components vs Client Components",
      slug: "server-vs-client-components",
      description: "Zero-bundle-size server components and when to use 'use client'.",
      contentType: "TEXT",
      orderIndex: 1,
      isRequired: true,
      durationMinutes: 25,
      textContent: `## The Next.js 15 App Router Model

React Server Components (RSC) execute exclusively on the server, producing rendered HTML without sending runtime JavaScript to the client browser.`,
    },
  });

  // 9. Create an Enrollment and partial progress for the sample Learner!
  await prisma.enrollment.create({
    data: {
      userId: learnerUser.id,
      courseId: pythonCourse.id,
    },
  });

  // Mark first 2 lessons completed for the learner
  const pyLessons = await prisma.lesson.findMany({
    where: { module: { courseId: pythonCourse.id } },
    orderBy: { orderIndex: "asc" },
  });

  if (pyLessons.length >= 2) {
    await prisma.lessonProgress.create({
      data: {
        userId: learnerUser.id,
        lessonId: pyLessons[0].id,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    await prisma.lessonProgress.create({
      data: {
        userId: learnerUser.id,
        lessonId: pyLessons[1].id,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    await prisma.courseProgress.create({
      data: {
        userId: learnerUser.id,
        courseId: pythonCourse.id,
        completedLessons: 2,
        totalLessons: pyLessons.length,
        percentage: Math.round((2 / pyLessons.length) * 100),
        isCompleted: false,
        lastLessonId: pyLessons[1].id,
      },
    });
  }

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
