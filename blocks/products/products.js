import { ConfigDrivenAgent } from '../../agents/config-agent.js';

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

// Deep recursive fallback helper
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

  // 2. Defer execution so the browser paints instantly
  setTimeout(async () => {
    try {
      const mainImg = document.querySelector('.product-details-image img, .main-image img');
      if (!mainImg) {
        statusEl.textContent = "Product image not found on page.";
        return;
      }

      const currentImageUrl = mainImg.src.split('?')[0];
      const cacheKey = `config_agent_rec_${currentImageUrl}`;

      // 3. CHECK BROWSER CACHE FIRST (Instant load if cached)
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        console.log("⚡ Loaded related products from browser cache.");
        renderProducts(container, JSON.parse(cachedData));
        return;
      }

      // 4. Load Config-Driven Agent from JSON config
      const agent = await ConfigDrivenAgent.load('/agents/agent-config.json');
      if (!agent) {
        statusEl.textContent = "Failed to initialize AI Agent.";
        return;
      }

      const currentMetaJsonUrl = `${currentImageUrl}.2.json`;
      const currentMeta = await fetchJSON(currentMetaJsonUrl);
      if (!currentMeta) {
        statusEl.textContent = "Could not load current product metadata.";
        return;
      }

      // Task 1: Extract target subject using Agent
      statusEl.textContent = "Agent analyzing product tags...";
      let targetSubject = await agent.executeTask('extract_tags', {
        PRODUCT_META: currentMeta
      });

      if (!targetSubject || targetSubject.length === 0) {
        const fallback = deepFind(currentMeta, 'autogen:subject');
        targetSubject = Array.isArray(fallback) ? fallback : [fallback || 'general'];
      }

      // Fetch Catalog Folder JSON (.4.json)
      const folderJsonUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms.4.json";
      const folderData = await fetchJSON(folderJsonUrl);

      if (!folderData) {
        statusEl.textContent = "Could not load catalog folder JSON.";
        return;
      }

      // Task 2: Parse Catalog Summary using Agent
      statusEl.textContent = "Agent parsing catalog summary...";
      const baseUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms";
      
      let catalogSummary = await agent.executeTask('parse_catalog', {
        FOLDER_DATA: folderData,
        BASE_URL: baseUrl
      });

      // Fallback JS parser if AI parsing fails
      if (!Array.isArray(catalogSummary) || catalogSummary.length === 0) {
        catalogSummary = [];
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

      if (!catalogSummary || catalogSummary.length === 0) {
        statusEl.textContent = "No items found in catalog.";
        return;
      }

      // Task 3: Match Products using Agent
      statusEl.textContent = "Agent curating recommendations...";
      let recommendedImageNames = await agent.executeTask('match_products', {
        TARGET_SUBJECTS: targetSubject,
        CATALOG_SUMMARY: catalogSummary
      });

      if (!Array.isArray(recommendedImageNames) || recommendedImageNames.length === 0) {
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

      // 5. Save to Browser Cache for Instant Future Loads
      localStorage.setItem(cacheKey, JSON.stringify(finalProducts));

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
    
    const title = prod.imageName || 'Product Title';
    const imageSrc = prod.path || '';

    card.innerHTML = `
      <a href="${prod.path || '#'}">
        <img src="${imageSrc}" alt="${title}" loading="lazy" />
        <span class="product-title">${title}</span>
        <span class="product-price">$39.20</span>
      </a>
    `;
    grid.appendChild(card);
  });

  container.appendChild(grid);
}
