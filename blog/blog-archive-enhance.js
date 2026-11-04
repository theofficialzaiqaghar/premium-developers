(function () {
  const SITE_ORIGIN = window.PD_BLOG_CONFIG?.siteOrigin || 'https://www.premiumdevelopers.co';
  const DEFAULT_OG = `${SITE_ORIGIN}/assets/images/og/premium-developers-og.jpg`;

  const search = document.getElementById('blog-search');
  const grid = document.getElementById('blog-grid');
  const featured = document.getElementById('blog-featured');
  const fallbackNote = document.getElementById('blog-static-fallback-note');
  if (!grid) return;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function resolveFeaturedImageSrc(article) {
    const url = String(article?.featuredImage?.url || '').trim();
    if (!url) return DEFAULT_OG;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${SITE_ORIGIN}${url}`;
    return `${SITE_ORIGIN}/${url.replace(/^\.\//, '')}`;
  }

  function featuredAlt(article) {
    const alt = article?.featuredImage?.alt;
    if (alt) return alt;
    return article?.title ? `${article.title} — Premium Developers` : 'Premium Developers blog article';
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(new Date(iso));
    } catch {
      return '';
    }
  }

  function categoryTags(slugs) {
    if (!slugs?.length) return '';
    const chips = slugs
      .slice(0, 2)
      .map((s) => `<span class="blog-card__cat">${escapeHtml(s.replace(/-/g, ' '))}</span>`)
      .join('');
    return `<div class="blog-card__cats">${chips}</div>`;
  }

  function articleUrl(slug) {
    return `${SITE_ORIGIN}/blog/${encodeURIComponent(slug)}/`;
  }

  function renderArchiveCard(article) {
    const url = articleUrl(article.slug);
    const imgSrc = resolveFeaturedImageSrc(article);
    const title = escapeHtml(article.title);
    const excerpt = escapeHtml(article.excerpt || '');
    const author = escapeHtml(article.author || 'Premium Developers');
    const date = escapeHtml(formatDate(article.publishedAt));
    const slugAttr = escapeHtml(article.slug || '');
    const titleAttr = escapeHtml((article.title || '').toLowerCase());
    return `<a class="blog-card" href="${url}" data-title="${titleAttr}" data-slug="${slugAttr}">
      <figure class="blog-card__thumb"><img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(featuredAlt(article))}" loading="lazy" decoding="async"></figure>
      <div class="blog-card__body">
        ${categoryTags(article.categorySlugs)}
        <h3>${title}</h3>
        <p>${excerpt}</p>
        <div class="blog-meta"><span>${author}</span><span>${date}</span></div>
      </div>
    </a>`;
  }

  function renderFeaturedCard(article) {
    const url = articleUrl(article.slug);
    const imgSrc = resolveFeaturedImageSrc(article);
    return `<a class="blog-featured__card" href="${url}">
      <figure class="blog-featured__media"><img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(featuredAlt(article))}" loading="eager" fetchpriority="high" decoding="async"></figure>
      <div class="blog-featured__body">
        <span class="blog-badge">Featured article</span>
        <h2>${escapeHtml(article.title)}</h2>
        <p>${escapeHtml(article.excerpt || '')}</p>
        <div class="blog-meta"><span>${escapeHtml(article.author || 'Premium Developers')}</span><span>${escapeHtml(formatDate(article.publishedAt))}</span></div>
      </div>
    </a>`;
  }

  function renderArchive(items) {
    if (!items.length) {
      grid.innerHTML =
        '<div class="blog-empty"><h2>No published articles yet</h2><p>Check back soon for WordPress, WooCommerce, Elementor, and web development insights from Premium Developers.</p></div>';
      if (featured) featured.hidden = true;
      return;
    }

    const [first, ...rest] = items;
    if (featured) {
      featured.hidden = false;
      featured.innerHTML = renderFeaturedCard(first);
    }
    grid.innerHTML = rest.map(renderArchiveCard).join('');
    if (fallbackNote) fallbackNote.hidden = true;
  }

  function cards() {
    return [...grid.querySelectorAll('.blog-card')];
  }

  function filterCards() {
    if (!search) return;
    const q = search.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards()) {
      const title = card.getAttribute('data-title') || card.textContent.toLowerCase();
      const slug = card.getAttribute('data-slug') || '';
      const match = !q || title.includes(q) || slug.includes(q);
      card.hidden = !match;
      if (match) visible += 1;
    }
    if (featured) {
      const link = featured.querySelector('.blog-featured__card');
      if (link) {
        const t = (link.textContent || '').toLowerCase();
        featured.hidden = q ? !t.includes(q) : false;
      }
    }
    grid.dataset.empty = visible === 0 && q ? 'true' : 'false';
  }

  async function hydrateIfEmpty() {
    const hasCards = grid.querySelector('.blog-card');
    const hasEmpty = grid.querySelector('.blog-empty');
    if (hasCards || hasEmpty) return;

    grid.setAttribute('aria-busy', 'true');
    try {
      const res = await fetch('/api/blog/public/articles?limit=100', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderArchive(Array.isArray(data.items) ? data.items : []);
    } catch {
      grid.innerHTML =
        '<div class="blog-empty"><h2>Unable to load articles</h2><p>Please refresh the page. If you are previewing locally, run <code>vercel dev</code> with Upstash Redis configured, or open <a href="/blog/">/blog/</a> on your deployed site.</p></div>';
    } finally {
      grid.removeAttribute('aria-busy');
    }
  }

  hydrateIfEmpty().finally(() => {
    search?.addEventListener('input', filterCards);
  });
})();
