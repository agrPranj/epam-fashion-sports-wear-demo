// Helper to fetch JSON safely
async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Error fetching JSON:", err);
    return null;
  }
}

// Deep recursive helper to find a property (like 'autogen:subject') anywhere in a nested JSON object
function deepFind(obj, targetKey) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj[targetKey] !== undefined) return obj[targetKey];

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const result = deepFind(obj[key], targetKey);
      if (result !== undefined && result !== null) return result;
    }
  }
  return null;
}

// Automatically triggered by EDS runtime when the block loads on the page
export default async function decorate(block) {
  block.innerHTML = `
    <div class="ai-agent-container">
      <h3>Related Products</h3>
      <p class="agent-status">🤖 AI Agent is scanning folder metadata...</p>
    </div>
  `;

  const container = block.querySelector('.ai-agent-container');
  const statusEl = container.querySelector('.agent-status');

  try {
    const currentMetaJsonUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/llwp11-1-28/wp11-green_main.jpg.2.json";

    // 2. Fetch current product metadata
    statusEl.textContent = "Analyzing current product tags...";
    const currentMeta = await fetchJSON(currentMetaJsonUrl);

    // Extract targetSubject recursively from current product JSON
    const targetSubject = deepFind(currentMeta, 'autogen:subject');

    if (!targetSubject) {
      statusEl.textContent = "No AI tags found for current product.";
      return;
    }

    // 3. Fetch catalog folder JSON (.4.json)
    statusEl.textContent = "Scanning catalog folder data...";
    const folderJsonUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms.4.json";
    const folderData = await fetchJSON(folderJsonUrl);

    if (!folderData) {
      statusEl.textContent = "Could not load folder catalog JSON.";
      return;
    }

    // 4. Extract image keys from the folder JSON (e.g. wp11-pink_main.jpg, etc.)
    let rawItems = [];
    if (folderData.entities) {
      rawItems = folderData.entities;
    } else if (folderData.items) {
      rawItems = folderData.items;
    } else {
      // Filter keys that represent image assets or child objects
      rawItems = Object.keys(folderData)
        .filter(key => !key.startsWith('jcr:') && !key.startsWith('sling:') && typeof folderData[key] === 'object')
        .map(key => ({ _key: key, ...folderData[key] }));
    }

    if (rawItems.length === 0) {
      statusEl.textContent = "No items found in folder data.";
      return;
    }

    // 5. Map catalog items, targeting image-named keys and deep-extracting autogen:subject
    const catalogSummary = rawItems.map(item => {
      const subject = deepFind(item, 'autogen:subject') || 'none';
      const name = item.title || item.name || item._key || 'Product';

      let path = item.path || item.url;
      if (!path && item._key) {
        path = `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${item._key}`;
      }

      return { name, path, subject };
    });
    console.log("--------------");
    console.log(catalogSummary);

    // 6. Prompt Local Ollama AI Agent to compare and match relevant tags
    statusEl.textContent = "AI Agent is comparing tags and finding related products...";

    const prompt = `
      You are an AI fashion stylist agent.
      The current product has the subject/tags: "${JSON.stringify(targetSubject)}".
      Here is the list of catalog items extracted from the folder data with their respective subjects: ${JSON.stringify(catalogSummary)}

      Compare the tags recursively and select the top 4 most relevant items that match or complement this product.
      Return ONLY a valid JSON array of strings containing the exact paths or names of the selected items. Do not include markdown formatting like \`\`\`json.
    `;

    let recommendedPaths = [];

    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama2", // Ensure this model is running in your local Ollama
          prompt: prompt,
          stream: false
        })
      });

      const result = await ollamaResponse.json();
      const cleanedResponse = result.response.trim().replace(/```json/g, '').replace(/```/g, '');
      recommendedPaths = JSON.parse(cleanedResponse);
    } catch (ollamaErr) {
      console.warn("Ollama unavailable, falling back to direct tag matching:", ollamaErr);

      // FALLBACK: If Ollama isn't running, match items directly where subjects overlap/match
      recommendedPaths = catalogSummary
        .filter(item => {
          if (Array.isArray(item.subject) && Array.isArray(targetSubject)) {
            return item.subject.some(tag => targetSubject.includes(tag));
          }
          return item.subject === targetSubject;
        })
        .map(item => item.path);
    }

    // 7. Filter final matched products
    const matchedProducts = catalogSummary.filter(item =>
      recommendedPaths.includes(item.path) || recommendedPaths.includes(item.name)
    ).slice(0, 4);

    const finalProducts = matchedProducts.length > 0 ? matchedProducts : catalogSummary.slice(0, 4);

    // 8. Render results automatically
    renderProducts(container, finalProducts);

  } catch (error) {
    console.error("AI Agent error:", error);
    statusEl.textContent = "Error processing AI recommendations.";
  }
}

// Render Helper matching your exact layout
function renderProducts(container, products) {
  container.innerHTML = `<h3>Related Products</h3>`;
  const grid = document.createElement('div');
  grid.className = 'recommendations-grid';

  products.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const price = prod.price || '39.20';
    const title = prod.name || 'Product Title';
    const imageSrc = prod.path || '';

    card.innerHTML = `
      <a href="${prod.path || '#'}">
        <img src="${imageSrc}" alt="${title}" loading="lazy" />
        <span class="product-title">${title}</span>
        <span class="product-price">$${price}</span>
      </a>
    `;
    grid.appendChild(card);
  });

  container.appendChild(grid);
}
