const axios = require("axios");

function getConfig() {
  return {
    provider: process.env.SEARCH_PROVIDER || "mongo",
    baseUrl: process.env.SEARCH_BASE_URL || "",
    apiKey: process.env.SEARCH_API_KEY || "",
    indexName: process.env.SEARCH_INDEX || "dokanx",
  };
}

async function indexDocuments(docs) {
  const { provider, baseUrl, apiKey, indexName } = getConfig();
  if (provider === "meilisearch") {
    await axios.post(
      `${baseUrl}/indexes/${indexName}/documents`,
      docs,
      { headers: { "X-Meili-API-Key": apiKey } }
    );
    return { provider };
  }
  if (provider === "elastic") {
    await axios.post(`${baseUrl}/${indexName}/_bulk`, docs, {
      headers: { Authorization: apiKey ? `ApiKey ${apiKey}` : undefined },
    });
    return { provider };
  }
  return { provider: "mongo" };
}

async function searchExternal(query) {
  const { provider, baseUrl, apiKey, indexName } = getConfig();
  if (provider === "meilisearch") {
    const response = await axios.post(
      `${baseUrl}/indexes/${indexName}/search`,
      { q: query },
      { headers: { "X-Meili-API-Key": apiKey } }
    );
    return response.data?.hits || [];
  }
  if (provider === "elastic") {
    const response = await axios.post(
      `${baseUrl}/${indexName}/_search`,
      { query: { multi_match: { query, fields: ["text"] } } },
      { headers: { Authorization: apiKey ? `ApiKey ${apiKey}` : undefined } }
    );
    return response.data?.hits?.hits?.map((hit) => hit._source) || [];
  }
  return [];
}

module.exports = {
  indexDocuments,
  searchExternal,
};
