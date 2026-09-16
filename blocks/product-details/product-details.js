export default async function decorate(block) {
  // 1. Get product ID from URL query parameters (e.g., ?id=LLWP13.2-30)
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id') || 'LLWP13.2-30'; // Fallback ID if none provided

  block.textContent = ''; // Clear existing block content

  try {
    // 2. Fetch the multi-product JSON catalog
    const response = await fetch('/data/products.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const productsCatalog = await response.json();

    // 3. Lookup the specific product using the key/SKU from the catalog
    const product = productsCatalog[productId];

    if (!product) {
      block.innerHTML = `
        <div class="product-not-found">
          <h2>Product Not Found</h2>
          <p>We couldn't find a product matching ID: <strong>${productId}</strong></p>
          <a href="/" class="return-home-btn">Back to Home</a>
        </div>
      `;
      return;
    }

    // 4. Construct the Product Details DOM Structure dynamically from the JSON data
    const container = document.createElement('div');
    container.className = 'product-details-container';

    container.innerHTML = `
      <div class="product-gallery-section">
        <div class="product-main-image">
          <img src="${product.images[0]}" alt="${product.name}" />
        </div>
        <div class="product-thumbnails">
          ${product.images.map((img, index) => `
            <img src="${img}" alt="${product.name} thumbnail ${index + 1}" class="thumb-img ${index === 0 ? 'active' : ''}" />
          `).join('')}
        </div>
      </div>

      <div class="product-info-section">
        <span class="product-sku">SKU: ${product.sku}</span>
        <h1 class="product-title">${product.name}</h1>

        <div class="product-rating">
          <span class="stars">⭐⭐⭐⭐⭐</span>
          <span class="review-count">(${product.reviewCount} Reviews)</span>
        </div>

        <div class="product-pricing">
          <span class="current-price">${product.price}</span>
          ${product.regularPrice ? `<span class="regular-price">${product.regularPrice}</span>` : ''}
        </div>

        <div class="stock-status ${product.inStock ? 'in-stock' : 'out-of-stock'}">
          ${product.inStock ? '✔ In Stock' : '✖ Out of Stock'}
        </div>

        <p class="product-description">${product.shortDescription}</p>

        <div class="product-options">
          <div class="option-group">
            <label>Color: <span class="selected-color-label">${product.colors[0].name}</span></label>
            <div class="color-swatches">
              ${product.colors.map((c, i) => `
                <button class="swatch ${i === 0 ? 'selected' : ''}" style="background-color: ${c.hex}" data-color-name="${c.name}" title="${c.name}"></button>
              `).join('')}
            </div>
          </div>

          <div class="option-group">
            <label>Size</label>
            <div class="size-options">
              ${product.sizes.map((size, i) => `
                <button class="size-btn ${i === 0 ? 'selected' : ''}">${size}</button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="product-actions-bar">
          <div class="quantity-selector">
            <button class="qty-btn minus">-</button>
            <input type="number" class="qty-input" value="1" min="1" max="10" />
            <button class="qty-btn plus">+</button>
          </div>
          <button class="add-to-cart-btn" ${!product.inStock ? 'disabled' : ''}>
            ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    `;

    block.append(container);

    // 5. Add Interactive Event Listeners

    // Color Swatch Selection
    block.querySelectorAll('.swatch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        block.querySelectorAll('.swatch').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        const colorName = e.target.getAttribute('data-color-name');
        block.querySelector('.selected-color-label').textContent = colorName;
      });
    });

    // Size Selection
    block.querySelectorAll('.size-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        block.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
      });
    });

    // Quantity Increment / Decrement logic
    const qtyInput = block.querySelector('.qty-input');
    block.querySelector('.qty-btn.minus').addEventListener('click', () => {
      let currentVal = parseInt(qtyInput.value, 10);
      if (currentVal > 1) {
        qtyInput.value = currentVal - 1;
      }
    });

    block.querySelector('.qty-btn.plus').addEventListener('click', () => {
      let currentVal = parseInt(qtyInput.value, 10);
      if (currentVal < 10) {
        qtyInput.value = currentVal + 1;
      }
    });

  } catch (error) {
    console.error('Error loading product catalog data:', error);
    block.innerHTML = `<div class="product-error">Failed to load product details. Please try again later.</div>`;
  }
}
