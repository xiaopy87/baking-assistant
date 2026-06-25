export const INITIAL_ING_LIB = {
  flour_bread: { name: '高筋面粉', price: 45, qty: 5000, unit: 'g' },
  salt:        { name: '盐',       price: 3,  qty: 500,  unit: 'g' },
  sugar:       { name: '细砂糖',   price: 8,  qty: 500,  unit: 'g' },
  yeast:       { name: '速发酵母', price: 12, qty: 100,  unit: 'g' },
  milk:        { name: '全脂牛奶', price: 15, qty: 1000, unit: 'ml' },
  butter:      { name: '无盐黄油', price: 35, qty: 500,  unit: 'g' },
  egg:         { name: '鸡蛋',     price: 12, qty: 6,    unit: 'pcs' },
  cake_flour:  { name: '低筋面粉', price: 18, qty: 1000, unit: 'g' },
};

export const INITIAL_RECIPES = [
  {
    id: 'croissant',
    name: '法式可颂（隔夜波兰种版）',
    tag: '🥐 面包',
    portion: 8,
    portionUnit: '个',
    days: [
      {
        label: '前一晚',
        tasks: [
          { id: 'a0', name: '制作波兰种', meta: '混合面粉、酵母、牛奶', totalSec: 10 * 60, serial: true },
          { id: 'a1', name: '波兰种室温发酵后冷藏', meta: '室温1小时后入冰箱隔夜', totalSec: 60 * 60, serial: true, overnight: true },
        ],
      },
      {
        label: '当天',
        tasks: [
          { id: 'b0', name: '波兰种回温·准备材料', meta: '取出波兰种，称量食材', totalSec: 20 * 60, serial: true },
          { id: 'b1', name: '揉主面团', meta: '波兰种＋主面团材料，揉至光滑', totalSec: 20 * 60, serial: true },
          { id: 'b2a', name: '面团冷藏松弛', meta: '冷藏30分钟', totalSec: 30 * 60, serial: true, parGroup: 'A', parWith: 'b2b' },
          { id: 'b2b', name: '准备裹入黄油片', meta: '黄油拍成薄片冷藏', totalSec: 10 * 60, serial: false, parGroup: 'A', parWith: 'b2a' },
          { id: 'b3', name: '三次折叠开酥', meta: '每次折叠后冷藏30分钟', totalSec: 90 * 60, serial: true },
          { id: 'b4', name: '整形·切割·卷起', meta: '擀开，切三角，卷成牛角', totalSec: 15 * 60, serial: true },
          { id: 'b5a', name: '最终发酵', meta: '常温至1.5倍大', totalSec: 40 * 60, serial: true, parGroup: 'B', parWith: 'b5b' },
          { id: 'b5b', name: '预热烤箱 200°C', meta: '发酵20分后启动', totalSec: 20 * 60, serial: false, parGroup: 'B', parWith: 'b5a', delayAfterPar: 20 * 60 },
          { id: 'b6', name: '刷蛋液·入烤箱烘烤', meta: '200°C 烤20分钟', totalSec: 20 * 60, serial: true },
        ],
      },
    ],
    ingGroups: [
      {
        groupName: '波兰种',
        ings: [
          { name: '高筋面粉', ingId: 'flour_bread', amount: 50, unit: 'g' },
          { name: '速发酵母', ingId: 'yeast', amount: 0.5, unit: 'g' },
          { name: '全脂牛奶', ingId: 'milk', amount: 50, unit: 'ml' },
        ],
      },
      {
        groupName: '主面团',
        ings: [
          { name: '高筋面粉', ingId: 'flour_bread', amount: 200, unit: 'g' },
          { name: '盐', ingId: 'salt', amount: 5, unit: 'g' },
          { name: '细砂糖', ingId: 'sugar', amount: 30, unit: 'g' },
          { name: '速发酵母', ingId: 'yeast', amount: 3, unit: 'g' },
          { name: '全脂牛奶', ingId: 'milk', amount: 100, unit: 'ml' },
          { name: '无盐黄油（面团）', ingId: 'butter', amount: 20, unit: 'g' },
        ],
      },
      {
        groupName: '裹入黄油',
        ings: [
          { name: '无盐黄油', ingId: 'butter', amount: 125, unit: 'g' },
        ],
      },
      {
        groupName: '表面',
        ings: [
          { name: '全蛋液', ingId: 'egg', amount: 1, unit: 'pcs' },
        ],
      },
    ],
    notes: '• 波兰种隔夜发酵让风味更丰富，是这个版本的核心\n• 黄油温度控制在13-15°C，裹入时与面团硬度一致\n• 叠层动作要快，避免黄油融化\n• 发酵充分才有明显层次',
  },
  {
    id: 'chiffon',
    name: '戚风蛋糕',
    tag: '🎂 蛋糕',
    portion: 1,
    portionUnit: '个',
    days: [
      {
        label: '当天',
        tasks: [
          { id: 'd0', name: '准备蛋黄糊', meta: '蛋黄加糖、牛奶、黄油，筛入面粉', totalSec: 10 * 60, serial: true },
          { id: 'd1a', name: '蛋白打发', meta: '蛋白加糖打至硬性发泡', totalSec: 15 * 60, serial: true, parGroup: 'A', parWith: 'd1b' },
          { id: 'd1b', name: '预热烤箱 160°C', meta: '与打发同时进行', totalSec: 15 * 60, serial: false, parGroup: 'A', parWith: 'd1a' },
          { id: 'd2', name: '翻拌·入模·震气泡', meta: '切拌均匀，倒入模具', totalSec: 5 * 60, serial: true },
          { id: 'd3', name: '烘烤', meta: '160°C 烤50分钟', totalSec: 50 * 60, serial: true },
          { id: 'd4', name: '倒扣冷却', meta: '出炉立即倒扣，冷却40分钟', totalSec: 40 * 60, serial: true },
        ],
      },
    ],
    ingGroups: [
      {
        groupName: '蛋黄糊',
        ings: [
          { name: '低筋面粉', ingId: 'cake_flour', amount: 85, unit: 'g' },
          { name: '细砂糖', ingId: 'sugar', amount: 40, unit: 'g' },
          { name: '全脂牛奶', ingId: 'milk', amount: 50, unit: 'ml' },
          { name: '无盐黄油', ingId: 'butter', amount: 40, unit: 'g' },
          { name: '鸡蛋（蛋黄）', ingId: 'egg', amount: 4, unit: 'pcs' },
        ],
      },
      {
        groupName: '蛋白霜',
        ings: [
          { name: '鸡蛋（蛋白）', ingId: 'egg', amount: 4, unit: 'pcs' },
          { name: '细砂糖', ingId: 'sugar', amount: 40, unit: 'g' },
        ],
      },
    ],
    notes: '• 打蛋白的盆必须无油无水\n• 翻拌用切拌手法，不要画圈\n• 倒扣冷却不能省略',
  },
];
