export default async function decorate(block) {
  // 1. Get product ID from URL query parameters (e.g., ?id=LLWP11.1-28)
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id') || 'LLWP11.1-28'; // Fallback ID

  block.textContent = ''; // Clear block content

  try {
    // 2. Format ID for the dynamic asset JSON path: e.g. "LLWP11.1-28" -> "llwp11-1-28"
    const formattedIdForPath = productId.toLowerCase().replace(/\./g, '-');
    const assetJsonUrl = `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${formattedIdForPath}.1.json`;

    // 3. Fetch the product-specific JSON asset from AEM
    const response = await fetch(assetJsonUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const product = await response.json();

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
    const sizes = Array.isArray(product.sizes)
      ? product.sizes
      : (product.sizes ? product.sizes.split(',').map(s => s.trim()) : []);

    const colors = Array.isArray(product.colors)
      ? product.colors
      : (product.colors ? product.colors.split(',').map(c => {
          const match = c.match(/(.*?)\s*\((#[0-9a-fA-F]{3,6})\)/);
          if (match) {
            return { name: match[1].trim(), hex: match[2].trim() };
          }
          return { name: c.trim(), hex: '#cccccc' };
        }) : []);

    // 5. Inspect JSON keys/values to extract assets where the key or value contains an image/video filename
    const assetBaseUrl = `https://publish-p24103-e71623.adobeaemcloud.com/content/dam/sportify/women/bottoms/${formattedIdForPath}`;

    const imageExtensions = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
    const videoExtensions = /\.(mp4|webm|mov|ogg)$/i;

    const extractedMedia = [];
    const processedUrls = new Set();

    // Scan both keys and values in the JSON response
    Object.entries(product).forEach(([key, val]) => {
      // Check if the key itself is a filename (e.g. "wp11-green_main.jpg": {...})
      // or if the value contains a filename
      const candidates = [key];
      if (typeof val === 'string') {
        candidates.push(val);
      }

      candidates.forEach((candidate) => {
        const trimmed = candidate.trim();
        if (imageExtensions.test(trimmed) || videoExtensions.test(trimmed)) {
          // Extract just the filename if it's a full path
          const filename = trimmed.split('/').pop();
          if (filename) {
            const fullUrl = `${assetBaseUrl}/${filename}`;
            if (!processedUrls.has(fullUrl)) {
              processedUrls.add(fullUrl);
              extractedMedia.push({
                url: fullUrl,
                type: videoExtensions.test(filename) ? 'video' : 'image',
              });
            }
          }
        }
      });
    });

    // Fallback if no media keys were detected
    const mediaItems = extractedMedia.length > 0 ? extractedMedia : [
      { url: `${assetBaseUrl}/${formattedIdForPath}_main.jpg`, type: 'image' }
    ];

    // Sort media: Images first, Videos always at the end
    const imagesList = mediaItems.filter(item => item.type === 'image');
    const videosList = mediaItems.filter(item => item.type === 'video');
    const sortedMediaItems = [...imagesList, ...videosList];

    let mainIndex = sortedMediaItems.findIndex(item => item.type === 'image' && item.url.toLowerCase().includes('main'));
    if (mainIndex === -1) {
      mainIndex = sortedMediaItems.findIndex(item => item.type === 'image');
      if (mainIndex === -1) mainIndex = 0;
    }

    const productSku = product.id || product.ID || productId;
    const productCategory = product.category || product.Category || 'women';
    const productName = product.name || product.Name || 'Product';
    const productPrice = product.price || product.Price || '0.00';
    const productDescription = product.description || product.Description || '';

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

    const hasMoreThanFour = sortedMediaItems.length > 4;
    const activeMedia = sortedMediaItems[mainIndex] || { type: 'image', url: '' };

    const initialMainDisplayHtml = activeMedia.type === 'video'
      ? `<video id="main-product-video" src="${activeMedia.url}" controls autoplay muted playsinline></video>`
      : `<img id="main-product-img" src="${activeMedia.url}" alt="${productName}" />`;

    // 6. Construct DOM Structure
    block.innerHTML = `
      <div class="product-main-wrapper">
        <div class="product-gallery-section">
          <div class="product-main-image" id="main-display-container">
            ${initialMainDisplayHtml}
          </div>

          ${sortedMediaItems.length > 1 ? `
            <div class="product-thumbnails-container ${hasMoreThanFour ? 'has-carousel' : ''}">
              <button class="carousel-arrow prev-arrow" aria-label="Previous" style="display: none;">‹</button>

              <div class="product-thumbnails-viewport">
                <div class="product-thumbnails-row">
                  ${sortedMediaItems.map((item, idx) => `
                    <button class="thumb-btn ${idx === mainIndex ? 'active' : ''} ${item.type === 'video' ? 'video-thumb-btn' : ''}" data-type="${item.type}" data-target-url="${item.url}">
                      ${item.type === 'video'
                        ? `<video src="${item.url}" muted preload="metadata"></video><div class="play-icon-overlay">▶</div>`
                        : `<img src="${item.url}" alt="Thumbnail ${idx + 1}" />`
                      }
                    </button>
                  `).join('')}
                </div>
              </div>

              <button class="carousel-arrow next-arrow" aria-label="Next" style="display: none;">›</button>
            </div>
          ` : ''}
        </div>

        <div class="product-info-section">
          <h1 class="product-title">${productName}</h1>

          <div class="product-rating">
            <span class="stars">★★★★★</span>
            <span class="review-count">${productReviews.length} Reviews</span>
          </div>

          <div class="product-pricing">
            <span class="current-price">$${typeof productPrice === 'string' && !productPrice.startsWith('$') ? parseFloat(productPrice).toFixed(2) : productPrice}</span>
          </div>

          <p class="product-description">${productDescription}</p>

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

    // 7. Interactive Media Switcher & Intelligent Carousel Arrows
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
          mainContainer.innerHTML = `<img id="main-product-img" src="${mediaUrl}" alt="${productName}" />`;
        }
      });
    });

    // Carousel Scrolling & Visibility Logic for Arrows
    const thumbRow = block.querySelector('.product-thumbnails-row');
    const prevArrow = block.querySelector('.prev-arrow');
    const nextArrow = block.querySelector('.next-arrow');

    if (thumbRow && prevArrow && nextArrow) {
      const updateArrowsVisibility = () => {
        const { scrollLeft, scrollWidth, clientWidth } = thumbRow;
        const tolerance = 2;

        const showLeft = scrollLeft > tolerance;
        const showRight = scrollLeft < (scrollWidth - clientWidth - tolerance);

        prevArrow.style.display = showLeft ? 'flex' : 'none';
        nextArrow.style.display = showRight ? 'flex' : 'none';
      };

      const scrollAmount = 280;
      prevArrow.addEventListener('click', () => {
        thumbRow.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      });
      nextArrow.addEventListener('click', () => {
        thumbRow.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      });

      thumbRow.addEventListener('scroll', updateArrowsVisibility);
      window.addEventListener('resize', updateArrowsVisibility);

      setTimeout(updateArrowsVisibility, 50);
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
