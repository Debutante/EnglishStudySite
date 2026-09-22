const ARTICLES = [
  {
    id: 'ai-productivity',
    category: 'Technology',
    date: 'Sep 18, 2026',
    level: 'Upper intermediate',
    readingTime: 5,
    title: 'AI is changing where productivity comes from',
    dek: 'The next gains may come less from faster software and more from better decisions about how work is organised.',
    tags: ['AI', 'work', 'productivity'],
    paragraphs: [
      [
        'Companies once looked to new software mainly for faster execution.',
        'Increasingly, the bigger opportunity is to decide which work should be automated, which should remain human and which should be redesigned altogether.'
      ],
      [
        'That shift matters because the cost of generating a first draft, query or analysis is falling rapidly.',
        'The scarce resource is becoming the judgement required to turn those outputs into useful decisions.'
      ],
      [
        'Managers therefore need to treat AI as a change to the workflow, not simply as another tool in the toolbox.',
        'Teams that redesign their processes around the technology may see larger gains than teams that merely add a chatbot to an existing routine.'
      ]
    ]
  },
  {
    id: 'city-energy',
    category: 'Economics',
    date: 'Sep 16, 2026',
    level: 'Advanced',
    readingTime: 6,
    title: 'Cities are learning to price scarce energy',
    dek: 'As electricity demand grows, local systems are experimenting with signals that encourage consumers to move usage away from crowded periods.',
    tags: ['energy', 'cities', 'economics'],
    paragraphs: [
      [
        'Electricity networks are built to meet demand at the busiest moments, even though those moments may occur for only a few hours each year.',
        'That makes peak demand unusually expensive and creates a strong incentive to spread consumption over time.'
      ],
      [
        'Digital meters make it easier to send households and businesses a price signal that changes during the day.',
        'The idea is simple, but its effects depend on whether consumers understand the signal and have practical ways to respond.'
      ],
      [
        'The challenge for city governments is to balance efficiency with fairness.',
        'A pricing system can reduce pressure on the grid, yet it should not leave households with limited flexibility paying the highest costs.'
      ]
    ]
  },
  {
    id: 'mobility-data',
    category: 'Cities',
    date: 'Sep 12, 2026',
    level: 'Upper intermediate',
    readingTime: 4,
    title: 'Better mobility data can change the shape of a city',
    dek: 'Transport planning is moving from counting vehicles towards understanding how people actually move between places.',
    tags: ['mobility', 'data', 'urban planning'],
    paragraphs: [
      [
        'For decades, transport agencies often measured success by counting vehicles, estimating travel times and expanding roads where congestion appeared.',
        'Newer datasets can reveal a more complicated picture of how people move across a city.'
      ],
      [
        'When planners combine travel records with land-use and demographic information, they can see which neighbourhoods have good access to jobs and which do not.',
        'That can shift the conversation from moving cars faster to improving access to opportunities.'
      ],
      [
        'The hardest part is not collecting another dataset.',
        'It is deciding how several imperfect sources should be combined without creating false precision or overlooking people who generate little digital trace.'
      ]
    ]
  }
];

const STORAGE_KEY = 'jenglish-te-saved-v1';
const UI = {
  articles: 'Articles', saved: 'Saved', thisWeek: 'This week', previous: 'Previous articles',
  explain: '意味を説明', translate: '日本語訳', grammar: '文法', vocabulary: '語彙', simplify: 'やさしい英語', listen: '聞く',
  ask: 'AIに質問', selected: '選択した文', emptyAi: '文を選択すると、ここで質問できます。',
};

const state = {
  articleId: new URL(location.href).pathname.match(/\/ai\/te\/([^/]+)/)?.[1] || ARTICLES[0].id,
  selected: null,
  aiMessages: [],
  busy: false,
  aiError: '',
  drawerOpen: false,
  saved: loadSaved(),
  activeNav: 'articles',
  lang: 'ja',
  speed: 1,
  speechToken: 0,
};

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function persistSaved() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saved)); }
function article() { return ARTICLES.find(a => a.id === state.articleId) || ARTICLES[0]; }
function sentenceText() { return state.selected?.text || ''; }
function sentenceContext() { return state.selected?.paragraph?.join(' ') || ''; }
function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
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
    headphones: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15v-3a7 7 0 0 1 14 0v3m-14 0a2 2 0 0 0 2 2h1v-5H7a2 2 0 0 0-2 2v1Zm14 0a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2v1Z"/></svg>'
  };
  return icons[name] || '';
}

function render() {
  const a = article();
  const savedCount = state.saved.length;
  const selectedId = state.selected?.id;

  document.querySelector('#app').innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand-wrap">
          <a class="brand" href="/ai/te" data-nav-home>JEnglish</a>
          <span class="brand-divider"></span>
          <span class="brand-product">TE AI Reader</span>
        </div>
        <nav class="topnav" aria-label="Primary navigation">
          <button class="topnav-link ${state.activeNav === 'articles' ? 'is-active' : ''}" data-nav="articles">Articles</button>
          <button class="topnav-link ${state.activeNav === 'saved' ? 'is-active' : ''}" data-nav="saved">Saved <span class="count-chip">${savedCount}</span></button>
        </nav>
        <div class="top-actions">
          <button class="quiet-button" data-lang-toggle aria-label="Toggle language">日本語 / EN</button>
          <button class="icon-button" data-theme aria-label="Toggle theme">◐</button>
        </div>
      </header>

      <main class="workspace">
        <aside class="sidebar">
          <div class="sidebar-section-title">TE WEEKLY</div>
          <button class="sidebar-link is-current" data-nav="articles">${icon('spark')} ${UI.thisWeek}</button>
          <button class="sidebar-link" data-nav="previous">${icon('chevron')} ${UI.previous}</button>
          <div class="sidebar-heading">ARTICLES</div>
          <div class="article-list">${ARTICLES.map(item => `
            <button class="article-item ${item.id === a.id ? 'is-selected' : ''}" data-article="${item.id}">
              <span class="article-item-dot"></span>
              <span class="article-item-text">
                <strong>${escapeHtml(item.title)}</strong>
                <small>${escapeHtml(item.category)} · ${item.readingTime} min</small>
              </span>
              ${item.id === a.id ? `<span class="article-item-arrow">${icon('chevron')}</span>` : ''}
            </button>`).join('')}</div>
          <div class="sidebar-footer">
            <div class="mini-stat"><span>Level</span><strong>${escapeHtml(a.level)}</strong></div>
            <div class="mini-stat"><span>Saved</span><strong>${savedCount}</strong></div>
          </div>
        </aside>

        <section class="reader-column">
          <div class="reader-topline">
            <span>${escapeHtml(a.category)}</span>
            <span class="dot-sep">•</span>
            <span>${escapeHtml(a.date)}</span>
            <span class="dot-sep">•</span>
            <span>${a.readingTime} min read</span>
          </div>
          <article class="article-reader" aria-label="Article reader">
            <h1>${escapeHtml(a.title)}</h1>
            <p class="article-dek">${escapeHtml(a.dek)}</p>
            <div class="article-meta"><span class="level-pill">${escapeHtml(a.level)}</span>${a.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
            <div class="article-body">
              ${a.paragraphs.map((paragraph, pIdx) => `<p>${paragraph.map((text, sIdx) => {
                const id = `${a.id}-${pIdx}-${sIdx}`;
                const isSelected = id === selectedId;
                return `<button class="sentence ${isSelected ? 'is-selected' : ''}" data-sentence="${id}" data-pidx="${pIdx}" data-sidx="${sIdx}" aria-pressed="${isSelected}">${escapeHtml(text)}</button>`;
              }).join(' ')}</p>`).join('')}
            </div>
            <div class="reader-endnote">
              <span>JEnglish · Editorial English learning workspace</span>
              <button class="save-page" data-save-article>Save article ${icon('bookmark')}</button>
            </div>
          </article>
        </section>

        <aside class="ai-panel ${state.drawerOpen ? 'is-open' : ''}" aria-label="AI Assistant">
          <div class="ai-panel-header">
            <div>
              <div class="eyebrow"><span class="ai-dot"></span> AI ASSISTANT</div>
              <h2>Learn from the sentence.</h2>
            </div>
            <button class="panel-close" data-close-ai aria-label="Close AI panel">${icon('x')}</button>
          </div>

          ${state.selected ? `
          <div class="selected-card">
            <div class="selected-label">${UI.selected}</div>
            <div class="selected-text">${escapeHtml(state.selected.text)}</div>
            <div class="selected-actions">
              ${[['explain',UI.explain],['translate',UI.translate],['grammar',UI.grammar],['vocabulary',UI.vocabulary],['simplify',UI.simplify]].map(([mode,label]) => `<button class="ai-action" data-ai-action="${mode}" ${state.busy ? 'disabled' : ''}>${label}</button>`).join('')}
              <button class="ai-action ai-action-listen" data-listen aria-label="Listen">${icon('headphones')} ${UI.listen}</button><button class="ai-action" data-save-sentence>${savedSentenceExists(state.selected.text) ? '保存済み' : '保存'}</button>
            </div>
          </div>` : `
            <div class="ai-empty">
              <div class="ai-empty-icon">${icon('spark')}</div>
              <h3>${UI.emptyAi}</h3>
              <p>選択した文を日本語で説明、翻訳、文法解析できます。</p>
              <div class="prompt-chips">
                <button data-demo-prompt="この文を簡単に説明して">この文を簡単に説明して</button>
                <button data-demo-prompt="重要な表現を教えて">重要な表現を教えて</button>
                <button data-demo-prompt="文法を説明して">文法を説明して</button>
              </div>
            </div>
          `}

          <div class="conversation" id="conversation">
            ${state.aiMessages.length ? state.aiMessages.map(m => `<div class="message ${m.role}"><div class="message-label">${m.role === 'user' ? 'You' : 'JEnglish AI'}</div><div class="message-body">${escapeHtml(m.content).replace(/\n/g,'<br>')}</div></div>`).join('') : ''}
            ${state.busy ? `<div class="message assistant"><div class="message-label">JEnglish AI</div><div class="thinking"><span></span><span></span><span></span></div></div>` : ''}
          </div>

          ${state.aiError ? `<div class="ai-error" role="alert">${escapeHtml(state.aiError)} <button data-retry>Retry</button></div>` : ''}

          <form class="ask-form" data-ask-form>
            <div class="ask-input-wrap">
              <textarea name="question" rows="2" placeholder="この記事について質問する..." aria-label="Ask AI about this article"></textarea>
              <button class="send-button" type="submit" ${state.busy ? 'disabled' : ''} aria-label="Send">${icon('send')}</button>
            </div>
            <div class="ask-hint"><span>Article context is included</span><kbd>Enter</kbd><span>to send</span></div>
          </form>
        </aside>
      </main>

      <div class="audio-bar">
        <div class="audio-main">
          <button class="audio-play" data-play aria-label="Play sentence">${icon('play')}</button>
          <div class="audio-track"><div class="audio-line"><span class="audio-progress" style="width:${state.speechPlaying ? '38%' : '0%'}"></span></div><div class="audio-caption"><span>${state.selected ? escapeHtml(state.selected.text) : 'Select a sentence to listen'}</span><span>${state.selected ? 'British English' : '—'}</span></div></div>
        </div>
        <div class="audio-controls">
          <select data-speed aria-label="Playback speed">
            ${[0.75,1,1.25,1.5].map(v => `<option value="${v}" ${state.speed === v ? 'selected' : ''}>${v}×</option>`).join('')}
          </select>
          <button class="audio-icon" data-next aria-label="Next sentence">›</button>
        </div>
      </div>

      <div class="mobile-backdrop ${state.drawerOpen ? 'is-visible' : ''}" data-close-ai></div>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => {
    const nav = btn.dataset.nav;
    if (nav === 'saved') {
      state.activeNav = 'saved';
      showToast('Saved items are stored locally on this device.');
      return renderSavedOverlay();
    }
    if (nav === 'previous') {
      state.activeNav = 'articles';
      showToast('Previous issues will connect to authorized JEnglish content here.');
      return;
    }
    state.activeNav = 'articles';
    closeDrawer(); render();
  }));

  document.querySelector('[data-nav-home]')?.addEventListener('click', (e) => { e.preventDefault(); state.articleId = ARTICLES[0].id; history.pushState({}, '', '/ai/te'); state.selected = null; state.aiMessages = []; state.aiError=''; render(); });

  document.querySelectorAll('[data-article]').forEach(btn => btn.addEventListener('click', () => {
    state.articleId = btn.dataset.article;
    state.selected = null;
    state.aiMessages = [];
    state.aiError = '';
    state.activeNav = 'articles';
    history.pushState({}, '', `/ai/te/${state.articleId}`);
    closeDrawer(); render();
  }));

  document.querySelectorAll('[data-sentence]').forEach(btn => btn.addEventListener('click', () => {
    const a = article();
    const pIdx = Number(btn.dataset.pidx), sIdx = Number(btn.dataset.sidx);
    state.selected = {
      id: btn.dataset.sentence,
      text: a.paragraphs[pIdx][sIdx],
      paragraph: a.paragraphs[pIdx],
      pIdx,
      sIdx,
    };
    state.aiError = '';
    state.drawerOpen = true;
    render();
    document.querySelector('.ai-panel')?.scrollIntoView({block:'nearest'});
  }));

  document.querySelectorAll('[data-ai-action]').forEach(btn => btn.addEventListener('click', () => runAi(btn.dataset.aiAction)));
  document.querySelector('[data-listen]')?.addEventListener('click', toggleSpeech);
  document.querySelector('[data-save-sentence]')?.addEventListener('click', saveSelectedSentence);
  document.querySelector('[data-play]')?.addEventListener('click', toggleSpeech);
  document.querySelector('[data-next]')?.addEventListener('click', nextSentence);
  document.querySelector('[data-speed]')?.addEventListener('change', (e) => { state.speed = Number(e.target.value); });
  document.querySelector('[data-close-ai]')?.addEventListener('click', closeDrawer);
  document.querySelector('[data-ask-form]')?.addEventListener('submit', (e) => { e.preventDefault(); const text = e.currentTarget.question.value.trim(); if (text) runAi('chat', text); });
  document.querySelectorAll('[data-demo-prompt]').forEach(btn => btn.addEventListener('click', () => { document.querySelector('[name="question"]').value = btn.dataset.demoPrompt; if (state.selected) runAi('chat', btn.dataset.demoPrompt); else showToast('まず記事の文を選択してください。'); }));
  document.querySelector('[data-theme]')?.addEventListener('click', () => document.body.classList.toggle('dark'));
  document.querySelector('[data-lang-toggle]')?.addEventListener('click', () => showToast(state.lang === 'ja' ? 'English UI is a lightweight MVP toggle.' : '日本語 UI is active.'));
  document.querySelector('[data-retry]')?.addEventListener('click', () => state.selected ? runAi('explain') : null);
  document.querySelector('[data-save-article]')?.addEventListener('click', saveArticle);
}

function closeDrawer() { state.drawerOpen = false; render(); }

async function runAi(mode, question = '') {
  if (state.busy) return;
  if (mode !== 'chat' && !state.selected) return;
  state.busy = true; state.aiError = '';
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
        selectedSentence: sentenceText(),
        paragraphContext: sentenceContext(),
        question,
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'AI request failed.');
    state.aiMessages.push({ role:'assistant', content:data.answer });
  } catch (error) {
    state.aiError = error instanceof Error ? error.message : '回答を取得できませんでした。もう一度試してください。';
  } finally {
    state.busy = false;
    render();
  }
}

function toggleSpeech() {
  if (!state.selected || !('speechSynthesis' in window)) {
    showToast(state.selected ? 'This browser does not support speech playback.' : 'まず記事の文を選択してください。');
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
  if (!state.selected) return showToast('まず記事の文を選択してください。');
  const a = article();
  let p = state.selected.pIdx, s = state.selected.sIdx + 1;
  if (s >= a.paragraphs[p].length) { p++; s = 0; }
  if (p >= a.paragraphs.length) { p = 0; s = 0; }
  state.selected = { id:`${a.id}-${p}-${s}`, text:a.paragraphs[p][s], paragraph:a.paragraphs[p], pIdx:p, sIdx:s };
  state.drawerOpen = true;
  render();
}

function savedSentenceExists(text) { return state.saved.some(item => item.kind === 'sentence' && item.text === text); }

function saveSelectedSentence() {
  if (!state.selected) return;
  if (savedSentenceExists(state.selected.text)) return showToast('この文はすでに保存されています。');
  state.saved.push({key:`sentence:${article().id}:${state.selected.text}`, kind:'sentence', text:state.selected.text, articleId:article().id, createdAt:Date.now()});
  persistSaved(); render(); showToast('文を保存しました。');
}

function saveArticle() {
  const a = article();
  const key = `article:${a.id}`;
  if (!state.saved.some(item => item.key === key)) state.saved.push({key, kind:'article', title:a.title, articleId:a.id, createdAt:Date.now()});
  persistSaved(); render(); showToast('記事を保存しました。');
}
function renderSavedOverlay() {
  const overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = `<div class="saved-modal"><div class="saved-modal-head"><div><div class="eyebrow">SAVED</div><h2>Saved learning items</h2></div><button class="panel-close" data-close>${icon('x')}</button></div>
  <div class="saved-list">${state.saved.length ? state.saved.map((x,i)=>`<div class="saved-row"><div><small>${escapeHtml(x.kind)}</small><strong>${escapeHtml(x.text || x.title)}</strong>${x.articleId ? `<span>${escapeHtml(ARTICLES.find(a=>a.id===x.articleId)?.title || '')}</span>`:''}</div><button data-remove="${i}">Remove</button></div>`).join('') : `<div class="saved-empty"><div class="ai-empty-icon">${icon('bookmark')}</div><h3>No saved items yet</h3><p>Save a sentence or article while you read.</p></div>`}</div></div>`;
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
  if (e.target.matches('.save-page')) return;
  const sentenceBtn = e.target.closest('[data-sentence]');
  if (sentenceBtn && e.shiftKey) {
    const text = sentenceBtn.textContent.trim();
    if (!savedSentenceExists(text)) {
      state.saved.push({key:`sentence:${article().id}:${text}`, kind:'sentence', text, articleId:article().id, createdAt:Date.now()});
      persistSaved(); showToast('文を保存しました。');
    }
  }
});
window.addEventListener('popstate', () => {
  state.articleId = new URL(location.href).pathname.match(/\/ai\/te\/([^/]+)/)?.[1] || ARTICLES[0].id;
  state.selected = null; state.aiMessages = []; state.aiError = ''; render();
});
render();
