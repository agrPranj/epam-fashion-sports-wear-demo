import { getMetadata } from '../../scripts/aem.js';
import { getLocalePath, loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta
    ? new URL(footerMeta, window.location).pathname
    : `${getLocalePath()}/fragments/footer/footer`;
  // eslint-disable-next-line no-console
  console.log('[footer] loading fragment', {
    path: footerPath,
    url: new URL(`${footerPath}.plain.html`, window.location).href,
  });
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);
}
