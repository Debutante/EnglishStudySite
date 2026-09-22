export const DEFAULT_CATEGORIES = [
  { id: 'technology', slug: 'technology', name: 'Technology' },
  { id: 'business', slug: 'business', name: 'Business' },
  { id: 'economics', slug: 'economics', name: 'Economics' },
  { id: 'science', slug: 'science', name: 'Science' },
  { id: 'society', slug: 'society', name: 'Society' },
];

export function slugify(value){
  return String(value||'')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,120);
}

export function splitContent(content){
  return String(content||'').trim()
    .split(/\n\s*\n/)
    .map(p=>p.split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean))
    .filter(x=>x.length);
}

export function draftFromArticle(a){
  return {
    slug:a?.slug || '', title:a?.title || '', dek:a?.dek || '', level:a?.level || 'Upper intermediate',
    category:a?.category || 'Technology', status:a?.status || 'draft', readingTime:Number(a?.readingTime||5),
    tags:Array.isArray(a?.tags)?[...a.tags]:[], coverImageUrl:a?.coverImageUrl || '',
    paragraphs:(a?.paragraphs||[]).map(p=>(p.sentences||[]).map(s=>s.text)).filter(p=>p.length)
  };
}

export function emptyDraft(){
  return {
    slug:'', title:'', dek:'', level:'Upper intermediate', category:'Technology', status:'draft', readingTime:5,
    tags:[], coverImageUrl:'', paragraphs:[['Write the first sentence of your article here.','Add another sentence to continue the paragraph.']]
  };
}

export function draftToPayload(draft){
  const title=String(draft?.title ?? '').trim();
  if(!title) throw new Error('标题不能为空，请检查标题输入框。');
  const category=String(draft?.category ?? 'Other').trim() || 'Other';
  const paragraphs=(draft?.paragraphs||[])
    .map(p=>Array.isArray(p)?p.map(x=>String(x).trim()).filter(Boolean):String(p).split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean))
    .filter(p=>p.length);
  if(!paragraphs.length) throw new Error('文章正文不能为空，请至少输入一个段落。');
  return {
    title,
    slug:slugify(title),
    subtitle:String(draft?.dek ?? '').trim(),
    level:String(draft?.level || 'Upper intermediate').trim(),
    category,
    categorySlug:slugify(category),
    categoryName:category,
    status:['draft','review','published','archived'].includes(draft?.status)?draft.status:'draft',
    readingTime:Math.max(1,Number(draft?.readingTime||5)),
    tags:Array.isArray(draft?.tags)?draft.tags.map(x=>String(x).trim()).filter(Boolean):[],
    coverImageUrl:String(draft?.coverImageUrl||'').trim(),
    paragraphs,
    sourceName:'JEnglish',
    copyrightNote:'Authorized editorial content.'
  };
}

export function draftFromFormValues(values){
  const v = values || {};
  const title = String(v.title ?? '').trim();
  const categoryChoice = String(v.categoryChoice ?? '').trim();
  const customCategory = String(v.categoryOther ?? '').trim();
  const category = categoryChoice === '__other__' ? customCategory : categoryChoice;
  return {
    slug: slugify(title),
    title,
    dek: String(v.subtitle ?? '').trim(),
    level: String(v.level || 'Upper intermediate').trim(),
    category: category || 'Other',
    status: ['draft','review','published','archived'].includes(v.status) ? v.status : 'draft',
    readingTime: Math.max(1, Number(v.readingTime || 5)),
    tags: String(v.tags ?? '').split(',').map(x=>x.trim()).filter(Boolean),
    coverImageUrl: String(v.coverImageUrl ?? '').trim(),
    paragraphs: splitContent(v.content ?? ''),
  };
}
