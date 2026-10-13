export default async function decorate(block) {
  // 1. Get the current product ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const currentProductId = urlParams.get('id');

  if (!currentProductId) {
    block.innerHTML = '<div class="related-error">No product selected.</div>';
    return;
  }

  // 2. Fetch all products data
  const response = await fetch('/data/products-data.json?sheet=en');
  if (!response.ok) {
    block.innerHTML = '<div class="related-error">Failed to load related products.</div>';
    return;
  }
  const data = await response.json();
  const products = data.data || [];

  // 3. Find the current product to get its category and subcategory
  const currentProduct = products.find(p =>
    (p.id && p.id.trim().toLowerCase() === currentProductId.trim().toLowerCase()) ||
    (p.ID && p.ID.trim().toLowerCase() === currentProductId.trim().toLowerCase())
  );

  if (!currentProduct) {
    block.innerHTML = '<div class="related-error">Current product not found.</div>';
    return;
  }

  const currentCategory = (currentProduct.category || currentProduct.Category || '').toLowerCase();
  const currentSubcategory = (currentProduct.subcategory || currentProduct.Subcategory || currentProduct.subCategory || currentProduct.SubCategory || '').toLowerCase();

  // 4. Filter related products with priority:
  //    Priority 1: Same subcategory (best match)
  //    Priority 2: Same category (if subcategory not found or not enough)
  //    Priority 3: Any products

  let related = [];

  // Priority 1: Try to find products with same subcategory
  if (currentSubcategory) {
    related = products.filter(p => {
      const productId = (p.id || p.ID || '').trim().toLowerCase();
      const productSubcategory = (p.subcategory || p.Subcategory || p.subCategory || p.SubCategory || '').toLowerCase();

      return productId !== currentProductId.trim().toLowerCase()
             && productSubcategory === currentSubcategory;
    });
  }

  // Priority 2: If less than 4 found, add products from same category
  if (related.length < 4) {
    const categoryMatches = products.filter(p => {
      const productId = (p.id || p.ID || '').trim().toLowerCase();
      const productCategory = (p.category || p.Category || '').toLowerCase();
      const alreadyAdded = related.some(r => (r.id || r.ID || '').trim().toLowerCase() === productId);

      return productId !== currentProductId.trim().toLowerCase()
             && productCategory === currentCategory
             && !alreadyAdded;
    });

    related = [...related, ...categoryMatches];
  }

  // Priority 3: If still less than 4, add any other products
  if (related.length < 4) {
    const otherProducts = products.filter(p => {
      const productId = (p.id || p.ID || '').trim().toLowerCase();
      const alreadyAdded = related.some(r => (r.id || r.ID || '').trim().toLowerCase() === productId);

      return productId !== currentProductId.trim().toLowerCase() && !alreadyAdded;
    });

    related = [...related, ...otherProducts];
  }

  // 5. Limit to 4 related products
  related = related.slice(0, 4);

  // 6. Fetch images from Adobe AEM DAM for each product (EXACT SAME LOGIC as product-details.js)
  const productsWithImages = await Promise.all(
    related.map(async (product) => {
      const productId = product.id || product.ID || '';

      // Format ID for path (same as product-details.js line 36)
      const formattedIdForPath = productId.toLowerCase().replace(/\./g, '-');
      const assetJsonUrl = `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${formattedIdForPath}.1.json`;

      let mainImageUrl = '';

      try {
        const assetResponse = await fetch(assetJsonUrl);
        if (!assetResponse.ok) {
          console.warn(`[Related Products] Asset JSON not found for ${productId} (${assetResponse.status})`);
          return { ...product, imageUrl: '' };
        }

        const assetJson = await assetResponse.json();
        console.log(`[Related Products] Asset JSON for ${productId}:`, assetJson);

        // Extract assets strictly from the KEYS of the asset JSON response (same as product-details.js line 60-90)
        const assetBaseUrl = `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${formattedIdForPath}`;
        const imageExtensions = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
        const videoExtensions = /\.(mp4|webm|mov|ogg)$/i;

        const extractedMedia = [];
        const processedUrls = new Set();

        const scanObjectForKeys = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          Object.entries(obj).forEach(([key, val]) => {
            const trimmedKey = key.trim();
            // Check if the key itself is an image or video filename
            if (imageExtensions.test(trimmedKey) || videoExtensions.test(trimmedKey)) {
              const fullUrl = `${assetBaseUrl}/${trimmedKey}`;
              if (!processedUrls.has(fullUrl)) {
                processedUrls.add(fullUrl);
                extractedMedia.push({
                  url: fullUrl,
                  type: videoExtensions.test(trimmedKey) ? 'video' : 'image',
                  filename: trimmedKey
                });
              }
            }
            // Recursively check nested child objects (like rendition nodes)
            if (typeof val === 'object' && val !== null) {
              scanObjectForKeys(val);
            }
          });
        };

        scanObjectForKeys(assetJson);

        console.log(`[Related Products] Extracted ${extractedMedia.length} media items for ${productId}:`, extractedMedia);

        if (extractedMedia.length === 0) {
          console.warn(`[Related Products] No images found in asset JSON for ${productId}`);
          return { ...product, imageUrl: '' };
        }

        // Sort media: Images first, Videos always at the end (same as product-details.js line 96-99)
        const imagesList = extractedMedia.filter(item => item.type === 'image');
        const videosList = extractedMedia.filter(item => item.type === 'video');
        const sortedMediaItems = [...imagesList, ...videosList];

        // Find main image (same as product-details.js line 101-104)
        let mainIndex = sortedMediaItems.findIndex(item => item.type === 'image' && item.url.toLowerCase().includes('main'));
        if (mainIndex === -1) {
          mainIndex = sortedMediaItems.findIndex(item => item.type === 'image');
          if (mainIndex === -1) mainIndex = 0;
        }

        mainImageUrl = sortedMediaItems[mainIndex] ? sortedMediaItems[mainIndex].url : '';

        console.log(`[Related Products] Selected image URL for ${productId}: ${mainImageUrl}`);

      } catch (error) {
        console.error(`[Related Products] Error fetching asset for ${productId}:`, error);
        return { ...product, imageUrl: '' };
      }

      return {
        ...product,
        imageUrl: mainImageUrl
      };
    })
  );

  // 7. Render the related products grid
  block.innerHTML = `
    <h2 class="related-title">Related Products</h2>
    <div class="related-grid">
      ${productsWithImages.map(product => {
        const productId = (product.id || product.ID || '').toString().trim();
        const productName = (product.name || product.Name || 'Product').toString();
        const productPrice = product.price || product.Price || '0.00';
        const imageUrl = product.imageUrl || '';

        return `
          <div class="related-card">
            <a href="?id=${encodeURIComponent(productId)}">
              <div class="related-img-wrap">
                <img src="${imageUrl || ''}" alt="${productName}" loading="lazy" />
              </div>
              <div class="related-info">
                <div class="related-name">${productName}</div>
                <div class="related-price">$${typeof productPrice === 'string' && !productPrice.startsWith('$') ? parseFloat(productPrice).toFixed(2) : productPrice}</div>
              </div>
            </a>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
