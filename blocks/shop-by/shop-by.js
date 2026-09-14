export default function decorate(block) {
  const rows = [...block.children];

  const container = document.createElement('div');
  container.className = 'shop-by-container';

  rows.forEach((row) => {
    const cells = [...row.children];

    if (cells.length < 2) {
      return;
    }

    const category = cells[0].textContent.trim();
    const values = cells[1].textContent
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const group = document.createElement('div');
    group.className = 'filter-group';

    const heading = document.createElement('h3');
    heading.textContent = category;

    group.appendChild(heading);

    const list = document.createElement('ul');

    values.forEach((value) => {
      const item = document.createElement('li');

      const label = document.createElement('label');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = value;

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(` ${value}`));

      item.appendChild(label);
      list.appendChild(item);
    });

    group.appendChild(list);
    container.appendChild(group);
  });

  block.replaceChildren(container);
}
