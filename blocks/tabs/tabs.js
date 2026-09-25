import { loadBlock } from '../../scripts/aem.js';

let tabsCount = 0;

/**
 * Enhances a Tabs block and its following sibling blocks.
 *
 * Authoring:
 * - Tabs table with one label per row, one cell per row.
 * - Immediately follow it with one block per label.
 * - Keep all blocks in the same section.
 *
 * @param {HTMLElement} block The Tabs block
 */
export default async function decorate(block) {
  const rows = [...block.children];

  const validRows = rows.length > 0
    && rows.every(
      (row) => row.children.length === 1
        && row.textContent.trim().length > 0,
    );

  if (!validRows) {
    // eslint-disable-next-line no-console
    console.warn(
      'Tabs: author one non-empty label per row, with one cell per row.',
      block,
    );
    return;
  }

  const labels = rows.map((row) => row.textContent.trim());
  const wrapper = block.parentElement;
  const section = wrapper?.parentElement;

  if (!section?.classList.contains('section')) {
    // eslint-disable-next-line no-console
    console.warn('Tabs: expected a block wrapper inside a section.', block);
    return;
  }

  const panelWrappers = [];
  const panelBlocks = [];
  let sibling = wrapper.nextElementSibling;

  // Match each label with one immediately following block wrapper.
  for (let index = 0; index < labels.length; index += 1) {
    const children = sibling ? [...sibling.children] : [];

    const isBlockWrapper = children.length === 1
      && children[0].classList.contains('block')
      && children[0].dataset.blockName !== 'tabs';

    if (!isBlockWrapper) {
      // eslint-disable-next-line no-console
      console.warn(
        'Tabs: each label requires one following block in the same section. '
          + 'Do not place text or section breaks between these blocks.',
        block,
      );
      return;
    }

    panelWrappers.push(sibling);
    panelBlocks.push(children[0]);
    sibling = sibling.nextElementSibling;
  }

  // Load the child blocks before moving their existing wrappers.
  // This avoids depending on when the section loader reaches them.
  await panelBlocks.reduce(
    (previousLoad, panelBlock) => previousLoad.then(() => loadBlock(panelBlock)),
    Promise.resolve(),
  );

  tabsCount += 1;
  const prefix = `content-tabs-${tabsCount}`;

  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  // Use a nearby authored heading as the accessible group name.
  const sectionHeading = section.querySelector(
    ':scope > .default-content-wrapper h2',
  );

  if (sectionHeading) {
    if (!sectionHeading.id) {
      sectionHeading.id = `${prefix}-heading`;
    }

    tablist.setAttribute('aria-labelledby', sectionHeading.id);
  }

  const panelsContainer = document.createElement('div');
  panelsContainer.className = 'tabs-panels';

  const buttons = [];
  const panels = [];

  labels.forEach((label, index) => {
    const tabId = `${prefix}-tab-${index + 1}`;
    const panelId = `${prefix}-panel-${index + 1}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-tab';
    button.id = tabId;
    button.textContent = label;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panelId);
    button.setAttribute('aria-selected', String(index === 0));
    button.tabIndex = index === 0 ? 0 : -1;

    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    panel.tabIndex = 0;
    panel.hidden = index !== 0;

    panel.append(panelWrappers[index]);
    tablist.append(button);
    panelsContainer.append(panel);

    buttons.push(button);
    panels.push(panel);
  });

  const activateTab = (selectedIndex, moveFocus = false) => {
    buttons.forEach((button, index) => {
      const selected = index === selectedIndex;

      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      panels[index].hidden = !selected;
    });

    if (moveFocus) {
      buttons[selectedIndex].focus();
    }
  };

  const isRtl = getComputedStyle(block).direction === 'rtl';

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      activateTab(index);
    });

    button.addEventListener('keydown', (event) => {
      let nextIndex = index;

      switch (event.key) {
        case 'ArrowRight':
          nextIndex = index + (isRtl ? -1 : 1);
          break;
        case 'ArrowLeft':
          nextIndex = index + (isRtl ? 1 : -1);
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = buttons.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();

      const wrappedIndex = (
        nextIndex + buttons.length
      ) % buttons.length;

      activateTab(wrappedIndex, true);
    });
  });

  block.replaceChildren(tablist, panelsContainer);
}
