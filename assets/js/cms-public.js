(function () {
  'use strict';

  const config = window.CONTENT_CMS_SUPABASE || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url || '') &&
    !String(config.publishableKey || '').startsWith('YOUR_');

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function safeUrl(value) {
    if (!value) return '';
    try {
      const base = /^https?:$/.test(window.location.protocol) ? `${window.location.origin}/` : 'http://127.0.0.1:4182/';
      const url = new URL(String(value).trim(), base);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }

  function blogPostUrl(slug) {
    return `/blog/${encodeURIComponent(String(slug || '').trim())}/`;
  }

  function slugFromLocation() {
    const legacySlug = new URLSearchParams(location.search).get('slug');
    if (legacySlug) return legacySlug;
    const match = location.pathname.match(/\/blog\/([^/]+)\/?$/i);
    if (!match || /^(?:index|post)\.html$/i.test(match[1])) return '';
    try { return decodeURIComponent(match[1]); } catch (_) { return match[1]; }
  }

  function activateMediaFallbacks(root) {
    root.querySelectorAll('img.blog-card-img').forEach((image) => {
      const showFallback = () => {
        const fallback = document.createElement('div');
        fallback.className = 'blog-card-img-ph';
        fallback.setAttribute('aria-hidden', 'true');
        image.replaceWith(fallback);
      };
      image.addEventListener('error', showFallback, { once: true });
      if (image.complete && image.naturalWidth === 0) showFallback();
    });
  }

  function sanitiseRichText(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script,style,iframe,object,embed,form,input,button').forEach((node) => node.remove());
    doc.body.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        if (name.startsWith('on') || (['href', 'src'].includes(name) && !safeUrl(attribute.value))) {
          node.removeAttribute(attribute.name);
        }
      });
    });
    doc.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('table-scroll')) return;
      const wrapper = doc.createElement('div');
      wrapper.className = 'table-scroll';
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', table.getAttribute('aria-label') || 'Scrollable data table');
      wrapper.tabIndex = 0;
      table.before(wrapper);
      wrapper.append(table);
    });
    return doc.body.innerHTML;
  }

  function mediaMarkup(item, className) {
    const video = safeUrl(item.video_url);
    const cover = safeUrl(item.cover_url);
    if (video) return `<video class="${className}" controls preload="metadata" playsinline${cover ? ` poster="${escapeHtml(cover)}"` : ''}><source src="${escapeHtml(video)}"></video>`;
    if (cover) return `<img class="${className}" src="${escapeHtml(cover)}" alt="${escapeHtml(item.title)}" loading="lazy">`;
    return `<div class="${className} cms-media-placeholder" aria-hidden="true"></div>`;
  }

  function cardMediaMarkup(item, className) {
    const cover = safeUrl(item.cover_url);
    let bodyImage = '';
    if (!cover && item.body_html) {
      const doc = new DOMParser().parseFromString(String(item.body_html), 'text/html');
      bodyImage = safeUrl(doc.querySelector('img')?.getAttribute('src'));
    }
    const image = cover || bodyImage;
    if (image) return `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(item.title)}" loading="lazy">`;
    return `<div class="${className} cms-media-placeholder" aria-hidden="true"></div>`;
  }

  async function getClient() {
    if (!configured || !window.supabase?.createClient) return null;
    if (window.CONTENT_CMS_PUBLIC_CLIENT) return window.CONTENT_CMS_PUBLIC_CLIENT;
    window.CONTENT_CMS_PUBLIC_CLIENT = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return window.CONTENT_CMS_PUBLIC_CLIENT;
  }

  async function fetchPublished(type, options = {}) {
    const client = await getClient();
    if (!client) return [];
    let query = client.from('content_items').select('*').eq('type', type).eq('status', 'published')
      .order('featured', { ascending: false }).order('sort_order', { ascending: true })
      .order('published_at', { ascending: false });
    if (options.slug) query = query.eq('slug', options.slug).limit(1);
    if (options.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function renderProjects() {
    const section = document.querySelector('[data-cms-projects]');
    const grid = document.querySelector('[data-cms-project-grid]');
    if (!section || !grid) return;
    try {
      const projects = await fetchPublished('project');
      if (!projects.length) return;
      grid.innerHTML = projects.map((item) => {
        const tags = (item.tags || []).join(' · ');
        const href = item.external_url ? safeUrl(item.external_url) : '';
        return `<article class="project-card cms-project-card">
          ${mediaMarkup(item, 'cms-project-media')}
          <div class="project-card-body">
            <p class="project-card-meta">${escapeHtml(tags || 'Portfolio project')}</p>
            <h3 class="project-card-title">${escapeHtml(item.title)}</h3>
            <p class="project-card-text">${escapeHtml(item.excerpt || '')}</p>
            ${href ? `<div class="project-card-actions"><a class="project-card-link project-card-link--primary" href="${escapeHtml(href)}" target="_blank" rel="noopener">View project</a></div>` : ''}
          </div>
        </article>`;
      }).join('');
      section.hidden = false;
    } catch (error) { console.error('Could not load projects.', error); }
  }

  async function renderLatestPosts() {
    const section = document.querySelector('[data-cms-blog]');
    const track = document.querySelector('[data-cms-blog-grid]');
    if (!section || !track) return;
    try {
      const posts = await fetchPublished('blog', { limit: 6 });
      if (!posts.length) return;
      const cards = posts.map((item) => `<a class="blog-card" href="${blogPostUrl(item.slug)}">
        ${cardMediaMarkup(item, 'blog-card-img')}
        <div class="blog-card-body">
          <div class="blog-card-meta">${escapeHtml((item.tags || [])[0] || 'Insight')} <span>${new Date(item.published_at).toLocaleDateString('en-ZW', { month: 'short', year: 'numeric' })}</span></div>
          <div class="blog-card-title">${escapeHtml(item.title)}</div>
        </div>
      </a>`).join('');
      track.classList.add('is-static');
      track.innerHTML = `<div class="carousel-set">${cards}</div>`;
      activateMediaFallbacks(track);
      section.hidden = false;
    } catch (error) { console.error('Could not load blog posts.', error); }
  }

  async function renderBlogIndex() {
    const grid = document.querySelector('[data-blog-index]');
    if (!grid) return;
    try {
      const posts = await fetchPublished('blog');
      grid.innerHTML = posts.length ? posts.map((item) => `<article class="article-card">
        <a href="${blogPostUrl(item.slug)}">${cardMediaMarkup(item, 'article-card-media')}</a>
        <div class="article-card-copy"><p class="eyebrow">${escapeHtml((item.tags || [])[0] || 'Insight')}</p><h2><a href="${blogPostUrl(item.slug)}">${escapeHtml(item.title)}</a></h2><p>${escapeHtml(item.excerpt || '')}</p></div>
      </article>`).join('') : '<p class="cms-empty">New articles are coming soon.</p>';
    } catch (_) { grid.innerHTML = '<p class="cms-empty">Articles are temporarily unavailable.</p>'; }
  }

  async function renderBlogPost() {
    const article = document.querySelector('[data-blog-post]');
    if (!article) return;
    const slug = slugFromLocation();
    if (!slug) { article.innerHTML = '<p class="cms-empty">Article not found.</p>'; return; }
    try {
      const [item] = await fetchPublished('blog', { slug });
      if (!item) throw new Error('Not found');
      document.title = `${item.seo_title || item.title} | ${config.siteName || 'My Site'}`;
      const description = document.querySelector('meta[name="description"]');
      if (description) description.content = item.seo_description || item.excerpt || '';
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
      if (config.siteUrl) canonical.href = `${String(config.siteUrl).replace(/\/$/, '')}${blogPostUrl(item.slug)}`;
      if (location.pathname.endsWith('/post.html')) history.replaceState({}, '', blogPostUrl(item.slug));
      const related = (await fetchPublished('blog', { limit: 4 })).filter((post) => post.slug !== item.slug).slice(0, 3);
      article.innerHTML = `<header class="post-header"><p class="eyebrow">${escapeHtml((item.tags || []).join(' · ') || 'Insight')}</p><h1>${escapeHtml(item.title)}</h1><p class="post-deck">${escapeHtml(item.excerpt || '')}</p><time>${new Date(item.published_at).toLocaleDateString('en-ZW', { day: 'numeric', month: 'long', year: 'numeric' })}</time></header>
        <div class="post-lead-media">${mediaMarkup(item, 'post-media')}</div>
        <div class="post-body">${sanitiseRichText(item.body_html)}</div>
        ${related.length ? `<aside class="related-posts"><div class="related-posts-header"><h2>Keep reading</h2><a href="/blog/">View all articles</a></div><div class="related-posts-grid">${related.map((post) => `<a class="related-post-card" href="${blogPostUrl(post.slug)}">${cardMediaMarkup(post, 'related-post-media')}<span>${escapeHtml(post.title)}</span></a>`).join('')}</div></aside>` : ''}`;
    } catch (_) { article.innerHTML = '<p class="cms-empty">This article could not be found.</p>'; }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderProjects(); renderLatestPosts(); renderBlogIndex(); renderBlogPost();
  });
})();
