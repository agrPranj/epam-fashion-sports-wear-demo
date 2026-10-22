export default async function decorate(block) {
  const urlParams = new URLSearchParams(window.location.search);
  const currentProductId = urlParams.get('id');

  if (!currentProductId) {
    block.innerHTML = '<div class="related-error">No product selected.</div>';
    return;
  }

  const response = await fetch('/data/products-data.json?sheet=en');
  if (!response.ok) {
    block.innerHTML = '<div class="related-error">Failed to load related products.</div>';
    return;
  }
  const data = await response.json();
  const products = data.data || [];

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

  let related = [];

  // Priority 1: Same subcategory
  if (currentSubcategory) {
    related = products.filter(p => {
      const productId = (p.id || p.ID || '').trim().toLowerCase();
      const productSubcategory = (p.subcategory || p.Subcategory || p.subCategory || p.SubCategory || '').toLowerCase();
      return productId !== currentProductId.trim().toLowerCase() && productSubcategory === currentSubcategory;
    });
  }

  // Priority 2: Same category
  if (related.length < 4) {
    const categoryMatches = products.filter(p => {
      const productId = (p.id || p.ID || '').trim().toLowerCase();
      const productCategory = (p.category || p.Category || '').toLowerCase();
      const alreadyAdded = related.some(r => (r.id || r.ID || '').trim().toLowerCase() === productId);
      return productId !== currentProductId.trim().toLowerCase() && productCategory === currentCategory && !alreadyAdded;
    });
    related = [...related, ...categoryMatches];
  }

  // Priority 3: Any products
  if (related.length < 4) {
    const otherProducts = products.filter(p => {
      const productId = (p.id || p.ID || '').trim().toLowerCase();
      const alreadyAdded = related.some(r => (r.id || r.ID || '').trim().toLowerCase() === productId);
      return productId !== currentProductId.trim().toLowerCase() && !alreadyAdded;
    });
    related = [...related, ...otherProducts];
  }

  related = related.slice(0, 4);

  // Fetch images from AEM DAM using JSON keys
  const productsWithImages = await Promise.all(
    related.map(async (product) => {
      const productId = product.id || product.ID || '';
      const formattedIdForPath = productId.toLowerCase().replace(/\./g, '-');
      const assetJsonUrl = `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${formattedIdForPath}.1.json`;
      const assetBaseUrl = `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${formattedIdForPath}`;

      let imageUrl = '';

      try {
        const assetResponse = await fetch(assetJsonUrl);

        if (assetResponse.ok) {
          const assetJson = await assetResponse.json();
          console.log(`[Related] JSON for ${productId}:`, assetJson);

          const imageExtensions = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
          const extractedImages = [];

          // Scan JSON keys for image filenames
          const scanObjectForKeys = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            Object.entries(obj).forEach(([key, val]) => {
              const trimmedKey = key.trim();
              if (imageExtensions.test(trimmedKey)) {
                console.log(`[Related] Found image key: "${trimmedKey}"`);
                extractedImages.push({
                  url: `${assetBaseUrl}/${trimmedKey}`,
                  filename: trimmedKey,
                });
              }
              if (typeof val === 'object' && val !== null) {
                scanObjectForKeys(val);
              }
            });
          };

          scanObjectForKeys(assetJson);

          console.log(`[Related] Found ${extractedImages.length} images for ${productId}`);

          if (extractedImages.length > 0) {
            // Find image with "main" in filename
            let mainImage = extractedImages.find(img => img.filename.toLowerCase().includes('main'));

            // If no "main", use first image
            if (!mainImage) {
              mainImage = extractedImages[0];
            }

            imageUrl = mainImage.url;
            console.log(`[Related] Using image for ${productId}: ${mainImage.filename}`);
          }
        }
      } catch (error) {
        console.error(`[Related] Error for ${productId}:`, error);
      }

      return { ...product, imageUrl };
    })
  );

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
                <img src="${imageUrl}" alt="${productName}" loading="lazy" />
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
