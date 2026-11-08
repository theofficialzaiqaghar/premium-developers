(function () {
  const PAGE_SIZE = 6;
  const SEARCH_DEBOUNCE_MS = 120;

  const search = document.getElementById('blog-search');
  const grid = document.getElementById('blog-grid');
  const featured = document.getElementById('blog-featured');
  const fallbackNote = document.getElementById('blog-static-fallback-note');
  const pagination = document.getElementById('blog-pagination');
  const filtersEl = document.getElementById('blog-filters');
  const statusEl = document.getElementById('blog-status');
  if (!grid) return;

  const mode = document.body.getAttribute('data-blog-archive');
  const isStatic = mode === 'static' || mode === 'server';

  let currentPage = 1;
  let activeCategory = '';
  let searchDebounce = 0;
  let emptyEl = document.getElementById('blog-search-empty');
  let clearBtn = document.getElementById('blog-search-clear');

  function cards() {
    return [...grid.querySelectorAll('.blog-card')];
  }

  function normalizeQuery(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function cardHaystack(card) {
    const cached = card.getAttribute('data-search');
    if (cached) return cached;
    const title = card.getAttribute('data-title') || '';
    const slug = (card.getAttribute('data-slug') || '').replace(/-/g, ' ');
    const cats = [...card.querySelectorAll('.blog-card__cat')]
      .map((el) => el.textContent.trim().toLowerCase())
      .join(' ');
    const h3 = card.querySelector('h3')?.textContent?.trim().toLowerCase() || '';
    const excerpt = card.querySelector('.blog-card__body p')?.textContent?.trim().toLowerCase() || '';
    const haystack = `${title} ${slug} ${h3} ${excerpt} ${cats}`.replace(/\s+/g, ' ').trim();
    card.setAttribute('data-search', haystack);
    return haystack;
  }

  function featuredHaystack() {
    const link = featured?.querySelector('.blog-featured__card');
    if (!link) return '';
    const cached = link.getAttribute('data-search');
    if (cached) return cached;
    const haystack = link.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    link.setAttribute('data-search', haystack);
    return haystack;
  }

  function queryTokens(q) {
    if (!q) return [];
    return q.split(' ').filter(Boolean);
  }

  function textMatchesHaystack(haystack, q) {
    if (!q) return true;
    const tokens = queryTokens(q);
    return tokens.every((token) => haystack.includes(token));
  }

  function cardMatchesQuery(card, q) {
    return textMatchesHaystack(cardHaystack(card), q);
  }

  function cardMatchesCategory(card) {
    if (!activeCategory) return true;
    const cats = [...card.querySelectorAll('.blog-card__cat')].map((el) =>
      el.textContent.trim().toLowerCase()
    );
    return cats.includes(activeCategory);
  }

  function hasActiveFilter() {
    const q = normalizeQuery(search?.value);
    return Boolean(q || activeCategory);
  }

  function ensureEmptyState() {
    if (emptyEl) return emptyEl;
    emptyEl = document.createElement('div');
    emptyEl.id = 'blog-search-empty';
    emptyEl.className = 'blog-empty blog-search-empty';
    emptyEl.hidden = true;
    emptyEl.setAttribute('role', 'status');
    grid.insertAdjacentElement('afterend', emptyEl);
    return emptyEl;
  }

  function ensureClearButton() {
    if (!search || clearBtn) return;
    const wrap = search.closest('.blog-search');
    if (!wrap) return;
    clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.id = 'blog-search-clear';
    clearBtn.className = 'blog-search__clear';
    clearBtn.setAttribute('aria-label', 'Clear search');
    clearBtn.hidden = true;
    clearBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    wrap.appendChild(clearBtn);
    clearBtn.addEventListener('click', () => {
      search.value = '';
      search.focus();
      syncUrl('');
      updateClearButton();
      applyFilters();
    });
  }

  function updateClearButton() {
    if (!clearBtn || !search) return;
    clearBtn.hidden = !normalizeQuery(search.value);
  }

  function updateStatus(visible, total, q) {
    if (!statusEl) return;
    if (!hasActiveFilter()) {
      statusEl.textContent = '';
      statusEl.hidden = true;
      return;
    }
    const parts = [];
    if (q) parts.push(`matching “${search.value.trim()}”`);
    if (activeCategory) parts.push(`in “${activeCategory}”`);
    const filterText = parts.length ? ` ${parts.join(' ')}` : '';
    if (visible === 0) {
      statusEl.textContent = `No articles found${filterText}. Try different keywords or choose All.`;
    } else {
      statusEl.textContent = `Showing ${visible} of ${total} article${total === 1 ? '' : 's'}${filterText}.`;
    }
    statusEl.hidden = false;
    statusEl.classList.remove('visually-hidden');
  }

  function syncUrl(q) {
    if (!window.history?.replaceState) return;
    const url = new URL(window.location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
  }

  function buildCategoryFilters() {
    if (!filtersEl || filtersEl.dataset.built === 'true') return;
    const counts = new Map();
    for (const card of cards()) {
      for (const chip of card.querySelectorAll('.blog-card__cat')) {
        const key = chip.textContent.trim().toLowerCase();
        if (key) counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    const entries = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (!entries.length) {
      filtersEl.hidden = true;
      return;
    }
    const label = (cat) => cat.replace(/\b\w/g, (c) => c.toUpperCase());
    filtersEl.innerHTML = [
      '<button type="button" class="blog-filter-btn is-active" data-category="">All topics</button>',
      ...entries.map(
        ([cat, count]) =>
          `<button type="button" class="blog-filter-btn" data-category="${cat.replace(/"/g, '&quot;')}">${label(cat)} <span class="blog-filter-btn__count">${count}</span></button>`
      )
    ].join('');
    filtersEl.dataset.built = 'true';
    filtersEl.addEventListener('click', (event) => {
      const btn = event.target.closest('.blog-filter-btn');
      if (!btn) return;
      activeCategory = btn.getAttribute('data-category') || '';
      filtersEl.querySelectorAll('.blog-filter-btn').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
      });
      currentPage = 1;
      applyFilters();
    });
  }

  function visibleCards() {
    return cards().filter((c) => c.dataset.filtered === '1');
  }

  function applyPagination() {
    if (!isStatic || !pagination) return;
    const list = visibleCards();
    const size = Number(pagination.getAttribute('data-page-size')) || PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(list.length / size));
    if (currentPage > totalPages) currentPage = totalPages;

    for (const card of cards()) {
      if (card.dataset.filtered !== '1') {
        card.hidden = true;
        continue;
      }
    }

    list.forEach((card, index) => {
      const page = Math.floor(index / size) + 1;
      card.hidden = page !== currentPage;
    });

    if (totalPages <= 1 || list.length === 0) {
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

  function applyFilters() {
    const q = normalizeQuery(search?.value);
    updateClearButton();

    let visible = 0;
    const all = cards();
    for (const card of all) {
      const match = cardMatchesQuery(card, q) && cardMatchesCategory(card);
      card.dataset.filtered = match ? '1' : '0';
      if (!match) card.hidden = true;
      if (match) visible += 1;
    }

    if (featured) {
      const haystack = featuredHaystack();
      let showFeatured = true;
      if (q) showFeatured = textMatchesHaystack(haystack, q);
      if (activeCategory) showFeatured = false;
      featured.hidden = !showFeatured;
    }

    const empty = ensureEmptyState();
    const filtering = hasActiveFilter();
    if (filtering && visible === 0) {
      empty.hidden = false;
      empty.innerHTML =
        '<h2>No articles found</h2><p>Try another keyword, remove filters, or browse all topics below.</p>';
      grid.setAttribute('aria-hidden', 'true');
    } else {
      empty.hidden = true;
      grid.removeAttribute('aria-hidden');
    }

    grid.classList.toggle('blog-grid--filtering', filtering);

    updateStatus(visible, all.length, q);
    syncUrl(q);

    if (isStatic) {
      currentPage = 1;
      applyPagination();
    }
  }

  function scheduleFilter() {
    window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(applyFilters, SEARCH_DEBOUNCE_MS);
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
      buildCategoryFilters();
      ensureClearButton();
      const params = new URLSearchParams(window.location.search);
      const initialQ = params.get('q');
      if (search && initialQ) {
        search.value = initialQ;
        updateClearButton();
      }
      applyFilters();
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
    search?.addEventListener('input', scheduleFilter);
    search?.addEventListener('search', () => {
      window.clearTimeout(searchDebounce);
      applyFilters();
    });
    search?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        search.value = '';
        syncUrl('');
        updateClearButton();
        applyFilters();
      }
    });
  });
})();
