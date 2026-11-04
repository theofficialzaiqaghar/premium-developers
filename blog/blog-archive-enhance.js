(function () {
  const search = document.getElementById('blog-search');
  const grid = document.getElementById('blog-grid');
  const featured = document.getElementById('blog-featured');
  if (!search || !grid) return;

  function cards() {
    return [...grid.querySelectorAll('.blog-card')];
  }

  function filterCards() {
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

  search.addEventListener('input', filterCards);
})();
