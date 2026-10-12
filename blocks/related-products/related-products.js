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

  // 3. Find the current product to get its category
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

      // Exclude the current product and match subcategory
      return productId !== currentProductId.trim().toLowerCase()
             && productSubcategory === currentSubcategory;
    });
  }

  // Priority 2: If less than 4 found, add products from same category
  if (related.length < 4) {
    const categoryMatches = products.filter(p => {
      const productId = (p.id || p.ID || '').trim().toLowerCase();
      const productCategory = (p.category || p.Category || '').toLowerCase();

      // Exclude current product and already added products
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

  // 7. Render the related products grid
  block.innerHTML = `
    <h2 class="related-title">Related Products</h2>
    <div class="related-grid">
      ${related.map(product => {
        const productId = product.id || product.ID || '';
        const productName = product.name || product.Name || 'Product';
        const productPrice = product.price || product.Price || '0.00';

        // Build image URL - fetch from AEM DAM assets
        const formattedId = productId.toLowerCase().replace(/\./g, '-');

        // Try to get main image URL from product data
        let imageUrl = '';
        if (product.image || product.Image) {
          const images = (product.image || product.Image || '').split(',');
          const mainImage = images.find(img => img.toLowerCase().includes('main')) || images[0];
          if (mainImage) {
            imageUrl = `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${formattedId}/${mainImage.trim()}`;
          }
        } else {
          // Fallback to a default pattern
          imageUrl = `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${formattedId}/main.jpg`;
        }

        return `
          <div class="related-card">
            <a href="?id=${productId}">
              <div class="related-img-wrap">
                <img src="${imageUrl}" alt="${productName}" loading="lazy" onerror="this.style.display='none'" />
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
