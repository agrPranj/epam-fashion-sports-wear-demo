export default async function decorate(block) {
  // 1. Get product ID from URL query parameters (e.g., ?id=LLWP11.1-28)
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id') || 'LLWP11.1-28'; // Fallback ID

  block.textContent = ''; // Clear block content

  try {
    // 2. Fetch the AEM EDS sheet JSON using the specified path
    const response = await fetch('/data/products-data.json?sheet=en');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonResponse = await response.json();
    const productsArray = jsonResponse.data || [];

    // 3. Find the product matching the id (case-insensitive)
    const product = productsArray.find(p =>
      (p.id && p.id.trim().toLowerCase() === productId.trim().toLowerCase()) ||
      (p.ID && p.ID.trim().toLowerCase() === productId.trim().toLowerCase())
    );

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

    // 4. Parse Sizes and Colors
    const sizes = product.sizes ? product.sizes.split(',').map(s => s.trim()) : [];
    const colors = product.colors ? product.colors.split(',').map(c => {
      const match = c.match(/(.*?)\s*\((#[0-9a-fA-F]{3,6})\)/);
      if (match) {
        return { name: match[1].trim(), hex: match[2].trim() };
      }
      return { name: c.trim(), hex: '#cccccc' };
    }) : [];

    // 5. Build Media URLs (Images & Videos mixed in the 'image' string) with AEM Cloud Domain
    const aemDomain = 'https://publish-p24103-e71623.adobeaemcloud.com';

    const rawId = product.id || product.ID || productId;
    const formattedIdForPath = rawId.toLowerCase().replace(/\./g, '-');

    const category = (product.category || 'women').toLowerCase();
    const subCategory = (product.subCategory || product.subcategory || 'bottoms').toLowerCase();

    const damBasePath = `/content/dam/Velocity%20Sports%20EDS%20DA%20POC/${category}/${subCategory}/${formattedIdForPath}`;

    // Split comma-separated filenames from the 'image' property
    const filenames = product.image
      ? product.image.split(',').map(item => item.trim()).filter(Boolean)
      : [`${formattedIdForPath}_main.jpg`];

    // Helper to check if a filename is a video
    const isVideoFile = (filename) => /\.(mp4|webm|mov|ogg)$/i.test(filename);

    // Separate images and videos so videos always appear at the end
    const imageFilenames = filenames.filter(f => !isVideoFile(f));
    const videoFilenames = filenames.filter(f => isVideoFile(f));
    const sortedFilenames = [...imageFilenames, ...videoFilenames];

    // Map filenames to full URLs
    const mediaItems = sortedFilenames.map(filename => {
      let url = filename;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = url.startsWith('/content/dam') ? `${aemDomain}${url}` : `${aemDomain}${damBasePath}/${url}`;
      }
      return {
        url,
        type: isVideoFile(filename) ? 'video' : 'image',
      };
    });

    // Identify main display index (default to first image or item with 'main')
    let mainIndex = mediaItems.findIndex(item => item.type === 'image' && item.url.toLowerCase().includes('main'));
    if (mainIndex === -1) {
      mainIndex = mediaItems.findIndex(item => item.type === 'image');
      if (mainIndex === -1) mainIndex = 0;
    }

    const productSku = rawId;
    const productCategory = product.category || 'General';

    const productFeatures = product.features ? product.features.split('|').map(f => f.trim()) : [
      "Breathable, moisture-wicking fabric",
      "Four-way stretch for maximum mobility",
      "Flatlock seams reduce chafing",
      "Antimicrobial treatment prevents odor",
      "Made with sustainable materials"
    ];

    const productReviews = [
      { author: "Sarah M.", rating: 5, text: "Love this product! The fit is perfect and the quality is outstanding. Highly recommend!" },
      { author: "Mike T.", rating: 4, text: "Great product, very comfortable. Would buy again." }
    ];

    const renderStars = (rating) => {
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        starsHtml += i <= rating ? '★' : '☆';
      }
      return starsHtml;
    };

    const hasMoreThanFour = mediaItems.length > 4;

    // Render initial active media element (image or video)
    const activeMedia = mediaItems[mainIndex] || { type: 'image', url: '' };
    const initialMainDisplayHtml = activeMedia.type === 'video'
      ? `<video id="main-product-video" src="${activeMedia.url}" controls autoplay muted playsinline></video>`
      : `<img id="main-product-img" src="${activeMedia.url}" alt="${product.name || 'Product Image'}" />`;

    // 6. Construct DOM Structure
    block.innerHTML = `
      <div class="product-main-wrapper">
        <div class="product-gallery-section">
          <div class="product-main-image" id="main-display-container">
            ${initialMainDisplayHtml}
          </div>

          ${mediaItems.length > 1 ? `
            <div class="product-thumbnails-container ${hasMoreThanFour ? 'has-carousel' : ''}">
              ${hasMoreThanFour ? `<button class="carousel-arrow prev-arrow" aria-label="Previous">‹</button>` : ''}

              <div class="product-thumbnails-viewport">
                <div class="product-thumbnails-row">
                  <!-- Render Image Thumbnails -->
                  ${mediaItems.map((item, idx) => `
                    <button class="thumb-btn ${idx === mainIndex ? 'active' : ''} ${item.type === 'video' ? 'video-thumb-btn' : ''}" data-type="${item.type}" data-target-url="${item.url}">
                      ${item.type === 'video'
                        ? `<video src="${item.url}" muted preload="metadata"></video><div class="play-icon-overlay">▶</div>`
                        : `<img src="${item.url}" alt="Thumbnail ${idx + 1}" />`
                      }
                    </button>
                  `).join('')}
                </div>
              </div>

              ${hasMoreThanFour ? `<button class="carousel-arrow next-arrow" aria-label="Next">›</button>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="product-info-section">
          <h1 class="product-title">${product.name}</h1>

          <div class="product-rating">
            <span class="stars">★★★★★</span>
            <span class="review-count">${productReviews.length} Reviews</span>
          </div>

          <div class="product-pricing">
            <span class="current-price">$${typeof product.price === 'string' ? parseFloat(product.price).toFixed(2) : product.price}</span>
          </div>

          <p class="product-description">${product.description || ''}</p>

          ${sizes.length > 0 ? `
            <div class="option-group">
              <label class="option-label">Size</label>
              <div class="size-options">
                ${sizes.map((size, i) => `
                  <button class="size-btn ${i === 0 ? 'selected' : ''}">${size}</button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${colors.length > 0 ? `
            <div class="option-group">
              <label class="option-label">Color</label>
              <div class="color-swatches">
                ${colors.map((c, i) => `
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

      <!-- Product Tabs Section -->
      <div class="product-tabs-section">
        <div class="product-tabs-header">
          <button class="tab-btn active" data-tab="details">Details</button>
          <button class="tab-btn" data-tab="reviews">Reviews</button>
        </div>

        <div class="product-tabs-content">
          <div class="tab-pane active" id="details-pane">
            <h3 class="tabs-pane-title">Product Details</h3>
            <ul class="product-features-list">
              ${productFeatures.map(feature => `
                <li><span class="check-icon">✓</span> ${feature}</li>
              `).join('')}
            </ul>
          </div>

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

    // 7. Interactive Media Switcher (Image vs Video)
    const mainContainer = block.querySelector('#main-display-container');
    block.querySelectorAll('.thumb-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        block.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('active'));
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('active');

        const mediaType = targetBtn.getAttribute('data-type');
        const mediaUrl = targetBtn.getAttribute('data-target-url');

        if (mediaType === 'video') {
          mainContainer.innerHTML = `<video id="main-product-video" src="${mediaUrl}" controls autoplay muted playsinline></video>`;
        } else {
          mainContainer.innerHTML = `<img id="main-product-img" src="${mediaUrl}" alt="${product.name || 'Product Image'}" />`;
        }
      });
    });

    // Carousel Scrolling Arrows
    const thumbRow = block.querySelector('.product-thumbnails-row');
    const prevArrow = block.querySelector('.prev-arrow');
    const nextArrow = block.querySelector('.next-arrow');

    if (thumbRow && prevArrow && nextArrow) {
      const scrollAmount = 280;
      prevArrow.addEventListener('click', () => {
        thumbRow.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      });
      nextArrow.addEventListener('click', () => {
        thumbRow.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      });
    }

    // Option Listeners
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
