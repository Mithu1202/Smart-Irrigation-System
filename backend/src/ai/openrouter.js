/**
 * openrouter.js
 * ─────────────────────────────────────────────────────────
 * OpenRouter API client for the Smart Irrigation AI Agent.
 *
 * Model: google/gemini-2.5-flash (recommended)
 *   - $0.15/1M input tokens, $0.60/1M output tokens
 *   - Native JSON schema support
 *   - 1M token context window
 *   - Fast inference (~500ms median)
 *
 * Features:
 *   - Single unified LLM call (not two separate ones)
 *   - Retry with exponential backoff
 *   - Response validation
 *   - Token usage tracking
 */

const { SYSTEM_PROMPT, FEW_SHOT_EXAMPLES, OUTPUT_SCHEMA } = require("./prompts");
const {
  buildCompactContext,
  buildRAGContext,
  buildLLMMessages,
  getMemory,
  addToMemory,
  estimateTokens,
} = require("./tokenBudget");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ── Recommended model for agriculture domain ─────────────
// google/gemini-2.5-flash: Best balance of cost, speed,
// accuracy, and JSON schema support on OpenRouter.
const DEFAULT_MODEL = "google/gemini-2.5-flash";

// ── Token Usage Tracking ─────────────────────────────────
let totalTokensUsed = { input: 0, output: 0, calls: 0 };

const getTokenUsage = () => ({ ...totalTokensUsed });
const resetTokenUsage = () => {
  totalTokensUsed = { input: 0, output: 0, calls: 0 };
};

// ── Core API Helpers ─────────────────────────────────────
const hasOpenRouter = () => Boolean(process.env.OPENROUTER_API_KEY);

const getModel = () =>
  process.env.OPENROUTER_MODEL && process.env.OPENROUTER_MODEL !== "openrouter/free"
    ? process.env.OPENROUTER_MODEL
    : DEFAULT_MODEL;

const getOpenRouterStatus = () => ({
  configured: hasOpenRouter(),
  model: getModel(),
  tokenUsage: getTokenUsage(),
});

// ── API Call with Retry ──────────────────────────────────
const callOpenRouter = async ({
  messages,
  model,
  temperature = 0.15,
  response_format,
  maxRetries = 2,
}) => {
  if (!hasOpenRouter()) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const selectedModel = model || getModel();
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        );
        console.log(`[OpenRouter] Retry attempt ${attempt}/${maxRetries}`);
      }

      const body = {
        model: selectedModel,
        messages,
        temperature,
        max_tokens: 800,
        ...(response_format ? { response_format } : {}),
      };

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer":
            process.env.OPENROUTER_HTTP_REFERER || "http://localhost:3000",
          "X-Title":
            process.env.OPENROUTER_APP_NAME || "Smart Irrigation System",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter ${response.status}: ${errorText.slice(0, 200)}`
        );
      }

      const data = await response.json();

      // Track token usage
      if (data.usage) {
        totalTokensUsed.input += data.usage.prompt_tokens || 0;
        totalTokensUsed.output += data.usage.completion_tokens || 0;
        totalTokensUsed.calls += 1;
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenRouter");
      }

      return content;
    } catch (error) {
      lastError = error;
      console.error(
        `[OpenRouter] Attempt ${attempt + 1} failed:`,
        error.message
      );
    }
  }

  throw lastError;
};

// ── Unified Agriculture Synthesis ────────────────────────
// Single LLM call that replaces both synthesizeAgentJSON
// and synthesizeAgricultureJSON from the old implementation.
const synthesizeAgricultureResponse = async ({
  question,
  intent,
  zone,
  data,
  trend,
  thresholdGap,
  risk,
  prediction,
  roi,
  irrigationLogs,
  decision,
  retrieval,
  sessionId,
}) => {
  if (!hasOpenRouter()) {
    return null;
  }

  try {
    // Build compact context (~500 tokens instead of ~15K)
    const compactContext = buildCompactContext({
      question,
      intent,
      zone,
      data,
      trend,
      thresholdGap,
      risk,
      prediction,
      roi,
      irrigationLogs,
      decision,
      retrieval,
    });

    const ragContext = buildRAGContext(retrieval, 4);

    // Get conversation history for follow-ups
    const conversationHistory = getMemory(sessionId);

    // Build token-efficient message array
    const messages = buildLLMMessages({
      systemPrompt: SYSTEM_PROMPT,
      fewShotExamples: FEW_SHOT_EXAMPLES,
      conversationHistory,
      question,
      compactContext,
      ragContext,
    });

    // Log token estimate
    const inputTokens = estimateTokens(messages);
    console.log(
      `[OpenRouter] Sending ${inputTokens} est. tokens | Model: ${getModel()} | Intent: ${intent}`
    );

    // Single LLM call
    const content = await callOpenRouter({
      messages,
      temperature: 0.15,
      response_format: OUTPUT_SCHEMA,
    });

    // Parse and validate response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // If JSON parsing fails, wrap the raw text
      parsed = {
        answer: content,
        decision: "Response generated",
        reason: "LLM returned non-JSON response",
        action: "Review the response",
        confidence: 0.6,
        riskLevel: "LOW",
        evidence: [],
        nextSteps: [],
      };
    }

    // Validate required fields
    const validated = {
      answer: parsed.answer || "No response generated",
      decision: parsed.decision || decision?.decision || "Analysis complete",
      reason: parsed.reason || "Based on available data",
      action: parsed.action || "Continue monitoring",
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      riskLevel: ["LOW", "MEDIUM", "HIGH", "NONE"].includes(parsed.riskLevel)
        ? parsed.riskLevel
        : "LOW",
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence.slice(0, 8) : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 5) : [],
    };

    // Save to conversation memory
    addToMemory(sessionId, question, validated.answer);

    return validated;
  } catch (error) {
    console.error("[OpenRouter] Synthesis failed:", error.message);
    return {
      answer: null,
      error: error.message,
    };
  }
};

module.exports = {
  callOpenRouter,
  getOpenRouterStatus,
  getModel,
  getTokenUsage,
  resetTokenUsage,
  hasOpenRouter,
  synthesizeAgricultureResponse,
};
