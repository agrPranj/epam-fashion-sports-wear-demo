export default function decorate(block) {
  const row = block.children[0];

  if (!row) return;

  const cells = [...row.children];

  if (cells.length < 2) return;

  const values = cells[1].textContent
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  const container = document.createElement('div');
  container.className = 'product-toolbar-container';

  const count = document.createElement('div');
  count.className = 'product-count';

  const countValue = document.createElement('span');
  countValue.className = 'product-count-value';
  countValue.textContent = '0 Items';

  count.append(countValue);

  const sort = document.createElement('div');
  sort.className = 'product-sort';

  const sortLabel = document.createElement('label');
  sortLabel.textContent = 'Sort By:';
  sortLabel.htmlFor = 'product-sort-select';

  const select = document.createElement('select');
  select.id = 'product-sort-select';
  select.className = 'product-sort-select';

  const options = values[1]
    ? values[1]
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    : ['Relevance'];

  options.forEach((value) => {
    const option = document.createElement('option');
    option.textContent = value;

    if (value === 'Relevance') {
      option.value = 'relevance';
    } else if (value === 'Price Low to High') {
      option.value = 'price-low';
    } else if (value === 'Price High to Low') {
      option.value = 'price-high';
    }

    select.append(option);
  });

  select.addEventListener('change', () => {
    document.dispatchEvent(
      new CustomEvent('catalog:sort-change', {
        detail: {
          sort: select.value,
        },
      }),
    );
  });

  sort.append(sortLabel, select);

  container.append(count, sort);

  block.replaceChildren(container);

  document.addEventListener(
    'catalog:count-change',
    (event) => {
      const value = event.detail.count;

      countValue.textContent = value === 1
              ? '1 Item'
              : `${value} Items`;
    },
  );
}
