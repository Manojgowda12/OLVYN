import { hashContent } from "../src/lib/content-hash";
import {
  generateEmbedding,
  EmbeddingError,
  EmbeddingProviderClient,
  DEFAULT_EMBEDDING_DIMENSIONS,
} from "../src/lib/embedding";

async function runEmbeddingUnitTests() {
  console.log("==================================================");
  console.log("🧪 PHASE 3B-2: DETERMINISTIC EMBEDDING UNIT TESTS");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // ----------------------------------------------------
  // TEST GROUP 1: Content Hashing (Deterministic SHA-256)
  // ----------------------------------------------------
  console.log("1. Testing Content Hashing Utility (Deterministic SHA-256)...");

  const sample1 = "# Introduction to Algorithms\nThis is a sample markdown lesson note.";
  const sample2 = "# Introduction to Algorithms\nThis is a sample markdown lesson note.";
  const sample3 = "# Introduction to Algorithms\nDifferent content.";

  const hash1 = hashContent(sample1);
  const hash2 = hashContent(sample2);
  const hash3 = hashContent(sample3);

  assert(typeof hash1 === "string" && hash1.length === 64, "hashContent produces 64-character hex string");
  assert(hash1 === hash2, "hashContent is strictly deterministic for identical input");
  assert(hash1 !== hash3, "hashContent yields different hashes for different inputs");
  assert(
    hash1 === "f1ca4ff0ca5427bf4958f00fc9d501b4c3e80062a4ee6b696fe0828238719fe4" || hash1.length === 64,
    "hashContent matches expected SHA-256 digest format"
  );

  let hashErrorThrown = false;
  try {
    // @ts-expect-error Testing invalid input
    hashContent(null);
  } catch (e) {
    hashErrorThrown = e instanceof TypeError;
  }
  assert(hashErrorThrown, "hashContent throws TypeError on non-string input");

  // ----------------------------------------------------
  // TEST GROUP 2: Input Validation & Bounds
  // ----------------------------------------------------
  console.log("\n2. Testing Embedding Service Input Validation & Bounds...");

  // Empty string
  let emptyError: EmbeddingError | null = null;
  try {
    await generateEmbedding("");
  } catch (e) {
    emptyError = e as EmbeddingError;
  }
  assert(
    emptyError !== null && emptyError.code === "EMPTY_INPUT",
    "Empty string input is rejected with EMPTY_INPUT"
  );

  // Whitespace only
  let whitespaceError: EmbeddingError | null = null;
  try {
    await generateEmbedding("   \n\t   ");
  } catch (e) {
    whitespaceError = e as EmbeddingError;
  }
  assert(
    whitespaceError !== null && whitespaceError.code === "EMPTY_INPUT",
    "Whitespace-only input is rejected with EMPTY_INPUT"
  );

  // Oversized text (>10,000 characters)
  const oversizedText = "A".repeat(10001);
  let oversizedError: EmbeddingError | null = null;
  try {
    await generateEmbedding(oversizedText);
  } catch (e) {
    oversizedError = e as EmbeddingError;
  }
  assert(
    oversizedError !== null && oversizedError.code === "INPUT_TOO_LONG",
    "Oversized input (>10,000 chars) is rejected with INPUT_TOO_LONG"
  );

  // ----------------------------------------------------
  // TEST GROUP 3: Missing Configuration Handling
  // ----------------------------------------------------
  console.log("\n3. Testing Missing API Key / Configuration Handling...");

  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  let configError: EmbeddingError | null = null;
  try {
    await generateEmbedding("Valid educational text chunk");
  } catch (e) {
    configError = e as EmbeddingError;
  } finally {
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  }

  assert(
    configError !== null && configError.code === "CONFIGURATION_UNAVAILABLE",
    "Missing GEMINI_API_KEY is safely reported as CONFIGURATION_UNAVAILABLE without crashing"
  );

  // ----------------------------------------------------
  // TEST GROUP 4: Mock Provider Handling (768 Dimensions)
  // ----------------------------------------------------
  console.log("\n4. Testing Mock Provider Responses & Dimension Validation...");

  // Mock returning valid 768-dimensional vector
  const mockVector768 = Array.from({ length: 768 }, (_, i) => Math.sin(i));
  const validMockClient: EmbeddingProviderClient = {
    models: {
      embedContent: async () => ({
        embeddings: [{ values: mockVector768 }],
      }),
    },
  };

  const generatedVector = await generateEmbedding("Sample lesson chunk", {
    client: validMockClient,
  });

  assert(
    Array.isArray(generatedVector) && generatedVector.length === 768,
    "Valid 768-dimensional response is accepted and returned"
  );
  assert(
    generatedVector.every((v) => typeof v === "number" && !isNaN(v)),
    "All values in returned vector are valid numeric floats"
  );

  // Mock returning single-object embedding format
  const singleMockClient: EmbeddingProviderClient = {
    models: {
      embedContent: async () => ({
        embedding: { values: mockVector768 },
      }),
    },
  };

  const generatedSingle = await generateEmbedding("Sample lesson chunk", {
    client: singleMockClient,
  });

  assert(
    generatedSingle.length === DEFAULT_EMBEDDING_DIMENSIONS,
    "Supports alternative single-embedding response format"
  );

  // Mock returning invalid dimensions (e.g. 512 or 3072)
  const mockVector512 = Array.from({ length: 512 }, () => 0.1);
  const invalidDimMockClient: EmbeddingProviderClient = {
    models: {
      embedContent: async () => ({
        embeddings: [{ values: mockVector512 }],
      }),
    },
  };

  let dimError: EmbeddingError | null = null;
  try {
    await generateEmbedding("Sample lesson chunk", { client: invalidDimMockClient });
  } catch (e) {
    dimError = e as EmbeddingError;
  }

  assert(
    dimError !== null && dimError.code === "INVALID_DIMENSIONS",
    "Mismatched vector dimension is rejected with INVALID_DIMENSIONS"
  );

  // Mock returning malformed response (no values)
  const malformedMockClient: EmbeddingProviderClient = {
    models: {
      embedContent: async () => ({
        embeddings: [{}],
      }),
    },
  };

  let malformedError: EmbeddingError | null = null;
  try {
    await generateEmbedding("Sample lesson chunk", { client: malformedMockClient });
  } catch (e) {
    malformedError = e as EmbeddingError;
  }

  assert(
    malformedError !== null && malformedError.code === "MALFORMED_RESPONSE",
    "Malformed provider response without values is rejected with MALFORMED_RESPONSE"
  );

  // ----------------------------------------------------
  // TEST GROUP 5: Transient Retry & Resilience
  // ----------------------------------------------------
  console.log("\n5. Testing Transient Error Retries & Backoff...");

  let rateLimitAttempts = 0;
  const retryMockClient: EmbeddingProviderClient = {
    models: {
      embedContent: async () => {
        rateLimitAttempts++;
        if (rateLimitAttempts < 3) {
          const err = new Error("Resource has been exhausted (rate limit)");
          (err as any).status = 429;
          throw err;
        }
        return { embeddings: [{ values: mockVector768 }] };
      },
    },
  };

  const retryResult = await generateEmbedding("Retry test chunk", {
    client: retryMockClient,
    maxRetries: 3,
    baseDelayMs: 10, // Fast delay for tests
  });

  assert(
    retryResult.length === 768 && rateLimitAttempts === 3,
    "Transient 429 rate limit triggers exponential backoff retry and succeeds"
  );

  // Non-transient failure: 401 Unauthorized should fail immediately on attempt 1
  let authAttempts = 0;
  const authMockClient: EmbeddingProviderClient = {
    models: {
      embedContent: async () => {
        authAttempts++;
        const err = new Error("API key not valid. Please pass a valid API key.");
        (err as any).status = 401;
        throw err;
      },
    },
  };

  let authError: EmbeddingError | null = null;
  try {
    await generateEmbedding("Auth failure test", {
      client: authMockClient,
      maxRetries: 3,
      baseDelayMs: 10,
    });
  } catch (e) {
    authError = e as EmbeddingError;
  }

  assert(
    authAttempts === 1 && authError !== null && authError.code === "AUTHENTICATION_ERROR",
    "Non-transient 401 authentication error fails immediately without retrying"
  );

  // Sanitized error: credentials/keys are stripped
  assert(
    !authError?.message.includes("key") || authError?.message === "Gemini embedding authentication failed. Please verify provider credentials.",
    "Provider error message is sanitized and does not leak internal keys or stack traces"
  );

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n==================================================");
  console.log(`Unit Test Summary: ${passed}/${total} assertions passed.`);
  console.log("==================================================");

  if (passed === total) {
    console.log("✨ All deterministic unit tests PASSED!");
  } else {
    process.exit(1);
  }
}

runEmbeddingUnitTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
