import http from 'http';
import Database from 'better-sqlite3';
import { INITIAL_ING_LIB, INITIAL_RECIPES } from './src/data/initialData.js';

const API_KEY = process.env.DASHSCOPE_API_KEY;
const PORT = 3001;

// ── 数据库初始化 ──
const db = new Database('data.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ing_lib (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
`);

// 首次运行写入初始数据
const recipeCount = db.prepare('SELECT COUNT(*) as n FROM recipes').get().n;
if (recipeCount === 0) {
  const insert = db.prepare('INSERT INTO recipes (id, data) VALUES (?, ?)');
  for (const r of INITIAL_RECIPES) insert.run(r.id, JSON.stringify(r));
  console.log('初始食谱已写入数据库');
}

const ingCount = db.prepare('SELECT COUNT(*) as n FROM ing_lib').get().n;
if (ingCount === 0) {
  const insert = db.prepare('INSERT INTO ing_lib (id, data) VALUES (?, ?)');
  for (const [id, val] of Object.entries(INITIAL_ING_LIB)) insert.run(id, JSON.stringify(val));
  console.log('初始食材库已写入数据库');
}

// ── 路由处理 ──
function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return JSON.parse(body);
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  // ── 食谱 API ──
  if (path === '/api/recipes' && method === 'GET') {
    const rows = db.prepare('SELECT data FROM recipes').all();
    return json(res, rows.map(r => JSON.parse(r.data)));
  }

  if (path === '/api/recipes' && method === 'POST') {
    const recipe = await readBody(req);
    db.prepare('INSERT OR REPLACE INTO recipes (id, data) VALUES (?, ?)').run(recipe.id, JSON.stringify(recipe));
    return json(res, { ok: true });
  }

  if (path.startsWith('/api/recipes/') && method === 'PUT') {
    const id = path.split('/')[3];
    const recipe = await readBody(req);
    db.prepare('UPDATE recipes SET data = ? WHERE id = ?').run(JSON.stringify(recipe), id);
    return json(res, { ok: true });
  }

  if (path.startsWith('/api/recipes/') && method === 'DELETE') {
    const id = path.split('/')[3];
    db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
    return json(res, { ok: true });
  }

  // ── 食材库 API ──
  if (path === '/api/ing-lib' && method === 'GET') {
    const rows = db.prepare('SELECT id, data FROM ing_lib').all();
    const lib = {};
    for (const row of rows) lib[row.id] = JSON.parse(row.data);
    return json(res, lib);
  }

  if (path === '/api/ing-lib' && method === 'POST') {
    const { id, ...data } = await readBody(req);
    db.prepare('INSERT OR REPLACE INTO ing_lib (id, data) VALUES (?, ?)').run(id, JSON.stringify(data));
    return json(res, { ok: true });
  }

  if (path.startsWith('/api/ing-lib/') && method === 'DELETE') {
    const id = path.split('/')[3];
    db.prepare('DELETE FROM ing_lib WHERE id = ?').run(id);
    return json(res, { ok: true });
  }

  // ── 识图 API ──
  if (path === '/api/recognize' && method === 'POST') {
    const { imageBase64 } = await readBody(req);
    console.log('[识别] 图片大小:', Math.round(imageBase64.length / 1024), 'KB');

    const apiRes = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-vl-max',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            {
              type: 'text',
              text: `请识别这张烘焙食谱图片，提取所有信息，严格按照以下JSON格式返回，不要有任何多余文字：
{
  "name": "食谱名称",
  "tag": "分类（如：面包、蛋糕、饼干等）",
  "portion": 数字,
  "portionUnit": "单位（如：个、片、条）",
  "notes": "注意事项，多条用换行分隔",
  "ingGroups": [
    {
      "groupName": "分组名（如：主料、配料）",
      "ings": [
        { "name": "食材名", "amount": 数字, "unit": "单位（g/ml/pcs等）" }
      ]
    }
  ],
  "days": [
    {
      "label": "第1天",
      "tasks": [
        {
          "id": "唯一短id如t1",
          "name": "步骤简短标题（10字以内）",
          "meta": "详细操作说明（补充温度/手法/注意点，与name不重复）",
          "totalSec": 秒数,
          "serial": true,
          "parGroup": "并行组标识（如A/B/C，只有可同时进行的步骤才填，其余留null）",
          "parWith": "并行的另一个步骤id（没有并行则留null）"
        }
      ]
    }
  ]
}

并行规则：
- 若两个步骤可以同时进行（如"发酵"和"预热烤箱"），给它们相同的parGroup（如"A"），并互相填写parWith为对方的id
- 耗时较长的那个serial设为true，另一个serial设为false
- 没有并行关系的步骤parGroup和parWith均为null`,
            },
          ],
        }],
      }),
    });

    const data = await apiRes.json();
    console.log('[识别] 千问状态:', apiRes.status);

    if (!apiRes.ok) {
      return json(res, { error: `API错误: ${data.message || apiRes.status}` }, 502);
    }

    const content = data.choices?.[0]?.message?.content ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[识别] 无法提取JSON:', content.slice(0, 200));
      return json(res, { error: '解析失败，请重试' }, 422);
    }

    console.log('[识别] 成功');
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(jsonMatch[0]);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    await handleRequest(req, res);
  } catch (e) {
    console.error('[错误]', e);
    json(res, { error: e.message }, 500);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`后端运行在 http://0.0.0.0:${PORT}`);
});
