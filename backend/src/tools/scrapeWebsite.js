const fetchWebsiteContext = async () => {
  const sourceUrl = process.env.IRRIGATION_SOURCE_URL;

  if (!sourceUrl) {
    return {
      configured: false,
      url: null,
      title: null,
      excerpt: null,
      error: null,
    };
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Smart-Irrigation-System/1.0",
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Website request failed: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const raw = await response.text();

    if (contentType.includes("application/json")) {
      const parsed = JSON.parse(raw);
      const excerpt = JSON.stringify(parsed).slice(0, 5000);
      return {
        configured: true,
        url: sourceUrl,
        title: "JSON source",
        excerpt,
        error: null,
      };
    }

    const titleMatch = raw.match(/<title[^>]*>([^<]*)<\/title>/i);
    const cleaned = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      configured: true,
      url: sourceUrl,
      title: titleMatch?.[1]?.trim() || null,
      excerpt: cleaned.slice(0, 5000),
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      url: sourceUrl,
      title: null,
      excerpt: null,
      error: error.message,
    };
  }
};

module.exports = fetchWebsiteContext;
