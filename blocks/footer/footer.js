import { getMetadata } from '../../scripts/aem.js';
import { getLanguagePath, getLocalePath, loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const localePath = getLocalePath();
  const footerPath = footerMeta
    ? new URL(footerMeta, window.location).pathname
    : `${localePath}/fragments/footer/footer`;
  // eslint-disable-next-line no-console
  console.log('[footer] loading fragment', {
    path: footerPath,
    url: new URL(`${footerPath}.plain.html`, window.location).href,
  });
  let fragment = await loadFragment(footerPath);
  if (!fragment && localePath !== getLanguagePath()) {
    const languageFooterPath = `${getLanguagePath()}/fragments/footer/footer`;
    // eslint-disable-next-line no-console
    console.warn('[footer] region fragment unavailable, trying language fragment', {
      path: languageFooterPath,
      url: new URL(`${languageFooterPath}.plain.html`, window.location).href,
    });
    fragment = await loadFragment(languageFooterPath);
  }
  if (!fragment) {
    // eslint-disable-next-line no-console
    console.error('[footer] unable to load footer fragment', { path: footerPath });
    return;
  }

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);
}
