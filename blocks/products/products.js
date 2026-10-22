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
    console.log(folderData);

    if (!folderData) {
      statusEl.textContent = "Could not load folder catalog JSON.";
      return;
    }

    // 4. & 5. Recursively find ALL image-named keys and extract their autogen:subject
    const catalogSummary = [];

    function extractImages(obj) {
      if (!obj || typeof obj !== 'object') return;

      for (const key of Object.keys(obj)) {
        if (key.match(/\.(jpg|jpeg|png|webp)$/i)) {
          const imageObj = obj[key];
          const subject = deepFind(imageObj, 'autogen:subject') || 'none';
          const path = `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${key}`;

          catalogSummary.push({
            imageName: key,
            path,
            [key]: subject
          });
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          extractImages(obj[key]);
        }
      }
    }

    extractImages(folderData);

    console.log("--------------");
    console.log("Extracted Multiple Images:", catalogSummary);

    if (catalogSummary.length === 0) {
      statusEl.textContent = "No image items found in folder data.";
      return;
    }

    // 6. Prompt Local Ollama AI Agent to return ONLY the image filenames
    statusEl.textContent = "AI Agent is comparing tags and finding related products...";

    const prompt = `
      You are an AI fashion stylist agent.
      The current product has the subject/tags: "${JSON.stringify(targetSubject)}".
      Here is the catalog of items with each image key mapping to its autogen:subject: ${JSON.stringify(catalogSummary)}

      Compare the tags recursively and select the top 4 most relevant items that match or complement this product.
      Return ONLY a valid JSON array of strings containing ONLY the exact image filenames (e.g., ["wp11-pink_main.jpg", "wp11-blue_main.jpg"]) of the selected items. Do not include markdown formatting like \`\`\`json.
    `;

    let recommendedImageNames = [];

    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama2",
          prompt: prompt,
          stream: false
        })
      });

      const result = await ollamaResponse.json();
      const cleanedResponse = result.response.trim().replace(/```json/g, '').replace(/```/g, '');
      recommendedImageNames = JSON.parse(cleanedResponse);
    } catch (ollamaErr) {
      console.warn("Ollama unavailable, falling back to direct tag matching:", ollamaErr);

      recommendedImageNames = catalogSummary
        .filter(item => {
          const sub = item[item.imageName];
          if (Array.isArray(sub) && Array.isArray(targetSubject)) {
            return sub.some(tag => targetSubject.includes(tag));
          }
          return sub === targetSubject;
        })
        .map(item => item.imageName);
    }

    // 7. Filter final matched products
    const matchedProducts = catalogSummary.filter(item =>
      recommendedImageNames.includes(item.imageName)
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
    const title = prod.imageName || 'Product Title';
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
