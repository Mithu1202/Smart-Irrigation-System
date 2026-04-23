const fs = require("fs");
const path = require("path");

let IndexFlatIP;
let faissAvailable = true;

try {
  ({ IndexFlatIP } = require("faiss-node"));
} catch (error) {
  faissAvailable = false;
}

const DEFAULT_CSV_PATH = process.env.RAG_CSV_PATH
  ? path.resolve(process.env.RAG_CSV_PATH)
  : path.join(__dirname, "..", "..", "data", "irrigation_knowledge.csv");

const INDEX_PATH = path.join(__dirname, "..", "..", "data", "irrigation.faiss.index");
const METADATA_PATH = path.join(__dirname, "..", "..", "data", "irrigation.faiss.json");
const VECTOR_DIMENSION = 128;

let cachedStore = null;

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCSV = (row) => {
  return {
    soilMoisture: safeNumber(
      row.soilMoisture ?? row.soil_moisture ?? row.moisture ?? row.soil_moisture_pct,
      0
    ),
    temperature: safeNumber(row.temperature ?? row.temp ?? row.ambient_temperature, 0),
    humidity: safeNumber(row.humidity ?? row.relative_humidity, 0),
    rainfall: safeNumber(row.rainfall ?? row.rain, 0),
  };
};

const parseCSVLine = (line) => {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i - 1] !== "\\") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, ""));
};

const parseCSV = (content) => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const headers = parseCSVLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = parseCSVLine(line);
    const record = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? "";
    });
    return record;
  });
};

const tokenize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const hashToken = (token) => {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

const vectorize = (text) => {
  const vector = new Array(VECTOR_DIMENSION).fill(0);
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return vector;
  }

  tokens.forEach((token, index) => {
    const tokenHash = hashToken(token);
    const primaryIndex = tokenHash % VECTOR_DIMENSION;
    const secondaryIndex = (tokenHash + index * 13) % VECTOR_DIMENSION;
    const weight = token.length > 6 ? 1.4 : 1;

    vector[primaryIndex] += weight;
    vector[secondaryIndex] += 0.35 * weight;

    if (!Number.isNaN(Number(token))) {
      const numericIndex = (tokenHash * 7) % VECTOR_DIMENSION;
      vector[numericIndex] += 0.85;
    }
  });

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Math.round((value / magnitude) * 100000) / 100000);
};

const createDocumentText = (row) => {
  const numeric = normalizeCSV(row);
  return [
    row.description,
    row.recommendation,
    row.crop,
    `soil moisture ${numeric.soilMoisture}`,
    `temperature ${numeric.temperature}`,
    `humidity ${numeric.humidity}`,
    `rainfall ${numeric.rainfall}`,
  ]
    .filter(Boolean)
    .join(" ");
};

const loadCSVDocuments = () => {
  if (!fs.existsSync(DEFAULT_CSV_PATH)) {
    return [];
  }

  const raw = fs.readFileSync(DEFAULT_CSV_PATH, "utf8");
  const rows = parseCSV(raw);

  return rows.map((row, index) => {
    const normalized = normalizeCSV(row);
    const text = createDocumentText(row);

    return {
      id: row.id || `csv-${index + 1}`,
      ...row,
      normalized,
      text,
    };
  });
};

const saveIndexArtifacts = (index, documents) => {
  try {
    if (index && typeof index.write === "function") {
      index.write(INDEX_PATH);
    }
    fs.writeFileSync(
      METADATA_PATH,
      JSON.stringify(
        {
          dimension: VECTOR_DIMENSION,
          count: documents.length,
          csvPath: DEFAULT_CSV_PATH,
          generatedAt: new Date().toISOString(),
          documents,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.warn("FAISS persistence warning:", error.message);
  }
};

const buildFaissStore = () => {
  const documents = loadCSVDocuments();
  const vectors = documents.map((document) => vectorize(document.text));

  if (!faissAvailable) {
    return {
      mode: "fallback",
      sourcePath: DEFAULT_CSV_PATH,
      index: null,
      documents,
      vectors,
    };
  }

  const index = new IndexFlatIP(VECTOR_DIMENSION);
  vectors.forEach((vector) => {
    index.add(vector);
  });

  saveIndexArtifacts(index, documents);

  return {
    mode: "faiss-node",
    sourcePath: DEFAULT_CSV_PATH,
    index,
    documents,
    vectors,
  };
};

const getStore = () => {
  if (!cachedStore) {
    cachedStore = buildFaissStore();
  }
  return cachedStore;
};

const searchKnowledge = async (query, { limit = 5 } = {}) => {
  const store = getStore();
  const queryVector = vectorize(query);

  if (!store.documents.length) {
    return {
      query,
      results: [],
      sourcePath: store.sourcePath,
      loaded: false,
      vectorStore: store.mode,
    };
  }

  if (store.mode === "faiss-node" && store.index) {
    const result = store.index.search(queryVector, Math.max(1, limit));

    const results = (result.labels || [])
      .map((label, rank) => {
        if (label < 0) return null;
        const document = store.documents[label];
        if (!document) return null;

        const similarity = result.distances?.[rank] ?? 0;
        return {
          id: document.id,
          score: Math.round(similarity * 1000) / 1000,
          text: document.text,
          normalized: document.normalized,
          source: document,
        };
      })
      .filter(Boolean);

    return {
      query,
      results,
      sourcePath: store.sourcePath,
      loaded: true,
      vectorStore: store.mode,
    };
  }

  const scored = store.documents
    .map((document, index) => {
      const docVector = store.vectors[index];
      let dot = 0;
      for (let i = 0; i < VECTOR_DIMENSION; i += 1) {
        dot += queryVector[i] * docVector[i];
      }

      return {
        id: document.id,
        score: Math.round(dot * 1000) / 1000,
        text: document.text,
        normalized: document.normalized,
        source: document,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  return {
    query,
    results: scored,
    sourcePath: store.sourcePath,
    loaded: true,
    vectorStore: "fallback",
  };
};

const getRetrieverStatus = () => {
  const store = getStore();

  return {
    loaded: store.documents.length > 0,
    sourcePath: store.sourcePath,
    rows: store.documents.length,
    vectorStore: store.mode,
    faissAvailable,
    indexPath: INDEX_PATH,
    metadataPath: METADATA_PATH,
  };
};

const refreshRetriever = () => {
  cachedStore = buildFaissStore();
  return getStore();
};

module.exports = {
  getStore,
  getRetrieverStatus,
  normalizeCSV,
  refreshRetriever,
  searchKnowledge,
  vectorize,
};
