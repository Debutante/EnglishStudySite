const STORAGE_KEY = 'jenglish-te-saved-v2';
const I18N = {
  zh: {
    articles:'文章', saved:'已保存', thisWeek:'本周', previous:'往期文章', similarArticles:'相似文章', explain:'解释', chinese:'中文', translate:'翻译', grammar:'语法', vocabulary:'词汇', simplify:'简化英语', listen:'朗读', save:'保存', saveDone:'已保存',
    ask:'AI 提问', selected:'选中句子', emptyAi:'请选择一个句子，在这里向 AI 提问。', assistantTitle:'从句子开始学习。', noSelection:'选中英文句子后，可以获得中文解释、翻译、语法和词汇提示。',
    articlePrompt:'关于这篇文章提问…', contextAttached:'已附带文章上下文', send:'发送', reading:'阅读', readMin:'分钟阅读', level:'等级', savedCount:'已保存',
    editorial:'JEnglish · 英语精读学习空间', saveArticle:'保存文章', loadingTranslation:'正在生成中文翻译…', translationEmpty:'点击“中文”后，将把整篇文章翻译成中文。',
    aiAssistant:'AI 助手', reopenAi:'打开 AI 助手', closeAi:'关闭 AI 助手', british:'英式英语', chooseSentence:'请选择一个句子开始朗读', pause:'暂停', retry:'重试',
    simpleExplain:'简单解释', keyExpressions:'重点表达', grammarExplain:'语法解释', noSaved:'还没有保存内容', saveHint:'阅读时可以保存句子或文章。', delete:'删除',
    contentApi:'内容 API', loadingContent:'正在加载阅读库…', connectApi:'正在连接文章 API。', articleUnavailable:'文章暂时无法加载', noPublished:'内容 API 没有返回已发布文章。',
    generating:'正在生成…', minute:'分钟', navigation:'导航', language:'语言', theme:'切换主题', reader:'文章阅读器', playbackSpeed:'播放速度', nextSentence:'下一句',
    savedContent:'已保存的学习内容', savedSentence:'句子', savedArticle:'文章', sentenceSaved:'句子已保存。', sentenceAlreadySaved:'这句话已经保存。', articleSaved:'文章已保存。',
    browserNoSpeech:'当前浏览器不支持语音朗读。', selectSentence:'请先选择文章中的句子。', translationFailed:'中文翻译生成失败。', readerApiError:'无法加载文章 API。',
    generatingCover:'正在生成封面…', generatingAi:'正在生成 AI 内容…',
  },
  en: {
    articles:'Articles', saved:'Saved', thisWeek:'This week', previous:'Previous articles', similarArticles:'Similar articles', explain:'Explain', chinese:'Chinese', translate:'Translate', grammar:'Grammar', vocabulary:'Vocabulary', simplify:'Simplify English', listen:'Listen', save:'Save', saveDone:'Saved',
    ask:'Ask AI', selected:'Selected sentence', emptyAi:'Select a sentence to ask the AI.', assistantTitle:'Learn from the sentence.', noSelection:'Select an English sentence to get meaning, translation, grammar, and vocabulary help.',
    articlePrompt:'Ask about this article…', contextAttached:'Article context attached', send:'Send', reading:'Reading', readMin:'min read', level:'Level', savedCount:'Saved',
    editorial:'JEnglish · English reading workspace', saveArticle:'Save article', loadingTranslation:'Generating Chinese translation…', translationEmpty:'Select “Chinese” to translate the full article.',
    aiAssistant:'AI Assistant', reopenAi:'Open AI assistant', closeAi:'Close AI assistant', british:'British English', chooseSentence:'Select a sentence to start listening', pause:'Pause', retry:'Retry',
    simpleExplain:'Simple explanation', keyExpressions:'Key expressions', grammarExplain:'Grammar explanation', noSaved:'No saved content yet', saveHint:'Save sentences or articles while reading.', delete:'Delete',
    contentApi:'CONTENT API', loadingContent:'Loading reading library…', connectApi:'Connecting to the article API.', articleUnavailable:'Article could not be loaded', noPublished:'The content API returned no published articles.',
    generating:'Generating…', minute:'min', navigation:'Navigation', language:'Language', theme:'Toggle theme', reader:'Article reader', playbackSpeed:'Playback speed', nextSentence:'Next sentence',
    savedContent:'Saved learning content', savedSentence:'Sentence', savedArticle:'Article', sentenceSaved:'Sentence saved.', sentenceAlreadySaved:'This sentence is already saved.', articleSaved:'Article saved.',
    browserNoSpeech:'This browser does not support speech playback.', selectSentence:'Select a sentence first.', translationFailed:'Chinese translation failed.', readerApiError:'Could not load the article API.',
    generatingCover:'Generating cover…', generatingAi:'Generating AI content…',
  },
};
function t(key){ return I18N[state.uiLanguage]?.[key] ?? I18N.zh[key] ?? key; }
function formatReadingTime(minutes){ return `${minutes} ${t('readMin')}`; }
function formatLevel(level){
  if (state.uiLanguage === 'en') return level;
  return ({'Upper intermediate':'中高级','Intermediate':'中级','Advanced':'高级','Beginner':'初级'}[level] || level);
}
function localizeCategory(category){
  if (state.uiLanguage === 'en') return category;
  return ({Technology:'科技',Business:'商业',Economics:'经济',Cities:'城市',Science:'科学',Society:'社会',Other:'其他'}[category] || category);
}


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
  speechPhase: 'idle',
  speechPlaying: false,
  speechPaused: false,
  speechStartedAt: null,
  speechElapsedMs: 0,
  speechEstimatedDuration: 0,
  speechResumeChar: 0,
  speechBoundaryChar: 0,
  translationBusy: false,
  translationError: '',
  previousOpen: false,
  uiLanguage: localStorage.getItem('jenglish-ui-language') || 'zh',
  contentLanguage: 'en',
  speechProgress: 0,
  speechTimer: null,
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
  return new Intl.DateTimeFormat(state.uiLanguage === 'en' ? 'en-GB' : 'zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));
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
      <div class="setup-state"><div class="eyebrow">${t('contentApi')}</div><h1>${t('articleUnavailable')}</h1><p>${escapeHtml(state.loadError)}</p><button class="primary-button" data-retry-content>${t('retry')}</button><p class="setup-note">${t('connectApi')}</p></div>` : `
      <div class="setup-state"><div class="eyebrow">${t('contentApi')}</div><h1>${t('loadingContent')}</h1><p>${t('connectApi')}</p></div>`;
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
        <nav class="topnav" aria-label="${t('navigation')}">
          <button class="topnav-link ${state.activeNav === 'articles' ? 'is-active' : ''}" data-nav="articles">${t('articles')}</button>
          <button class="topnav-link ${state.activeNav === 'saved' ? 'is-active' : ''}" data-nav="saved">${t('saved')} <span class="count-chip">${savedCount}</span></button>
        </nav>
        <div class="top-actions">
          <div class="language-switch" aria-label="${t('language')}">
            <button class="language-choice ${state.contentLanguage==='zh' ? 'is-active' : ''}" data-language="zh">中文</button>
            <button class="language-choice ${state.contentLanguage==='en' ? 'is-active' : ''}" data-language="en">EN</button>
          </div>
          <button class="icon-button" data-theme aria-label="${t('theme')}">◐</button>
        </div>
      </header>

      <main class="workspace ${state.drawerOpen ? '' : 'ai-closed'}">
        <aside class="sidebar">
          <div class="sidebar-section-title">${t('thisWeek')}</div>
          <button class="sidebar-link is-current" data-nav="articles">${icon('spark')} ${t('thisWeek')}</button>
          <button class="sidebar-link previous-trigger ${state.previousOpen ? 'is-open' : ''}" data-previous-toggle>
            ${icon('chevronDown')} <span>${t('previous')}</span>
            <span class="previous-count">${previous.length}</span>
          </button>
          ${state.previousOpen ? `<div class="previous-cascade" aria-label="${t('similarArticles')}">
            ${previous.map((item, idx) => `
              <button class="cascade-card cascade-${idx + 1}" data-article="${escapeHtml(item.slug)}">
                <img src="${escapeHtml(item.coverImageUrl || '/assets/thumb-technology.svg')}" alt="" loading="lazy">
                <span class="cascade-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(localizeCategory(item.category))} · ${formatReadingTime(item.readingTime)}</small></span>
              </button>`).join('')}
          </div>` : ''}
          <div class="sidebar-heading">${t('articles')}</div>
          <div class="article-list">${state.articles.map(item => `
            <button class="article-item ${item.slug === a.slug ? 'is-selected' : ''}" data-article="${escapeHtml(item.slug)}">
              <span class="article-item-dot"></span>
              <span class="article-item-text">
                <strong>${escapeHtml(item.title)}</strong>
                <small>${escapeHtml(localizeCategory(item.category))} · ${formatReadingTime(item.readingTime)}</small>
              </span>
              ${item.slug === a.slug ? `<span class="article-item-arrow">${icon('chevron')}</span>` : ''}
            </button>`).join('')}</div>
          <div class="sidebar-footer">
            <div class="mini-stat"><span>${t('level')}</span><strong>${escapeHtml(formatLevel(a.level))}</strong></div>
            <div class="mini-stat"><span>${t('savedCount')}</span><strong>${savedCount}</strong></div>
          </div>
        </aside>

        <section class="reader-column">
          <div class="reader-switcher-mobile">
            <button class="previous-trigger-mobile ${state.previousOpen ? 'is-open' : ''}" data-previous-toggle>${icon('chevronDown')} ${t('previous')} <span>${previous.length}</span></button>
            ${state.previousOpen ? `<div class="previous-cascade-mobile">${previous.map(item => `<button data-article="${escapeHtml(item.slug)}"><img src="${escapeHtml(item.coverImageUrl || '/assets/thumb-technology.svg')}" alt=""><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(localizeCategory(item.category))}</small></span></button>`).join('')}</div>` : ''}
          </div>
          <div class="reader-topline">
            <span>${escapeHtml(localizeCategory(a.category))}</span>
            <span class="dot-sep">•</span>
            <span>${escapeHtml(formatDate(a.date))}</span>
            <span class="dot-sep">•</span>
            <span>${formatReadingTime(a.readingTime)}</span>
          </div>
          <article class="article-reader" aria-label="${t('reader')}">
            <div class="article-cover-row">
              <div>
                <h1>${escapeHtml(a.title)}</h1>
                <p class="article-dek">${escapeHtml(a.dek)}</p>
              </div>
              <img class="article-cover" src="${escapeHtml(a.coverImageUrl || '/assets/thumb-technology.svg')}" alt="">
            </div>
            <div class="article-meta"><span class="level-pill">${escapeHtml(formatLevel(a.level))}</span>${a.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
            <div class="article-translation-state">
              ${state.translationBusy ? `<span class="translation-loading"><span></span><span></span><span></span> ${t('loadingTranslation')}</span>` : ''}
              ${state.translationError ? `<span class="translation-error">${escapeHtml(state.translationError)}</span>` : ''}
            </div>
            ${state.contentLanguage === 'zh' ? `
              <div class="translation-body" lang="zh-CN">
                ${translationParagraphs.length ? translationParagraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('') : `<div class="translation-empty">${t('translationEmpty')}</div>`}
              </div>` : `
              <div class="article-body" lang="en">
                ${a.paragraphs.map((paragraph, pIdx) => `<p>${paragraph.sentences.map((sentence, sIdx) => {
                  const id = String(sentence.id);
                  const isSelected = id === selectedId;
                  return `<button class="sentence ${isSelected ? 'is-selected' : ''}" data-sentence="${id}" data-pidx="${pIdx}" data-sidx="${sIdx}" aria-pressed="${isSelected}">${escapeHtml(sentence.text)}</button>`;
                }).join(' ')}</p>`).join('')}
              </div>`}
            <div class="reader-endnote">
              <span>${t('editorial')}</span>
              <button class="save-page" data-save-article>${t('saveArticle')} ${icon('bookmark')}</button>
            </div>
          </article>
        </section>

        <aside class="ai-panel ${state.drawerOpen ? 'is-open' : 'is-hidden'}" aria-label="${t('aiAssistant')}">
          <div class="ai-panel-header">
            <div>
              <div class="eyebrow"><span class="ai-dot"></span> ${t('aiAssistant')}</div>
              <h2>${t('assistantTitle')}</h2>
            </div>
            <button class="panel-close" data-close-ai aria-label="${t('closeAi')}">${icon('x')}</button>
          </div>

          ${state.selected ? `
          <div class="selected-card">
            <div class="selected-label">${t('selected')}</div>
            <div class="selected-text">${escapeHtml(state.selected.text)}</div>
            <div class="selected-actions">
              ${[['explain',t('explain')],['chinese',t('chinese')],['translate',t('translate')],['grammar',t('grammar')],['vocabulary',t('vocabulary')],['simplify',t('simplify')]].map(([mode,label]) => `<button class="ai-action ${cachedSentenceGeneration(mode) ? 'has-cache' : ''}" data-ai-action="${mode}" ${state.busy ? 'disabled' : ''}>${label}</button>`).join('')}
              <button class="ai-action ai-action-listen" data-listen aria-label="${t('listen')}">${icon('headphones')} ${t('listen')}</button>
              <button class="ai-action" data-save-sentence>${savedSentenceExists(state.selected.text) ? t('saveDone') : t('save')}</button>
            </div>
          </div>` : `
            <div class="ai-empty">
              <div class="ai-empty-icon">${icon('spark')}</div>
              <h3>${t('emptyAi')}</h3>
              <p>${t('noSelection')}</p>
              <div class="prompt-chips">
                <button data-demo-prompt="${t('simpleExplain')}">${t('simpleExplain')}</button>
                <button data-demo-prompt="${t('keyExpressions')}">${t('keyExpressions')}</button>
                <button data-demo-prompt="${t('grammarExplain')}">${t('grammarExplain')}</button>
              </div>
            </div>
          `}

          <div class="conversation" id="conversation">
            ${state.aiMessages.length ? state.aiMessages.map(m => `<div class="message ${m.role}"><div class="message-label">${m.role === 'user' ? (state.uiLanguage === 'en' ? 'You' : '你') : 'JEnglish AI'}</div><div class="message-body">${escapeHtml(m.content).replace(/\n/g,'<br>')}</div></div>`).join('') : ''}
            ${state.busy ? `<div class="message assistant"><div class="message-label">JEnglish AI</div><div class="thinking"><span></span><span></span><span></span></div></div>` : ''}
          </div>

          ${state.aiError ? `<div class="ai-error" role="alert">${escapeHtml(state.aiError)} <button data-retry>${t('retry')}</button></div>` : ''}

          <form class="ask-form" data-ask-form>
            <div class="ask-input-wrap">
              <textarea name="question" rows="2" placeholder="${t('articlePrompt')}" aria-label="${t('ask')}"></textarea>
              <button class="send-button" type="submit" ${state.busy ? 'disabled' : ''} aria-label="${t('send')}">${icon('send')}</button>
            </div>
            <div class="ask-hint"><span>${t('contextAttached')}</span><kbd>Enter</kbd><span>${t('send')}</span></div>
          </form>
        </aside>

        ${!state.drawerOpen ? `<button class="ai-reopen" data-open-ai aria-label="${t('reopenAi')}">${icon('spark')} AI</button>` : ''}
      </main>

      <div class="mobile-backdrop ${state.drawerOpen ? 'is-visible' : ''}" data-close-ai></div>
    </div>`;

  renderSpeechControl();
  bindEvents();
}

function renderSpeechControl() {
  const host = document.querySelector('#speech-control');
  if (!host) return;

  // Mount the control only once. Replacing this DOM on every article render
  // was the source of the visual reset: a rerender could recreate the track
  // while speech was paused. Playback progress now lives in the controller
  // state and this DOM stays mounted for the lifetime of the page.
  if (!host.querySelector('.audio-bar')) {
    host.innerHTML = `
      <div class="audio-bar">
        <div class="audio-main">
          <button class="audio-play" data-play aria-label="${t('listen')}" aria-pressed="false">${icon('play')}</button>
          <div class="audio-track">
            <div class="audio-line">
              <span class="audio-progress"></span>
              <span class="audio-progress-thumb"></span>
            </div>
            <div class="audio-caption"><span data-speech-caption></span><span data-speech-language></span></div>
          </div>
        </div>
        <div class="audio-controls">
          <select data-speed aria-label="${t('playbackSpeed')}">${[0.75,1,1.25,1.5].map(v => `<option value="${v}" ${state.speed === v ? 'selected' : ''}>${v}×</option>`).join('')}</select>
          <button class="audio-icon" data-next aria-label="${t('nextSentence')}">›</button>
        </div>
      </div>`;
    host.querySelector('[data-play]')?.addEventListener('click', toggleSpeech);
    host.querySelector('[data-next]')?.addEventListener('click', nextSentence);
    host.querySelector('[data-speed]')?.addEventListener('change', (e) => { state.speed = Number(e.target.value); });
  }

  const caption = host.querySelector('[data-speech-caption]');
  const language = host.querySelector('[data-speech-language]');
  if (caption) caption.textContent = state.selected?.text || t('chooseSentence');
  if (language) language.textContent = state.selected ? t('british') : '—';
  const speed = host.querySelector('[data-speed]');
  if (speed && Number(speed.value) !== state.speed) speed.value = String(state.speed);

  syncSpeechProgressVisuals();
  syncSpeechControlVisual();
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
    if (speechSynthesis?.speaking || state.speechPaused || state.speechPlaying) { speechSynthesis.cancel(); state.speechToken += 1; }
    state.speechPlaying = false;
    resetSpeechProgress();
    state.selected = { id: String(sentence.id), text: sentence.text, paragraph: a.paragraphs[pIdx], pIdx, sIdx };
    state.aiError = '';
    state.drawerOpen = true;
    render();
  }));

  document.querySelectorAll('[data-ai-action]').forEach(btn => btn.addEventListener('click', () => runAi(btn.dataset.aiAction)));
  document.querySelector('[data-save-sentence]')?.addEventListener('click', saveSelectedSentence);
  document.querySelectorAll('[data-close-ai]').forEach(btn => btn.addEventListener('click', closeDrawer));
  document.querySelector('[data-open-ai]')?.addEventListener('click', openDrawer);
  document.querySelector('[data-ask-form]')?.addEventListener('submit', (e) => { e.preventDefault(); const text = e.currentTarget.question.value.trim(); if (text) runAi('chat', text); });
  document.querySelectorAll('[data-demo-prompt]').forEach(btn => btn.addEventListener('click', () => {
    const input = document.querySelector('[name="question"]');
    if (input) input.value = btn.dataset.demoPrompt;
    if (state.selected) runAi('chat', btn.dataset.demoPrompt); else showToast(t('selectSentence'));
  }));
  document.querySelector('[data-theme]')?.addEventListener('click', () => document.body.classList.toggle('dark'));
  document.querySelector('[data-retry]')?.addEventListener('click', () => state.selected ? runAi('explain') : null);
  document.querySelector('[data-save-article]')?.addEventListener('click', saveArticle);
  document.querySelectorAll('[data-previous-toggle]').forEach(btn => btn.addEventListener('click', () => { state.previousOpen = !state.previousOpen; render(); }));
  document.querySelectorAll('[data-language]').forEach(btn => btn.addEventListener('click', () => selectContentLanguage(btn.dataset.language)));
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, { headers: { Accept: 'application/json', ...(options.headers || {}) }, ...options });
  let data = {};
  try { data = await response.json(); } catch { /* preserve useful HTTP error below */ }
  if (!response.ok) throw new Error(data.error || (state.uiLanguage === 'en' ? `Request failed (${response.status}).` : `请求失败 (${response.status})。`));
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
    state.loadError = error instanceof Error ? error.message : t('readerApiError');
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
  state.contentLanguage = state.uiLanguage;
  state.translationError = '';
  state.translationBusy = state.uiLanguage === 'zh';
  state.articleId = slug;
  if (push) history.pushState({}, '', `/ai/te/${slug}`);
  render();
  try {
    const { article: data } = await apiJson(`/api/articles/${encodeURIComponent(slug)}`);
    state.currentArticle = data;
    state.loading = false;
    state.drawerOpen = true;
    render();
    if (state.uiLanguage === 'zh' && !state.currentArticle.ai?.articleTranslationZh) await selectContentLanguage('zh', { syncUi: false });
  } catch (error) {
    state.currentArticle = null;
    state.loading = false;
    state.loadError = error instanceof Error ? error.message : t('articleUnavailable');
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

async function selectContentLanguage(language, { syncUi = true } = {}) {
  const target = language === 'zh' ? 'zh' : 'en';
  state.contentLanguage = target;
  if (syncUi) {
    state.uiLanguage = target;
    localStorage.setItem('jenglish-ui-language', target);
  }
  if (target === 'en') { state.translationBusy = false; state.translationError = ''; render(); return; }
  if (article()?.ai?.articleTranslationZh) { state.translationBusy = false; state.translationError = ''; render(); return; }
  state.translationBusy = true;
  state.translationError = '';
  render();
  try {
    const current = article();
    const data = await apiJson('/api/ai', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ mode:'article_translate', articleId:current.id, articleSlug:current.slug, articleText:articleText(current) }),
    });
    if (!data?.answer) throw new Error(t('translationFailed'));
    state.currentArticle.ai ||= { articleTranslationZh: null, sentences: {} };
    state.currentArticle.ai.articleTranslationZh = data.answer;
  } catch (error) {
    state.contentLanguage = 'en';
    state.translationError = error instanceof Error ? error.message : t('translationFailed');
  } finally {
    state.translationBusy = false;
    render();
  }
}


async function runAi(mode, question = '') {
  if (state.busy) return;
  if (mode !== 'chat' && !state.selected) { showToast(t('selectSentence')); return; }
  const cached = mode !== 'chat' ? cachedSentenceGeneration(mode) : null;
  const userText = mode === 'chat' ? question : ({explain:t('explain'),chinese:t('chinese'),translate:t('translate'),grammar:t('grammar'),vocabulary:t('vocabulary'),simplify:t('simplify')}[mode] || mode);
  state.aiError = '';
  state.aiMessages.push({ role:'user', content:userText });
  if (cached) {
    state.aiMessages.push({ role:'assistant', content:cached });
    render();
    return;
  }
  state.busy = true;
  render();
  try {
    const current = article();
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        mode, articleId:current.id, articleSlug:current.slug,
        selectedSentenceId:state.selected?.id || '', selectedSentence:sentenceText(),
        paragraphContext:sentenceContext(), question,
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'AI 请求失败。');
    if (!data?.answer) throw new Error('AI 返回了空结果。');
    if (state.selected && mode !== 'chat') {
      state.currentArticle.ai ||= { articleTranslationZh: null, sentences: {} };
      state.currentArticle.ai.sentences ||= {};
      state.currentArticle.ai.sentences[state.selected.id] ||= {};
      state.currentArticle.ai.sentences[state.selected.id][mode] = data.answer;
    }
    state.aiMessages.push({ role:'assistant', content:data.answer });
  } catch (error) {
    state.aiError = error instanceof Error ? error.message : `${t('aiAssistant')} ${t('retry')}。`;
  } finally {
    state.busy = false;
    render();
  }
}

function stopSpeechTimer() {
  if (state.speechTimer) cancelAnimationFrame(state.speechTimer);
  state.speechTimer = null;
}

function syncSpeechProgressVisuals() {
  const progressValue = Math.max(0, Math.min(1, Number(state.speechProgress) || 0));
  const percent = `${progressValue * 100}%`;
  const progress = document.querySelector('.audio-progress');
  const thumb = document.querySelector('.audio-progress-thumb');
  if (progress) progress.style.width = percent;
  if (thumb) thumb.style.left = percent;
}

function syncSpeechControlVisual() {
  const button = document.querySelector('[data-play]');
  if (!button) return;
  const active = state.speechPhase === 'playing';
  button.innerHTML = active ? icon('pause') : icon('play');
  button.setAttribute('aria-label', active ? t('pause') : t('listen'));
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
}

function resetSpeechProgress() {
  stopSpeechTimer();
  state.speechPhase = 'idle';
  state.speechPlaying = false;
  state.speechPaused = false;
  state.speechProgress = 0;
  state.speechElapsedMs = 0;
  state.speechStartedAt = null;
  state.speechEstimatedDuration = 0;
  state.speechResumeChar = 0;
  state.speechBoundaryChar = 0;
  state.speechToken += 1;
  syncSpeechProgressVisuals();
  syncSpeechControlVisual();
}

function updateSpeechProgressNow() {
  if (!state.speechPlaying || state.speechPaused || state.speechStartedAt == null) return;
  const elapsed = state.speechElapsedMs + Math.max(0, performance.now() - state.speechStartedAt);
  const nextProgress = Math.min(0.995, elapsed / Math.max(1, state.speechEstimatedDuration));
  if (nextProgress > state.speechProgress) {
    state.speechProgress = nextProgress;
    const textLength = state.selected?.text?.length || 0;
    if (textLength) {
      state.speechResumeChar = Math.max(
        state.speechResumeChar,
        Math.min(textLength - 1, Math.floor(state.speechProgress * textLength))
      );
    }
    syncSpeechProgressVisuals();
  }
}

function startSpeechProgressLoop() {
  stopSpeechTimer();
  const updateSpeechProgress = () => {
    if (!state.speechPlaying || state.speechPaused) return;
    updateSpeechProgressNow();
    state.speechTimer = requestAnimationFrame(updateSpeechProgress);
  };
  state.speechTimer = requestAnimationFrame(updateSpeechProgress);
}

function pauseSpeech() {
  if (!state.speechPlaying || state.speechPaused) return;

  // Capture the exact UI position before changing any speech-engine state.
  updateSpeechProgressNow();
  const pausedProgress = Math.max(0, Math.min(1, state.speechProgress));
  const textLength = state.selected?.text?.length || 0;
  if (textLength) {
    state.speechResumeChar = Math.max(
      0,
      Math.min(textLength - 1, Math.floor(pausedProgress * textLength))
    );
  }
  state.speechElapsedMs = pausedProgress * state.speechEstimatedDuration;
  state.speechStartedAt = null;
  state.speechPlaying = false;
  state.speechPaused = true;
  state.speechPhase = 'paused';
  stopSpeechTimer();

  // Invalidate the old utterance before canceling it. Some browsers fire
  // onend/onerror asynchronously after cancel(); those callbacks must not
  // change the saved paused position.
  state.speechToken += 1;
  try { speechSynthesis.cancel(); } catch {}

  // IMPORTANT: do not call render() here. The existing DOM is deliberately
  // left untouched so the white dot and colored track cannot jump to 0.
  syncSpeechProgressVisuals();
  syncSpeechControlVisual();
}

function speakSelectedFromOffset() {
  if (!state.selected) return;
  const fullText = state.selected.text;
  const textLength = fullText.length;
  if (!textLength) return;

  const offset = Math.max(0, Math.min(textLength - 1, state.speechResumeChar || 0));
  const remainingText = fullText.slice(offset);
  if (!remainingText) {
    state.speechProgress = 1;
    state.speechPlaying = false;
    state.speechPaused = false;
    state.speechElapsedMs = state.speechEstimatedDuration || 0;
    state.speechStartedAt = null;
    state.speechResumeChar = textLength;
    syncSpeechProgressVisuals();
    syncSpeechControlVisual();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(remainingText);
  utterance.lang = 'en-GB';
  utterance.rate = state.speed;

  const token = ++state.speechToken;
  const fullDuration = Math.max(1800, Math.min(18_000, (textLength * 62) / state.speed));
  state.speechEstimatedDuration = fullDuration;
  state.speechElapsedMs = Math.max(0, state.speechProgress * fullDuration);
  state.speechStartedAt = performance.now();
  state.speechBoundaryChar = offset;
  state.speechPlaying = true;
  state.speechPaused = false;
  state.speechPhase = 'playing';

  // Invalidate/cancel any stale utterance before speaking the resumed one.
  try { speechSynthesis.cancel(); } catch {}
  speechSynthesis.speak(utterance);

  // Do not rerender the page; preserve the exact progress-bar DOM position.
  syncSpeechProgressVisuals();
  syncSpeechControlVisual();
  startSpeechProgressLoop();

  utterance.onboundary = (event) => {
    if (token !== state.speechToken || state.speechPaused) return;
    if (typeof event.charIndex !== 'number' || !textLength) return;
    const absoluteChar = Math.min(textLength - 1, offset + event.charIndex);
    state.speechBoundaryChar = Math.max(state.speechBoundaryChar, absoluteChar);
    state.speechResumeChar = state.speechBoundaryChar;
    const boundaryProgress = Math.max(0, Math.min(0.995, absoluteChar / textLength));
    if (boundaryProgress > state.speechProgress) {
      state.speechProgress = boundaryProgress;
      state.speechElapsedMs = state.speechProgress * fullDuration;
      state.speechStartedAt = performance.now();
      syncSpeechProgressVisuals();
    }
  };

  utterance.onend = () => {
    if (token !== state.speechToken || state.speechPaused) return;
    state.speechPlaying = false;
    state.speechPaused = false;
    state.speechPhase = 'ended';
    state.speechProgress = 1;
    state.speechElapsedMs = fullDuration;
    state.speechStartedAt = null;
    state.speechResumeChar = textLength;
    state.speechBoundaryChar = textLength;
    stopSpeechTimer();
    syncSpeechProgressVisuals();
    syncSpeechControlVisual();
  };

  utterance.onerror = () => {
    if (token !== state.speechToken || state.speechPaused) return;
    state.speechPlaying = false;
    state.speechPaused = false;
    state.speechPhase = 'idle';
    stopSpeechTimer();
    // Keep the last visible position on an engine error rather than jumping
    // back to the beginning.
    syncSpeechProgressVisuals();
    syncSpeechControlVisual();
  };
}

function resumeSpeech() {
  if (!state.speechPaused) return;
  // Keep state.speechProgress exactly where pauseSpeech left it.
  speakSelectedFromOffset();
}

function toggleSpeech() {
  if (!state.selected || !('speechSynthesis' in window)) {
    showToast(state.selected ? t('browserNoSpeech') : t('selectSentence'));
    return;
  }

  if (state.speechPaused) {
    resumeSpeech();
    return;
  }

  if (state.speechPlaying) {
    pauseSpeech();
    return;
  }

  // A fresh Play starts at zero. Resume never reaches this branch.
  state.speechPhase = 'idle';
  state.speechProgress = 0;
  state.speechElapsedMs = 0;
  state.speechStartedAt = null;
  state.speechEstimatedDuration = 0;
  state.speechResumeChar = 0;
  state.speechBoundaryChar = 0;
  speakSelectedFromOffset();
}

function nextSentence() {
  if (!state.selected) return showToast(t('selectSentence'));
  const a = article();
  let p = state.selected.pIdx, s = state.selected.sIdx + 1;
  if (s >= a.paragraphs[p].sentences.length) { p++; s = 0; }
  if (p >= a.paragraphs.length) { p = 0; s = 0; }
  const sentence = a.paragraphs[p].sentences[s];
  if (speechSynthesis?.speaking || state.speechPaused || state.speechPlaying) { speechSynthesis.cancel(); state.speechToken += 1; }
  state.speechPlaying = false;
  resetSpeechProgress();
  state.selected = { id:String(sentence.id), text:sentence.text, paragraph:a.paragraphs[p], pIdx:p, sIdx:s };
  state.drawerOpen = true;
  render();
}

function savedSentenceExists(text) { return state.saved.some(item => item.kind === 'sentence' && item.text === text); }

function saveSelectedSentence() {
  if (!state.selected) return;
  if (savedSentenceExists(state.selected.text)) return showToast(t('sentenceAlreadySaved'));
  state.saved.push({key:`sentence:${article().id}:${state.selected.text}`, kind:'sentence', text:state.selected.text, articleId:article().id, createdAt:Date.now()});
  persistSaved(); render(); showToast(t('sentenceSaved'));
}

function saveArticle() {
  const a = article();
  const key = `article:${a.id}`;
  if (!state.saved.some(item => item.key === key)) state.saved.push({key, kind:'article', title:a.title, articleId:a.id, createdAt:Date.now()});
  persistSaved(); render(); showToast(t('articleSaved'));
}

function renderSavedOverlay() {
  const overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = `<div class="saved-modal"><div class="saved-modal-head"><div><div class="eyebrow">${t('saved')}</div><h2>${t('savedContent')}</h2></div><button class="panel-close" data-close>${icon('x')}</button></div>
  <div class="saved-list">${state.saved.length ? state.saved.map((x,i)=>`<div class="saved-row"><div><small>${x.kind === 'sentence' ? t('savedSentence') : t('savedArticle')}</small><strong>${escapeHtml(x.text || x.title)}</strong>${x.articleId ? `<span>${escapeHtml(state.articles.find(a=>String(a.id)===String(x.articleId))?.title || '')}</span>`:''}</div><button data-remove="${i}">${t('delete')}</button></div>`).join('') : `<div class="saved-empty"><div class="ai-empty-icon">${icon('bookmark')}</div><h3>${t('noSaved')}</h3><p>${t('saveHint')}</p></div>`}</div></div>`;
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
      persistSaved(); showToast(t('sentenceSaved'));
    }
  }
});
window.addEventListener('popstate', () => {
  const slug = new URL(location.href).pathname.match(/\/ai\/te\/([^/]+)/)?.[1] || state.articles[0]?.slug;
  if (slug) loadArticle(slug, false);
});
render();
initContent();
