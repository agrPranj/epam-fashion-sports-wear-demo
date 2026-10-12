export default function decorate(block) {
  const lastPathSegment = window.location.pathname.split('/').filter(Boolean).pop()?.toLowerCase();

  const container = document.createElement('div');
  container.className = 'product-grid-container';

  const productsUrl = '/data/products-data.json?sheet=en';
  const damBaseUrl = 'https://publish-p24103-e71623.adobeaemcloud.com';
  const pageAudience = ['men', 'women'].includes(lastPathSegment) ? lastPathSegment : '';
  const isGearPage = lastPathSegment === 'gear';
  let products = [];
  let currentSort = 'relevance';
  const selectedFilters = new Map();

  function normalizeGroupName(value) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normalized === 'size' || normalized === 'sizes') return 'sizes';
    if (normalized === 'category' || normalized === 'categories') return 'category';
    if (normalized === 'subcategory' || normalized === 'subcategories') return 'subcategory';
    if (normalized === 'price' || normalized === 'prices') return 'price';

    return normalized;
  }

  function normalizeValues(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    }

    return String(value || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  function getProductImageUrl(image, category) {
    const firstImage = String(image || '').split(',')[0].trim();
    if (!firstImage) return '';

    const productAudience = String(category || '').trim().toLowerCase();
    let damFolder = '';
    if (isGearPage) {
      damFolder = 'gear';
    } else if (['men', 'women'].includes(productAudience)) {
      damFolder = productAudience;
    }

    if (damFolder) {
      const { pathname } = new URL(firstImage, window.location.href);
      const filename = decodeURIComponent(pathname.split('/').pop());
      return new URL(
        `/content/dam/sportify/${damFolder}/${encodeURIComponent(filename)}`,
        damBaseUrl,
      ).href;
    }

    return new URL(firstImage, new URL(productsUrl, window.location.href)).href;
  }

  function normalizeProduct(product, index) {
    const id = product.id || product.ID;
    const name = product.name || product.Name;
    const price = product.price ?? product.Price;
    const image = product.image || product.Image;
    const category = product.category || product.Category;
    const subCategory = product.subCategory || product.subcategory
      || product.SubCategory || product.Subcategory;
    const sizes = product.sizes || product.Sizes;
    const audience = [
      ...normalizeValues(product.gender || product.Gender),
      ...normalizeValues(product.audience || product.Audience),
      ...normalizeValues(product.department || product.Department),
      ...normalizeValues(category),
      ...normalizeValues(subCategory),
    ];
    const parsedPrice = Number.parseFloat(String(price ?? '').replace(/[^0-9.-]/g, ''));

    return {
      id: id || `product-${index}`,
      name: name || 'Untitled product',
      price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      hasPrice: Number.isFinite(parsedPrice),
      displayPrice: price !== undefined && price !== null && price !== '' ? `$${price}` : '',
      category: normalizeValues(category),
      subCategory: normalizeValues(subCategory),
      sizes: normalizeValues(sizes),
      audience,
      link: id ? `/products/${encodeURIComponent(id)}` : '#',
      image: getProductImageUrl(image, category),
      originalIndex: index,
    };
  }

  function matchesPageAudience(product) {
    if (!pageAudience) return true;

    const audiencePattern = pageAudience === 'women'
      ? /^(women|womens|woman|female)/
      : /^(men|mens|man|male)/;

    return product.audience.some((value) => (
      audiencePattern.test(value.replace(/[^a-z]/g, ''))
    ));
  }

  function matchesGearCategory(product) {
    return !isGearPage || product.category.includes('equipment');
  }

  function matchesPriceRange(price, option) {
    const normalized = option.toLowerCase();
    const values = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];

    if (!values.length) return false;

    if (/under|below|less than|</.test(normalized)) return price < values[0];
    if (/over|above|greater than|more than|\+/.test(normalized)) return price >= values[0];
    if (values.length > 1) return price >= values[0] && price <= values[1];

    return price === values[0];
  }

  function matchesFilters(product) {
    return [...selectedFilters.entries()].every(([group, values]) => {
      if (values.size === 0) return true;

      const selectedValues = [...values];

      switch (group) {
        case 'sizes':
          return selectedValues.some((value) => product.sizes.includes(value));

        case 'category':
          return selectedValues.some((value) => (
            product.category.includes(value) || product.subCategory.includes(value)
          ));

        case 'subcategory':
          return selectedValues.some((value) => product.subCategory.includes(value));

        case 'price':
          return product.hasPrice
            && selectedValues.some((value) => matchesPriceRange(product.price, value));

        default:
          return true;
      }
    });
  }

  function renderProducts(items) {
    container.replaceChildren();

    items.forEach((product) => {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.dataset.productId = product.id;

      const imageLink = document.createElement('a');
      imageLink.href = product.link;
      imageLink.className = 'product-image-link';

      if (product.image) {
        const img = document.createElement('img');

        img.src = product.image;
        img.alt = product.name;
        img.loading = 'lazy';

        imageLink.append(img);
      }

      const content = document.createElement('div');
      content.className = 'product-card-content';

      const title = document.createElement('h3');
      title.className = 'product-name';

      const anchor = document.createElement('a');
      anchor.href = product.link;
      anchor.textContent = product.name;

      title.append(anchor);

      const price = document.createElement('p');
      price.className = 'product-price';
      price.textContent = product.displayPrice;

      content.append(title, price);

      card.append(imageLink, content);
      container.append(card);
    });
  }

  function updateCount(count) {
    document.dispatchEvent(
      new CustomEvent('catalog:count-change', {
        detail: {
          count,
        },
      }),
    );
  }

  function sortProducts(items, sort) {
    const result = [...items];

    switch (sort) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;

      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;

      case 'relevance':
      default:
        result.sort((a, b) => a.originalIndex - b.originalIndex);
        break;
    }

    return result;
  }

  function render() {
    const filteredProducts = products.filter(matchesFilters);
    const sortedProducts = sortProducts(filteredProducts, currentSort);

    renderProducts(sortedProducts);
    updateCount(sortedProducts.length);
  }

  document.addEventListener('catalog:sort-change', (event) => {
    currentSort = event.detail.sort;
    render();
  });

  document.addEventListener('catalog:filter-change', (event) => {
    const { group, value, checked } = event.detail;
    const groupKey = normalizeGroupName(group);
    const values = selectedFilters.get(groupKey) || new Set();
    const normalizedValue = String(value).trim().toLowerCase();

    if (checked) {
      values.add(normalizedValue);
    } else {
      values.delete(normalizedValue);
    }

    if (values.size) {
      selectedFilters.set(groupKey, values);
    } else {
      selectedFilters.delete(groupKey);
    }

    render();
  });

  block.replaceChildren(container);

  container.textContent = 'Loading products...';

  fetch(productsUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Product feed request failed: ${response.status}`);
      }

      return response.json();
    })
    .then((payload) => {
      products = (Array.isArray(payload) ? payload : payload.data || [])
        .map(normalizeProduct)
        .filter((product) => (
          product.name && matchesPageAudience(product) && matchesGearCategory(product)
        ));

      render();
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Product feed loading failed', error);
      container.textContent = 'Products could not be loaded.';
      updateCount(0);
    });
}
