let guideCount = 0;

/**
 * Decorates an authored Size Guide.
 *
 * Expected content rows:
 * 1. Guide title — one merged cell
 * 2. Instructions — one merged cell
 * 3. Column headings — two or more cells
 * 4+. Size data — same cell count as the column-heading row
 * Penultimate row: disclaimer — one merged cell
 * Final row: collection link — one merged cell
 *
 * The block header is not included in block.children.
 *
 * @param {HTMLElement} block The size-guide block
 */
export default function decorate(block) {
  const rows = [...block.children];

  // Title, instructions, headers, at least one data row,
  // disclaimer, and link.
  if (rows.length < 6) {
    // eslint-disable-next-line no-console
    console.warn(
      'Size Guide: expected title, instructions, column headings, '
        + 'at least one size row, disclaimer, and link.',
      block,
    );
    return;
  }

  const titleRow = rows[0];
  const instructionsRow = rows[1];
  const headerRow = rows[2];
  const dataRows = rows.slice(3, -2);
  const disclaimerRow = rows[rows.length - 2];
  const linkRow = rows[rows.length - 1];

  const mergedRows = [
    titleRow,
    instructionsRow,
    disclaimerRow,
    linkRow,
  ];

  const columnCount = headerRow.children.length;

  const validStructure = mergedRows.every(
    (row) => row.children.length === 1,
  )
    && columnCount >= 2
    && dataRows.every((row) => row.children.length === columnCount);

  if (!validStructure) {
    // eslint-disable-next-line no-console
    console.warn(
      'Size Guide: merge the title, instructions, disclaimer, and link rows. '
        + 'All size rows must match the column-heading count.',
      block,
    );
    return;
  }

  const titleText = titleRow.textContent.trim();
  const instructionsText = instructionsRow.textContent.trim();
  const disclaimerText = disclaimerRow.textContent.trim();

  const headingTexts = [...headerRow.children].map(
    (cell) => cell.textContent.trim(),
  );

  if (!titleText || headingTexts.some((text) => !text)) {
    // eslint-disable-next-line no-console
    console.warn(
      'Size Guide: the guide title and all column headings are required.',
      block,
    );
    return;
  }

  const links = linkRow.querySelectorAll('a[href]');
  const hasLinkContent = linkRow.textContent.trim().length > 0
    || links.length > 0;

  if (hasLinkContent && (links.length !== 1 || !links[0].textContent.trim())) {
    // eslint-disable-next-line no-console
    console.warn(
      'Size Guide: the final row must be empty or contain one text hyperlink.',
      block,
    );
    return;
  }

  guideCount += 1;
  const titleId = `size-guide-title-${guideCount}`;

  const panel = document.createElement('div');
  panel.className = 'size-guide-panel';

  // The homepage section heading is authored separately as H2.
  const title = document.createElement('h3');
  title.className = 'size-guide-title';
  title.id = titleId;
  title.textContent = titleText;
  panel.append(title);

  if (instructionsText) {
    const instructions = document.createElement('p');
    instructions.className = 'size-guide-instructions';
    instructions.textContent = instructionsText;
    panel.append(instructions);
  }

  // Keyboard-focusable region allows horizontal scrolling
  // when a wider table does not fit the available space.
  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'size-guide-table-wrapper';
  tableWrapper.tabIndex = 0;
  tableWrapper.setAttribute('role', 'region');
  tableWrapper.setAttribute('aria-labelledby', titleId);

  const table = document.createElement('table');
  table.className = 'size-guide-table';
  table.setAttribute('aria-labelledby', titleId);

  const thead = document.createElement('thead');
  const headingRow = document.createElement('tr');

  headingTexts.forEach((text) => {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = text;
    headingRow.append(cell);
  });

  thead.append(headingRow);

  const tbody = document.createElement('tbody');

  dataRows.forEach((authoredRow) => {
    const row = document.createElement('tr');

    [...authoredRow.children].forEach((authoredCell) => {
      const cell = document.createElement('td');
      cell.textContent = authoredCell.textContent.trim();
      row.append(cell);
    });

    tbody.append(row);
  });

  table.append(thead, tbody);
  tableWrapper.append(table);
  panel.append(tableWrapper);

  if (disclaimerText) {
    const disclaimer = document.createElement('p');
    disclaimer.className = 'size-guide-disclaimer';
    disclaimer.textContent = disclaimerText;
    panel.append(disclaimer);
  }

  const authoredLink = links[0];

  if (authoredLink) {
    const link = authoredLink.cloneNode(true);
    link.className = 'size-guide-link';
    link.textContent = authoredLink.textContent.trim();

    const linkWrapper = document.createElement('p');
    linkWrapper.className = 'size-guide-link-wrapper';
    linkWrapper.append(link);
    panel.append(linkWrapper);
  }

  block.replaceChildren(panel);
}
