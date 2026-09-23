export default async function decorate(block) {
  // 1. Get product ID from URL query parameters (e.g., ?id=24-WG09)
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id') || 'LLWP13.2-30'; // Fallback ID

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

    const imageUrl = product.image.startsWith('/') ? product.image : `/${product.image}`;
    const productSku = product.sku || product.id;
    const productCategory = product.category || 'General';

    // Fallbacks if arrays aren't in JSON
    const productFeatures = product.features || [
      "Breathable, moisture-wicking fabric",
      "Four-way stretch for maximum mobility",
      "Flatlock seams reduce chafing"
    ];

    const productReviews = product.reviews || [
      { author: "Sarah M.", rating: 5, text: "Love this product! The fit is perfect and the quality is outstanding. Highly recommend!" },
      { author: "Mike T.", rating: 4, text: "Great product, very comfortable. Would buy again." }
    ];

    // Helper to render star ratings
    const renderStars = (rating) => {
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        starsHtml += i <= rating ? '★' : '☆';
      }
      return starsHtml;
    };

    // 4. Construct the Main Product Section + Dynamic Tabs Section
    block.innerHTML = `
      <div class="product-main-wrapper">
        <div class="product-gallery-section">
          <div class="product-main-image">
            <img src="${imageUrl}" alt="${product.name}" />
          </div>
        </div>

        <div class="product-info-section">
          <h1 class="product-title">${product.name}</h1>

          <div class="product-rating">
            <span class="stars">★★★★★</span>
            <span class="review-count">${productReviews.length} Reviews</span>
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
      </div>

      <!-- Product Tabs Section (Details & Reviews matching screenshot) -->
      <div class="product-tabs-section">
        <div class="product-tabs-header">
          <button class="tab-btn active" data-tab="details">Details</button>
          <button class="tab-btn" data-tab="reviews">Reviews</button>
        </div>

        <div class="product-tabs-content">
          <!-- Details Pane -->
          <div class="tab-pane active" id="details-pane">
            <h3 class="tabs-pane-title">Product Details</h3>
            <ul class="product-features-list">
              ${productFeatures.map(feature => `
                <li><span class="check-icon">✓</span> ${feature}</li>
              `).join('')}
            </ul>
          </div>

          <!-- Reviews Pane -->
          <div class="tab-pane" id="reviews-pane">
            <h3 class="tabs-pane-title">Customer Reviews</h3>
            <div class="reviews-list">
              ${productReviews.map(review => `
                <div class="review-item">
                  <div class="review-stars">${renderStars(review.rating)}</div>
                  <div class="review-author">${review.author}</div>
                  <p class="review-text">${review.text}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

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

    // Tab Switching Logic
    const tabButtons = block.querySelectorAll('.tab-btn');
    const tabPanes = block.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.target.getAttribute('data-tab');

        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        e.target.classList.add('active');
        if (targetTab === 'details') {
          block.querySelector('#details-pane').classList.add('active');
        } else if (targetTab === 'reviews') {
          block.querySelector('#reviews-pane').classList.add('active');
        }
      });
    });

  } catch (error) {
    console.error('Error loading product catalog data:', error);
    block.innerHTML = `<div class="product-error">Failed to load product details. Please check console for details.</div>`;
  }
}
