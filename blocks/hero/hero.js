/**
 * Decorates an explicitly authored Hero (Split).
 *
 * Expected rows:
 * Eyebrow | Text
 * Heading | Text
 * Description | Text
 * Image | Inserted image
 * Primary CTA | Authored hyperlink
 * Secondary CTA | Authored hyperlink
 *
 * @param {HTMLElement} block The hero block
 */
export default function decorate(block) {
  if (!block.classList.contains('split')) return;

  // Read the authored field labels and their value cells.
  const fields = new Map();

  [...block.children].forEach((row) => {
    const [label, value] = row.children;
    if (!label || !value) return;

    const key = label.textContent.trim().toLowerCase();
    fields.set(key, value);
  });

  const headingText = fields.get('heading')?.textContent.trim();
  const imageCell = fields.get('image');
  const image = imageCell?.querySelector('img');

  // Leave the authored content intact if required fields are missing.
  if (!headingText || !image) {
    // eslint-disable-next-line no-console
    console.warn('Hero (Split) requires a Heading and an inserted Image.');
    return;
  }

  const layout = document.createElement('div');
  layout.className = 'hero-layout';

  const content = document.createElement('div');
  content.className = 'hero-content';

  const media = document.createElement('div');
  media.className = 'hero-media';

  // The eyebrow is optional.
  const eyebrowText = fields.get('eyebrow')?.textContent.trim();

  if (eyebrowText) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'hero-eyebrow';
    eyebrow.textContent = eyebrowText;
    content.append(eyebrow);
  }

  // This implementation is for the homepage's main hero.
  const heading = document.createElement('h1');
  heading.textContent = headingText;
  content.append(heading);

  const descriptionText = fields.get('description')?.textContent.trim();

  if (descriptionText) {
    const description = document.createElement('p');
    description.className = 'hero-description';
    description.textContent = descriptionText;
    content.append(description);
  }

  // Style the authored links as buttons without requiring bold/italic.
  [
    ['primary cta', 'primary'],
    ['secondary cta', 'secondary'],
  ].forEach(([field, style]) => {
    const link = fields.get(field)?.querySelector('a[href]');
    if (!link) return;

    const button = link.cloneNode(true);
    button.className = `button ${style}`;

    const wrapper = document.createElement('p');
    wrapper.className = 'button-wrapper';
    wrapper.append(button);

    content.append(wrapper);
  });

  // Preserve any responsive picture sources and the image's alt text.
  const picture = image.closest('picture');
  media.append(picture || image);

  layout.append(content, media);
  block.replaceChildren(layout);

  const section = block.closest('.section');
  section?.classList.add('velocity-hero-section');

  const main = block.closest('main');
  const firstSection = main?.querySelector('.section');

  if (section && section === firstSection) {
    image.loading = 'eager';
    image.setAttribute('fetchpriority', 'high');
  }
}
