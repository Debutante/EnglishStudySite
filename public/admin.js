const ADMIN_KEY = 'jenglish-admin-key';
const fallbackCover = '/assets/thumb-technology.svg';
const state = { key: sessionStorage.getItem(ADMIN_KEY) || '', authenticated: false, articles: [], categories: [], selected: null, filter: '', saving: false, generating: false, error: '' };

function esc(v){ return String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function api(url, options={}){ return fetch(url,{...options,headers:{Accept:'application/json','Content-Type':'application/json','Authorization':`Bearer ${state.key}`,...(options.headers||{})}}).then(async r=>{const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||`请求失败 (${r.status})`); return d;}); }
function toast(msg){document.querySelector('.toast')?.remove();const n=document.createElement('div');n.className='toast';n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),2400)}
function render(){document.querySelector('#admin-app').innerHTML=state.authenticated?renderApp():renderLogin();bind();}
function renderLogin(){return `<main class="login"><section class="login-card"><div class="brand">JEnglish</div><div class="brand-sub">TE AI Reader · Admin CMS</div><h1>内容管理</h1><p>请输入后台密钥。生产环境应把 ADMIN_KEY 放在服务器环境变量中，不要写入前端代码。</p>${state.error?`<div class="error">${esc(state.error)}</div>`:''}<div class="field"><label>Admin key</label><input id="login-key" type="password" placeholder="ADMIN_KEY" value="${esc(state.key)}"></div><button class="btn primary" id="login-btn">进入 CMS</button></section></main>`;}
function renderApp(){
  const a=state.selected;
  return `<div class="app"><aside class="sidebar"><div class="brand">JEnglish</div><div class="brand-sub">TE AI Reader · Admin CMS</div><div class="admin-nav"><button class="nav-btn active">文章</button><button class="nav-btn" onclick="window.location='/ai/te'">打开阅读器</button><button class="nav-btn" id="logout">退出</button></div><div class="note" style="margin-top:28px">AI 生成支持文章中文翻译，以及按句子生成解释、翻译、语法、词汇和简化英语。生成结果会缓存到数据库。</div></aside><main class="content"><div class="toolbar"><div><div class="eyebrow">CONTENT WORKFLOW</div><h1>文章管理</h1></div><div class="toolbar-actions"><select class="filter" id="filter"><option value="">全部状态</option><option value="draft">草稿</option><option value="review">审核中</option><option value="published">已发布</option><option value="archived">已归档</option></select><button class="btn primary" id="new-article">新建文章</button></div></div>${state.error?`<div class="error">${esc(state.error)}</div>`:''}<div class="grid"><section class="panel"><div class="panel-head"><strong>Articles</strong><span class="note">${state.articles.length} 篇</span></div><div class="article-cards">${state.articles.map(item=>`<button class="article-card ${a?.slug===item.slug?'active':''}" data-select="${esc(item.slug)}"><img src="${esc(item.coverImageUrl||fallbackCover)}" alt=""><span class="article-card-copy"><strong>${esc(item.title)}</strong><small>${esc(item.category)} · ${item.readingTime} 分钟</small><span class="status ${esc(item.status)}">${esc(item.status)}</span></span></button>`).join('')}</div></section><section class="panel editor">${a?renderEditor(a):renderEmptyEditor()}</section></div></main></div>`;
}
function renderEmptyEditor(){return `<div class="empty-editor"><div class="brand" style="font-size:56px">＋</div><h2>选择一篇文章</h2><p class="note">或者点击“新建文章”开始创建内容。</p></div>`}
function slugify(value){
  return String(value||'')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,120);
}
function renderEditor(a){
  const content=(a.paragraphs||[]).map(p=>p.sentences.map(s=>s.text).join(' ')).join('\n\n');
  const tags=(a.tags||[]).join(', ');
  return `<div class="panel-head" style="margin:-20px -20px 18px"><strong>${a.status==='draft'?'编辑草稿':'编辑文章'}</strong><span class="status ${esc(a.status)}">${esc(a.status)}</span></div><div class="field-grid"><div class="field"><label>Title</label><input id="f-title" value="${esc(a.title)}" autocomplete="off"></div><div class="field"><label>Slug（自动生成）</label><input id="f-slug" value="${esc(a.slug||slugify(a.title))}" readonly aria-readonly="true"><small class="note">保存时始终根据标题自动生成；如果重复会自动添加编号。</small></div><div class="field"><label>Subtitle</label><input id="f-subtitle" value="${esc(a.dek)}"></div><div class="field"><label>Level</label><input id="f-level" value="${esc(a.level)}"></div><div class="field"><label>Category</label><input id="f-category" value="${esc(a.category)}"></div><div class="field"><label>Status</label><select id="f-status"><option ${a.status==='draft'?'selected':''}>draft</option><option ${a.status==='review'?'selected':''}>review</option><option ${a.status==='published'?'selected':''}>published</option><option ${a.status==='archived'?'selected':''}>archived</option></select></div><div class="field"><label>Reading time</label><input id="f-reading" type="number" min="1" value="${a.readingTime||5}"></div><div class="field"><label>Tags</label><input id="f-tags" value="${esc(tags)}" placeholder="AI, work, productivity"></div><div class="field full"><label>Cover image URL</label><input id="f-cover" value="${esc(a.coverImageUrl||'')}" placeholder="/assets/thumb-technology.svg"></div><div class="field full"><label>Article content · separate paragraphs with a blank line</label><textarea id="f-content">${esc(content)}</textarea></div></div><div class="editor-actions"><button class="btn primary" id="save-article" ${state.saving?'disabled':''}>${state.saving?'保存中…':'保存新版本'}</button>${a.status!=='published' && a.slug?'<button class="btn accent" id="publish-article">发布</button>':''}<button class="btn" id="translate-article">生成中文翻译</button><button class="btn" id="pack-ai">生成全部句子学习内容</button></div><section class="generation"><h2>AI 生成</h2><p class="note">生成结果保存在当前文章版本中。中文翻译会出现在阅读器的“中文 / EN”按钮中；句子学习内容会被阅读器直接复用。</p><div class="generation-grid"><button class="generation-card" id="open-reader" ${a.slug?'':'disabled'}><strong>打开阅读器</strong><small>${a.slug?`/ai/te/${esc(a.slug)}`:'保存后可打开'}</small></button><button class="generation-card" id="refresh-article" ${a.slug?'':'disabled'}><strong>刷新文章</strong><small>重新读取数据库中的最新版本</small></button></div></section>`;
}
function formData(){
  const content=document.querySelector('#f-content').value.trim();
  const paragraphs=content.split(/\n\s*\n/).map(p=>p.split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean)).filter(x=>x.length);
  const title=document.querySelector('#f-title').value.trim();
  const category=document.querySelector('#f-category').value.trim()||'General';
  return {title,slug:slugify(title),subtitle:document.querySelector('#f-subtitle').value.trim(),level:document.querySelector('#f-level').value.trim(),category,categorySlug:slugify(category),status:document.querySelector('#f-status').value,readingTime:Number(document.querySelector('#f-reading').value||5),tags:document.querySelector('#f-tags').value.split(',').map(x=>x.trim()).filter(Boolean),coverImageUrl:document.querySelector('#f-cover').value.trim(),paragraphs,sourceName:'JEnglish',copyrightNote:'Authorized editorial content.'};
}
async function loadArticles(){ const d=await api(`/api/admin/articles${state.filter?`?status=${encodeURIComponent(state.filter)}`:''}`); state.articles=d.articles||[]; if(state.selected){const match=state.articles.find(x=>x.slug===state.selected.slug); if(match) await selectArticle(match.slug); else state.selected=null;} }
async function selectArticle(slug){ const d=await api(`/api/admin/articles/${encodeURIComponent(slug)}`); state.selected=d.article; render(); }
async function createNew(){state.selected={slug:'',title:'',dek:'',level:'Upper intermediate',category:'Technology',status:'draft',readingTime:5,tags:[],coverImageUrl:'/assets/thumb-technology.svg',paragraphs:[{sentences:[{text:'Write the first sentence of your article here.'},{text:'Add another sentence to continue the paragraph.'}]}]};render();}
async function saveArticle(){state.saving=true;state.error='';render();try{const body=formData();let d;if(state.selected?.slug){d=await api(`/api/admin/articles/${encodeURIComponent(state.selected.slug)}`,{method:'PATCH',body:JSON.stringify(body)});}else{d=await api('/api/admin/articles',{method:'POST',body:JSON.stringify(body)});}state.selected=d.article;await loadArticles();state.selected=d.article;toast('文章已保存');render();}catch(e){state.error=e.message;render();}finally{state.saving=false;}}
async function publish(){state.error='';try{const d=await api(`/api/admin/articles/${encodeURIComponent(state.selected.slug)}/publish`,{method:'POST'});state.selected=d.article;await loadArticles();render();toast('文章已发布');}catch(e){state.error=e.message;render();}}
async function generate(kind){
  if(!state.selected?.slug){toast('请先保存文章，再生成 AI 内容。');return;}
  state.generating=true;state.error='';render();
  try{
    const d=await api(`/api/admin/articles/${encodeURIComponent(state.selected.slug)}/generate`,{method:'POST',body:JSON.stringify({kind})});
    toast(kind==='article_translate'?'中文翻译已生成':`已生成 ${d.generated||1} 条 AI 内容`);
    await selectArticle(state.selected.slug);
  }catch(e){state.error=e.message;render();}
  finally{state.generating=false;}
}
function bind(){
  document.querySelector('#login-btn')?.addEventListener('click',()=>{state.key=document.querySelector('#login-key').value.trim();state.error='';api('/api/admin/articles').then(()=>{sessionStorage.setItem(ADMIN_KEY,state.key);state.authenticated=true;return loadArticles();}).then(render).catch(e=>{state.error=e.message;render();})});
  document.querySelector('#login-key')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.querySelector('#login-btn').click();});
  document.querySelector('#logout')?.addEventListener('click',()=>{sessionStorage.removeItem(ADMIN_KEY);state.key='';state.authenticated=false;state.selected=null;render();});
  document.querySelector('#filter')?.addEventListener('change',async e=>{state.filter=e.target.value;try{await loadArticles();render();}catch(err){state.error=err.message;render();}});
  document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>selectArticle(b.dataset.select).catch(e=>{state.error=e.message;render();})));
  document.querySelector('#new-article')?.addEventListener('click',createNew);
  document.querySelector('#f-title')?.addEventListener('input', (e) => {
    const slug = document.querySelector('#f-slug');
    if (slug) slug.value = slugify(e.currentTarget.value);
  });
  document.querySelector('#save-article')?.addEventListener('click',saveArticle);
  document.querySelector('#publish-article')?.addEventListener('click',publish);
  document.querySelector('#translate-article')?.addEventListener('click',()=>generate('article_translate'));
  document.querySelector('#pack-ai')?.addEventListener('click',()=>generate('sentence_pack'));
  document.querySelector('#open-reader')?.addEventListener('click',()=>window.open(`/ai/te/${encodeURIComponent(state.selected.slug)}`,'_blank'));
  document.querySelector('#refresh-article')?.addEventListener('click',()=>selectArticle(state.selected.slug).catch(e=>{state.error=e.message;render();}));
}

(async()=>{
  if(!state.key){render();return;}
  try{await api('/api/admin/articles');state.authenticated=true;await loadArticles();}catch(e){sessionStorage.removeItem(ADMIN_KEY);state.key='';state.error=e.message;}
  render();
})();
