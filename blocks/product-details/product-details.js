export default async function decorate(block) {
  // 1. Get product ID from URL query parameters (e.g., ?id=LLWP11.1-28 or ?id=24-WG09)
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id') || 'LLWP11.1-28'; // Fallback ID

  block.textContent = ''; // Clear block content

  try {
    // 2. Fetch the products JSON array
    const response = await fetch('/data/products.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // 3. Find the product inside the array matching the ID
    let product = null;
    if (Array.isArray(data)) {
      product = data.find(p => p.id === productId || p.sku === productId);
    } else {
      product = data[productId];
    }

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

    // 4. Construct the Product Details DOM Structure matching the reference screenshot
    const container = document.createElement('div');
    container.className = 'product-details-container';

    // Format image path correctly
    const imageUrl = product.image.startsWith('/') ? product.image : `/${product.image}`;
    const productSku = product.sku || product.id;
    const productCategory = product.category || 'General';

    container.innerHTML = `
      <div class="product-gallery-section">
        <div class="product-main-image">
          <img src="${imageUrl}" alt="${product.name}" />
        </div>
      </div>

      <div class="product-info-section">
        <h1 class="product-title">${product.name}</h1>

        <div class="product-rating">
          <span class="stars">★★★★★</span>
          <span class="review-count">23 Reviews</span>
        </div>

        <div class="product-pricing">
          <span class="current-price">$${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}</span>
        </div>

        <p class="product-description">${product.description}</p>

        ${product.sizes && product.sizes.length > 0 ? `
          <div class="option-group">
            <label class="option-label">Size</label>
            <div class="size-options">
              ${product.sizes.map((size, i) => `
                <button class="size-btn ${i === 0 ? 'selected' : ''}">${size}</button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${product.colors && product.colors.length > 0 ? `
          <div class="option-group">
            <label class="option-label">Color</label>
            <div class="color-swatches">
              ${product.colors.map((c, i) => `
                <button class="swatch ${i === 0 ? 'selected' : ''}" style="background-color: ${c.hex}" data-color-name="${c.name}" title="${c.name}"></button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="option-group">
          <label class="option-label">Quantity</label>
          <div class="product-actions-bar">
            <div class="quantity-selector">
              <button class="qty-btn minus">-</button>
              <input type="number" class="qty-input" value="1" min="1" max="10" />
              <button class="qty-btn plus">+</button>
            </div>
            <button class="add-to-cart-btn">ADD TO CART</button>
          </div>
        </div>

        <div class="product-metadata">
          <div class="meta-item"><strong>SKU:</strong> ${productSku}</div>
          <div class="meta-item"><strong>Category:</strong> ${productCategory.charAt(0).toUpperCase() + productCategory.slice(1)}</div>
        </div>
      </div>
    `;

    block.append(container);

    // 5. Add Interactive Event Listeners
    block.querySelectorAll('.swatch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        block.querySelectorAll('.swatch').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
      });
    });

    block.querySelectorAll('.size-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        block.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
      });
    });

    const qtyInput = block.querySelector('.qty-input');
    block.querySelector('.qty-btn.minus').addEventListener('click', () => {
      let currentVal = parseInt(qtyInput.value, 10);
      if (currentVal > 1) qtyInput.value = currentVal - 1;
    });

    block.querySelector('.qty-btn.plus').addEventListener('click', () => {
      let currentVal = parseInt(qtyInput.value, 10);
      if (currentVal < 10) qtyInput.value = currentVal + 1;
    });

  } catch (error) {
    console.error('Error loading product catalog data:', error);
    block.innerHTML = `<div class="product-error">Failed to load product details. Please check console for details.</div>`;
  }
}
