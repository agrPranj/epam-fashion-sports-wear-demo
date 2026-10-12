export default async function decorate(block) {
  // 1. Fetch related products data (adjust the endpoint as needed)
  const response = await fetch('/data/products-data.json?sheet=en');
  if (!response.ok) {
    block.innerHTML = '<div class="related-error">Failed to load related products.</div>';
    return;
  }
  const data = await response.json();
  const products = data.data || [];

  // 2. (Optional) Filter for related products (e.g., same category, not current product)
  // For demo, just take the first 4 products
  const related = products.slice(0, 4);

  // 3. Render the related products grid
  block.innerHTML = `
    <h2 class="related-title">Related Products</h2>
    <div class="related-grid">
      ${related.map(product => {
        // Build image URL (adjust logic if you use asset JSON for images)
        const formattedId = product.id.toLowerCase().replace(/\./g, '-');
        const mainImage = (product.image || '').split(',').find(img => img.toLowerCase().includes('main')) || (product.image || '').split(',')[0];
        const imageUrl = mainImage
          ? `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${formattedId}/${mainImage.trim()}`
          : '';

        return `
          <div class="related-card">
            <a href="product-detail-page?id=${product.id}">
              <div class="related-img-wrap">
                <img src="${imageUrl}" alt="${product.name}" loading="lazy" />
              </div>
              <div class="related-info">
                <div class="related-name">${product.name}</div>
                <div class="related-price">$${parseFloat(product.price).toFixed(2)}</div>
              </div>
            </a>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
