/**
 * Canonical social URLs for SEO (sameAs) and site chrome.
 */
const FOUNDER_LINKEDIN = 'https://www.linkedin.com/in/saadullahkhan-premiumdevelopers/';
const COMPANY_LINKEDIN = 'https://www.linkedin.com/company/premium-developers-co/';
const FACEBOOK = 'https://www.facebook.com/p/Muhammad-Saad-Ullah-Khan-61595269371970/';
const CONTRA = 'https://contra.com/muhammadsaadullahkhan/about';
const UPWORK = 'https://www.upwork.com/freelancers/~0181e957ec9a52d41b';
const INSTAGRAM = 'https://www.instagram.com/premiumdevelopers_official';

const ORGANIZATION_SAME_AS = [
  COMPANY_LINKEDIN,
  INSTAGRAM,
  CONTRA,
  UPWORK,
  FACEBOOK,
  FOUNDER_LINKEDIN
];

const FOUNDER_SAME_AS = [FOUNDER_LINKEDIN, FACEBOOK, CONTRA, UPWORK];

const FOUNDER_PERSON_ID = 'https://www.premiumdevelopers.co/#founder';

function siteChromeSocialLinksHtml({ isHome = false } = {}) {
  const portfolioHref = isHome ? '#work' : '/#work';
  return `          <a href="${COMPANY_LINKEDIN}" target="_blank" rel="noopener noreferrer" aria-label="Premium Developers on LinkedIn">
            <svg class="ico"><use href="#i-linkedin" /></svg>
          </a>
          <a href="${INSTAGRAM}" target="_blank" rel="noopener noreferrer" aria-label="Premium Developers on Instagram">
            <svg class="ico"><use href="#i-instagram" /></svg>
          </a>
          <a href="${FOUNDER_LINKEDIN}" target="_blank" rel="noopener noreferrer" aria-label="Muhammad Saad Ullah Khan on LinkedIn">
            <svg class="ico"><use href="#i-user" /></svg>
          </a>
          <a href="${FACEBOOK}" target="_blank" rel="noopener noreferrer" aria-label="Muhammad Saad Ullah Khan on Facebook">
            <svg class="ico"><use href="#i-facebook" /></svg>
          </a>
          <a href="${CONTRA}" target="_blank" rel="noopener noreferrer" aria-label="Services and work on Contra">
            <svg class="ico"><use href="#i-globe" /></svg>
          </a>
          <a href="${UPWORK}" target="_blank" rel="noopener noreferrer" aria-label="Hire on Upwork">
            <svg class="ico"><use href="#i-share" /></svg>
          </a>
          <a href="${portfolioHref}" aria-label="Portfolio">
            <svg class="ico"><use href="#i-layout" /></svg>
          </a>`;
}

module.exports = {
  FOUNDER_LINKEDIN,
  COMPANY_LINKEDIN,
  FACEBOOK,
  CONTRA,
  UPWORK,
  INSTAGRAM,
  ORGANIZATION_SAME_AS,
  FOUNDER_SAME_AS,
  FOUNDER_PERSON_ID,
  siteChromeSocialLinksHtml
};
