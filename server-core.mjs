import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const PUBLIC_DIR = path.join(ROOT, 'public');

export const AI_MODES = new Set(['explain', 'chinese', 'translate', 'grammar', 'vocabulary', 'simplify', 'chat', 'article_translate']);

const MOCK_SENTENCE_TRANSLATIONS = {
  'Companies once looked to new software mainly for faster execution.': '企业过去主要把新软件当作提高执行速度的工具。',
  'Increasingly, the bigger opportunity is to decide which work should be automated, which should remain human and which should be redesigned altogether.': '越来越重要的机会，是判断哪些工作应该自动化，哪些工作应该继续由人完成，以及哪些工作应该被彻底重新设计。',
  'That shift matters because the cost of generating a first draft, query or analysis is falling rapidly.': '这种变化很重要，因为生成初稿、查询或分析的成本正在快速下降。',
  'The scarce resource is becoming the judgement required to turn those outputs into useful decisions.': '真正稀缺的资源，正在变成把这些产出转化为有用决策所需要的判断力。',
  'Managers therefore need to treat AI as a change to the workflow, not simply as another tool in the toolbox.': '因此，管理者需要把人工智能看成工作流程的改变，而不只是工具箱中的又一个工具。',
  'Teams that redesign their processes around the technology may see larger gains than teams that merely add a chatbot to an existing routine.': '围绕这项技术重新设计流程的团队，可能会比只是在原有流程中加入聊天机器人的团队获得更大的收益。',
  'Electricity networks are built to meet demand at the busiest moments, even though those moments may occur for only a few hours each year.': '电力网络通常按照最繁忙时段的需求来建设，尽管这样的高峰一年中可能只出现几个小时。',
  'That makes peak demand unusually expensive and creates a strong incentive to spread consumption over time.': '这使峰值需求格外昂贵，也形成了把消费分散到不同时间的强烈激励。',
  'Digital meters make it easier to send households and businesses a price signal that changes during the day.': '数字电表让人们更容易向家庭和企业发送会随一天中时间变化的价格信号。',
  'The idea is simple, but its effects depend on whether consumers understand the signal and have practical ways to respond.': '这个想法很简单，但实际效果取决于消费者是否理解这种信号，以及他们是否有现实可行的方式作出回应。',
  'The challenge for city governments is to balance efficiency with fairness.': '对于城市政府而言，难点在于在效率与公平之间取得平衡。',
  'A pricing system can reduce pressure on the grid, yet it should not leave households with limited flexibility paying the highest costs.': '价格机制可以降低电网压力，但也不应该让灵活性有限的家庭承担最高成本。',
  'For decades, transport agencies often measured success by counting vehicles, estimating travel times and expanding roads where congestion appeared.': '几十年来，交通机构经常通过统计车辆数量、估算出行时间，以及在拥堵出现的地方扩建道路来衡量交通系统的成效。',
  'Newer datasets can reveal a more complicated picture of how people move across a city.': '新的数据集可以呈现出人们在城市中移动方式更加复杂的一面。',
  'When planners combine travel records with land-use and demographic information, they can see which neighbourhoods have good access to jobs and which do not.': '当规划者把出行记录与土地利用和人口数据结合起来时，他们可以看到哪些社区能够方便地到达就业岗位，哪些社区做不到。',
  'That can shift the conversation from moving cars faster to improving access to opportunities.': '这会让讨论从让汽车更快转向改善人们获得机会的途径。',
  'The hardest part is not collecting another dataset.': '最难的部分并不是再收集一个数据集。',
  'It is deciding how several imperfect sources should be combined without creating false precision or overlooking people who generate little digital trace.': '真正困难的是决定如何在不制造虚假精确度、也不忽视那些几乎不会留下数字足迹的人群的情况下，把多个不完美的数据源结合起来。',
};

const MOCKS = {
  explain: (sentence) => `这句话的核心意思是：${sentence.replace(/\.$/, '')}。先抓住主语和核心动词，再理解修饰信息。`,
  chinese: (sentence) => `中文意思：${MOCK_SENTENCE_TRANSLATIONS[sentence] || '这句话的核心意思需要结合上下文理解；当前处于模拟 AI 模式。'}`,
  translate: (sentence) => `中文翻译：${MOCK_SENTENCE_TRANSLATIONS[sentence] || '当前处于模拟 AI 模式，未找到这句话的预置译文；请启用真实 AI 服务以获得准确翻译。'}`,
  grammar: () => '语法提示：先找出主语和谓语，再判断后面的从句、分词结构或介词短语分别修饰什么。这样可以更容易看清句子的主干。',
  vocabulary: (sentence) => `重点词汇\n• demand — 需求，指市场或用户所需要的数量。\n• expected to — 预计、被认为会。\n• reshape — 重新塑造、明显改变。\n\n本句：${sentence}`,
  simplify: (sentence) => `Simpler English: ${sentence.replace(/\b(expected to|increasingly|significantly)\b/gi, 'will').replace(/\s+/g, ' ')}`,
};

const MOCK_ARTICLE_TRANSLATIONS = {
  'ai-is-changing-where-productivity-comes-from': [
    '企业过去主要把新软件当作提高执行速度的工具。',
    '但越来越多的时候，更大的机会在于判断哪些工作应该自动化，哪些工作应该继续由人完成，以及哪些工作应该被彻底重新设计。',
    '这种变化很重要，因为生成初稿、查询或分析的成本正在快速下降。',
    '真正稀缺的资源，正在变成把这些产出转化为有用决策所需要的判断力。',
    '因此，管理者需要把人工智能看成工作流程的改变，而不只是工具箱中的又一个工具。',
    '围绕这项技术重新设计流程的团队，可能会比只是在原有流程中加入聊天机器人的团队获得更大的收益。',
  ],
  'cities-are-learning-to-price-scarce-energy': [
    '电力网络通常按照最繁忙时段的需求来建设，尽管这样的高峰一年中可能只出现几个小时。',
    '这使峰值需求格外昂贵，也形成了把消费分散到不同时间的强烈激励。',
    '数字电表让人们更容易向家庭和企业发送会随一天中时间变化的价格信号。',
    '这个想法很简单，但实际效果取决于消费者是否理解这种信号，以及他们是否有现实可行的方式作出回应。',
    '对于城市政府而言，难点在于在效率与公平之间取得平衡。',
    '价格机制可以降低电网压力，但也不应该让灵活性有限的家庭承担最高成本。',
  ],
  'better-mobility-data-can-change-the-shape-of-a-city': [
    '几十年来，交通机构经常通过统计车辆数量、估算出行时间，以及在拥堵出现的地方扩建道路来衡量交通系统的成效。',
    '新的数据集可以呈现出人们在城市中移动方式更加复杂的一面。',
    '当规划者把出行记录与土地利用和人口数据结合起来时，他们可以看到哪些社区能够方便地到达就业岗位，哪些社区做不到。',
    '这会让讨论从“如何让汽车更快”转向“如何改善人们获得机会的途径”。',
    '最难的部分并不是再收集一个数据集。',
    '真正困难的是决定如何在不制造虚假精确度、也不忽视那些几乎不会留下数字足迹的人群的情况下，把多个不完美的数据源结合起来。',
  ],
};

export function normalizeAiRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body.');
  const mode = String(body.mode || '');
  if (!AI_MODES.has(mode)) throw new Error('Unsupported AI mode.');

  const articleId = typeof body.articleId === 'string' ? body.articleId.slice(0, 120) : '';
  const articleSlug = typeof body.articleSlug === 'string' ? body.articleSlug.slice(0, 140) : '';
  const selectedSentenceId = typeof body.selectedSentenceId === 'string' ? body.selectedSentenceId.slice(0, 80) : '';
  const selectedSentence = typeof body.selectedSentence === 'string' ? body.selectedSentence.slice(0, 1600) : '';
  const paragraphContext = typeof body.paragraphContext === 'string' ? body.paragraphContext.slice(0, 4000) : '';
  const articleText = typeof body.articleText === 'string' ? body.articleText.slice(0, 24_000) : '';
  const question = typeof body.question === 'string' ? body.question.slice(0, 1200) : '';

  if (!articleId && !articleSlug) throw new Error('articleId or articleSlug is required.');
  if (mode !== 'chat' && mode !== 'article_translate' && !selectedSentence) throw new Error('selectedSentence is required for this action.');
  if (mode === 'chat' && !question) throw new Error('question is required.');
  if (mode === 'article_translate' && !articleText) throw new Error('articleText is required.');

  return { mode, articleId, articleSlug, selectedSentenceId, selectedSentence, paragraphContext, articleText, question };
}

function mockArticleTranslation(request) {
  if (request.articleSlug && MOCK_ARTICLE_TRANSLATIONS[request.articleSlug]) {
    return { answer: MOCK_ARTICLE_TRANSLATIONS[request.articleSlug].join('\n\n') };
  }
  return { answer: request.articleText.split(/\n\n+/).map((paragraph) => `当前处于模拟 AI 模式，无法对未预置文章执行准确中文翻译。原文段落：${paragraph}`).join('\n\n') };
}

export function mockAnswer(request) {
  if (request.mode === 'article_translate') return mockArticleTranslation(request);
  if (request.mode === 'chat') {
    return { answer: `结合这篇文章的上下文，你的问题是“${request.question}”。建议先定位相关句子，再理解它的主语、动词和关键词。你也可以选中具体句子，我会进一步解释含义、语法和表达。` };
  }
  return { answer: MOCKS[request.mode](request.selectedSentence, request.paragraphContext) };
}

export async function callOpenAI(request, env = process.env) {
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL || 'gpt-5-mini';
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const baseSystem = `You are an English-learning tutor helping an intermediate-to-advanced English learner whose UI language is Simplified Chinese. Use the supplied article context as the primary source. Be concise, accurate and educational. Respond in Simplified Chinese unless the task explicitly asks for simpler English. Do not invent article facts. If the context is insufficient, say so.`;
  let system = baseSystem;
  let user;

  if (request.mode === 'article_translate') {
    system += ' Translate the entire English article into natural Simplified Chinese. Preserve paragraph boundaries. Return only the Chinese translation with one blank line between paragraphs. Do not summarize.';
    user = `Article title: ${request.articleSlug || request.articleId}\n\nArticle:\n${request.articleText}`;
  } else if (request.mode === 'chinese') {
    system += ' Give a concise natural-Chinese explanation of the selected English sentence. Focus on what the sentence means, not a word-for-word translation. Return only the Chinese explanation.';
    user = `Selected sentence: ${request.selectedSentence}\nParagraph context: ${request.paragraphContext}`;
  } else if (request.mode === 'translate') {
    system += ' Translate the selected English sentence into natural Simplified Chinese. Preserve the original meaning and tone. Return only the Chinese translation.';
    user = `Selected sentence: ${request.selectedSentence}\nParagraph context: ${request.paragraphContext}`;
  } else if (request.mode === 'simplify') {
    system += ' Rewrite the selected sentence in simpler, natural English without changing its meaning. Return only the simplified English sentence.';
    user = `Selected sentence: ${request.selectedSentence}\nParagraph context: ${request.paragraphContext}`;
  } else {
    system += ` For ${request.mode}, focus only on the selected sentence and relevant paragraph context.`;
    user = [
      `Mode: ${request.mode}`,
      `Article: ${request.articleSlug || request.articleId}`,
      `Selected sentence: ${request.selectedSentence || '(none)'}`,
      `Paragraph context: ${request.paragraphContext || '(none)'}`,
      `Article context: ${request.articleText || '(not provided)'}`,
      `Question: ${request.question || '(none)'}`,
    ].join('\n');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_output_tokens: request.mode === 'article_translate' ? 2600 : 900,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`AI provider error (${response.status}): ${details.slice(0, 500)}`);
  }

  const data = await response.json();
  const answer = data.output_text || data.output?.map((item) => item.content?.map((part) => part.text).join('')).filter(Boolean).join('\n') || '';
  if (!answer) throw new Error('AI provider returned an empty response.');
  return { answer };
}

export async function aiResponse(body, env = process.env) {
  const request = normalizeAiRequest(body);
  const provider = env.AI_PROVIDER || 'mock';
  return provider === 'openai' ? callOpenAI(request, env) : mockAnswer(request);
}

export function generateEditorialCoverSvg({ title, subtitle = '', category = 'Technology', tags = [], content = '' } = {}) {
  const palette = {
    Technology: ['#0f5f61', '#dcefed'],
    Business: ['#32465f', '#e7ebf2'],
    Economics: ['#5f5738', '#f0eddf'],
    Science: ['#4d5870', '#e8ebf4'],
    Society: ['#6b4e62', '#f1e7ed'],
    Other: ['#45535b', '#e7ecef'],
  };
  const [accent, soft] = palette[category] || palette.Other;
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[c]));
  const words = String(title || 'JEnglish').trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > 27 && line) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line);
  const titleLines = lines.slice(0, 4);
  const stop = new Set(['the','and','that','this','with','from','into','their','there','which','where','what','when','than','have','will','would','could','should','about','after','before','because','while','these','those','only','more','less','over','under','into','your','they','them','then','also']);
  const keywordCounts = new Map();
  `${title} ${subtitle} ${content}`.toLowerCase().match(/[a-z][a-z'-]{3,}/g)?.forEach(word => { if (!stop.has(word)) keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1); });
  const contentKeywords = [...keywordCounts.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([word])=>word);
  const tagLine = [...new Set([...(tags || []), ...contentKeywords])].slice(0, 4).join('  •  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" role="img" aria-label="${esc(title)}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#17201f"/></linearGradient></defs>
    <rect width="1200" height="700" fill="${soft}"/>
    <circle cx="1020" cy="110" r="220" fill="${accent}" opacity="0.16"/>
    <circle cx="1060" cy="600" r="260" fill="${accent}" opacity="0.09"/>
    <path d="M0 540 C260 430 420 590 680 490 S1020 390 1200 470 L1200 700 L0 700 Z" fill="url(#g)" opacity="0.97"/>
    <rect x="70" y="70" width="170" height="34" rx="17" fill="${accent}"/>
    <text x="155" y="93" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="white">${esc(category.toUpperCase())}</text>
    ${titleLines.map((t, i) => `<text x="70" y="${205 + i * 64}" font-family="Georgia, serif" font-size="56" font-weight="700" fill="#17201f">${esc(t)}</text>`).join('')}
    <text x="70" y="450" font-family="Arial, sans-serif" font-size="20" fill="#4d5a58">${esc(subtitle).slice(0, 92)}</text>
    <text x="70" y="625" font-family="Arial, sans-serif" font-size="17" fill="white" opacity="0.86">${esc(tagLine || 'JEnglish  ·  Editorial English Learning')}</text>
    <text x="1115" y="92" text-anchor="end" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#17201f">JEnglish</text>
  </svg>`;
}

export async function serveStatic(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0] || '/');
  const relative = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  const safe = path.normalize(relative);
  if (safe.startsWith('..')) return null;
  const file = path.join(PUBLIC_DIR, safe);
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) return null;
    return file;
  } catch {
    return null;
  }
}
