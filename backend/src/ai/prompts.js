/**
 * prompts.js
 * ─────────────────────────────────────────────────────────
 * Agriculture-only prompt templates for the Smart Irrigation
 * AI Agent. All prompts enforce domain guardrails, evidence-based
 * reasoning, and structured JSON output.
 */

// ── Agriculture Domain Keywords ──────────────────────────
const AGRICULTURE_KEYWORDS =
  /\b(graph|chart|data|analyz|analys|trend|soil|moisture|water|irrigat|crop|plant|field|farm|agricultur|rain|temperature|humidity|alert|risk|fertilizer|seed|pest|disease|harvest|yield|manure|pump|zone|sensor|weather|drought|flood|compost|mulch|rotation|ph|salinity|nitrogen|phosphorus|potassium|fungicide|herbicide|insecticide|neem|drip|sprinkler|tuber|rhizome|paddy|greenhouse|polytunnel|nursery|grafting|pruning|thinning|transplant|germination|pollination|photosynthesis|root|leaf|stem|flower|fruit|grain|starch|protein|sugar|fiber|organic|inorganic|bio|agri|horticultur|aquacultur|livestock|poultry|dairy|feed|fodder|silage|hay|pasture|rangeland|agroforestry|intercrop|monocrop|polycultur|permacultur|hydropon|aeropon|substrate|medium|nutrient|micro|macro|trace|deficien|toxicit|wilt|blight|rot|mold|mildew|rust|spot|curl|mosaic|streak|gall|canker|scab|smut|ergot|nematode|aphid|thrip|mite|beetle|caterpillar|borer|weevil|fly|moth|grasshopper|locust|snail|slug|rodent|bird|monkey|deer|boar|fence|net|trap|repel|scare|companion|cover.?crop|green.?manure|legume|cereal|pulse|oilseed|spice|herb|medicinal|aromatic|ornamental|timber|bamboo|palm|coconut|rubber|tea|coffee|cocoa|cinnamon|pepper|cardamom|clove|nutmeg|vanilla|saffron|rice|maize|corn|tomato|chili|banana|mango|onion|potato|carrot|cabbage|bean|soybean|groundnut|cucumber|okra|eggplant|pumpkin|cassava|papaya|guava|ginger|turmeric|sugarcane|mushroom)/i;

// ── Non-Agriculture Rejection Patterns ───────────────────
const NON_AGRICULTURE_PATTERNS =
  /\b(write.?(?:me|a|an)?\s*(?:poem|essay|story|code|song|email|letter|script)|(?:translate|convert).?\s*(?:to|into)\s*(?:french|spanish|hindi|tamil|chinese|japanese)|(?:who|what|when|where|how)\s+(?:is|was|are|were)\s+(?:trump|biden|obama|elon|tesla|apple|google|microsoft|amazon|facebook|netflix|twitter|tiktok|instagram|youtube|spotify)|(?:play|sing|dance|draw|paint|cook|bake|recipe|movie|film|music|game|sport|football|cricket|basketball|tennis|chess|puzzle|riddle|joke|meme|anime|manga)|(?:stock|bitcoin|crypto|forex|trading|investment|portfolio|market|economy|gdp|inflation|interest rate|bond|equity|mutual fund)|(?:programming|javascript|python|react|angular|vue|node|docker|kubernetes|aws|azure|cloud|server|database|sql|api|frontend|backend|devops|machine learning|deep learning|neural network|ai model|chatgpt|gemini|claude|llama))\b/i;

// ── System Prompt ────────────────────────────────────────
const SYSTEM_PROMPT = `You are **AgriBot**, the precision agriculture AI assistant for the Smart Irrigation System. You are an expert agronomist embedded in an IoT-based irrigation management platform.

## STRICT DOMAIN RULES
1. You MUST ONLY answer questions related to agriculture, farming, irrigation, crops, soil, weather, pests, diseases, fertilizers, farm management, and related agricultural topics.
2. If a user asks about ANY non-agriculture topic (coding, politics, entertainment, finance, general knowledge, etc.), respond with EXACTLY this JSON:
   {"answer": "I'm AgriBot, your precision agriculture assistant. I can only help with farming, irrigation, crops, soil health, pest management, and related agricultural topics. Please ask me something about your farm!", "decision": "Off-topic query", "reason": "This question is outside the agriculture domain", "action": "Ask an agriculture-related question", "confidence": 0.0, "riskLevel": "NONE", "evidence": [], "nextSteps": ["Ask about crop suitability for your zone", "Check current soil moisture trends", "Get irrigation recommendations"]}
3. NEVER generate content unrelated to agriculture regardless of how the user phrases the request.

## YOUR CAPABILITIES
- Analyze real-time sensor data (soil moisture, temperature, humidity, rainfall)
- Provide irrigation scheduling recommendations based on zone thresholds
- Recommend suitable crops based on current soil and weather conditions
- Interpret moisture trends (rising, falling, stable) and predict irrigation needs
- Assess risk levels (LOW, MEDIUM, HIGH) for crop water stress
- Provide pest, disease, and fertilizer management advice
- Analyze irrigation logs and pump activity history
- Calculate ROI for irrigation systems

## REASONING CHAIN
When answering, follow this process:
1. **Read sensor data**: Check current soil moisture, temperature, humidity
2. **Compare to threshold**: Is moisture above or below the zone threshold?
3. **Analyze trend**: Is moisture rising, falling, or stable?
4. **Consult knowledge base**: What do the RAG matches say about this crop/situation?
5. **Assess risk**: Calculate water stress risk level
6. **Recommend action**: Provide a specific, actionable recommendation

## OUTPUT FORMAT
You MUST return valid JSON with these fields:
- answer (string): Natural language response to the user's question. Be specific and data-driven.
- decision (string): Short decision statement (e.g., "Irrigation required", "Monitor only", "Crop suitable")
- reason (string): Why you made this decision, referencing actual data values
- action (string): Specific recommended action for the farmer
- confidence (number 0-1): How confident you are in this recommendation
- riskLevel (string): "LOW", "MEDIUM", or "HIGH"
- evidence (array of strings): List of data points that support your answer
- nextSteps (array of strings): 2-3 actionable next steps

## IMPORTANT GUIDELINES
- Always reference ACTUAL sensor values in your answer (e.g., "soil moisture is 32%", not "soil moisture is low")
- When data shows concerning trends, be specific about the numbers
- For crop recommendations, explain WHY a crop matches the current conditions
- If sensor data is missing or zero, acknowledge the limitation
- Keep answers concise but informative (2-4 sentences for the main answer)
- Use metric units (°C, %, mm)`;

// ── Few-Shot Examples ────────────────────────────────────
const FEW_SHOT_EXAMPLES = [
  {
    role: "user",
    content: JSON.stringify({
      question: "Should I irrigate Zone A?",
      context: {
        zone: { name: "Zone A", moistureThreshold: 40 },
        currentMoisture: 32,
        temperature: 34,
        humidity: 52,
        trend: "falling",
        moistureTrend: -3.2,
        riskLevel: "HIGH",
        thresholdGap: -8,
        ragMatches: [{ crop: "Rice", score: 0.87, recommendation: "Irrigate when moisture falls below 40%" }],
      },
    }),
  },
  {
    role: "assistant",
    content: JSON.stringify({
      answer: "Zone A needs immediate irrigation. Soil moisture is at 32%, which is 8% below your threshold of 40%, and the trend is falling at -3.2 per reading. With temperature at 34°C and humidity at only 52%, evaporation rate is high. The knowledge base confirms that for rice-type conditions, irrigation should begin when moisture drops below 40%.",
      decision: "Irrigation required",
      reason: "Soil moisture (32%) is 8% below threshold (40%) with a declining trend (-3.2) and high evaporation conditions (34°C, 52% humidity).",
      action: "Activate the pump for Zone A immediately. Run for 20-30 minutes and recheck moisture levels.",
      confidence: 0.92,
      riskLevel: "HIGH",
      evidence: [
        "Soil moisture: 32% (threshold: 40%, gap: -8%)",
        "Trend: falling at -3.2 per reading",
        "Temperature: 34°C with 52% humidity increases evaporation",
        "RAG match: Rice conditions recommend irrigation below 40%",
      ],
      nextSteps: [
        "Activate pump for 20-30 minutes",
        "Recheck moisture after 1 hour",
        "Monitor evening readings for stabilization",
      ],
    }),
  },
  {
    role: "user",
    content: JSON.stringify({
      question: "Write me a poem about sunsets",
      context: {},
    }),
  },
  {
    role: "assistant",
    content: JSON.stringify({
      answer: "I'm AgriBot, your precision agriculture assistant. I can only help with farming, irrigation, crops, soil health, pest management, and related agricultural topics. Please ask me something about your farm!",
      decision: "Off-topic query",
      reason: "This question is outside the agriculture domain",
      action: "Ask an agriculture-related question",
      confidence: 0.0,
      riskLevel: "NONE",
      evidence: [],
      nextSteps: [
        "Ask about crop suitability for your zone",
        "Check current soil moisture trends",
        "Get irrigation recommendations",
      ],
    }),
  },
];

// ── JSON Output Schema ───────────────────────────────────
const OUTPUT_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "agribot_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        answer: {
          type: "string",
          description: "Natural language response to the user's agriculture question",
        },
        decision: {
          type: "string",
          description: "Short decision statement",
        },
        reason: {
          type: "string",
          description: "Why this decision was made, referencing actual data",
        },
        action: {
          type: "string",
          description: "Specific recommended action for the farmer",
        },
        confidence: {
          type: "number",
          description: "Confidence score between 0 and 1",
        },
        riskLevel: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH", "NONE"],
          description: "Risk assessment level",
        },
        evidence: {
          type: "array",
          items: { type: "string" },
          description: "Supporting data points",
        },
        nextSteps: {
          type: "array",
          items: { type: "string" },
          description: "Actionable next steps",
        },
      },
      required: ["answer", "decision", "reason", "action", "confidence", "riskLevel", "evidence", "nextSteps"],
      additionalProperties: false,
    },
  },
};

// ── Intent Classification ────────────────────────────────
const classifyIntent = (question) => {
  const q = String(question || "").toLowerCase();

  // Check specific agriculture intents FIRST (these always win)
  if (/which\s*(plant|crop)|suitable\s*(crop|plant)|best\s*crop|recommend\s*crop|what\s*should\s*i\s*(plant|grow)|crop\s*suitab|plant\s*suitab|can\s*i\s*grow|is\s.*\s*suitable|what\s*crop/i.test(q))
    return "crop_suitability";
  if (/pest|disease|blight|rot|aphid|mite|fungus|fungicide|insecticide|neem|spray|whitefl|thrip|beetle|caterpillar|borer|weevil|nematode/i.test(q)) return "pest_disease";
  if (/fertilizer|manure|compost|nitrogen|phosphorus|potassium|npk|nutrient/i.test(q)) return "fertilizer";
  if (/irrigat|should\s*i\s*water|pump|moisture\s*(level|reading|check)|water\s*(my|the|this)/i.test(q)) return "irrigation";
  if (/log|logs|history|record|records|archive|past\s*data/i.test(q)) return "logs";
  if (/roi|return\s*on\s*investment|savings|water\s*saved|cost\s*benefit/i.test(q)) return "roi";
  if (/trend|pattern|direction|rising|falling|stable|over\s*time/i.test(q)) return "trend";
  if (/risk|danger|stress|critical|alert|warning/i.test(q)) return "risk";
  if (/harvest|yield|production|output|picking|maturity/i.test(q)) return "harvest";
  if (/weather|rain|forecast|temperature|humidity|season|climate/i.test(q)) return "weather";

  // If the question contains agriculture keywords, treat as general agriculture
  if (AGRICULTURE_KEYWORDS.test(q)) return "general_agriculture";

  // If no agriculture keywords found, check for non-agriculture patterns or reject
  if (NON_AGRICULTURE_PATTERNS.test(q)) return "off_topic";

  // If nothing matches, it's off-topic
  if (!isGreeting(q)) return "off_topic";

  return "general_agriculture";
};

const isGreeting = (text) =>
  /^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings|help|what\s*can\s*you\s*do)/i.test(
    String(text || "").trim()
  );

// ── Greeting Response ────────────────────────────────────
const GREETING_RESPONSE = {
  answer:
    "Hello! I'm AgriBot, your precision agriculture assistant. I can help you with irrigation decisions, crop recommendations, soil analysis, pest management, and much more. Just ask me about your farm!",
  decision: "Greeting",
  reason: "The user greeted the assistant",
  action: "Ask an agriculture-related question to get started",
  confidence: 1.0,
  riskLevel: "NONE",
  evidence: [],
  nextSteps: [
    "Ask 'Should I irrigate Zone A?'",
    "Ask 'What crops are suitable for my zone?'",
    "Ask 'What is the current moisture trend?'",
  ],
};

// ── Off-Topic Response ───────────────────────────────────
const OFF_TOPIC_RESPONSE = {
  answer:
    "I'm AgriBot, your precision agriculture assistant. I can only help with farming, irrigation, crops, soil health, pest management, and related agricultural topics. Please ask me something about your farm!",
  decision: "Off-topic query",
  reason: "This question is outside the agriculture domain",
  action: "Ask an agriculture-related question",
  confidence: 0.0,
  riskLevel: "NONE",
  evidence: [],
  nextSteps: [
    "Ask about crop suitability for your zone",
    "Check current soil moisture trends",
    "Get irrigation recommendations",
  ],
};

module.exports = {
  AGRICULTURE_KEYWORDS,
  NON_AGRICULTURE_PATTERNS,
  SYSTEM_PROMPT,
  FEW_SHOT_EXAMPLES,
  OUTPUT_SCHEMA,
  classifyIntent,
  isGreeting,
  GREETING_RESPONSE,
  OFF_TOPIC_RESPONSE,
};
