const STORAGE_KEY = 'jenglish-te-saved-v2';
const UI = {
  articles: '文章', saved: '已保存', thisWeek: '本周', previous: '往期文章',
  explain: '解释', translate: '中文翻译', grammar: '语法', vocabulary: '词汇', simplify: '简化英语', listen: '朗读',
  ask: 'AI 提问', selected: '选中句子', emptyAi: '请选择一个句子，在这里向 AI 提问。',
};

const state = {
  articleId: new URL(location.href).pathname.match(/\/ai\/te\/([^/]+)/)?.[1] || null,
  articles: [],
  currentArticle: null,
  loading: true,
  loadError: '',
  selected: null,
  aiMessages: [],
  busy: false,
  aiError: '',
  drawerOpen: true,
  saved: loadSaved(),
  activeNav: 'articles',
  speed: 1,
  speechToken: 0,
  speechPlaying: false,
  showTranslation: false,
  translationBusy: false,
  translationError: '',
  previousOpen: false,
};

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function persistSaved() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saved)); }
function article() { return state.currentArticle; }
function sentenceText() { return state.selected?.text || ''; }
function sentenceContext() { return state.selected?.paragraph?.sentences?.map(s => s.text).join(' ') || ''; }
function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));
}
function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function icon(name) {
  const icons = {
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.3L6 21V4.5Z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 8-16 8 3-8-3-8Zm3.3 8h8.4"/></svg>',
    headphones: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15v-3a7 7 0 0 1 14 0v3m-14 0a2 2 0 0 0 2 2h1v-5H7a2 2 0 0 0-2 2v1Zm14 0a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2v1Z"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>',
  };
  return icons[name] || '';
}

function similarArticles() {
  const a = article();
  if (!a) return [];
  const scored = state.articles.filter(item => item.slug !== a.slug).map(item => {
    const sameCategory = item.categorySlug === a.categorySlug ? 3 : 0;
    const overlap = (item.tags || []).filter(tag => (a.tags || []).map(x => x.toLowerCase()).includes(String(tag).toLowerCase())).length;
    return { item, score: sameCategory + overlap };
  });
  scored.sort((x, y) => y.score - x.score || new Date(y.item.date) - new Date(x.item.date));
  return scored.slice(0, 3).map(x => x.item);
}

function articleText(a) {
  return a.paragraphs.map(p => p.sentences.map(s => s.text).join(' ')).join('\n\n');
}

function cachedSentenceGeneration(kind) {
  const id = state.selected?.id;
  return id && article()?.ai?.sentences?.[id]?.[kind];
}

function render() {
  const a = article();
  if (!a) {
    document.querySelector('#app').innerHTML = state.loadError ? `
      <div class="setup-state"><div class="eyebrow">CONTENT API</div><h1>文章暂时无法加载</h1><p>${escapeHtml(state.loadError)}</p><button class="primary-button" data-retry-content>重试</button><p class="setup-note">请确认 PostgreSQL 已启动，并已运行数据库迁移和种子脚本。</p></div>` : `
      <div class="setup-state"><div class="eyebrow">LOADING CONTENT</div><h1>正在加载阅读库…</h1><p>正在连接文章 API。</p></div>`;
    document.querySelector('[data-retry-content]')?.addEventListener('click', initContent);
    return;
  }

  const savedCount = state.saved.length;
  const selectedId = state.selected?.id;
  const previous = similarArticles();
  const translationParagraphs = (a.ai?.articleTranslationZh || '').split(/\n\n+/).filter(Boolean);

  document.querySelector('#app').innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand-wrap">
          <a class="brand" href="/ai/te" data-nav-home>JEnglish</a>
          <span class="brand-divider"></span>
          <span class="brand-product">TE AI Reader</span>
        </div>
        <nav class="topnav" aria-label="主导航">
          <button class="topnav-link ${state.activeNav === 'articles' ? 'is-active' : ''}" data-nav="articles">文章</button>
          <button class="topnav-link ${state.activeNav === 'saved' ? 'is-active' : ''}" data-nav="saved">已保存 <span class="count-chip">${savedCount}</span></button>
        </nav>
        <div class="top-actions">
          <button class="translation-toggle ${state.showTranslation ? 'is-active' : ''}" data-translation-toggle ${state.translationBusy ? 'disabled' : ''} aria-label="切换中文翻译">中文 / EN</button>
          <button class="icon-button" data-theme aria-label="切换主题">◐</button>
        </div>
      </header>

      <main class="workspace ${state.drawerOpen ? '' : 'ai-closed'}">
        <aside class="sidebar">
          <div class="sidebar-section-title">TE WEEKLY</div>
          <button class="sidebar-link is-current" data-nav="articles">${icon('spark')} ${UI.thisWeek}</button>
          <button class="sidebar-link previous-trigger ${state.previousOpen ? 'is-open' : ''}" data-previous-toggle>
            ${icon('chevronDown')} <span>${UI.previous}</span>
            <span class="previous-count">${previous.length}</span>
          </button>
          ${state.previousOpen ? `<div class="previous-cascade" aria-label="相似文章">
            ${previous.map((item, idx) => `
              <button class="cascade-card cascade-${idx + 1}" data-article="${escapeHtml(item.slug)}">
                <img src="${escapeHtml(item.coverImageUrl || '/assets/thumb-technology.svg')}" alt="" loading="lazy">
                <span class="cascade-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category)} · ${item.readingTime} 分钟</small></span>
              </button>`).join('')}
          </div>` : ''}
          <div class="sidebar-heading">ARTICLES</div>
          <div class="article-list">${state.articles.map(item => `
            <button class="article-item ${item.slug === a.slug ? 'is-selected' : ''}" data-article="${escapeHtml(item.slug)}">
              <span class="article-item-dot"></span>
              <span class="article-item-text">
                <strong>${escapeHtml(item.title)}</strong>
                <small>${escapeHtml(item.category)} · ${item.readingTime} 分钟</small>
              </span>
              ${item.slug === a.slug ? `<span class="article-item-arrow">${icon('chevron')}</span>` : ''}
            </button>`).join('')}</div>
          <div class="sidebar-footer">
            <div class="mini-stat"><span>Level</span><strong>${escapeHtml(a.level)}</strong></div>
            <div class="mini-stat"><span>已保存</span><strong>${savedCount}</strong></div>
          </div>
        </aside>

        <section class="reader-column">
          <div class="reader-switcher-mobile">
            <button class="previous-trigger-mobile ${state.previousOpen ? 'is-open' : ''}" data-previous-toggle>${icon('chevronDown')} ${UI.previous} <span>${previous.length}</span></button>
            ${state.previousOpen ? `<div class="previous-cascade-mobile">${previous.map(item => `<button data-article="${escapeHtml(item.slug)}"><img src="${escapeHtml(item.coverImageUrl || '/assets/thumb-technology.svg')}" alt=""><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category)}</small></span></button>`).join('')}</div>` : ''}
          </div>
          <div class="reader-topline">
            <span>${escapeHtml(a.category)}</span>
            <span class="dot-sep">•</span>
            <span>${escapeHtml(formatDate(a.date))}</span>
            <span class="dot-sep">•</span>
            <span>${a.readingTime} 分钟阅读</span>
          </div>
          <article class="article-reader" aria-label="文章阅读器">
            <div class="article-cover-row">
              <div>
                <h1>${escapeHtml(a.title)}</h1>
                <p class="article-dek">${escapeHtml(a.dek)}</p>
              </div>
              <img class="article-cover" src="${escapeHtml(a.coverImageUrl || '/assets/thumb-technology.svg')}" alt="">
            </div>
            <div class="article-meta"><span class="level-pill">${escapeHtml(a.level)}</span>${a.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
            <div class="article-translation-state">
              ${state.translationBusy ? '<span class="translation-loading"><span></span><span></span><span></span> 正在生成中文翻译…</span>' : ''}
              ${state.translationError ? `<span class="translation-error">${escapeHtml(state.translationError)}</span>` : ''}
            </div>
            ${state.showTranslation ? `
              <div class="translation-body" lang="zh-CN">
                ${translationParagraphs.length ? translationParagraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('') : `<div class="translation-empty">点击“中文 / EN”后，将把整篇文章翻译成中文。</div>`}
              </div>` : `
              <div class="article-body" lang="en">
                ${a.paragraphs.map((paragraph, pIdx) => `<p>${paragraph.sentences.map((sentence, sIdx) => {
                  const id = String(sentence.id);
                  const isSelected = id === selectedId;
                  return `<button class="sentence ${isSelected ? 'is-selected' : ''}" data-sentence="${id}" data-pidx="${pIdx}" data-sidx="${sIdx}" aria-pressed="${isSelected}">${escapeHtml(sentence.text)}</button>`;
                }).join(' ')}</p>`).join('')}
              </div>`}
            <div class="reader-endnote">
              <span>JEnglish · Editorial English learning workspace</span>
              <button class="save-page" data-save-article>保存文章 ${icon('bookmark')}</button>
            </div>
          </article>
        </section>

        <aside class="ai-panel ${state.drawerOpen ? 'is-open' : 'is-hidden'}" aria-label="AI 助手">
          <div class="ai-panel-header">
            <div>
              <div class="eyebrow"><span class="ai-dot"></span> AI ASSISTANT</div>
              <h2>从句子开始学习。</h2>
            </div>
            <button class="panel-close" data-close-ai aria-label="关闭 AI 助手">${icon('x')}</button>
          </div>

          ${state.selected ? `
          <div class="selected-card">
            <div class="selected-label">${UI.selected}</div>
            <div class="selected-text">${escapeHtml(state.selected.text)}</div>
            <div class="selected-actions">
              ${[['explain',UI.explain],['translate',UI.translate],['grammar',UI.grammar],['vocabulary',UI.vocabulary],['simplify',UI.simplify]].map(([mode,label]) => `<button class="ai-action ${cachedSentenceGeneration(mode) ? 'has-cache' : ''}" data-ai-action="${mode}" ${state.busy ? 'disabled' : ''}>${label}</button>`).join('')}
              <button class="ai-action ai-action-listen" data-listen aria-label="朗读">${icon('headphones')} ${UI.listen}</button>
              <button class="ai-action" data-save-sentence>${savedSentenceExists(state.selected.text) ? '已保存' : '保存'}</button>
            </div>
          </div>` : `
            <div class="ai-empty">
              <div class="ai-empty-icon">${icon('spark')}</div>
              <h3>${UI.emptyAi}</h3>
              <p>选中英文句子后，可以获得中文解释、翻译、语法和词汇提示。</p>
              <div class="prompt-chips">
                <button data-demo-prompt="请用中文简单解释这句话">简单解释</button>
                <button data-demo-prompt="请告诉我重要的英文表达">重点表达</button>
                <button data-demo-prompt="请用中文解释这句话的语法">语法解释</button>
              </div>
            </div>
          `}

          <div class="conversation" id="conversation">
            ${state.aiMessages.length ? state.aiMessages.map(m => `<div class="message ${m.role}"><div class="message-label">${m.role === 'user' ? '你' : 'JEnglish AI'}</div><div class="message-body">${escapeHtml(m.content).replace(/\n/g,'<br>')}</div></div>`).join('') : ''}
            ${state.busy ? `<div class="message assistant"><div class="message-label">JEnglish AI</div><div class="thinking"><span></span><span></span><span></span></div></div>` : ''}
          </div>

          ${state.aiError ? `<div class="ai-error" role="alert">${escapeHtml(state.aiError)} <button data-retry>重试</button></div>` : ''}

          <form class="ask-form" data-ask-form>
            <div class="ask-input-wrap">
              <textarea name="question" rows="2" placeholder="关于这篇文章提问…" aria-label="向 AI 提问"></textarea>
              <button class="send-button" type="submit" ${state.busy ? 'disabled' : ''} aria-label="发送">${icon('send')}</button>
            </div>
            <div class="ask-hint"><span>已附带文章上下文</span><kbd>Enter</kbd><span>发送</span></div>
          </form>
        </aside>

        ${!state.drawerOpen ? `<button class="ai-reopen" data-open-ai aria-label="打开 AI 助手">${icon('spark')} AI</button>` : ''}
      </main>

      <div class="audio-bar">
        <div class="audio-main">
          <button class="audio-play" data-play aria-label="朗读句子">${state.speechPlaying ? icon('pause') : icon('play')}</button>
          <div class="audio-track"><div class="audio-line"><span class="audio-progress" style="width:${state.speechPlaying ? '38%' : '0%'}"></span></div><div class="audio-caption"><span>${state.selected ? escapeHtml(state.selected.text) : '请选择一个句子开始朗读'}</span><span>${state.selected ? 'British English' : '—'}</span></div></div>
        </div>
        <div class="audio-controls">
          <select data-speed aria-label="播放速度">${[0.75,1,1.25,1.5].map(v => `<option value="${v}" ${state.speed === v ? 'selected' : ''}>${v}×</option>`).join('')}</select>
          <button class="audio-icon" data-next aria-label="下一句">›</button>
        </div>
      </div>

      <div class="mobile-backdrop ${state.drawerOpen ? 'is-visible' : ''}" data-close-ai></div>
    </div>`;

  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => {
    const nav = btn.dataset.nav;
    if (nav === 'saved') {
      state.activeNav = 'saved';
      return renderSavedOverlay();
    }
    state.activeNav = 'articles';
    closeDrawer();
  }));

  document.querySelector('[data-nav-home]')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const first = state.articles[0];
    if (!first) return;
    history.pushState({}, '', '/ai/te');
    state.showTranslation = false;
    await loadArticle(first.slug, false);
  });

  document.querySelectorAll('[data-article]').forEach(btn => btn.addEventListener('click', async () => {
    state.activeNav = 'articles';
    state.previousOpen = false;
    closeDrawer();
    history.pushState({}, '', `/ai/te/${btn.dataset.article}`);
    await loadArticle(btn.dataset.article, false);
  }));

  document.querySelectorAll('[data-sentence]').forEach(btn => btn.addEventListener('click', () => {
    const a = article();
    const pIdx = Number(btn.dataset.pidx), sIdx = Number(btn.dataset.sidx);
    const sentence = a.paragraphs[pIdx]?.sentences?.[sIdx];
    if (!sentence) return;
    state.selected = { id: String(sentence.id), text: sentence.text, paragraph: a.paragraphs[pIdx], pIdx, sIdx };
    state.aiError = '';
    state.drawerOpen = true;
    render();
  }));

  document.querySelectorAll('[data-ai-action]').forEach(btn => btn.addEventListener('click', () => runAi(btn.dataset.aiAction)));
  document.querySelector('[data-listen]')?.addEventListener('click', toggleSpeech);
  document.querySelector('[data-save-sentence]')?.addEventListener('click', saveSelectedSentence);
  document.querySelector('[data-play]')?.addEventListener('click', toggleSpeech);
  document.querySelector('[data-next]')?.addEventListener('click', nextSentence);
  document.querySelector('[data-speed]')?.addEventListener('change', (e) => { state.speed = Number(e.target.value); });
  document.querySelectorAll('[data-close-ai]').forEach(btn => btn.addEventListener('click', closeDrawer));
  document.querySelector('[data-open-ai]')?.addEventListener('click', openDrawer);
  document.querySelector('[data-ask-form]')?.addEventListener('submit', (e) => { e.preventDefault(); const text = e.currentTarget.question.value.trim(); if (text) runAi('chat', text); });
  document.querySelectorAll('[data-demo-prompt]').forEach(btn => btn.addEventListener('click', () => {
    const input = document.querySelector('[name="question"]');
    if (input) input.value = btn.dataset.demoPrompt;
    if (state.selected) runAi('chat', btn.dataset.demoPrompt); else showToast('请先选择文章中的句子。');
  }));
  document.querySelector('[data-theme]')?.addEventListener('click', () => document.body.classList.toggle('dark'));
  document.querySelector('[data-retry]')?.addEventListener('click', () => state.selected ? runAi('explain') : null);
  document.querySelector('[data-save-article]')?.addEventListener('click', saveArticle);
  document.querySelectorAll('[data-previous-toggle]').forEach(btn => btn.addEventListener('click', () => { state.previousOpen = !state.previousOpen; render(); }));
  document.querySelector('[data-translation-toggle]')?.addEventListener('click', toggleArticleTranslation);
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, { headers: { Accept: 'application/json', ...(options.headers || {}) }, ...options });
  let data = {};
  try { data = await response.json(); } catch { /* preserve useful HTTP error below */ }
  if (!response.ok) throw new Error(data.error || `请求失败 (${response.status})。`);
  return data;
}

async function initContent() {
  state.loading = true;
  state.loadError = '';
  render();
  try {
    const { articles } = await apiJson('/api/articles');
    state.articles = articles || [];
    if (!state.articles.length) throw new Error('内容 API 没有返回已发布文章。');
    const requested = state.articleId && state.articles.some(item => item.slug === state.articleId) ? state.articleId : state.articles[0].slug;
    if (!state.articleId || state.articleId !== requested) {
      state.articleId = requested;
      history.replaceState({}, '', `/ai/te/${requested}`);
    }
    await loadArticle(requested, false);
  } catch (error) {
    state.loading = false;
    state.loadError = error instanceof Error ? error.message : '无法加载文章 API。';
    render();
  }
}

async function loadArticle(slug, push = true) {
  if (!slug) return;
  state.loading = true;
  state.loadError = '';
  state.selected = null;
  state.aiMessages = [];
  state.aiError = '';
  state.showTranslation = false;
  state.translationError = '';
  state.translationBusy = false;
  state.articleId = slug;
  if (push) history.pushState({}, '', `/ai/te/${slug}`);
  render();
  try {
    const { article: data } = await apiJson(`/api/articles/${encodeURIComponent(slug)}`);
    state.currentArticle = data;
    state.loading = false;
    state.drawerOpen = true;
    render();
  } catch (error) {
    state.currentArticle = null;
    state.loading = false;
    state.loadError = error instanceof Error ? error.message : '无法加载这篇文章。';
    render();
  }
}

function closeDrawer() {
  state.drawerOpen = false;
  state.aiError = '';
  render();
}

function openDrawer() {
  state.drawerOpen = true;
  render();
}

async function toggleArticleTranslation() {
  if (state.translationBusy) return;
  state.showTranslation = !state.showTranslation;
  if (!state.showTranslation) return render();
  const existing = article()?.ai?.articleTranslationZh;
  if (existing) return render();

  state.translationBusy = true;
  state.translationError = '';
  render();
  try {
    const data = await apiJson('/api/ai', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        mode: 'article_translate',
        articleId: article().id,
        articleSlug: article().slug,
        articleText: articleText(article()),
      }),
    });
    state.currentArticle.ai ||= { articleTranslationZh: null, sentences: {} };
    state.currentArticle.ai.articleTranslationZh = data.answer;
  } catch (error) {
    state.showTranslation = false;
    state.translationError = error instanceof Error ? error.message : '中文翻译生成失败。';
  } finally {
    state.translationBusy = false;
    render();
  }
}

async function runAi(mode, question = '') {
  if (state.busy) return;
  if (mode !== 'chat' && !state.selected) return;
  state.busy = true;
  state.aiError = '';
  const userText = mode === 'chat' ? question : ({explain:UI.explain,translate:UI.translate,grammar:UI.grammar,vocabulary:UI.vocabulary,simplify:UI.simplify}[mode] || mode);
  state.aiMessages.push({ role:'user', content:userText });
  render();

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        mode,
        articleId: article().id,
        articleSlug: article().slug,
        selectedSentenceId: state.selected?.id || '',
        selectedSentence: sentenceText(),
        paragraphContext: sentenceContext(),
        question,
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'AI 请求失败。');
    if (state.selected && mode !== 'chat') {
      state.currentArticle.ai ||= { articleTranslationZh: null, sentences: {} };
      state.currentArticle.ai.sentences ||= {};
      state.currentArticle.ai.sentences[state.selected.id] ||= {};
      state.currentArticle.ai.sentences[state.selected.id][mode] = data.answer;
    }
    state.aiMessages.push({ role:'assistant', content:data.answer });
  } catch (error) {
    state.aiError = error instanceof Error ? error.message : 'AI 回答获取失败，请重试。';
  } finally {
    state.busy = false;
    render();
  }
}

function toggleSpeech() {
  if (!state.selected || !('speechSynthesis' in window)) {
    showToast(state.selected ? '当前浏览器不支持语音朗读。' : '请先选择文章中的句子。');
    return;
  }
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    state.speechPlaying = false;
    render();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(state.selected.text);
  utterance.lang = 'en-GB';
  utterance.rate = state.speed;
  state.speechPlaying = true;
  const token = ++state.speechToken;
  utterance.onend = () => { if (token === state.speechToken) { state.speechPlaying = false; render(); } };
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  render();
}

function nextSentence() {
  if (!state.selected) return showToast('请先选择文章中的句子。');
  const a = article();
  let p = state.selected.pIdx, s = state.selected.sIdx + 1;
  if (s >= a.paragraphs[p].sentences.length) { p++; s = 0; }
  if (p >= a.paragraphs.length) { p = 0; s = 0; }
  const sentence = a.paragraphs[p].sentences[s];
  state.selected = { id:String(sentence.id), text:sentence.text, paragraph:a.paragraphs[p], pIdx:p, sIdx:s };
  state.drawerOpen = true;
  render();
}

function savedSentenceExists(text) { return state.saved.some(item => item.kind === 'sentence' && item.text === text); }

function saveSelectedSentence() {
  if (!state.selected) return;
  if (savedSentenceExists(state.selected.text)) return showToast('这句话已经保存。');
  state.saved.push({key:`sentence:${article().id}:${state.selected.text}`, kind:'sentence', text:state.selected.text, articleId:article().id, createdAt:Date.now()});
  persistSaved(); render(); showToast('句子已保存。');
}

function saveArticle() {
  const a = article();
  const key = `article:${a.id}`;
  if (!state.saved.some(item => item.key === key)) state.saved.push({key, kind:'article', title:a.title, articleId:a.id, createdAt:Date.now()});
  persistSaved(); render(); showToast('文章已保存。');
}

function renderSavedOverlay() {
  const overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = `<div class="saved-modal"><div class="saved-modal-head"><div><div class="eyebrow">SAVED</div><h2>已保存的学习内容</h2></div><button class="panel-close" data-close>${icon('x')}</button></div>
  <div class="saved-list">${state.saved.length ? state.saved.map((x,i)=>`<div class="saved-row"><div><small>${x.kind === 'sentence' ? '句子' : '文章'}</small><strong>${escapeHtml(x.text || x.title)}</strong>${x.articleId ? `<span>${escapeHtml(state.articles.find(a=>String(a.id)===String(x.articleId))?.title || '')}</span>`:''}</div><button data-remove="${i}">删除</button></div>`).join('') : `<div class="saved-empty"><div class="ai-empty-icon">${icon('bookmark')}</div><h3>还没有保存内容</h3><p>阅读时可以保存句子或文章。</p></div>`}</div></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('[data-close]')) overlay.remove(); });
  overlay.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => { state.saved.splice(Number(btn.dataset.remove),1); persistSaved(); overlay.remove(); renderSavedOverlay(); render(); }));
}

function showToast(message) {
  document.querySelector('.toast')?.remove();
  const node = document.createElement('div'); node.className = 'toast'; node.textContent = message; document.body.appendChild(node);
  setTimeout(() => node.remove(), 2400);
}

document.addEventListener('click', (e) => {
  const sentenceBtn = e.target.closest('[data-sentence]');
  if (sentenceBtn && e.shiftKey) {
    const text = sentenceBtn.textContent.trim();
    if (!savedSentenceExists(text)) {
      state.saved.push({key:`sentence:${article().id}:${text}`, kind:'sentence', text, articleId:article().id, createdAt:Date.now()});
      persistSaved(); showToast('句子已保存。');
    }
  }
});
window.addEventListener('popstate', () => {
  const slug = new URL(location.href).pathname.match(/\/ai\/te\/([^/]+)/)?.[1] || state.articles[0]?.slug;
  if (slug) loadArticle(slug, false);
});
render();
initContent();
