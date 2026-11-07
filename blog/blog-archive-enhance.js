(function () {
  const SITE_ORIGIN = window.PD_BLOG_CONFIG?.siteOrigin || 'https://www.premiumdevelopers.co';
  const DEFAULT_OG = `${SITE_ORIGIN}/assets/images/og/premium-developers-og.jpg`;
  const PAGE_SIZE = 6;

  const search = document.getElementById('blog-search');
  const grid = document.getElementById('blog-grid');
  const featured = document.getElementById('blog-featured');
  const fallbackNote = document.getElementById('blog-static-fallback-note');
  const pagination = document.getElementById('blog-pagination');
  if (!grid) return;

  const mode = document.body.getAttribute('data-blog-archive');
  const isStatic = mode === 'static' || mode === 'server';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
      card.dataset.filtered = match ? '1' : '0';
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
    if (isStatic) {
      currentPage = 1;
      applyPagination();
    }
  }

  let currentPage = 1;

  function visibleCards() {
    return cards().filter((c) => c.dataset.filtered !== '0');
  }

  function applyPagination() {
    if (!isStatic || !pagination) return;
    const list = visibleCards();
    const size = Number(pagination.getAttribute('data-page-size')) || PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(list.length / size));

    if (currentPage > totalPages) currentPage = totalPages;

    list.forEach((card, index) => {
      const page = Math.floor(index / size) + 1;
      card.hidden = page !== currentPage;
    });

    if (totalPages <= 1) {
      pagination.innerHTML = '';
      pagination.hidden = true;
      return;
    }

    pagination.hidden = false;
    let html = '';
    if (currentPage > 1) {
      html += `<button type="button" class="blog-pagination__btn" data-page="${currentPage - 1}">Previous</button>`;
    }
    html += '<span class="blog-pagination__pages">';
    for (let p = 1; p <= totalPages; p += 1) {
      const active = p === currentPage ? ' is-active' : '';
      html += `<button type="button" class="blog-pagination__num${active}" data-page="${p}" aria-current="${p === currentPage ? 'page' : 'false'}">${p}</button>`;
    }
    html += '</span>';
    if (currentPage < totalPages) {
      html += `<button type="button" class="blog-pagination__btn" data-page="${currentPage + 1}">Next</button>`;
    }
    pagination.innerHTML = html;
  }

  pagination?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-page]');
    if (!btn) return;
    currentPage = Number(btn.getAttribute('data-page')) || 1;
    applyPagination();
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  async function hydrateIfEmpty() {
    if (isStatic) {
      if (fallbackNote) fallbackNote.hidden = true;
      cards().forEach((c) => {
        c.dataset.filtered = '1';
      });
      applyPagination();
      return;
    }
    if (mode !== 'client') {
      if (fallbackNote) fallbackNote.hidden = true;
      return;
    }

    const hasCards = grid.querySelector('.blog-card');
    const hasEmpty = grid.querySelector('.blog-empty');
    if (hasCards || hasEmpty) {
      if (fallbackNote) fallbackNote.hidden = true;
      return;
    }

    grid.setAttribute('aria-busy', 'true');
    let status = 0;
    try {
      const res = await fetch('/api/blog/public/articles?limit=100', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
      });
      status = res.status;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) {
        grid.innerHTML =
          '<div class="blog-empty"><h2>No published articles yet</h2><p>Check back soon for WordPress, WooCommerce, Elementor, and web development insights from Premium Developers.</p></div>';
      }
    } catch {
      grid.innerHTML =
        status === 404
          ? '<div class="blog-empty"><h2>Articles could not be loaded</h2><p>This site uses a static blog. Redeploy the latest build or open <a href="/blog/">/blog/</a> on the live domain.</p></div>'
          : '<div class="blog-empty"><h2>Could not load articles</h2><p>Open <a href="/blog/">/blog/</a> on your live site.</p></div>';
    } finally {
      grid.removeAttribute('aria-busy');
      if (fallbackNote) fallbackNote.hidden = true;
    }
  }

  hydrateIfEmpty().finally(() => {
    search?.addEventListener('input', filterCards);
  });
})();
