export default function decorate(block) {
  const container = document.createElement('div');
  container.className = 'product-grid-container';

  const row = block.children[0];

  if (!row) {
    return;
  }

  const cells = [...row.children];

  if (cells.length < 4) {
    return;
  }

  const names = cells[0].textContent
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  const prices = cells[1].textContent
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  const links = cells[2].textContent
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  const images = [...cells[3].querySelectorAll('img')]
    .map((img) => img.src)
    .filter(Boolean);

  const products = names.map((name, index) => ({
    name,
    price: Number.parseFloat(
      (prices[index] || '').replace(/[^0-9.]/g, ''),
    ) || 0,
    displayPrice: prices[index] || '',
    link: links[index] || '#',
    image: images[index] || '',
    originalIndex: index,
  }));

  function renderProducts(items) {
    container.replaceChildren();

    items.forEach((product) => {
      const card = document.createElement('article');
      card.className = 'product-card';

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

  render();

  block.replaceChildren(container);
}
