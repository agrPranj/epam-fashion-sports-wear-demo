export default function decorate(block) {
  const container = document.createElement('div');
  container.className = 'product-grid-container';

  const productsUrl = '/data/products-data.json?sheet=en';
  let products = [];

  function normalizeProduct(product, index) {
    return {
      id: product.ID || `product-${index}`,
      name: product.Name || 'Untitled product',
      price: Number.parseFloat(product.Price) || 0,
      displayPrice: product.Price ? `$${product.Price}` : '',
      link: product.ID ? `/products/${encodeURIComponent(product.ID)}` : '#',
      image: product.Image ? new URL(product.Image, new URL(productsUrl, window.location.href)).href : '',
      originalIndex: index,
    };
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

  function render(sort = 'relevance') {
    const sortedProducts = sortProducts(products, sort);

    renderProducts(sortedProducts);
    updateCount(sortedProducts.length);
  }

  document.addEventListener('catalog:sort-change', (event) => {
    render(event.detail.sort);
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
        .filter((product) => product.name);

      render();
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Product feed loading failed', error);
      container.textContent = 'Products could not be loaded.';
      updateCount(0);
    });
}
