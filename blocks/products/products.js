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

      const params = new URLSearchParams(window.location.search);
      const productId = params.get("id");
      console.log(productId);
      const cacheKey = `ai_related_products_${productId}`;

      // 3. CHECK BROWSER CACHE FIRST (Instant load if cached)
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        console.log("⚡ Loaded related products from browser cache.");
        renderProducts(container, JSON.parse(cachedData));
        return;
      }

      // 4. Load Three Separate Agents
      console.log("🤖 Loading Agent 1: TagExtractionAgent...");
      const agent1 = await ConfigDrivenAgent.load('/agents/agent-extract-tags.json');

      console.log("🤖 Loading Agent 2: CatalogParserAgent...");
      const agent2 = await ConfigDrivenAgent.load('/agents/agent-parse-catalog.json');

      console.log("🤖 Loading Agent 3: ProductMatchingAgent...");
      const agent3 = await ConfigDrivenAgent.load('/agents/agent-match-products.json');

      if (!agent1 || !agent2 || !agent3) {
        statusEl.textContent = "Failed to initialize AI Agents.";
        return;
      }

      const currentMetaJsonUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/llwp11-1-28/wp11-green_main.jpg.2.json";
      const currentMeta = await fetchJSON(currentMetaJsonUrl);
      if (!currentMeta) {
        statusEl.textContent = "Could not load current product metadata.";
        return;
      }

      // ============================================
      // AGENT 1: Extract target subject tags
      // ============================================
      statusEl.textContent = "🤖 Agent 1: Analyzing product tags...";
      console.log("\n--- AGENT 1: TagExtractionAgent ---");
      const step1Start = Date.now();

      let targetSubject = await agent1.executeTask('extract_tags', {
        PRODUCT_META: JSON.stringify(currentMeta)
      });

      const step1Duration = Date.now() - step1Start;
      console.log(`✓ Tags extracted: ${JSON.stringify(targetSubject)}`);
      console.log(`  Duration: ${step1Duration}ms`);

      if (!targetSubject || targetSubject.length === 0) {
        const fallback = deepFind(currentMeta, 'autogen:subject');
        targetSubject = Array.isArray(fallback) ? fallback : [fallback || 'general'];
      }

      console.log("Extracted target subject tags:");
      console.log(targetSubject);

      // Fetch Catalog Folder JSON (.4.json)
      const folderJsonUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms.4.json";
      const folderData = await fetchJSON(folderJsonUrl);

      console.log("folder data");
      console.log(folderData);

      if (!folderData) {
        statusEl.textContent = "Could not load catalog folder JSON.";
        return;
      }

      // ============================================
      // AGENT 2: Parse Catalog Summary
      // ============================================
      statusEl.textContent = "🤖 Agent 2: Parsing catalog...";
      console.log("\n--- AGENT 2: CatalogParserAgent ---");
      const step2Start = Date.now();

      const baseUrl = "https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms";

      let catalogSummary = await agent2.executeTask('parse_catalog', {
        FOLDER_DATA: JSON.stringify(folderData),
        BASE_URL: baseUrl
      });

      const step2Duration = Date.now() - step2Start;
      console.log(`✓ Catalog parsed: ${catalogSummary?.length || 0} products found`);
      console.log(`  Duration: ${step2Duration}ms`);

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

      console.log("catalogSummary");
      console.log(catalogSummary);

      if (!catalogSummary || catalogSummary.length === 0) {
        statusEl.textContent = "No items found in catalog.";
        return;
      }

      // ============================================
      // AGENT 3: Match Products (uses output from Agent 1 & Agent 2)
      // ============================================
      statusEl.textContent = "🤖 Agent 3: Matching products...";
      console.log("\n--- AGENT 3: ProductMatchingAgent ---");
      console.log(`Input from Agent 1 (tags): ${JSON.stringify(targetSubject)}`);
      console.log(`Input from Agent 2 (catalog): ${catalogSummary.length} products`);

      const step3Start = Date.now();

      let recommendedImageNames = await agent3.executeTask('match_products', {
        TARGET_SUBJECTS: JSON.stringify(targetSubject),
        CATALOG_SUMMARY: JSON.stringify(catalogSummary)
      });

      const step3Duration = Date.now() - step3Start;
      console.log(`✓ Products matched: ${recommendedImageNames?.length || 0} recommendations`);
      console.log(`  Recommendations: ${JSON.stringify(recommendedImageNames)}`);
      console.log(`  Duration: ${step3Duration}ms`);

      // ============================================
      // PIPELINE SUMMARY
      // ============================================
      const totalDuration = step1Duration + step2Duration + step3Duration;
      console.log("\n--- PIPELINE COMPLETE ---");
      console.log(`Total execution time: ${totalDuration}ms`);
      console.log(`Step 1 (Extract Tags): ${step1Duration}ms`);
      console.log(`Step 2 (Parse Catalog): ${step2Duration}ms`);
      console.log(`Step 3 (Match Products): ${step3Duration}ms`);

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
