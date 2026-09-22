import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

function storage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k) => data.has(k) ? data.get(k) : null,
    setItem: (k,v) => data.set(k,String(v)),
    removeItem: (k) => data.delete(k),
    clear: () => data.clear(),
  };
}

async function boot() {
  const source = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const root = { innerHTML: '' };
  const speechRoot = { innerHTML: '', querySelector(selector) { return special.get(selector) || null; } };
  const special = new Map([
    ['.audio-progress', { style: {} }],
    ['.audio-progress-thumb', { style: {} }],
    ['#app', root],
    ['#speech-control', speechRoot],
  ]);
  const document = {
    querySelector: (selector) => special.get(selector) || null,
    querySelectorAll: () => [],
    createElement: () => ({ className:'', innerHTML:'', appendChild(){}, addEventListener(){}, querySelectorAll:()=>[] }),
    addEventListener(){},
    body: { classList: { toggle(){} }, appendChild(){} },
  };
  const localStorage = storage({ 'jenglish-ui-language':'en' });
  const sessionStorage = storage();
  const article = {
    id:'101', slug:'test-article', title:'Test Article', dek:'A test article', category:'Technology', categorySlug:'technology',
    date:'2026-09-21T00:00:00Z', level:'Upper intermediate', readingTime:5, coverImageUrl:'', tags:['AI'],
    paragraphs:[{id:'p1',position:0,text:'First sentence. Second sentence.',sentences:[{id:'s1',position:0,text:'First sentence.'},{id:'s2',position:1,text:'Second sentence.'}]}],
    ai:{articleTranslationZh:null,sentences:{}}
  };
  const summaries = [{id:'101',slug:article.slug,title:article.title,dek:article.dek,excerpt:article.dek,category:article.category,categorySlug:article.categorySlug,date:article.date,level:article.level,readingTime:5,coverImageUrl:'',tags:['AI']}];
  const fetchLog = [];
  const fetch = async (url, options={}) => {
    fetchLog.push({url,options});
    if (url === '/api/articles') return new Response(JSON.stringify({articles:summaries}), {status:200,headers:{'Content-Type':'application/json'}});
    if (url.startsWith('/api/articles/')) return new Response(JSON.stringify({article:structuredClone(article)}), {status:200,headers:{'Content-Type':'application/json'}});
    if (url === '/api/ai') {
      const body = JSON.parse(options.body);
      const answer = body.mode === 'article_translate' ? '第一段中文翻译。\n\n第二段中文翻译。' : `mock ${body.mode} answer`;
      return new Response(JSON.stringify({answer}), {status:200,headers:{'Content-Type':'application/json'}});
    }
    return new Response(JSON.stringify({error:'not mocked'}), {status:404,headers:{'Content-Type':'application/json'}});
  };
  let rafId = 0; const rafCallbacks = new Map();
  const performance = { now: () => context.__testNow };
  const context = {
    console, document, localStorage, sessionStorage, fetch, URL, Intl, Response, structuredClone,
    location:{href:'http://test.local/ai/te/test-article',pathname:'/ai/te/test-article'},
    history:{pushState(){},replaceState(){}}, window:null, addEventListener(){},
    setTimeout, clearTimeout, setInterval, clearInterval, performance,
    requestAnimationFrame:(fn)=>{ const id=++rafId; rafCallbacks.set(id,fn); return id; },
    cancelAnimationFrame:(id)=>rafCallbacks.delete(id),
    speechSynthesis:{speaking:false,paused:false,lastUtterance:null,cancelCount:0,cancel(){this.cancelCount+=1;const old=this.lastUtterance;this.speaking=false;this.paused=false;if(old && typeof old.onend==='function') old.onend();},speak(utterance){this.lastUtterance=utterance;this.speaking=true;this.paused=false;},pause(){this.paused=true;this.speaking=false;},resume(){this.paused=false;this.speaking=true;}},
    SpeechSynthesisUtterance: class { constructor(text){this.text=text;} },
  };
  context.window = context;
  context.__testNow = 0;
  vm.createContext(context);
  const harness = `
    globalThis.__stateSnapshot = () => ({ uiLanguage: state.uiLanguage, contentLanguage: state.contentLanguage, drawerOpen: state.drawerOpen, speechPlaying: state.speechPlaying, messages: state.aiMessages.map(x => x.content), currentArticle: state.currentArticle });
    globalThis.__closeAi = () => { closeDrawer(); return __stateSnapshot(); };
    globalThis.__setSelected = () => { const a = article(); state.selected = { id:'s1', text:'First sentence.', paragraph:a.paragraphs[0], pIdx:0, sIdx:0 }; state.drawerOpen = true; render(); };
    globalThis.__switchLanguage = (lang) => selectContentLanguage(lang);
    globalThis.__runAction = (mode) => runAi(mode);
    globalThis.__startSpeech = () => toggleSpeech();
    globalThis.__toggleSpeech = () => toggleSpeech();
    globalThis.__setNow = (n) => { globalThis.__testNow = n; };
    globalThis.__renderNow = () => render();
    globalThis.__bootPromise = (async () => { await new Promise(r => setTimeout(r, 10)); return __stateSnapshot(); })();
  `;
  vm.runInContext(source + harness, context, {filename:'app.js'});
  await context.__bootPromise;
  return { context, root, speechRoot, fetchLog, rafCallbacks, article };
}

test('reader AI close button state actually hides the panel and exposes reopen control', async () => {
  const {context, root} = await boot();
  const before = await context.__stateSnapshot(); assert.equal(before.drawerOpen, true);
  const after = await context.__closeAi();
  assert.equal(after.drawerOpen, false);
  assert.match(root.innerHTML, /workspace ai-closed/);
  assert.match(root.innerHTML, /ai-panel is-hidden/);
  assert.match(root.innerHTML, /data-open-ai/);
});

test('中文 switch changes UI language and passage, EN switches both back', async () => {
  const {context, root, fetchLog} = await boot();
  await context.__switchLanguage('zh');
  let snapshot = await context.__stateSnapshot();
  assert.equal(snapshot.uiLanguage, 'zh');
  assert.equal(snapshot.contentLanguage, 'zh');
  assert.match(root.innerHTML, /本周/);
  await context.__setSelected();
  assert.match(root.innerHTML, /解释/);
  assert.match(root.innerHTML, /第一段中文翻译/);
  assert.equal(fetchLog.filter(x=>x.url==='/api/ai').length, 1);
  await context.__switchLanguage('en');
  snapshot = await context.__stateSnapshot();
  assert.equal(snapshot.uiLanguage, 'en');
  assert.equal(snapshot.contentLanguage, 'en');
  assert.match(root.innerHTML, /This week/);
  await context.__setSelected();
  assert.match(root.innerHTML, /Explain/);
  assert.doesNotMatch(root.innerHTML, /第一段中文翻译/);
});

test('all six AI assistant actions call the API and render a response', async () => {
  const {context, root, fetchLog} = await boot();
  await context.__setSelected();
  for (const mode of ['explain','chinese','translate','grammar','vocabulary','simplify']) {
    await context.__runAction(mode);
    const snapshot = await context.__stateSnapshot();
    assert.equal(snapshot.messages.at(-1), `mock ${mode} answer`);
    assert.match(root.innerHTML, new RegExp(`mock ${mode} answer`));
  }
  assert.equal(fetchLog.filter(x=>x.url==='/api/ai').length, 6);
});

test('sentence playback pauses without resetting the dot/filled track and resumes from the same position', async () => {
  const {context, speechRoot, rafCallbacks} = await boot();
  await context.__setSelected();
  context.__setNow(0);
  context.__startSpeech();
  assert.equal((await context.__stateSnapshot()).speechPlaying, true);

  const callback = [...rafCallbacks.values()][0];
  context.__setNow(1000);
  callback();
  const firstLeft = Number.parseFloat(context.document.querySelector('.audio-progress-thumb').style.left || '0');
  const firstWidth = Number.parseFloat(context.document.querySelector('.audio-progress').style.width || '0');
  assert.ok(firstLeft > 0, `expected moving dot, got ${firstLeft}`);
  assert.equal(firstWidth, firstLeft);

  context.__setNow(1400);
  const utteranceBeforePause = context.speechSynthesis.lastUtterance;
  context.__toggleSpeech();
  assert.equal((await context.__stateSnapshot()).speechPlaying, false);
  assert.equal((await context.__stateSnapshot()).currentArticle.slug, 'test-article');
  assert.equal(context.speechSynthesis.paused, false);
  assert.equal(context.speechSynthesis.speaking, false);

  const pausedLeft = Number.parseFloat(context.document.querySelector('.audio-progress-thumb').style.left || '0');
  const pausedWidth = Number.parseFloat(context.document.querySelector('.audio-progress').style.width || '0');
  assert.equal(pausedLeft, pausedWidth);
  assert.ok(pausedLeft >= firstLeft);
  assert.ok(context.speechSynthesis.cancelCount >= 2, 'pause should cancel the current utterance and own the resume state');

  // A normal render while paused must keep exactly the same visual position.
  context.__renderNow();
  assert.match(speechRoot.innerHTML, new RegExp(`audio-progress[^>]*style=\"width:${pausedWidth}`));
  assert.match(speechRoot.innerHTML, new RegExp(`audio-progress-thumb[^>]*style=\"left:${pausedLeft}`));

  context.__setNow(5000);
  for (const cb of [...rafCallbacks.values()]) cb();
  const stillPausedLeft = Number.parseFloat(context.document.querySelector('.audio-progress-thumb').style.left || '0');
  const stillPausedWidth = Number.parseFloat(context.document.querySelector('.audio-progress').style.width || '0');
  assert.equal(stillPausedLeft, pausedLeft);
  assert.equal(stillPausedWidth, pausedWidth);

  // Resume must create a new utterance from the saved character offset, not restart the full sentence.
  context.__toggleSpeech();
  assert.equal((await context.__stateSnapshot()).speechPlaying, true);
  assert.equal(context.speechSynthesis.paused, false);
  assert.equal(context.speechSynthesis.speaking, true);
  const resumedStart = Number.parseFloat(context.document.querySelector('.audio-progress-thumb').style.left || '0');
  assert.equal(resumedStart, pausedLeft);
  assert.notEqual(context.speechSynthesis.lastUtterance, utteranceBeforePause);
  assert.ok(context.speechSynthesis.lastUtterance.text.length < utteranceBeforePause.text.length, 'resumed utterance should start from the saved offset');

  const resumeCallback = [...rafCallbacks.values()][0];
  context.__setNow(5600);
  resumeCallback();
  const resumedLeft = Number.parseFloat(context.document.querySelector('.audio-progress-thumb').style.left || '0');
  const resumedWidth = Number.parseFloat(context.document.querySelector('.audio-progress').style.width || '0');
  assert.ok(resumedLeft > pausedLeft);
  assert.equal(resumedLeft, resumedWidth);
});;
