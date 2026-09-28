export default function decorate(block) {
  const row = block.children[0];

  if (!row) return;

  const cells = [...row.children];

  if (cells.length < 2) return;

  const groupNames = cells[0].textContent
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  const optionGroups = cells[1].textContent
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  const container = document.createElement('div');
  container.className = 'shop-by-container';

  const title = document.createElement('h2');
  title.className = 'shop-by-title';
  title.textContent = 'Shop By';

  const groups = document.createElement('div');
  groups.className = 'shop-by-groups';

  groupNames.forEach((groupName, index) => {
    const optionsText = optionGroups[index] || '';

    const options = optionsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const groupKey = groupName.toLowerCase();

    const group = document.createElement('div');
    group.className = 'filter-group';

    const heading = document.createElement('h3');
    heading.textContent = groupName;

    const list = document.createElement('ul');

    options.forEach((option) => {
      const item = document.createElement('li');

      const label = document.createElement('label');

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = option;

      input.addEventListener('change', () => {
        document.dispatchEvent(
          new CustomEvent('catalog:filter-change', {
            detail: {
              group: groupKey,
              value: option,
              checked: input.checked,
            },
          }),
        );
      });

      label.append(
        input,
        document.createTextNode(option),
      );

      item.append(label);
      list.append(item);
    });

    group.append(heading, list);
    groups.append(group);
  });

  container.append(title, groups);

  block.replaceChildren(container);
}
