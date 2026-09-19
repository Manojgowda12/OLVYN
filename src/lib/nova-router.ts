/**
 * OpenLearnerAI — Nova Query Intent Classifier & Router
 *
 * Lightweight, zero-latency deterministic query router that determines whether
 * a user's question is a general concept question, an explicit course question,
 * a lesson-specific question, a recommendation request, or a personal progress inquiry.
 *
 * NON-NEGOTIABLE RULE:
 * RAG is NOT the default for every user message.
 * General knowledge questions (e.g. "what is AI", "what is recursion") must NOT
 * retrieve course curriculum or force grounding into an active lesson.
 */

import { LessonContext } from "./ai-assistant";

export type NovaQueryIntent =
  | "GENERAL"
  | "COURSE"
  | "LESSON"
  | "RESOURCE"
  | "PROGRESS"
  | "RECOMMENDATION"
  | "UNCLEAR";

export interface NovaClassificationResult {
  intent: NovaQueryIntent;
  confidence: number;
  isExplicitCurriculumRequest: boolean;
  targetCourseSlug?: string;
  reason: string;
}

// Common general knowledge concept patterns
const GENERAL_CONCEPT_PATTERNS = [
  /^(what is|what are|define|explain|meaning of)\s+(ai|artificial intelligence|machine learning|deep learning|data science|computer science|software engineering|nlp|computer vision)(\?|\.|\s|$)/i,
  /^(what is|what are|define|explain|meaning of)\s+(recursion|an? algorithm|time complexity|space complexity|big o|dynamic programming|data structure)(\?|\.|\s|$)/i,
  /^(what is|what are|define|explain|meaning of)\s+(an? api|rest|graphql|http|tcp|udp|ip address|dns|the internet|a database|sql|nosql)(\?|\.|\s|$)/i,
  /^(what is|what are|define|explain|meaning of)\s+(object oriented programming|oop|functional programming|polymorphism|inheritance|encapsulation)(\?|\.|\s|$)/i,
  /^(who (invented|created|designed|founded)|when was)\s+(python|javascript|react|next\.?js|linux|the internet|git|c\+\+|java)(\?|\.|\s|$)/i,
  /^(difference between|compare)\s+(.*)\s+(and|vs\.?|versus)\s+(.*)/i,
  /^(how does|how do)\s+(a compiler|an interpreter|the browser|git|dns|garbage collection|a neural network)\s+work(\?|\.|\s|$)/i,
  /^(why is|why do we use|benefits of)\s+(python|typescript|docker|git|microservices|serverless)(\?|\.|\s|$)/i,
];

// Greetings and chitchat
const GREETING_PATTERNS = [
  /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)(\s+nova|\s+there|\s+ai|[!.,\s]*$)/i,
  /^(who are you|what can you do|what are your capabilities|help me|tell me about yourself)(\?|\.|\s|$)/i,
];

// Course-level explicit keywords
const COURSE_KEYWORDS = [
  /\b(this|the)\s+course\b/i,
  /\b(course\s+(curriculum|syllabus|overview|structure|topics|modules?))\b/i,
  /\b(in\s+this\s+course)\b/i,
  /\b(according\s+to\s+(this|the)\s+course)\b/i,
  /\b(what\s+does\s+this\s+course\s+(teach|cover))\b/i,
  /\b(syllabus|curriculum)\b/i,
  /\bmodule\s+\d+\b/i,
];

// Lesson-level explicit keywords
const LESSON_KEYWORDS = [
  /\b(this|current|the)\s+lesson\b/i,
  /\b(in\s+this\s+lesson)\b/i,
  /\b(according\s+to\s+this\s+lesson)\b/i,
  /\b(this\s+example|the\s+example\s+above|this\s+code|the\s+code\s+in\s+this\s+lesson)\b/i,
  /\b(why\s+does\s+this\s+code|what\s+does\s+this\s+snippet\s+do)\b/i,
  /\b(explain\s+this\s+lesson|summarize\s+this\s+lesson)\b/i,
  /\b(quiz\s+me\s+on\s+this\s+lesson)\b/i,
];

// Progress keywords
const PROGRESS_KEYWORDS = [
  /\b(my\s+progress|what\s+have\s+i\s+completed|completed\s+courses?|where\s+did\s+i\s+stop)\b/i,
  /\b(my\s+enrolled\s+courses?|courses\s+i\s+am\s+(taking|enrolled\s+in))\b/i,
  /\b(how\s+many\s+lessons?\s+(have\s+i\s+finished|completed))\b/i,
  /\b(continue\s+learning|resume\s+(my\s+)?course)\b/i,
];

// Recommendation keywords
const RECOMMENDATION_KEYWORDS = [
  /\b(recommend|suggest|what\s+should\s+i\s+learn\s+next|which\s+course)\b/i,
  /\b(roadmap|study\s+plan|learning\s+path)\b/i,
  /\b(beginner\s+course|where\s+to\s+start|how\s+do\s+i\s+start\s+learning)\b/i,
  /\b(best\s+course\s+for|courses?\s+for\s+(beginners?|intermediates?|experts?))\b/i,
];

// Resource keywords
const RESOURCE_KEYWORDS = [
  /\b(uploaded\s+(file|pdf|notes|document)|attached\s+(file|pdf))\b/i,
  /\b(what\s+does\s+this\s+pdf\s+say|summarize\s+(the\s+)?notes)\b/i,
  /\b(from\s+my\s+notes|in\s+the\s+document)\b/i,
];

// Known course slug / name tokens for explicit cross-course scoping
const KNOWN_COURSES = [
  { slug: "python-fundamentals-for-beginners", terms: ["python fundamentals", "python for beginners", "python course"] },
  { slug: "web-development-essentials", terms: ["web development essentials", "web dev essentials", "web development course"] },
  { slug: "foundations-of-ui-ux-design", terms: ["foundations of ui/ux", "ui/ux design course", "ui/ux foundations"] },
  { slug: "applied-data-science-machine-learning", terms: ["applied data science", "data science course", "machine learning course"] },
  { slug: "discrete-mathematics-algorithms", terms: ["discrete mathematics", "algorithms course", "discrete math"] },
  { slug: "tech-startup-product-management", terms: ["tech startup product management", "product management course"] },
];

/**
 * Deterministically classifies a user message to guide retrieval and prompt assembly.
 */
export function classifyNovaQuery(
  rawMessage: string,
  context?: { lessonContext?: LessonContext }
): NovaClassificationResult {
  const message = rawMessage.trim();
  const lower = message.toLowerCase();

  // 1. Progress queries (Highest priority for personal analytics)
  for (const pattern of PROGRESS_KEYWORDS) {
    if (pattern.test(lower)) {
      return {
        intent: "PROGRESS",
        confidence: 0.95,
        isExplicitCurriculumRequest: false,
        reason: "User inquired about personal learning progress, enrollments, or completion stats.",
      };
    }
  }

  // 2. Resource queries (PDF / uploaded attachments)
  for (const pattern of RESOURCE_KEYWORDS) {
    if (pattern.test(lower)) {
      return {
        intent: "RESOURCE",
        confidence: 0.9,
        isExplicitCurriculumRequest: true,
        reason: "User explicitly requested information from an uploaded resource/document.",
      };
    }
  }

  // 3. Recommendation / Study Roadmap queries
  for (const pattern of RECOMMENDATION_KEYWORDS) {
    if (pattern.test(lower)) {
      return {
        intent: "RECOMMENDATION",
        confidence: 0.9,
        isExplicitCurriculumRequest: false,
        reason: "User requested course recommendations, catalogs, or study roadmaps.",
      };
    }
  }

  // 4. Explicit Lesson queries (User specifically asking about current lesson)
  for (const pattern of LESSON_KEYWORDS) {
    if (pattern.test(lower)) {
      return {
        intent: "LESSON",
        confidence: 0.95,
        isExplicitCurriculumRequest: true,
        reason: "User explicitly referenced 'this lesson', 'current lesson', or attached code snippet.",
      };
    }
  }

  // 5. Explicit Course queries
  for (const pattern of COURSE_KEYWORDS) {
    if (pattern.test(lower)) {
      return {
        intent: "COURSE",
        confidence: 0.9,
        isExplicitCurriculumRequest: true,
        reason: "User explicitly referenced course syllabus, curriculum, or modules.",
      };
    }
  }

  // Check for explicit mentions of specific courses by name
  for (const course of KNOWN_COURSES) {
    for (const term of course.terms) {
      if (lower.includes(term)) {
        return {
          intent: "COURSE",
          confidence: 0.85,
          isExplicitCurriculumRequest: true,
          targetCourseSlug: course.slug,
          reason: `User explicitly mentioned course '${term}'.`,
        };
      }
    }
  }

  // 6. Greetings & Chitchat
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        intent: "GENERAL",
        confidence: 0.95,
        isExplicitCurriculumRequest: false,
        reason: "Greeting or conversational identity inquiry.",
      };
    }
  }

  // 7. General Knowledge Concept Questions (Crucial check!)
  for (const pattern of GENERAL_CONCEPT_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        intent: "GENERAL",
        confidence: 0.95,
        isExplicitCurriculumRequest: false,
        reason: "General knowledge question asking for concept definition/explanation without course scoping.",
      };
    }
  }

  // 8. General question heuristics:
  // If the query starts with general interrogatives and doesn't mention course/lesson/syllabus
  if (/^(what is|what are|explain|how does|why is|difference between|tell me about|how to)\s+/i.test(lower)) {
    // Check if the query contains explicit lesson/course deictic references
    const hasDeicticCourseRef = /\b(this|the|our|your)\s+(course|lesson|module|class|chapter|video)\b/i.test(lower);
    if (!hasDeicticCourseRef) {
      return {
        intent: "GENERAL",
        confidence: 0.85,
        isExplicitCurriculumRequest: false,
        reason: "Standard general conceptual inquiry without deictic course/lesson reference.",
      };
    }
  }

  // 9. If active lesson context is present AND the query is a short follow-up or deictic reference:
  if (context?.lessonContext) {
    // E.g. "why?", "explain that", "can you clarify?", "give an example of this"
    if (/^(why|explain that|clarify|give an example|how so|what does that mean)\??$/i.test(lower)) {
      return {
        intent: "LESSON",
        confidence: 0.75,
        isExplicitCurriculumRequest: true,
        reason: "Deictic follow-up question while viewing an active lesson.",
      };
    }
  }

  // 10. Default fallback:
  // If no clear course or lesson indicators exist, treat as GENERAL to prevent unwanted RAG hallucination
  return {
    intent: "GENERAL",
    confidence: 0.7,
    isExplicitCurriculumRequest: false,
    reason: "No explicit curriculum cues detected; defaulting to general knowledge to avoid incorrect grounding.",
  };
}
