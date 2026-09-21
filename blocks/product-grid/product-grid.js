import { createOptimizedPicture } from '../../scripts/aem.js';

function getCell(row, index) {
  return row.children[index] || document.createElement('div');
}

export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'product-grid-list';

  [...block.children].forEach((row) => {
    const imageCell = getCell(row, 0);
    const infoCell = getCell(row, 1);
    const priceCell = getCell(row, 2);
    const image = imageCell.querySelector('img');
    const name = infoCell.textContent.trim();
    const price = priceCell.textContent.trim();
    const link = infoCell.querySelector('a[href]') || getCell(row, 3).querySelector('a[href]');

    if (!image || !name) {
      return;
    }

    const item = document.createElement('li');

    const media = document.createElement('div');
    media.className = 'product-grid-image';

    const picture = image.closest('picture');
    media.append(picture || image);

    const details = document.createElement('div');
    details.className = 'product-grid-details';

    const title = document.createElement(link ? 'a' : 'h3');
    title.textContent = name;

    if (link) {
      title.href = link.href;
      title.className = 'product-grid-title';
    }

    details.append(title);

    if (price) {
      const priceElement = document.createElement('p');
      priceElement.className = 'product-grid-price';
      priceElement.textContent = price;
      details.append(priceElement);
    }

    item.append(media, details);
    list.append(item);
  });

  list.querySelectorAll('picture > img').forEach((img) => {
    const picture = img.closest('picture');
    if (picture) {
      picture.replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
    }
  });

  block.replaceChildren(list);
}
