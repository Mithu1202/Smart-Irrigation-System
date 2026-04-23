const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const hasOpenRouter = () => Boolean(process.env.OPENROUTER_API_KEY);

const callOpenRouter = async ({
  messages,
  model,
  temperature = 0.2,
  response_format,
}) => {
  if (!hasOpenRouter()) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME || "Smart Irrigation System",
    },
    body: JSON.stringify({
      model: model || process.env.OPENROUTER_MODEL || "openrouter/free",
      messages,
      temperature,
      ...(response_format ? { response_format } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || null;
};

const synthesizeAgentJSON = async ({ question, decision, toolTrace, retrieval, websiteContext }) => {
  if (!hasOpenRouter()) {
    return null;
  }

  try {
    const content = await callOpenRouter({
      messages: [
        {
          role: "system",
          content:
            "You are a highly accurate irrigation decision assistant. You MUST rigorously analyze graph patterns and trends from the data provided. Return ONLY valid JSON with keys decision, reason, action, summary, and nextSteps. Prioritize precision and factual analysis of the provided data.",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              question,
              decision,
              toolTrace,
              retrieval,
              websiteContext,
            },
            null,
            2
          ),
        },
      ],
      temperature: 0.1,
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "irrigation_agent_response",
          schema: {
            type: "object",
            additionalProperties: true,
            properties: {
              decision: { type: "string" },
              reason: { type: "string" },
              action: { type: "string" },
              summary: { type: "string" },
              nextSteps: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["decision", "reason", "action"],
          },
        },
      },
    });

    if (!content) return null;

    try {
      return JSON.parse(content);
    } catch {
      return {
        summary: content,
      };
    }
  } catch (error) {
    return {
      summary: null,
      error: error.message,
    };
  }
};

const synthesizeAgricultureJSON = async ({
  question,
  intent,
  context,
  toolTrace,
  retrieval,
  websiteContext,
}) => {
  if (!hasOpenRouter()) {
    return null;
  }

  try {
    const content = await callOpenRouter({
      messages: [
        {
          role: "system",
          content:
            "You are a highly accurate agriculture assistant for an irrigation dashboard. Answer naturally, rigorously analyze any provided graph patterns and trends, use the provided evidence, and stay focused on agriculture, crops, soil, irrigation, logs, weather, yield, pests, and farm operations. Prioritize statistical accuracy. Return only JSON.",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              question,
              intent,
              context,
              toolTrace,
              retrieval,
              websiteContext,
            },
            null,
            2
          ),
        },
      ],
      temperature: 0.2,
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "agriculture_chat_response",
          schema: {
            type: "object",
            additionalProperties: true,
            properties: {
              answer: { type: "string" },
              decision: { type: "string" },
              reason: { type: "string" },
              action: { type: "string" },
              summary: { type: "string" },
              evidence: {
                type: "array",
                items: { type: "string" },
              },
              nextSteps: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["answer", "reason", "action"],
          },
        },
      },
    });

    if (!content) return null;

    try {
      return JSON.parse(content);
    } catch {
      return {
        answer: content,
        summary: content,
      };
    }
  } catch (error) {
    return {
      error: error.message,
      summary: null,
    };
  }
};

const getOpenRouterStatus = () => ({
  configured: hasOpenRouter(),
  model: process.env.OPENROUTER_MODEL || "openrouter/free",
});

module.exports = {
  callOpenRouter,
  getOpenRouterStatus,
  hasOpenRouter,
  synthesizeAgricultureJSON,
  synthesizeAgentJSON,
};
