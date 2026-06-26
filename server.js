import http from 'http';

const API_KEY = process.env.DASHSCOPE_API_KEY;
const PORT = 3001;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;
  const { imageBase64 } = JSON.parse(body);

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
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
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
        { "name": "步骤名称", "meta": "详细说明", "totalSec": 秒数, "serial": true }
      ]
    }
  ]
}`,
          },
        ],
      }],
    }),
  });

  const data = await apiRes.json();
  console.log('[识别] 千问状态:', apiRes.status);

  if (!apiRes.ok) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `API错误: ${data.message || apiRes.status}` }));
    return;
  }

  const content = data.choices?.[0]?.message?.content ?? '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('[识别] 无法提取JSON，原始内容:', content.slice(0, 200));
    res.writeHead(422, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '解析失败，请重试' }));
    return;
  }

  console.log('[识别] 成功');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(jsonMatch[0]);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`后端运行在 http://0.0.0.0:${PORT}`);
});
