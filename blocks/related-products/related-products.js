export default async function decorate(block) {
  // 1. Get the current product ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const currentProductId = urlParams.get('id');

  if (!currentProductId) {
    block.innerHTML = '<div class="related-error">No product selected.</div>';
    return;
  }

  console.log('[Related Products] Current product ID:', currentProductId);

  // 2. Fetch all products data
  const productsUrl = '/data/products-data.json?sheet=en';
  const response = await fetch(productsUrl);
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

  console.log('[Related Products] Current category:', currentCategory);
  console.log('[Related Products] Current subcategory:', currentSubcategory);

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

  console.log('[Related Products] Found by subcategory:', related.length);

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

  console.log('[Related Products] After category matches:', related.length);

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

  console.log('[Related Products] Final count:', related.length);

  // 6. Render the related products grid
  block.innerHTML = `
    <h2 class="related-title">Related Products</h2>
    <div class="related-grid">
      ${related.map(product => {
        const productId = (product.id || product.ID || '').toString().trim();
        const productName = (product.name || product.Name || 'Product').toString();
        const productPrice = product.price || product.Price || '0.00';

        // Get image URL from product data (same as product-grid)
        const image = product.image || product.Image || '';
        const imageUrl = image ? new URL(image, new URL(productsUrl, window.location.href)).href : '';

        console.log('[Related Products] Product:', productId, '| Image:', imageUrl);

        return `
          <div class="related-card" data-product-id="${productId}">
            <a href="?id=${encodeURIComponent(productId)}">
              <div class="related-img-wrap">
                ${imageUrl ? `<img src="${imageUrl}" alt="${productName}" loading="lazy" />` : '<div class="no-image">No Image</div>'}
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
