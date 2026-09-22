import { DEFAULT_CATEGORIES, slugify, splitContent, draftFromArticle, emptyDraft, draftToPayload, draftFromFormValues } from './admin-model.mjs';
const ADMIN_KEY = 'jenglish-admin-key';
const fallbackCover = '/assets/thumb-technology.svg';

const state = {
  key: sessionStorage.getItem(ADMIN_KEY) || '',
  authenticated: false,
  articles: [],
  categories: DEFAULT_CATEGORIES,
  selected: null,
  draft: null,
  filter: '',
  saving: false,
  generating: false,
  error: '',
};

function esc(v){ return String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function api(url, options={}){
  return fetch(url,{...options,headers:{Accept:'application/json','Content-Type':'application/json','Authorization':`Bearer ${state.key}`,...(options.headers||{})}})
    .then(async r=>{const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||`请求失败 (${r.status})`); return d;});
}
function toast(msg){document.querySelector('.toast')?.remove();const n=document.createElement('div');n.className='toast';n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),2400)}
function render(){document.querySelector('#admin-app').innerHTML=state.authenticated?renderApp():renderLogin();bind();}
function renderLogin(){return `<main class="login"><section class="login-card"><div class="brand">JEnglish</div><div class="brand-sub">TE AI Reader · Admin CMS</div><h1>内容管理</h1><p>请输入后台密钥。生产环境应把 ADMIN_KEY 放在服务器环境变量中，不要写入前端代码。</p>${state.error?`<div class="error">${esc(state.error)}</div>`:''}<div class="field"><label>Admin key</label><input id="login-key" type="password" placeholder="ADMIN_KEY" value="${esc(state.key)}"></div><button class="btn primary" id="login-btn">进入 CMS</button></section></main>`;}
function renderApp(){
  const a=state.selected;
  return `<div class="app"><aside class="sidebar"><div class="brand">JEnglish</div><div class="brand-sub">TE AI Reader · Admin CMS</div><div class="admin-nav"><button class="nav-btn active">文章</button><button class="nav-btn" onclick="window.location='/ai/te'">打开阅读器</button><button class="nav-btn" id="logout">退出</button></div><div class="note" style="margin-top:28px">AI 生成支持文章中文翻译，以及按句子生成解释、翻译、语法、词汇和简化英语。生成结果会缓存到数据库。</div></aside><main class="content"><div class="toolbar"><div><div class="eyebrow">CONTENT WORKFLOW</div><h1>文章管理</h1></div><div class="toolbar-actions"><select class="filter" id="filter"><option value="">全部状态</option><option value="draft">草稿</option><option value="review">审核中</option><option value="published">已发布</option><option value="archived">已归档</option></select><button class="btn primary" id="new-article">新建文章</button></div></div>${state.error?`<div class="error">${esc(state.error)}</div>`:''}<div class="grid"><section class="panel"><div class="panel-head"><strong>Articles</strong><span class="note">${state.articles.length} 篇</span></div><div class="article-cards">${state.articles.map(item=>`<button class="article-card ${a?.slug===item.slug?'active':''}" data-select="${esc(item.slug)}"><img src="${esc(item.coverImageUrl||fallbackCover)}" alt=""><span class="article-card-copy"><strong>${esc(item.title)}</strong><small>${esc(item.category)} · ${item.readingTime} 分钟</small><span class="status ${esc(item.status)}">${esc(item.status)}</span></span></button>`).join('')}</div></section><section class="panel editor">${a?renderEditor():renderEmptyEditor()}</section></div></main></div>`;
}
function renderEmptyEditor(){return `<div class="empty-editor"><div class="brand" style="font-size:56px">＋</div><h2>选择一篇文章</h2><p class="note">或者点击“新建文章”开始创建内容。</p></div>`}
function renderEditor(){
  const a=state.selected; const d=state.draft || draftFromArticle(a);
  state.draft=d;
  const content=(d.paragraphs||[]).map(p=>p.join(' ')).join('\n\n');
  const tags=(d.tags||[]).join(', ');
  const knownCategory=state.categories.some(c=>c.name===d.category);
  return `<form id="article-form" novalidate><div class="panel-head" style="margin:-20px -20px 18px"><strong>${d.status==='draft'?'编辑草稿':'编辑文章'}</strong><span class="status ${esc(d.status)}">${esc(d.status)}</span></div><div class="field-grid"><div class="field"><label>Title</label><input id="f-title" name="title" value="${esc(d.title)}" autocomplete="off"></div><div class="field"><label>Slug（自动生成）</label><input id="f-slug" value="${esc(slugify(d.title))}" readonly aria-readonly="true"><small class="note">Slug 始终根据标题自动生成；保存时服务器也会重新生成。</small></div><div class="field"><label>Subtitle</label><input id="f-subtitle" name="subtitle" value="${esc(d.dek)}"></div><div class="field"><label>Level</label><input id="f-level" name="level" value="${esc(d.level)}"></div><div class="field"><label>Category</label><select id="f-category-select" name="categoryChoice">${state.categories.map(c=>`<option value="${esc(c.name)}" ${knownCategory && d.category===c.name?'selected':''}>${esc(c.name)}</option>`).join('')}<option value="__other__" ${!knownCategory?'selected':''}>Other</option></select><input id="f-category-other" name="categoryOther" value="${esc(!knownCategory?d.category:'')}" placeholder="Enter another category" style="display:${!knownCategory?'block':'none'}"></div><div class="field"><label>Status</label><select id="f-status" name="status"><option value="draft" ${d.status==='draft'?'selected':''}>draft</option><option value="review" ${d.status==='review'?'selected':''}>review</option><option value="published" ${d.status==='published'?'selected':''}>published</option><option value="archived" ${d.status==='archived'?'selected':''}>archived</option></select></div><div class="field"><label>Reading time</label><input id="f-reading" name="readingTime" type="number" min="1" value="${Number(d.readingTime||5)}"></div><div class="field"><label>Tags</label><input id="f-tags" name="tags" value="${esc(tags)}" placeholder="AI, work, productivity"></div><div class="field full"><label>Cover image URL</label><input id="f-cover" name="coverImageUrl" value="${esc(d.coverImageUrl)}" placeholder="自动生成，无需填写"></div><div class="field full"><label>Article content · separate paragraphs with a blank line</label><textarea id="f-content" name="content">${esc(content)}</textarea></div></div><div class="editor-actions"><button class="btn primary" type="submit" id="save-article" ${state.saving?'disabled':''}>${state.saving?'保存中…':'保存草稿'}</button>${d.slug?'<button type="button" class="btn accent" id="publish-article">发布</button>':''}<button type="button" class="btn" id="generate-cover" ${d.slug?'':'disabled'}>根据文章内容生成封面</button><button type="button" class="btn" id="translate-article" ${d.slug?'':'disabled'}>生成中文翻译</button><button type="button" class="btn" id="pack-ai" ${d.slug?'':'disabled'}>生成全部句子学习内容</button></div><section class="generation"><h2>AI 生成</h2><p class="note">生成结果保存在当前文章版本中。文章封面会根据标题、分类、标签和正文关键词生成；中文翻译和句子学习内容会被阅读器复用。</p><div class="generation-grid"><button class="generation-card" id="open-reader" ${d.slug?'':'disabled'}><strong>打开阅读器</strong><small>${d.slug?`/ai/te/${esc(d.slug)}`:'保存后可打开'}</small></button><button class="generation-card" id="refresh-article" ${d.slug?'':'disabled'}><strong>刷新文章</strong><small>重新读取数据库中的最新版本</small></button></div></section></form>`;
}
async function loadArticles(){
  const d=await api(`/api/admin/articles${state.filter?`?status=${encodeURIComponent(state.filter)}`:''}`);
  state.articles=d.articles||[];
}
async function loadCategories(){
  try { const d=await api('/api/admin/categories'); state.categories=(d.categories||[]).length?d.categories:DEFAULT_CATEGORIES; }
  catch { state.categories=DEFAULT_CATEGORIES; }
}
async function selectArticle(slug){ const d=await api(`/api/admin/articles/${encodeURIComponent(slug)}`); state.selected=d.article; state.draft=draftFromArticle(d.article); render(); }
function createNew(){state.selected={id:null,slug:'',title:'',dek:'',level:'Upper intermediate',category:'Technology',status:'draft',readingTime:5,tags:[],coverImageUrl:'',paragraphs:[]}; state.draft=emptyDraft(); render();}
function updateDraftFromField(id, value){
  state.draft ||= emptyDraft();
  if(id==='f-title') state.draft.title=value;
  else if(id==='f-subtitle') state.draft.dek=value;
  else if(id==='f-level') state.draft.level=value;
  else if(id==='f-status') state.draft.status=value;
  else if(id==='f-reading') state.draft.readingTime=Number(value||5);
  else if(id==='f-tags') state.draft.tags=value.split(',').map(x=>x.trim()).filter(Boolean);
  else if(id==='f-cover') state.draft.coverImageUrl=value;
  else if(id==='f-content') state.draft.paragraphs=splitContent(value);
}
function updateCategory(){
  const select=document.querySelector('#f-category-select'); const other=document.querySelector('#f-category-other');
  if(!select) return;
  const isOther=select.value==='__other__';
  if(other) other.style.display=isOther?'block':'none';
  state.draft ||= emptyDraft();
  state.draft.category=isOther?(other?.value.trim()||'Other'):select.value;
}
async function saveArticle(event){
  event?.preventDefault?.();
  state.error='';
  const form=document.querySelector('#article-form');
  if(!form) { state.error='保存表单尚未加载，请刷新页面后重试。'; render(); return; }
  try {
    const fd=new FormData(form);
    const formDraft=draftFromFormValues({
      title:fd.get('title'), subtitle:fd.get('subtitle'), level:fd.get('level'),
      categoryChoice:fd.get('categoryChoice'), categoryOther:fd.get('categoryOther'),
      status:fd.get('status'), readingTime:fd.get('readingTime'), tags:fd.get('tags'),
      coverImageUrl:fd.get('coverImageUrl'), content:fd.get('content'),
    });
    const body=draftToPayload(formDraft);
    state.draft={...state.draft,...formDraft};
    state.saving=true;
    render();
    const endpoint=state.selected?.id ? `/api/admin/articles/${encodeURIComponent(state.selected.slug)}` : '/api/admin/articles';
    const method=state.selected?.id ? 'PATCH' : 'POST';
    const d=await api(endpoint,{method,body:JSON.stringify(body)});
    state.selected=d.article;
    state.draft=draftFromArticle(d.article);
    await loadArticles();
    state.saving=false;
    render();
    toast('草稿已保存');
  } catch(e){
    state.saving=false;
    state.error=e.message;
    render();
  }
}
async function publish(){state.error='';try{if(!state.selected?.slug)throw new Error('请先保存草稿，再发布。');const d=await api(`/api/admin/articles/${encodeURIComponent(state.selected.slug)}/publish`,{method:'POST'});state.selected=d.article;state.draft=draftFromArticle(d.article);await loadArticles();render();toast('文章已发布');}catch(e){state.error=e.message;render();}}
async function generateCover(){
  if(!state.selected?.slug){toast('请先保存文章，再生成封面。');return;}
  state.generating=true;state.error='';render();
  try{ const d=await api(`/api/admin/articles/${encodeURIComponent(state.selected.slug)}/generate-cover`,{method:'POST'}); state.selected=d.article; state.draft=draftFromArticle(d.article); toast('封面已根据文章内容生成'); render(); }
  catch(e){state.error=e.message;render();} finally{state.generating=false;}
}
async function generate(kind){
  if(!state.selected?.slug){toast('请先保存文章，再生成 AI 内容。');return;}
  state.generating=true;state.error='';render();
  try{ const d=await api(`/api/admin/articles/${encodeURIComponent(state.selected.slug)}/generate`,{method:'POST',body:JSON.stringify({kind})}); toast(kind==='article_translate'?'中文翻译已生成':`已生成 ${d.generated||1} 条 AI 内容`); await selectArticle(state.selected.slug); }
  catch(e){state.error=e.message;render();} finally{state.generating=false;}
}
function bind(){
  document.querySelector('#login-btn')?.addEventListener('click',()=>{state.key=document.querySelector('#login-key').value.trim();state.error='';api('/api/admin/articles').then(async()=>{sessionStorage.setItem(ADMIN_KEY,state.key);state.authenticated=true;await loadCategories();await loadArticles();}).then(render).catch(e=>{state.error=e.message;render();})});
  document.querySelector('#login-key')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.querySelector('#login-btn').click();});
  document.querySelector('#logout')?.addEventListener('click',()=>{sessionStorage.removeItem(ADMIN_KEY);state.key='';state.authenticated=false;state.selected=null;state.draft=null;render();});
  document.querySelector('#filter')?.addEventListener('change',async e=>{state.filter=e.target.value;try{await loadArticles();render();}catch(err){state.error=err.message;render();}});
  document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>selectArticle(b.dataset.select).catch(e=>{state.error=e.message;render();})));
  document.querySelector('#new-article')?.addEventListener('click',createNew);
  ['f-title','f-subtitle','f-level','f-status','f-reading','f-tags','f-cover','f-content'].forEach(id=>document.querySelector(`#${id}`)?.addEventListener('input',e=>updateDraftFromField(id,e.currentTarget.value)));
  document.querySelector('#f-category-select')?.addEventListener('change', updateCategory);
  document.querySelector('#f-category-other')?.addEventListener('input', updateCategory);
  document.querySelector('#f-title')?.addEventListener('input',e=>{const slug=document.querySelector('#f-slug');if(slug)slug.value=slugify(e.currentTarget.value);});
  document.querySelector('#article-form')?.addEventListener('submit',saveArticle);
  document.querySelector('#publish-article')?.addEventListener('click',publish);
  document.querySelector('#generate-cover')?.addEventListener('click',generateCover);
  document.querySelector('#translate-article')?.addEventListener('click',()=>generate('article_translate'));
  document.querySelector('#pack-ai')?.addEventListener('click',()=>generate('sentence_pack'));
  document.querySelector('#open-reader')?.addEventListener('click',()=>window.open(`/ai/te/${encodeURIComponent(state.selected.slug)}`,'_blank'));
  document.querySelector('#refresh-article')?.addEventListener('click',()=>selectArticle(state.selected.slug).catch(e=>{state.error=e.message;render();}));
}

(async()=>{
  if(!state.key){render();return;}
  try{await api('/api/admin/articles');state.authenticated=true;await loadCategories();await loadArticles();}catch(e){sessionStorage.removeItem(ADMIN_KEY);state.key='';state.error=e.message;}
  render();
})();
