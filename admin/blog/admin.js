(function () {
  const CSRF_HEADER = 'x-pd-blog-csrf';
  const STATUSES = [
    'researching',
    'generated',
    'draft',
    'in_review',
    'approved',
    'scheduled',
    'published',
    'rejected',
    'failed'
  ];
  const EDITABLE_STATUSES = STATUSES.filter((s) => s !== 'published');

  let csrfToken = '';
  let sessionExpiresAt = null;
  let quill = null;
  let articlesPage = { offset: 0, limit: 15, total: 0 };
  let slugCheckTimer = null;

  const $ = (id) => document.getElementById(id);

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.json) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.csrf && csrfToken) {
      headers[CSRF_HEADER] = csrfToken;
    }
    const res = await fetch(path, {
      method: options.method || 'GET',
      credentials: 'include',
      headers,
      body: options.json ? JSON.stringify(options.json) : options.body
    });
    if (res.status === 401) {
      forceLogin('Your session expired. Please sign in again.');
      throw new Error('Unauthorized');
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.error || 'Request failed');
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    }
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res;
  }

  function forceLogin(message) {
    csrfToken = '';
    $('app-shell').hidden = true;
    $('login-view').hidden = false;
    if (message) {
      const el = $('login-error');
      el.hidden = false;
      el.textContent = message;
    }
  }

  async function refreshSession() {
    const data = await api('/api/blog/session');
    if (!data.authenticated) {
      forceLogin();
      return false;
    }
    csrfToken = data.csrfToken || csrfToken;
    sessionExpiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    updateSessionLabel();
    return true;
  }

  function updateSessionLabel() {
    const el = $('session-expiry');
    if (!el || !sessionExpiresAt) {
      if (el) el.textContent = '';
      return;
    }
    el.textContent = `Session expires ${sessionExpiresAt.toLocaleString('en-GB')}`;
  }

  function showView(name) {
    document.querySelectorAll('.admin-view').forEach((v) => {
      v.hidden = true;
    });
    document.querySelectorAll('.admin-nav__btn').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.view === name);
    });
    const map = {
      dashboard: 'view-dashboard',
      articles: 'view-articles',
      editor: 'view-editor',
      taxonomy: 'view-taxonomy',
      backup: 'view-backup'
    };
    const section = $(map[name]);
    if (section) section.hidden = false;
  }

  function initQuill() {
    if (quill || !window.Quill) return;
    quill = new Quill('#quill-editor', {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [2, 3, 4, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'link', 'image'],
          ['clean']
        ]
      }
    });
    quill.on('text-change', updateTocPreview);
  }

  function updateTocPreview() {
    const html = quill ? quill.root.innerHTML : '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const headings = temp.querySelectorAll('h2, h3');
    const toc = $('toc-preview');
    const list = $('toc-list');
    if (!headings.length) {
      toc.hidden = true;
      return;
    }
    toc.hidden = false;
    list.innerHTML = [...headings]
      .map((h) => `<li style="${h.tagName === 'H3' ? 'margin-left:12px' : ''}">${h.textContent}</li>`)
      .join('');
  }

  function fillStatusSelect(select, includePublished) {
    select.innerHTML = '';
    const list = includePublished ? STATUSES : EDITABLE_STATUSES.concat(['published']);
    const unique = [...new Set(list)];
    unique.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s.replace(/_/g, ' ');
      select.appendChild(opt);
    });
  }

  async function loadStats() {
    const data = await api('/api/blog/stats');
    const grid = $('stats-grid');
    grid.innerHTML = Object.entries(data.byStatus)
      .map(
        ([status, count]) =>
          `<div class="admin-stat"><span class="admin-muted">${status.replace(/_/g, ' ')}</span><strong>${count}</strong></div>`
      )
      .join('');
  }

  async function loadArticles() {
    const search = $('articles-search').value.trim();
    const status = $('articles-status-filter').value;
    const params = new URLSearchParams({
      limit: String(articlesPage.limit),
      offset: String(articlesPage.offset),
      search,
      status
    });
    const data = await api(`/api/blog/articles?${params}`);
    articlesPage.total = data.total ?? data.items.length;
    const wrap = $('articles-table-wrap');
    if (!data.items.length) {
      wrap.innerHTML = '<p class="admin-muted" style="padding:16px">No articles found.</p>';
    } else {
      wrap.innerHTML = `<table class="admin-table"><thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>
        ${data.items
          .map(
            (a) => `<tr>
            <td>${escapeHtml(a.title)}</td>
            <td><code>${escapeHtml(a.slug)}</code></td>
            <td>${escapeHtml(a.status)}</td>
            <td>${escapeHtml(formatDate(a.updatedAt))}</td>
            <td><button type="button" class="btn btn--ghost" data-edit-id="${a.id}">Edit</button></td>
          </tr>`
          )
          .join('')}
      </tbody></table>`;
      wrap.querySelectorAll('[data-edit-id]').forEach((btn) => {
        btn.addEventListener('click', () => openEditor(btn.dataset.editId));
      });
    }
    $('articles-page-info').textContent = `Showing ${articlesPage.offset + 1}–${articlesPage.offset + data.items.length}`;
  }

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }

  function readFormPayload() {
    return {
      title: $('field-title').value.trim(),
      slug: $('field-slug').value.trim(),
      status: $('field-status').value,
      author: $('field-author').value.trim(),
      seoTitle: $('field-seo-title').value.trim(),
      metaDescription: $('field-meta-description').value.trim(),
      excerpt: $('field-excerpt').value.trim(),
      primaryKeyword: $('field-primary-keyword').value.trim(),
      searchIntent: $('field-search-intent').value.trim(),
      scheduledAt: $('field-scheduled-at').value ? new Date($('field-scheduled-at').value).toISOString() : null,
      categorySlugs: $('field-categories')
        .value.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      tagSlugs: $('field-tags')
        .value.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      featuredImage: {
        url: $('field-fi-url').value.trim(),
        alt: $('field-fi-alt').value.trim(),
        filename: $('field-fi-filename').value.trim()
      },
      bodyHtml: quill ? quill.root.innerHTML : ''
    };
  }

  function showFormError(message, fieldErrors) {
    const el = $('editor-form-error');
    el.hidden = false;
    let text = message;
    if (fieldErrors) {
      text += ` ${Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')}`;
    }
    el.textContent = text;
  }

  function clearFormError() {
    $('editor-form-error').hidden = true;
  }

  function resetEditor() {
    $('field-id').value = '';
    $('editor-heading').textContent = 'New article';
    $('article-form').reset();
    $('field-author').value = 'Premium Developers';
    $('field-status').value = 'draft';
    if (quill) quill.root.innerHTML = '';
    updateTocPreview();
    clearFormError();
  }

  async function openEditor(id) {
    showView('editor');
    if (!id) {
      resetEditor();
      return;
    }
    const data = await api(`/api/blog/article?id=${encodeURIComponent(id)}`);
    const a = data.article;
    $('field-id').value = a.id;
    $('editor-heading').textContent = 'Edit article';
    $('field-title').value = a.title || '';
    $('field-slug').value = a.slug || '';
    $('field-status').value = a.status || 'draft';
    $('field-author').value = a.author || 'Premium Developers';
    $('field-seo-title').value = a.seoTitle || '';
    $('field-meta-description').value = a.metaDescription || '';
    $('field-excerpt').value = a.excerpt || '';
    $('field-primary-keyword').value = a.primaryKeyword || '';
    $('field-search-intent').value = a.searchIntent || '';
    if (a.scheduledAt) {
      $('field-scheduled-at').value = a.scheduledAt.slice(0, 16);
    }
    $('field-categories').value = (a.categorySlugs || []).join(', ');
    $('field-tags').value = (a.tagSlugs || []).join(', ');
    $('field-fi-url').value = a.featuredImage?.url || '';
    $('field-fi-alt').value = a.featuredImage?.alt || '';
    $('field-fi-filename').value = a.featuredImage?.filename || '';
    if (quill) quill.root.innerHTML = a.bodyHtml || '';
    updateTocPreview();
    clearFormError();
  }

  async function saveArticle(options = {}) {
    clearFormError();
    const id = $('field-id').value;
    const payload = readFormPayload();
    if (options.forceStatus) payload.status = options.forceStatus;
    if (options.publishedAt) payload.publishedAt = options.publishedAt;

    try {
      if (id) {
        const data = await api(`/api/blog/article?id=${encodeURIComponent(id)}`, {
          method: 'PATCH',
          csrf: true,
          json: payload
        });
        $('field-id').value = data.article.id;
        return data.article;
      }
      if (payload.status === 'published') {
        showFormError('Use the Publish button to publish.');
        return null;
      }
      const data = await api('/api/blog/articles', { method: 'POST', csrf: true, json: payload });
      $('field-id').value = data.article.id;
      $('editor-heading').textContent = 'Edit article';
      return data.article;
    } catch (err) {
      showFormError(err.message, err.data?.fieldErrors);
      return null;
    }
  }

  async function checkSlug() {
    const slug = $('field-slug').value.trim();
    const hint = $('slug-hint');
    if (!slug) {
      hint.textContent = '';
      return;
    }
    const excludeId = $('field-id').value;
    const params = new URLSearchParams({ slug });
    if (excludeId) params.set('excludeId', excludeId);
    try {
      const data = await api(`/api/blog/slug-check?${params}`);
      hint.textContent = data.available ? 'Slug is available' : 'Slug is already in use';
      hint.className = `admin-hint ${data.available ? 'is-ok' : 'is-bad'}`;
    } catch {
      hint.textContent = '';
    }
  }

  async function loadTaxonomy() {
    const [cats, tags] = await Promise.all([api('/api/blog/categories'), api('/api/blog/tags')]);
    $('category-list').innerHTML = cats.categories
      .map(
        (c) =>
          `<li><span><strong>${escapeHtml(c.name)}</strong> <code>${escapeHtml(c.slug)}</code></span>
        <button type="button" class="btn btn--ghost" data-del-cat="${escapeHtml(c.slug)}">Delete</button></li>`
      )
      .join('');
    $('tag-list').innerHTML = tags.tags
      .map(
        (t) =>
          `<li><span><strong>${escapeHtml(t.name)}</strong> <code>${escapeHtml(t.slug)}</code></span>
        <button type="button" class="btn btn--ghost" data-del-tag="${escapeHtml(t.slug)}">Delete</button></li>`
      )
      .join('');
    $('category-list').querySelectorAll('[data-del-cat]').forEach((btn) => {
      btn.addEventListener('click', () => deleteCategory(btn.dataset.delCat));
    });
    $('tag-list').querySelectorAll('[data-del-tag]').forEach((btn) => {
      btn.addEventListener('click', () => deleteTag(btn.dataset.delTag));
    });
  }

  async function deleteCategory(slug) {
    if (!confirm(`Delete category "${slug}"?`)) return;
    await api(`/api/blog/categories?slug=${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      csrf: true,
      json: {}
    });
    loadTaxonomy();
  }

  async function deleteTag(slug) {
    if (!confirm(`Delete tag "${slug}"?`)) return;
    await api(`/api/blog/tags?slug=${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      csrf: true,
      json: {}
    });
    loadTaxonomy();
  }

  async function bootApp() {
    $('login-view').hidden = true;
    $('app-shell').hidden = false;
    initQuill();
    fillStatusSelect($('field-status'), true);
    fillStatusSelect($('articles-status-filter'), true);
    $('articles-status-filter').prepend(new Option('All statuses', ''));
    await loadStats();
    await loadArticles();
    await loadTaxonomy();
    setInterval(refreshSession, 5 * 60 * 1000);
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('login-error').hidden = true;
    try {
      const password = $('login-password').value;
      const data = await api('/api/blog/login', { method: 'POST', json: { password } });
      csrfToken = data.csrfToken;
      sessionExpiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      await bootApp();
    } catch (err) {
      $('login-error').hidden = false;
      $('login-error').textContent = err.status === 429 ? err.message : 'Invalid credentials or CMS unavailable.';
    }
  });

  $('btn-logout').addEventListener('click', async () => {
    try {
      await api('/api/blog/logout', { method: 'POST', csrf: true, json: {} });
    } catch {
      /* ignore */
    }
    forceLogin();
  });

  document.querySelectorAll('.admin-nav__btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      showView(btn.dataset.view);
      if (btn.dataset.view === 'dashboard') await loadStats();
      if (btn.dataset.view === 'articles') await loadArticles();
      if (btn.dataset.view === 'taxonomy') await loadTaxonomy();
      if (btn.dataset.view === 'editor') await openEditor(null);
    });
  });

  $('btn-new-article').addEventListener('click', () => {
    showView('editor');
    openEditor(null);
  });

  $('articles-search').addEventListener(
    'input',
    debounce(() => {
      articlesPage.offset = 0;
      loadArticles();
    }, 300)
  );
  $('articles-status-filter').addEventListener('change', () => {
    articlesPage.offset = 0;
    loadArticles();
  });
  $('articles-prev').addEventListener('click', () => {
    articlesPage.offset = Math.max(0, articlesPage.offset - articlesPage.limit);
    loadArticles();
  });
  $('articles-next').addEventListener('click', () => {
    articlesPage.offset += articlesPage.limit;
    loadArticles();
  });

  $('field-title').addEventListener('input', () => {
    if (!$('field-id').value && !$('field-slug').dataset.touched) {
      $('field-slug').value = slugify($('field-title').value);
      checkSlug();
    }
  });
  $('field-slug').addEventListener('input', () => {
    $('field-slug').dataset.touched = '1';
    clearTimeout(slugCheckTimer);
    slugCheckTimer = setTimeout(checkSlug, 400);
  });

  $('article-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saved = await saveArticle();
    if (saved) {
      await loadStats();
      await loadArticles();
    }
  });

  $('btn-save-draft').addEventListener('click', async () => {
    $('field-status').value = 'draft';
    await saveArticle({ forceStatus: 'draft' });
  });

  $('btn-publish').addEventListener('click', async () => {
    const title = $('field-title').value.trim();
    if (
      !confirm(
        `Publish "${title}" now?\n\nThis will set status to published and set publishedAt. Scheduled auto-publish is not enabled.`
      )
    ) {
      return;
    }
    const saved = await saveArticle({
      forceStatus: 'published',
      publishedAt: new Date().toISOString()
    });
    if (saved) {
      await loadStats();
      await loadArticles();
    }
  });

  $('btn-preview').addEventListener('click', async () => {
    let id = $('field-id').value;
    if (!id) {
      const saved = await saveArticle({ forceStatus: $('field-status').value || 'draft' });
      if (!saved) return;
      id = saved.id;
    }
    window.open(`/api/blog/preview?id=${encodeURIComponent(id)}`, '_blank', 'noopener,noreferrer');
  });

  $('btn-history').addEventListener('click', async () => {
    const id = $('field-id').value;
    if (!id) return;
    const data = await api(`/api/blog/history?articleId=${encodeURIComponent(id)}`);
    $('history-content').textContent = JSON.stringify(data.revisions, null, 2);
    $('history-dialog').showModal();
  });

  $('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api('/api/blog/categories', {
      method: 'POST',
      csrf: true,
      json: { name: $('cat-name').value.trim(), slug: $('cat-slug').value.trim() || undefined }
    });
    $('category-form').reset();
    loadTaxonomy();
  });

  $('tag-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api('/api/blog/tags', {
      method: 'POST',
      csrf: true,
      json: { name: $('tag-name').value.trim(), slug: $('tag-slug').value.trim() || undefined }
    });
    $('tag-form').reset();
    loadTaxonomy();
  });

  $('btn-export').addEventListener('click', async () => {
    const res = await fetch('/api/blog/backup', { credentials: 'include' });
    if (!res.ok) {
      alert('Export failed.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('import-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      alert('Invalid JSON file.');
      return;
    }
    if (!confirm('Import backup? Existing articles with the same id will be updated.')) return;
    try {
      const data = await api('/api/blog/backup', {
        method: 'POST',
        csrf: true,
        json: { ...json, onSlugConflict: 'skip' }
      });
      $('backup-result').hidden = false;
      $('backup-result').textContent = JSON.stringify(data, null, 2);
      await loadStats();
      await loadArticles();
    } catch (err) {
      alert(err.message);
    }
    e.target.value = '';
  });

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  refreshSession().then((ok) => {
    if (ok) bootApp();
  });
})();
