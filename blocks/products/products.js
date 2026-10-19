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

// Automatically triggered by EDS runtime when the block loads on the page
export default async function decorate(block) {
  block.innerHTML = `
    <div class="ai-agent-container">
      <h3>Related Products</h3>
      <p class="agent-status">🤖 AI Agent is finding related products...</p>
    </div>
  `;

  const container = block.querySelector('.ai-agent-container');
  const statusEl = container.querySelector('.agent-status');

  try {
    const currentMetaJsonUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/llwp11-1-28/wp11-green_main.jpg.2.json";

    // 2. Fetch current product metadata
    statusEl.textContent = "Analyzing current product tags...";
    const currentMeta = await fetchJSON(currentMetaJsonUrl);
    console.log(currentMeta);

    // Extract targetSubject from current product JSON
    const targetSubject =
      currentMeta?.['autogen:subject'] ||
      currentMeta?.['jcr:content']?.['metadata']?.['autogen:subject'] ||
      currentMeta?.['metadata']?.['autogen:subject'];

      console.log(targetSubject);

    if (!targetSubject) {
      statusEl.textContent = "No AI tags found for comparison.";
      return;
    }

    // 3. Fetch catalog folder JSON
    statusEl.textContent = "Scanning catalog folder...";
    const folderJsonUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms.4.json";
    const folderData = await fetchJSON(folderJsonUrl);
    console.log(folderData);

    // Extract items whether AEM returns them as an array or as key-value child objects in .4.json
    let rawItems = [];
    if (folderData?.entities) {
      rawItems = folderData.entities;
    } else if (folderData?.items) {
      rawItems = folderData.items;
    } else if (folderData) {
      // In AEM folder JSON, child assets/folders are often keys directly on the object (excluding system keys starting with jcr: or sling:)
      rawItems = Object.keys(folderData)
        .filter(key => !key.startsWith('jcr:') && !key.startsWith('sling:') && typeof folderData[key] === 'object')
        .map(key => ({ _key: key, ...folderData[key] }));
    }

console.log(rawItems);
    if (rawItems.length === 0) {
      statusEl.textContent = "No catalog items found in folder.";
      return;
    }

    // Map folder items to a clean structure, extracting autogen:subject from nested jcr:content/metadata
    const catalogSummary = rawItems.map(item => {
      const subject =
        item?.['autogen:subject'] ||
        item?.['jcr:content']?.['metadata']?.['autogen:subject'] ||
        item?.['metadata']?.['autogen:subject'] || 'none';

      const name = item.title || item.name || item._key || 'Product';
      const path = item.path || item.url || (item._key ? `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${item._key}` : '');

      return { name, path, subject };
    });

    console.log(catalogSummary);
    // 4. Prompt Local Ollama AI Agent for Semantic Matching
    statusEl.textContent = "AI Agent is reasoning and curating recommendations...";

    const prompt = `
      You are an AI fashion stylist agent.
      The current product has the subject/tags: "${targetSubject}".
      Here is the list of catalog items with their subjects: ${JSON.stringify(catalogSummary)}

      Analyze the tags and select the top 4 most relevant items that match or complement this product.
      Return ONLY a valid JSON array of strings containing the exact paths or names of the selected items. Do not include markdown formatting like \`\`\`json.
    `;

    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama2", // Ensure model is available in your local Ollama
        prompt: prompt,
        stream: false
      })
    });

    const result = await ollamaResponse.json();
    let recommendedPaths = [];
    console.log("-----------------");
    console.log(result.response);
    try {
      const cleanedResponse = result.response.trim().replace(/```json/g, '').replace(/```/g, '');
      recommendedPaths = JSON.parse(cleanedResponse);
    } catch (parseErr) {
      console.error("Failed to parse Ollama JSON:", result.response);
      statusEl.textContent = "AI response parsing failed.";
      return;
    }

    // 5. Filter the items based on Ollama's recommendations
    const matchedProducts = catalogSummary.filter(item =>
      recommendedPaths.includes(item.path) || recommendedPaths.includes(item.name)
    ).slice(0, 4);

    const finalProducts = matchedProducts.length > 0 ? matchedProducts : catalogSummary.slice(0, 4);

    // 6. Render results automatically
    renderProducts(container, finalProducts);

  } catch (error) {
    console.error("Ollama AI Agent error:", error);
    statusEl.textContent = "Could not connect to local Ollama. Ensure OLLAMA_ORIGINS='*' is set.";
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
