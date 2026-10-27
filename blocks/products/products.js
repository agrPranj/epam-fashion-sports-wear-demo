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

// Deep recursive helper to find a property anywhere in a nested JSON object (fallback)
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
  // 1. Render placeholder immediately so the page is never blank
  block.innerHTML = `
    <div class="ai-agent-container">
      <h3>Related Products</h3>
      <div class="recommendations-loading">
        <p class="agent-status">🤖 AI Agent is finding related products...</p>
      </div>
    </div>
  `;

  const container = block.querySelector('.ai-agent-container');
  const statusEl = container.querySelector('.agent-status');

  // 2. Defer AI execution so the browser paints instantly
  setTimeout(async () => {
    try {
      const currentMetaJsonUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/llwp11-1-28/wp11-green_main.jpg.2.json";
      const currentMeta = await fetchJSON(currentMetaJsonUrl);
      if (!currentMeta) {
        statusEl.textContent = "Could not load current product metadata.";
        return;
      }

      // Step 1: AI Call to extract target subject from current product metadata
      let targetSubject = [];
      const extractionPrompt = `
        You are an AI metadata extraction agent.
        Here is the raw metadata JSON of the current product: ${JSON.stringify(currentMeta)}

        Extract the 'autogen:subject' (or related subject/tag properties).
        Return ONLY a valid JSON array of strings containing the tags/subjects found (e.g., ["green", "pants", "cargo"]). If none found, return []. Do not include markdown formatting like \`\`\`json.
      `;

      try {
        const extractionResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "llama2",
            prompt: extractionPrompt,
            stream: false
          })
        });

        const extractionResult = await extractionResponse.json();
        const cleanedExtraction = extractionResult.response.trim().replace(/```json/g, '').replace(/```/g, '');
        targetSubject = JSON.parse(cleanedExtraction);
      } catch (aiErr) {
        const fallbackSubject = deepFind(currentMeta, 'autogen:subject');
        targetSubject = Array.isArray(fallbackSubject) ? fallbackSubject : [fallbackSubject || 'general'];
      }

      console.log("Extracted target subject tags:");
      console.log(targetSubject);

      // Step 2: Fetch Catalog Folder JSON (.4.json)
      const folderJsonUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms.4.json";
      const folderData = await fetchJSON(folderJsonUrl);

      console.log("folder data");
      console.log(folderData);

      if (!folderData) {
        statusEl.textContent = "Could not load catalog folder JSON.";
        return;
      }

      // Step 3: DEDICATED AI CALL to generate and structure the catalog summary
      statusEl.textContent = "AI Agent is parsing catalog summary...";
      let catalogSummary = [];
      const baseUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms";

      const catalogSummaryPrompt = `
        You are an AI data formatting agent.
        Here is the raw folder JSON of the product catalog: ${JSON.stringify(folderData)}

        Extract all image filenames (ending in .jpg, .png, etc.) along with their subfolders and their respective 'autogen:subject' tags.
        Return ONLY a valid JSON array of objects, where each object has:
        - "imageName": string (the exact image filename)
        - "path": string (constructed as ${baseUrl}/[subfolder if any]/[imageName])
        - "[imageName]": array of strings (the autogen:subject tags)
        Example format: [{"imageName": "wp11-pink_main.jpg", "path": "${baseUrl}/llwp11-1-28/wp11-pink_main.jpg", "wp11-pink_main.jpg": ["pink", "pants"]}]
        Do not include markdown formatting like \`\`\`json.
      `;

      try {
        const summaryResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "llama2",
            prompt: catalogSummaryPrompt,
            stream: false
          })
        });

        const summaryResult = await summaryResponse.json();
        const cleanedSummary = summaryResult.response.trim().replace(/```json/g, '').replace(/```/g, '');
        catalogSummary = JSON.parse(cleanedSummary);
      } catch (aiSummaryErr) {
        console.warn("AI catalog summary fallback to JS recursive parser:", aiSummaryErr);

        // Fallback JS parser if AI call fails
        function extractImages(node, currentSubfolder = "") {
          if (!node || typeof node !== 'object') return;
          for (const key of Object.keys(node)) {
            if (key.startsWith('jcr:') || key.startsWith('sling:')) continue;
            const val = node[key];
            if (key.match(/\.(jpg|jpeg|png|webp)$/i)) {
              let rawSubject = deepFind(val, 'autogen:subject') || [];
              const subjectArray = Array.isArray(rawSubject) ? rawSubject : [rawSubject];
              const path = currentSubfolder ? `${baseUrl}/${currentSubfolder}/${key}` : `${baseUrl}/${key}`;
              catalogSummary.push({ imageName: key, path, [key]: subjectArray });
            } else if (typeof val === 'object' && val !== null) {
              const nextSubfolder = currentSubfolder ? `${currentSubfolder}/${key}` : key;
              extractImages(val, nextSubfolder);
            }
          }
        }
        extractImages(folderData);
      }

      console.log("catalogSummary");
      console.log(catalogSummary);

      if (!catalogSummary || catalogSummary.length === 0) {
        statusEl.textContent = "No items found in catalog.";
        return;
      }

      // Step 4: AI Call to compare and match recommendations
      statusEl.textContent = "AI Agent is curating recommendations...";
      let recommendedImageNames = [];

      const matchingPrompt = `
        You are an AI fashion stylist agent.
        Current product tags: ${JSON.stringify(targetSubject)}.
        Catalog summary: ${JSON.stringify(catalogSummary)}

        Compare the catalog items against the current product tags and select the top 4 most relevant items.
        Return ONLY a valid JSON array of strings containing ONLY the exact image filenames (e.g., ["wp11-pink_main.jpg", "wp11-blue_main.jpg"]). Do not include markdown formatting like \`\`\`json.
      `;

      try {
        const aiResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "llama2",
            prompt: matchingPrompt,
            stream: false
          })
        });

        const aiResult = await aiResponse.json();
        const cleanedAiResponse = aiResult.response.trim().replace(/```json/g, '').replace(/```/g, '');
        recommendedImageNames = JSON.parse(cleanedAiResponse);
      } catch (aiMatchErr) {
        console.warn("AI matching fallback to tag intersection:", aiMatchErr);
        recommendedImageNames = catalogSummary
          .filter(item => {
            const subArray = item[item.imageName];
            return Array.isArray(subArray) && subArray.some(tag => targetSubject.includes(tag));
          })
          .map(item => item.imageName);
      }

      // Filter final matched products
      const matchedProducts = catalogSummary.filter(item =>
        recommendedImageNames.includes(item.imageName)
      ).slice(0, 4);

      const finalProducts = matchedProducts.length > 0 ? matchedProducts : catalogSummary.slice(0, 4);

      // Render results dynamically
      renderProducts(container, finalProducts);

    } catch (error) {
      console.error("AI Agent error:", error);
      statusEl.textContent = "Error processing AI recommendations.";
    }
  }, 50);
}

// Render Helper
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
