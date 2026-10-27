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
  // 1. Render the initial block markup IMMEDIATELY so the page never goes blank
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

  // 2. Defer heavy AI operations using setTimeout so browser paints the page instantly
  setTimeout(async () => {
    try {
      // Get current product metadata JSON endpoint from the page image
      const currentMetaJsonUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/llwp11-1-28/wp11-green_main.jpg.2.json";
      // Fetch current product metadata
      const currentMeta = await fetchJSON(currentMetaJsonUrl);
      if (!currentMeta) {
        statusEl.textContent = "Could not load current product metadata.";
        return;
      }

      // Use AI (Ollama) to extract 'autogen:subject' as an array from currentMeta
      let targetSubject = [];
      const extractionPrompt = `
        You are an AI metadata extraction agent.
        Here is the raw metadata JSON of the current product: ${JSON.stringify(currentMeta)}

        Extract the 'autogen:subject' (or related subject/tag properties) from this JSON.
        Return ONLY a valid JSON array of strings containing the tags/subjects found (e.g., ["green", "pants", "cargo"]). If none found, return an empty array []. Do not include markdown formatting like \`\`\`json.
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
      } catch (aiExtractionErr) {
        console.warn("AI extraction failed, falling back to deepFind:", aiExtractionErr);
        const fallbackSubject = deepFind(currentMeta, 'autogen:subject');
        targetSubject = Array.isArray(fallbackSubject) ? fallbackSubject : [fallbackSubject || 'general'];
      }

      console.log("Extracted targetSubject");
      console.log(targetSubject);
      if (!targetSubject || targetSubject.length === 0) {
        statusEl.textContent = "No valid AI tags found for current product.";
        return;
      }

      // Fetch catalog folder JSON (.4.json)
      const folderJsonUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms.4.json";
      const folderData = await fetchJSON(folderJsonUrl);

      if (!folderData) {
        statusEl.textContent = "Could not load folder catalog JSON.";
        return;
      }

      console.log("folder data");
      console.log(folderData);

      // Recursively traverse folders/subfolders and map each image key to an array of its autogen:subject
      const catalogSummary = [];
      const baseUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms";

      function extractImages(node, currentSubfolder = "") {
        if (!node || typeof node !== 'object') return;

        for (const key of Object.keys(node)) {
          if (key.startsWith('jcr:') || key.startsWith('sling:')) continue;

          const val = node[key];

          if (key.match(/\.(jpg|jpeg|png|webp)$/i)) {
            let rawSubject = deepFind(val, 'autogen:subject') || [];
            const subjectArray = Array.isArray(rawSubject) ? rawSubject : [rawSubject];

            const path = currentSubfolder
              ? `${baseUrl}/${currentSubfolder}/${key}`
              : `${baseUrl}/${key}`;

            catalogSummary.push({
              imageName: key,
              subfolder: currentSubfolder,
              path,
              [key]: subjectArray
            });
          } else if (typeof val === 'object' && val !== null) {
            const nextSubfolder = currentSubfolder ? `${currentSubfolder}/${key}` : key;
            extractImages(val, nextSubfolder);
          }
        }
      }

      extractImages(folderData);

      if (catalogSummary.length === 0) {
        statusEl.textContent = "No image items found in catalog folders.";
        return;
      }

      // Prompt Local Ollama AI Agent to compare and return matching image filenames
      const matchingPrompt = `
        You are an AI fashion stylist agent.
        The current product has the subject/tags array: "${JSON.stringify(targetSubject)}".
        Here is the catalog of items across folders where each image filename maps to its autogen:subject array: ${JSON.stringify(catalogSummary)}

        Compare the tags and select the top 4 most relevant items that match or complement this product.
        Return ONLY a valid JSON array of strings containing ONLY the exact image filenames (e.g., ["wp11-pink_main.jpg", "wp11-blue_main.jpg"]) of the selected items. Do not include markdown formatting like \`\`\`json.
      `;

      let recommendedImageNames = [];

      try {
        statusEl.textContent = "AI Agent is curating recommendations...";
        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "llama2",
            prompt: matchingPrompt,
            stream: false
          })
        });

        const result = await ollamaResponse.json();
        const cleanedResponse = result.response.trim().replace(/```json/g, '').replace(/```/g, '');
        recommendedImageNames = JSON.parse(cleanedResponse);
      } catch (ollamaErr) {
        console.warn("Ollama matching unavailable, falling back to direct tag overlap matching:", ollamaErr);

        recommendedImageNames = catalogSummary
          .filter(item => {
            const subArray = item[item.imageName];
            if (Array.isArray(subArray) && Array.isArray(targetSubject)) {
              return subArray.some(tag => targetSubject.includes(tag));
            }
            return false;
          })
          .map(item => item.imageName);
      }

      // Filter final matched products
      const matchedProducts = catalogSummary.filter(item =>
        recommendedImageNames.includes(item.imageName)
      ).slice(0, 4);

      const finalProducts = matchedProducts.length > 0 ? matchedProducts : catalogSummary.slice(0, 4);

      // Render results dynamically once AI processing completes
      renderProducts(container, finalProducts);

    } catch (error) {
      console.error("AI Agent error:", error);
      statusEl.textContent = "Error processing AI recommendations.";
    }
  }, 50); // Small 50ms delay lets the browser paint the page HTML immediately
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
