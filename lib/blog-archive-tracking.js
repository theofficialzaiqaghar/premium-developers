const {
  gtmHead,
  gtmBody,
  trackingScriptsAfterAnalytics
} = require('./tracking-snippets');

/** Keep blog archive aligned with site-wide consent + tracking (P0). */
function ensureBlogArchiveTracking(html) {
  const headBlock = `${gtmHead().trim()}\n`;

  if (!html.includes('consent-default.js')) {
    const bareGtm =
      /(<head>\s*\n)\s*<!-- Google Tag Manager -->[\s\S]*?<!-- End Google AdSense -->\s*\n/;
    if (bareGtm.test(html)) {
      html = html.replace(bareGtm, `$1${headBlock}`);
    } else {
      html = html.replace(/(<head>\s*\n)/, `$1${headBlock}`);
    }
  } else if (!html.includes('<!-- Consent Mode (must load before Google Tag Manager) -->')) {
    const replaceGtm =
      /(<head>\s*\n)(?:\s*<link rel="preconnect" href="https:\/\/www\.googletagmanager\.com">\s*\n)?[\s\S]*?<!-- End Google AdSense -->\s*\n/;
    if (replaceGtm.test(html)) {
      html = html.replace(replaceGtm, `$1${headBlock}`);
    }
  }

  if (!html.includes('cookie-consent.css')) {
    html = html.replace(
      /(<link rel="stylesheet" href="\/whatsapp-button\.css">)/,
      `$1\n  <link rel="stylesheet" href="/cookie-consent.css">`
    );
  }

  if (!html.includes('<!-- Google Tag Manager (noscript) -->')) {
    html = html.replace(
      /<body([^>]*)>\s*\n\s*<noscript><iframe src="https:\/\/www\.googletagmanager\.com\/ns\.html\?id=GTM-WF285DKZ"[\s\S]*?<\/noscript>\s*\n/,
      `<body$1>\n${gtmBody().trim()}\n`
    );
  }

  if (!html.includes('data-pd-open-cookie-settings')) {
  const termsRe =
    /(<a href="\/terms-and-conditions\.html">Terms(?:\s*&amp;| and )?Conditions<\/a>|<a href="\/terms-and-conditions\.html">Terms<\/a>)/;
    if (termsRe.test(html)) {
      html = html.replace(
        termsRe,
        `$1\n        <a href="#" data-pd-open-cookie-settings>Cookie settings</a>`
      );
    }
  }

  if (!html.includes('cookie-consent.js')) {
    html = html.replace(
      /(<script src="\/analytics\.js"><\/script>)\s*/,
      `$1\n${trackingScriptsAfterAnalytics().trim()}\n`
    );
  }

  return html;
}

module.exports = { ensureBlogArchiveTracking };
