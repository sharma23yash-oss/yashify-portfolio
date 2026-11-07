/**
 * "Request this" on a service card tells the brief form which package to preselect.
 * A window event keeps the cards and the form independent (no shared React state needed).
 */
export const PACKAGE_EVENT = 'hire:select-package';
export const BRIEF_SECTION_ID = 'brief';
export const PACKAGE_FIELD_ID = 'brief-package';

export function requestPackage(packageId: string) {
  window.dispatchEvent(new CustomEvent<string>(PACKAGE_EVENT, { detail: packageId }));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(BRIEF_SECTION_ID)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  // Focus the package dropdown so keyboard and screen-reader users land where the change happened.
  document.getElementById(PACKAGE_FIELD_ID)?.focus({ preventScroll: true });
  history.replaceState(null, '', `#${BRIEF_SECTION_ID}`);
}
