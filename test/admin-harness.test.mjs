import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

function storage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return { getItem:k=>data.has(k)?data.get(k):null, setItem:(k,v)=>data.set(k,String(v)), removeItem:k=>data.delete(k) };
}

async function bootAdmin() {
  const model = (await fs.readFile(new URL('../public/admin-model.mjs', import.meta.url), 'utf8')).replace(/^export /gm,'');
  const source = (await fs.readFile(new URL('../public/admin.js', import.meta.url), 'utf8')).replace(/^import .*\n/,'');
  const nodes = new Map();
  const app = {innerHTML:''};
  const body = {appendChild(){}, classList:{toggle(){}}};
  function node(id, value='') { const n={id, value, style:{}, disabled:false, addEventListener(){}, click(){}, focus(){}}; return n; }
  ['f-title','f-slug','f-subtitle','f-level','f-category-select','f-category-other','f-status','f-reading','f-tags','f-cover','f-content'].forEach(id=>nodes.set(`#${id}`,node(id)));
  nodes.set('#admin-app', app);
  const document={
    querySelector(sel){ return nodes.get(sel) || null; },
    querySelectorAll(){ return []; },
    createElement(){ return {className:'',textContent:'',remove(){}}; },
    body,
  };
  const sessionStorage=storage({'jenglish-admin-key':'secret'});
  const requests=[];
  const article={id:'1',slug:'the-new-geography-of-remote-work',title:'The New Geography of Remote Work',dek:'Subtitle',level:'B2–C1',category:'Business',status:'draft',readingTime:6,tags:['remote work'],coverImageUrl:'',paragraphs:[{id:'p1',position:0,text:'A paragraph.',sentences:[{id:'s1',position:0,text:'A paragraph.'}]}]};
  const fetch=async(url,options={})=>{
    requests.push({url,options});
    if(url==='/api/admin/articles') return new Response(JSON.stringify({articles:[],article:article}),{status:200,headers:{'Content-Type':'application/json'}});
    if(url==='/api/admin/categories') return new Response(JSON.stringify({categories:[{slug:'business',name:'Business'},{slug:'technology',name:'Technology'}]}),{status:200,headers:{'Content-Type':'application/json'}});
    if(url==='/api/admin/articles' && options.method==='POST') return new Response(JSON.stringify({article}),{status:201,headers:{'Content-Type':'application/json'}});
    return new Response(JSON.stringify({articles:[]}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  const context={console,document,sessionStorage,fetch,Response,URL,setTimeout,clearTimeout,Intl,structuredClone,window:null,location:{href:'http://test.local/admin'},open(){}};
  context.window=context;
  vm.createContext(context);
  const harness=`
    globalThis.__createNew=()=>createNew();
    globalThis.__set=(id,value)=>{ const n=document.querySelector('#'+id); n.value=value; };
    globalThis.__setCategory=(value,other='')=>{ document.querySelector('#f-category-select').value=value; document.querySelector('#f-category-other').value=other; updateCategory(); };
    globalThis.__save=()=>saveArticle();
    globalThis.__snapshot=()=>({saving:state.saving,error:state.error,draft:state.draft,selected:state.selected});
    globalThis.__bootPromise=(async()=>{await new Promise(r=>setTimeout(r,5)); return __snapshot();})();
  `;
  vm.runInContext(model+'\n'+source+'\n'+harness,context,{filename:'admin-test.js'});
  await context.__bootPromise;
  return {context,requests};
}

test('actual CMS save reads title/body from rendered form and posts a complete draft',async()=>{
  const {context,requests}=await bootAdmin();
  await context.__createNew();
  context.__set('f-title','The New Geography of Remote Work');
  context.__set('f-subtitle','How flexible working changes cities');
  context.__set('f-level','B2–C1');
  context.__set('f-status','draft');
  context.__set('f-reading','6');
  context.__set('f-tags','remote work, cities');
  context.__set('f-cover','');
  context.__set('f-content','First paragraph.\n\nSecond paragraph.');
  context.__setCategory('Business');
  await context.__save();
  const req=requests.find(x=>x.url==='/api/admin/articles' && x.options.method==='POST');
  assert.ok(req,'expected create draft POST');
  const body=JSON.parse(req.options.body);
  assert.equal(body.title,'The New Geography of Remote Work');
  assert.equal(body.slug,'the-new-geography-of-remote-work');
  assert.equal(body.category,'Business');
  assert.deepEqual(body.paragraphs,[['First paragraph.'],['Second paragraph.']]);
});


test('actual CMS Other category field is serialized from the custom input',async()=>{
  const {context,requests}=await bootAdmin();
  await context.__createNew();
  context.__set('f-title','A City Without Cars');
  context.__set('f-subtitle','Mobility and urban design');
  context.__set('f-level','B2');
  context.__set('f-status','draft');
  context.__set('f-reading','5');
  context.__set('f-tags','cities, mobility');
  context.__set('f-cover','');
  context.__set('f-content','Cars shape cities.\n\nNew transport changes that pattern.');
  context.__setCategory('__other__','Urban Mobility');
  await context.__save();
  const req=requests.find(x=>x.url==='/api/admin/articles' && x.options.method==='POST');
  assert.ok(req,'expected create draft POST');
  const body=JSON.parse(req.options.body);
  assert.equal(body.category,'Urban Mobility');
  assert.equal(body.slug,'a-city-without-cars');
});
