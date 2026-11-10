const GTM_ID = 'GTM-WF285DKZ';
const ADSENSE_CLIENT = 'ca-pub-7106840681244658';

function adsenseHead() {
  return `  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}"
     crossorigin="anonymous"></script>
  <!-- End Google AdSense -->`;
}

function gtmHead() {
  return `  <link rel="preconnect" href="https://www.googletagmanager.com">
  <!-- Consent Mode (must load before Google Tag Manager) -->
  <script src="/consent-default.js"></script>
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
  <!-- End Google Tag Manager -->
${adsenseHead()}`;
}

function gtmBody() {
  return `  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->`;
}

function trackingStylesLink() {
  return '  <link rel="stylesheet" href="/cookie-consent.css">';
}

function trackingScriptsAfterAnalytics() {
  return '  <script src="/cookie-consent.js" defer></script>';
}

module.exports = {
  GTM_ID,
  ADSENSE_CLIENT,
  adsenseHead,
  gtmHead,
  gtmBody,
  trackingStylesLink,
  trackingScriptsAfterAnalytics
};
