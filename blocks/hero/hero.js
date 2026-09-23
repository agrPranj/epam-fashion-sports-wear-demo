/**
 * Decorates a structurally authored Hero (Split).
 *
 * Author a single-column table with this header:
 * Hero (Split)
 *
 * Follow it with exactly five content rows:
 * 1. Eyebrow text     — optional
 * 2. Heading text     — required
 * 3. Description text — optional
 * 4. Inserted image   — required
 * 5. Primary CTA link — optional
 *
 * Keep empty optional rows. Do not reorder the rows.
 * The block header is not included in block.children.
 *
 * @param {HTMLElement} block The hero block element
 */
export default function decorate(block) {
  if (!block.classList.contains('split')) return;

  const rows = [...block.children];

  // Validate the authoring structure before changing any content.
  const hasValidStructure = rows.length === 5
    && rows.every((row) => row.children.length === 1);

  if (!hasValidStructure) {
    // eslint-disable-next-line no-console
    console.warn(
      'Hero (Split): expected exactly five content rows, each with one cell.',
      block,
    );
    return;
  }

  const [
    eyebrowCell,
    headingCell,
    descriptionCell,
    imageCell,
    primaryCell,
  ] = rows.map((row) => row.firstElementChild);

  const eyebrowText = eyebrowCell.textContent.trim();
  const headingText = headingCell.textContent.trim();
  const descriptionText = descriptionCell.textContent.trim();
  const image = imageCell.querySelector('img');

  if (!headingText || !image) {
    // eslint-disable-next-line no-console
    console.warn(
      'Hero (Split): row 2 requires heading text and row 4 requires an inserted image.',
      block,
    );
    return;
  }

  // A non-empty CTA cell must contain one link with visible text.
  const links = primaryCell.querySelectorAll('a[href]');
  const hasCtaContent = primaryCell.textContent.trim().length > 0
    || links.length > 0;

  if (hasCtaContent && (links.length !== 1 || !links[0].textContent.trim())) {
    // eslint-disable-next-line no-console
    console.warn(
      'Hero (Split): row 5 must be empty or contain one text hyperlink.',
      block,
    );
    return;
  }

  const layout = document.createElement('div');
  layout.className = 'hero-layout';

  const content = document.createElement('div');
  content.className = 'hero-content';

  const media = document.createElement('div');
  media.className = 'hero-media';

  if (eyebrowText) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'hero-eyebrow';
    eyebrow.textContent = eyebrowText;
    content.append(eyebrow);
  }

  // This block is intended to be the page's main hero.
  const heading = document.createElement('h1');
  heading.textContent = headingText;
  content.append(heading);

  if (descriptionText) {
    const description = document.createElement('p');
    description.className = 'hero-description';
    description.textContent = descriptionText;
    content.append(description);
  }

  const authoredLink = links[0];

  if (authoredLink) {
    // Preserve the authored URL and other link attributes.
    const button = authoredLink.cloneNode(true);
    button.className = 'button primary';
    button.textContent = authoredLink.textContent.trim();

    const wrapper = document.createElement('p');
    wrapper.className = 'button-wrapper';
    wrapper.append(button);

    content.append(wrapper);
  }

  // Preserve responsive picture sources and the image's alt text.
  const picture = image.closest('picture');
  media.append(picture || image);

  layout.append(content, media);
  block.replaceChildren(layout);

  const section = block.closest('.section');
  section?.classList.add('velocity-hero-section');

  // Prioritize the image only for a hero in the first section.
  const main = block.closest('main');
  const firstSection = main?.querySelector('.section');

  if (section && section === firstSection) {
    image.loading = 'eager';
    image.setAttribute('fetchpriority', 'high');
  }
}
