const ALLOWED_ORIGIN = '*';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { imageBase64 } = await request.json();

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-vl-max',
        messages: [
          {
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
          },
        ],
      }),
    });

    const data = await response.json();
    console.log('DashScope status:', response.status);
    console.log('DashScope response:', JSON.stringify(data).slice(0, 500));
    const content = data.choices?.[0]?.message?.content ?? '';

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `API错误: ${response.status} ${data.message || data.error?.message || ''}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN },
      });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('No JSON found in content:', content.slice(0, 200));
      return new Response(JSON.stringify({ error: '解析失败，请重试' }), {
        status: 422,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
      });
    }

    return new Response(jsonMatch[0], {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      },
    });
  },
};
