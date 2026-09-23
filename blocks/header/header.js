import { getMetadata } from '../../scripts/aem.js';
import { getLanguagePath, getLocalePath, loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

const ICONS = {
  search: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  cart: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 4h2.2l2.3 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 8H6.2"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="10" cy="20" r="1.6" fill="currentColor"/>
      <circle cx="17.5" cy="20" r="1.6" fill="currentColor"/>
    </svg>`,
};

// Sportify Hub logo — four-circle mark + wordmark, inlined so it stays crisp
// at any size and doesn't depend on an image being authored in da.live
const LOGO_SVG = `<svg viewBox="0 0 300 72" role="img" aria-label="Sportify Hub" focusable="false">
    <g transform="translate(36 36)">
      <circle cx="-9" cy="-9" r="17" fill="#ff5a3c" opacity="0.92"/>
      <circle cx="9" cy="-9" r="17" fill="#ffb020" opacity="0.92"/>
      <circle cx="9" cy="9" r="17" fill="#0ea5b8" opacity="0.92"/>
      <circle cx="-9" cy="9" r="17" fill="#1e3a8a" opacity="0.92"/>
    </g>
    <g transform="translate(84 0)" font-family="Georgia, 'Times New Roman', serif">
      <text x="0" y="45" font-size="30" font-weight="700" fill="#1c1f26">Sportify<tspan fill="#e8281e" font-style="italic"> Hub</tspan></text>
    </g>
  </svg>`;

function closeOnEscape(e) {
  if (e.code !== 'Escape') return;
  const nav = document.getElementById('nav');
  if (!nav) return;

  const search = nav.querySelector('.nav-search');
  if (search && search.classList.contains('open')) {
    search.classList.remove('open');
    nav.querySelector('.nav-search-toggle').setAttribute('aria-expanded', 'false');
    return;
  }

  const openDrop = nav.querySelector('.nav-drop[aria-expanded="true"]');
  if (openDrop && isDesktop.matches) {
    openDrop.setAttribute('aria-expanded', 'false');
    openDrop.focus();
    return;
  }

  if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
    // eslint-disable-next-line no-use-before-define
    toggleMenu(nav, false);
    nav.querySelector('.nav-hamburger button').focus();
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (nav.contains(e.relatedTarget)) return;
  const openDrop = nav.querySelector('.nav-drop[aria-expanded="true"]');
  if (openDrop && isDesktop.matches) openDrop.setAttribute('aria-expanded', 'false');
}

function toggleAllNavDrops(sections, expanded) {
  sections.querySelectorAll('.nav-drop').forEach((drop) => {
    drop.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the mobile drawer.
 * @param {Element} nav the nav element
 * @param {Boolean} forceExpanded optional force state
 */
function toggleMenu(nav, forceExpanded = null) {
  const sections = nav.querySelector('.nav-sections');
  const expanded = forceExpanded !== null
    ? !forceExpanded
    : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');

  document.body.style.overflowY = expanded || isDesktop.matches ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (sections) toggleAllNavDrops(sections, false);
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');

  if (!expanded || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

function decorateSections(sections) {
  if (!sections) return;
  sections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((li) => {
    if (li.querySelector('ul')) li.classList.add('nav-drop');

    li.addEventListener('click', () => {
      if (!isDesktop.matches || !li.classList.contains('nav-drop')) return;
      const expanded = li.getAttribute('aria-expanded') === 'true';
      toggleAllNavDrops(sections, false);
      li.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });
}

function buildSearch(nav) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-search';
  wrapper.innerHTML = `
    <label class="sr-only" for="nav-search-input">Search</label>
    <input id="nav-search-input" type="search" placeholder="Search entire store here..." />
    <button type="button" class="nav-search-submit" aria-label="Search">
      ${ICONS.search}
    </button>`;

  const input = wrapper.querySelector('input');
  const submit = wrapper.querySelector('.nav-search-submit');

  const runSearch = () => {
    if (!input.value.trim()) return;
    window.location.href = `/search?q=${encodeURIComponent(input.value.trim())}`;
  };

  submit.addEventListener('click', runSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    runSearch();
  });

  nav.querySelector('.nav-tools').prepend(wrapper);
}

function decorateCart(tools) {
  // the authored cart entry is a link whose href contains "cart", or whose
  // text is just a number (the item count) if href doesn't say so explicitly
  let cartLink = tools.querySelector('a[href*="cart" i]');
  if (!cartLink) {
    cartLink = [...tools.querySelectorAll('a')]
      .find((a) => /^\d+$/.test(a.textContent.trim()));
  }
  if (!cartLink) return;
  const count = cartLink.textContent.trim() || '0';
  cartLink.classList.add('nav-cart');
  cartLink.setAttribute('aria-label', `Cart, ${count} items`);
  cartLink.innerHTML = `${ICONS.cart}<span class="nav-cart-count">${count}</span>`;
}

/**
 * Loads and decorates the Luma-style header.
 * @param {Element} block the header block element
 */
export default async function decorate(block) {
  // load the nav fragment (authored in da.live)
  const navMeta = getMetadata('nav');
  const localePath = getLocalePath();
  const navPath = navMeta
    ? new URL(navMeta, window.location).pathname
    : `${localePath}/fragments/header/nav`;
  // eslint-disable-next-line no-console
  console.log('[header] loading fragment', {
    path: navPath,
    url: new URL(`${navPath}.plain.html`, window.location).href,
  });
  let fragment = await loadFragment(navPath);
  if (!fragment && localePath !== getLanguagePath()) {
    const languageNavPath = `${getLanguagePath()}/fragments/header/nav`;
    // eslint-disable-next-line no-console
    console.warn('[header] region fragment unavailable, trying language fragment', {
      path: languageNavPath,
      url: new URL(`${languageNavPath}.plain.html`, window.location).href,
    });
    fragment = await loadFragment(languageNavPath);
  }
  if (!fragment) {
    // eslint-disable-next-line no-console
    console.error('[header] unable to load navigation fragment', { path: navPath });
    return;
  }

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // three authored sections, separated by --- in the nav document
  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const brand = nav.querySelector('.nav-brand');
  const sections = nav.querySelector('.nav-sections');
  let tools = nav.querySelector('.nav-tools');

  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'nav-tools';
    nav.append(tools);
  }

  // brand: use the image authored in da.live if present; otherwise fall
  // back to the built-in Sportify Hub logo so the header never breaks if
  // nothing (or the wrong thing) has been authored yet
  if (brand) {
    const brandAnchor = brand.querySelector('a');
    const authoredMedia = brand.querySelector('picture') || brand.querySelector('img');
    const homeHref = brandAnchor?.getAttribute('href') || '/';

    brand.innerHTML = '';
    const logoLink = document.createElement('a');
    logoLink.href = homeHref;
    logoLink.className = 'nav-logo';
    logoLink.setAttribute('aria-label', 'Sportify Hub');

    if (authoredMedia) {
      const img = authoredMedia.tagName === 'PICTURE' ? authoredMedia.querySelector('img') : authoredMedia;
      if (img) {
        img.removeAttribute('width');
        img.removeAttribute('height');
        if (!img.alt) img.alt = 'Sportify Hub';
      }
      logoLink.append(authoredMedia);
    } else {
      logoLink.innerHTML = LOGO_SVG;
    }

    brand.append(logoLink);
  }

  // unwrap authored links (out of their <p>/.button-container) so each one
  // is a direct flex child of tools — CSS "order" only works on direct
  // flex children, not on nested descendants. A wrapper may contain more
  // than one link, so pull all of them out before removing the wrapper.
  [...tools.children].forEach((child) => {
    if (child.tagName === 'A') return;
    const links = [...child.querySelectorAll('a')];
    if (!links.length) return;
    links.forEach((link) => tools.insertBefore(link, child));
    child.remove();
  });

  decorateSections(sections);
  decorateCart(tools);

  // any plain authored link left in tools (e.g. "Sign In") gets a class for styling
  tools.querySelectorAll('a:not(.nav-cart)').forEach((a) => a.classList.add('nav-signin'));

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));

  // regroup into the Luma single-row layout
  const mainRow = document.createElement('div');
  mainRow.className = 'nav-main';
  mainRow.append(hamburger);
  if (brand) mainRow.append(brand);
  if (sections) mainRow.append(sections);
  mainRow.append(tools);

  nav.textContent = '';
  nav.append(mainRow);

  buildSearch(nav);

  nav.setAttribute('aria-expanded', 'false');
  toggleMenu(nav, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  // sticky shadow once scrolled
  const onScroll = () => {
    block.closest('header')?.classList.toggle('is-scrolled', window.scrollY > 10);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}