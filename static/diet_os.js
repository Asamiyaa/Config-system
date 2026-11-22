/* ============================================================================
   Nutrition OS · 饮食饮水记录
   结构：今日 / 食物库 / 目标 / 复盘
   - 常见中式食物参考库（每 100g），份量换算后自动计算热量与宏量
   - 早餐/午餐/晚餐/加餐 + 饮水，按日查看与补录
   - Mifflin-St Jeor 估算 BMR/TDEE，自动给蛋白、脂肪、碳水、纤维、水目标
   - 按剩余目标推荐一餐，可一键加入
   ========================================================================== */

const HOS_MEALS = [
  { key: 'breakfast', label: '早餐', icon: '☀' },
  { key: 'lunch', label: '午餐', icon: '◐' },
  { key: 'dinner', label: '晚餐', icon: '☾' },
  { key: 'snack', label: '加餐', icon: '·' }
];
const HOS_FOOD_TAGS = ['meat', 'pork', 'beef', 'poultry', 'seafood', 'egg', 'dairy', 'soy', 'gluten', 'vegan', 'vegetarian', 'highSugar'];
const HOS_RESTRICTIONS = [
  { value: '素食', label: '素食' },
  { value: '不吃猪肉', label: '不吃猪肉' },
  { value: '不吃牛肉', label: '不吃牛肉' },
  { value: '乳糖不耐', label: '乳糖不耐' },
  { value: '海鲜过敏', label: '海鲜过敏' },
  { value: '麸质敏感', label: '麸质敏感' }
];

/* 参考值取常见食物成分表的近似值，用于趋势与份量管理，不作为医学或精确营养依据。 */
const HOS_FOODS = [
  ['rice', '米饭', '主食', [], 116, 2.6, 25.9, 0.3, 0.3, 0.1, 2, 150, '1 碗'],
  ['brown-rice', '糙米饭', '主食', ['gluten'], 111, 2.6, 23, 0.9, 1.8, 0.4, 5, 150, '1 碗'],
  ['mantou', '馒头', '主食', ['gluten'], 223, 7, 47, 1.1, 1.3, 3, 165, 100, '1 个'],
  ['whole-bread', '全麦面包', '主食', ['gluten'], 246, 9.9, 46, 3.4, 6, 4.3, 450, 35, '1 片'],
  ['noodles', '面条（熟）', '主食', ['gluten'], 110, 3.5, 22, 0.4, 0.8, 0.5, 150, 200, '1 碗'],
  ['oats', '燕麦片（干）', '主食', ['gluten'], 377, 13.5, 61, 7, 10, 1, 4, 40, '1 份'],
  ['sweet-potato', '红薯', '主食', [], 86, 1.6, 20, 0.1, 3, 4.2, 55, 150, '1 个'],
  ['corn', '玉米', '主食', [], 112, 4, 22.8, 1.2, 2.9, 6.3, 1, 150, '1 根'],
  ['potato', '土豆', '主食', [], 77, 2, 17, 0.1, 2.2, 0.8, 6, 150, '1 个'],
  ['quinoa', '藜麦（熟）', '主食', [], 120, 4.4, 21, 1.9, 2.8, 0.9, 7, 150, '1 碗'],
  ['congee', '白粥', '主食', [], 46, 1.1, 9.9, 0.2, 0.3, 0, 2, 250, '1 碗'],
  ['baozi', '猪肉包子', '主食', ['meat', 'pork', 'gluten'], 227, 8, 30, 8, 1.5, 2, 450, 100, '1 个'],
  ['dumpling', '猪肉饺子', '主食', ['meat', 'pork', 'gluten'], 240, 10, 28, 9, 1.2, 2, 400, 120, '6 个'],
  ['rice-noodle', '米粉（熟）', '主食', [], 109, 2, 24, 0.2, 0.9, 0.2, 10, 200, '1 碗'],
  ['cornflake', '玉米片', '主食', ['gluten'], 357, 7, 84, 0.4, 3, 0.6, 500, 30, '1 份'],
  ['chicken-breast', '鸡胸肉', '蛋白质', ['meat', 'poultry'], 133, 24, 0, 3.6, 0, 0, 60, 120, '1 块'],
  ['chicken-thigh', '鸡腿肉（去皮）', '蛋白质', ['meat', 'poultry'], 146, 20, 0, 7, 0, 0, 70, 100, '1 份'],
  ['egg', '鸡蛋', '蛋白质', ['egg'], 144, 13, 1.1, 9.5, 0, 1.1, 142, 50, '1 个'],
  ['beef-tender', '牛里脊', '蛋白质', ['meat', 'beef'], 107, 22, 0, 2, 0, 0, 55, 100, '1 份'],
  ['pork-tender', '猪里脊', '蛋白质', ['meat', 'pork'], 143, 20, 0, 6, 0, 0, 55, 100, '1 份'],
  ['salmon', '三文鱼', '蛋白质', ['seafood'], 208, 20, 0, 13, 0, 0, 59, 100, '1 份'],
  ['shrimp', '虾仁', '蛋白质', ['seafood'], 93, 18.6, 1, 0.8, 0, 0, 111, 100, '1 份'],
  ['tuna', '金枪鱼（水浸）', '蛋白质', ['seafood'], 116, 26, 0, 1, 0, 0, 247, 100, '1 罐'],
  ['tofu', '豆腐', '蛋白质', ['soy', 'vegan', 'vegetarian'], 76, 8, 1.9, 4.8, 0.3, 0.6, 7, 150, '1 块'],
  ['soy-milk', '无糖豆浆', '蛋白质', ['soy', 'vegan', 'vegetarian'], 31, 3, 1.2, 1.6, 0.4, 0.6, 4, 250, '1 杯'],
  ['edamame', '毛豆', '蛋白质', ['soy', 'vegan', 'vegetarian'], 131, 13, 10, 5, 4.2, 2, 6, 100, '1 小碗'],
  ['pea', '豌豆', '蛋白质', ['vegan', 'vegetarian'], 81, 5.4, 14, 0.4, 5.1, 5.7, 5, 100, '1 小碗'],
  ['milk', '牛奶', '乳制品', ['dairy', 'vegetarian'], 54, 3, 3.4, 3.2, 0, 3.2, 37, 250, '1 杯'],
  ['yogurt', '无糖酸奶', '乳制品', ['dairy', 'vegetarian'], 63, 3.5, 4.5, 3.3, 0, 4.5, 46, 150, '1 杯'],
  ['greek-yogurt', '希腊酸奶', '乳制品', ['dairy', 'vegetarian'], 97, 9, 3.6, 5, 0, 3.6, 36, 150, '1 杯'],
  ['cheese', '奶酪', '乳制品', ['dairy', 'vegetarian'], 328, 25, 3.5, 25, 0, 0.5, 621, 30, '1 片'],
  ['whey', '蛋白粉', '蛋白质', ['dairy'], 380, 80, 8, 5, 1, 2, 300, 30, '1 勺'],
  ['broccoli', '西兰花', '蔬菜', ['vegan', 'vegetarian'], 34, 2.8, 6.6, 0.4, 2.6, 1.5, 33, 150, '1 份'],
  ['spinach', '菠菜', '蔬菜', ['vegan', 'vegetarian'], 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79, 150, '1 份'],
  ['lettuce', '生菜', '蔬菜', ['vegan', 'vegetarian'], 15, 1.4, 2.9, 0.2, 1.3, 0.8, 28, 100, '1 份'],
  ['tomato', '番茄', '蔬菜', ['vegan', 'vegetarian'], 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5, 150, '1 个'],
  ['cucumber', '黄瓜', '蔬菜', ['vegan', 'vegetarian'], 15, 0.7, 3.6, 0.1, 0.5, 1.7, 2, 150, '1 根'],
  ['carrot', '胡萝卜', '蔬菜', ['vegan', 'vegetarian'], 41, 0.9, 9.6, 0.2, 2.8, 4.7, 69, 100, '1 根'],
  ['mushroom', '蘑菇', '蔬菜', ['vegan', 'vegetarian'], 22, 3.1, 3.3, 0.3, 1, 2, 5, 100, '1 份'],
  ['pepper', '青椒', '蔬菜', ['vegan', 'vegetarian'], 20, 0.9, 4.6, 0.2, 1.7, 2.4, 3, 100, '1 个'],
  ['eggplant', '茄子', '蔬菜', ['vegan', 'vegetarian'], 25, 1, 6, 0.2, 3, 3.5, 2, 150, '1 份'],
  ['kelp', '海带', '蔬菜', ['vegan', 'vegetarian'], 13, 1.2, 2.1, 0.1, 0.5, 0.5, 233, 100, '1 份'],
  ['fungus', '木耳（泡发）', '蔬菜', ['vegan', 'vegetarian'], 27, 1.5, 6, 0.2, 2.6, 0.5, 5, 100, '1 份'],
  ['apple', '苹果', '水果', ['vegan', 'vegetarian'], 52, 0.3, 14, 0.2, 2.4, 10.4, 1, 180, '1 个'],
  ['banana', '香蕉', '水果', ['vegan', 'vegetarian'], 89, 1.1, 23, 0.3, 2.6, 12, 1, 120, '1 根'],
  ['blueberry', '蓝莓', '水果', ['vegan', 'vegetarian'], 57, 0.7, 14.5, 0.3, 2.4, 10, 1, 100, '1 小盒'],
  ['orange', '橙子', '水果', ['vegan', 'vegetarian'], 47, 0.9, 12, 0.1, 2.4, 9.4, 0, 180, '1 个'],
  ['avocado', '牛油果', '水果', ['vegan', 'vegetarian'], 160, 2, 8.5, 15, 6.7, 0.7, 7, 100, '半个'],
  ['nuts', '混合坚果', '坚果', ['vegan', 'vegetarian'], 607, 20, 21, 54, 7, 4, 5, 25, '1 小把'],
  ['peanut-butter', '花生酱', '坚果', ['vegan', 'vegetarian'], 588, 25, 20, 50, 6, 9, 17, 15, '1 勺'],
  ['olive-oil', '橄榄油', '油脂', ['vegan', 'vegetarian'], 884, 0, 0, 100, 0, 0, 2, 10, '1 勺'],
  ['honey', '蜂蜜', '甜味', ['vegetarian', 'highSugar'], 304, 0.3, 82, 0, 0.2, 82, 4, 15, '1 勺'],
  ['cola', '可乐', '饮品', ['vegan', 'vegetarian', 'highSugar'], 42, 0, 10.6, 0, 0, 10.6, 4, 330, '1 罐'],
  ['milk-tea', '奶茶（全糖）', '饮品', ['dairy', 'highSugar'], 72, 1, 12, 2, 0, 11, 40, 500, '1 杯'],
  ['coffee', '黑咖啡', '饮品', ['vegan', 'vegetarian'], 2, 0.1, 0, 0, 0, 0, 2, 250, '1 杯'],
  ['beer', '啤酒', '饮品', ['gluten'], 43, 0.5, 3.6, 0, 0, 0, 4, 330, '1 罐'],
  ['orange-juice', '橙汁', '饮品', ['vegan', 'vegetarian', 'highSugar'], 45, 0.7, 10.4, 0.2, 0.2, 8.4, 1, 250, '1 杯'],
  ['sparkling-water', '无糖气泡水', '饮品', ['vegan', 'vegetarian'], 0, 0, 0, 0, 0, 0, 0, 330, '1 罐'],
  ['fries', '薯条', '快餐', ['vegan', 'vegetarian'], 312, 3.4, 41, 15, 3.8, 0.3, 210, 100, '1 份'],
  ['burger', '牛肉汉堡', '快餐', ['meat', 'beef', 'gluten'], 254, 13, 24, 12, 1.5, 5, 500, 200, '1 个'],
  ['pizza', '披萨', '快餐', ['gluten', 'dairy'], 266, 11, 33, 10, 2.3, 3.6, 598, 150, '1 块'],
  ['fried-rice', '炒饭', '快餐', ['egg'], 163, 4, 26, 5, 0.8, 1, 400, 250, '1 份'],
  ['beef-noodle', '牛肉面', '快餐', ['meat', 'beef', 'gluten'], 130, 6, 18, 4, 1, 1, 450, 400, '1 碗'],
  ['sandwich', '三明治', '快餐', ['gluten'], 250, 11, 28, 10, 2, 4, 600, 150, '1 个'],
  ['chicken-salad', '鸡胸沙拉', '快餐', ['meat', 'poultry'], 85, 9, 6, 3, 1.5, 2, 180, 250, '1 份'],
  ['gongbao', '宫保鸡丁', '家常菜', ['meat', 'poultry'], 200, 12, 9, 13, 1, 4, 650, 200, '1 份'],
  ['yuxiang', '鱼香肉丝', '家常菜', ['meat', 'pork'], 180, 9, 10, 12, 1, 5, 600, 200, '1 份'],
  ['chocolate', '黑巧克力（70%）', '零食', ['vegetarian', 'highSugar'], 598, 7.8, 46, 43, 11, 24, 20, 20, '1 小块'],
  ['icecream', '冰淇淋', '零食', ['dairy', 'highSugar'], 207, 3.5, 24, 11, 0.7, 21, 80, 100, '1 球']
].map(([id, name, cat, tags, kcal, protein, carbs, fat, fiber, sugar, sodium, serving, servingLabel]) => (
  { id, name, cat, tags, kcal, protein, carbs, fat, fiber, sugar, sodium, serving, servingLabel }
));

const HOS_ACTIVITY_FACTORS = { '久坐': 1.2, '轻活动': 1.375, '中活动': 1.55, '高活动': 1.725, '很高': 1.9 };
const HOS_MEAL_TEMPLATES = [
  { id: 'hp-lunch', name: '高蛋白工作日', meal: 'lunch', desc: '鸡胸 150g + 米饭 150g + 西兰花 150g + 希腊酸奶 150g', items: [['chicken-breast', 150], ['rice', 150], ['broccoli', 150], ['greek-yogurt', 150]] },
  { id: 'fat-lunch', name: '减脂家常', meal: 'lunch', desc: '虾仁 120g + 红薯 150g + 菠菜 150g + 苹果 180g', items: [['shrimp', 120], ['sweet-potato', 150], ['spinach', 150], ['apple', 180]] },
  { id: 'veg-dinner', name: '素食均衡', meal: 'dinner', desc: '豆腐 200g + 糙米饭 150g + 西兰花 150g + 坚果 15g', items: [['tofu', 200], ['brown-rice', 150], ['broccoli', 150], ['nuts', 15]] }
];
const HOS_GOALS = [
  { value: '减脂', label: '减脂（热量 −15%）' },
  { value: '维持', label: '维持' },
  { value: '增肌', label: '增肌（热量 +10%）' }
];
let HOS_DIET_SUGGESTION = null;

function hosDietState() {
  if (!state.diet || !state.diet.profile || !state.diet.targets) hosEnsureDietState();
  return state.diet;
}
function hosEnsureDietState() {
  if (typeof state === 'undefined' || !state) return;
  state.diet = state.diet && typeof state.diet === 'object' ? state.diet : {};
  const d = state.diet;
  const weight = state.bodyMeasurements && state.bodyMeasurements[0] && state.bodyMeasurements[0].weight ? state.bodyMeasurements[0].weight : 70;
  d.profile = { sex: '男', age: 30, height: 172, weight, activity: '轻活动', goal: '维持', dietStyle: '普通', restrictions: [], ...(d.profile || {}) };
  if (!Array.isArray(d.profile.restrictions)) d.profile.restrictions = [];
  if (!d.targets || typeof d.targets !== 'object') d.targets = hosCalcDietTargets(d.profile);
  if (!Array.isArray(d.logs)) d.logs = [];
  if (!Array.isArray(d.water)) d.water = [];
  if (!Array.isArray(d.customFoods)) d.customFoods = [];
  if (!Array.isArray(d.favorites)) d.favorites = [];
}
function hosCalcDietTargets(profile) {
  const p = profile || {};
  const weight = hosNum(p.weight, 70);
  const height = hosNum(p.height, 172);
  const age = hosNum(p.age, 30);
  const male = p.sex !== '女';
  const bmr = 10 * weight + 6.25 * height - 5 * age + (male ? 5 : -161);
  const factor = HOS_ACTIVITY_FACTORS[p.activity] || 1.375;
  let kcal = bmr * factor;
  if (p.goal === '减脂') kcal *= 0.85;
  if (p.goal === '增肌') kcal *= 1.1;
  kcal = Math.round(kcal / 10) * 10;
  const protein = Math.round(weight * (p.goal === '增肌' || p.goal === '减脂' ? 1.8 : 1.6));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return {
    kcal, protein, carbs, fat,
    fiber: Math.round((kcal / 1000) * 14),
    water: Math.round((weight * 35) / 50) * 50,
    sugar: Math.round((kcal * 0.05) / 4),
    sodium: 2000,
    bmr: Math.round(bmr), tdee: Math.round(bmr * factor)
  };
}
function hosDietTargets() {
  return { ...hosCalcDietTargets(hosDietState().profile), ...(hosDietState().targets || {}) };
}
function hosFoodById(id) {
  const custom = (hosDietState().customFoods || []).find((x) => String(x.id) === String(id));
  return custom || HOS_FOODS.find((x) => x.id === id) || null;
}
function hosDietMealLogs(date = hosToday(), meal = '') {
  return (hosDietState().logs || []).filter((x) => x.date === date && (!meal || x.meal === meal)).slice().sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}
function hosDietTotals(date = hosToday()) {
  const logs = hosDietMealLogs(date);
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  logs.forEach((x) => Object.keys(total).forEach((k) => { total[k] += hosNum(x[k]); }));
  total.water = hosDietWater(date);
  return total;
}
function hosDietWater(date = hosToday()) {
  return hosSum((hosDietState().water || []).filter((x) => x.date === date), 'ml');
}
function hosFoodMacros(food, grams) {
  const factor = hosNum(grams) / 100;
  return {
    kcal: Math.round(hosNum(food.kcal) * factor),
    protein: hosRound(hosNum(food.protein) * factor, 1),
    carbs: hosRound(hosNum(food.carbs) * factor, 1),
    fat: hosRound(hosNum(food.fat) * factor, 1),
    fiber: hosRound(hosNum(food.fiber) * factor, 1),
    sugar: hosRound(hosNum(food.sugar) * factor, 1),
    sodium: Math.round(hosNum(food.sodium) * factor)
  };
}
function hosFoodAllowed(food, restrictions) {
  const tags = food.tags || [];
  const list = restrictions || [];
  if (list.includes('素食') && tags.some((t) => ['meat', 'poultry', 'beef', 'pork', 'seafood'].includes(t))) return false;
  if (list.includes('不吃猪肉') && tags.includes('pork')) return false;
  if (list.includes('不吃牛肉') && tags.includes('beef')) return false;
  if (list.includes('乳糖不耐') && tags.includes('dairy')) return false;
  if (list.includes('海鲜过敏') && tags.includes('seafood')) return false;
  if (list.includes('麸质敏感') && tags.includes('gluten')) return false;
  return true;
}
function hosDietScore(date = hosToday()) {
  const t = hosDietTotals(date);
  const g = hosDietTargets();
  if (!t.kcal) return null;
  let score = 100;
  score -= Math.min(25, (Math.abs(t.kcal - g.kcal) / Math.max(1, g.kcal)) * 100 * 0.6);
  const pr = t.protein / Math.max(1, g.protein);
  if (pr < 0.9) score -= Math.min(20, ((0.9 - pr) / 0.9) * 20);
  const fr = t.fiber / Math.max(1, g.fiber);
  if (fr < 0.8) score -= Math.min(12, ((0.8 - fr) / 0.8) * 12);
  const wr = t.water / Math.max(1, g.water);
  if (wr < 0.8) score -= Math.min(15, ((0.8 - wr) / 0.8) * 15);
  if (g.sugar && t.sugar > g.sugar) score -= Math.min(15, (t.sugar / g.sugar - 1) * 20);
  if (t.sodium > g.sodium) score -= Math.min(8, (t.sodium - g.sodium) / 500);
  return Math.round(hosClamp(score, 0, 100));
}
function hosDietInsights(date = hosToday()) {
  const t = hosDietTotals(date);
  const g = hosDietTargets();
  const logs = hosDietMealLogs(date);
  const out = [];
  if (!logs.length) return [{ tone: 'neutral', title: '今天还没有饮食记录', text: '先记录第一餐；没有记录时所有热量与宏量都按 0 处理，不生成虚假数据。' }];
  if (t.protein < g.protein * 0.8) out.push({ tone: 'warn', title: '蛋白质偏低', text: `目前 ${Math.round(t.protein)}g，目标 ${g.protein}g。下一餐优先加鸡胸、鱼虾、鸡蛋、豆腐或无糖酸奶。` });
  if (t.water < g.water * 0.7) out.push({ tone: 'warn', title: '饮水不足', text: `目前 ${hosDietWater(date)}ml，目标 ${g.water}ml。每杯 250–300ml，分次补充。` });
  if (t.fiber < g.fiber * 0.6) out.push({ tone: 'neutral', title: '膳食纤维偏少', text: `目前 ${hosRound(t.fiber, 1)}g，目标 ${g.fiber}g。加一份蔬菜、豆类或水果。` });
  if (t.sugar > g.sugar) out.push({ tone: 'bad', title: '添加糖偏高', text: `目前 ${hosRound(t.sugar, 1)}g，超过建议上限 ${g.sugar}g。先减少含糖饮料和甜点。` });
  if (t.sodium > g.sodium) out.push({ tone: 'warn', title: '钠摄入偏高', text: `目前 ${Math.round(t.sodium)}mg。少用酱料、腌制品和加工肉。` });
  if (t.kcal < g.kcal * 0.65) out.push({ tone: 'warn', title: '热量明显低于目标', text: '长期过低会影响恢复和训练表现；若在减脂，也不建议用极端低热量换短期下降。' });
  if (t.kcal > g.kcal * 1.15) out.push({ tone: 'warn', title: '热量超过目标', text: `目前 ${Math.round(t.kcal)}kcal，目标 ${g.kcal}kcal。先检查饮料、坚果、酱料和加餐份量。` });
  const missing = HOS_MEALS.filter((m) => !logs.some((x) => x.meal === m.key));
  if (missing.length && logs.length) out.push({ tone: 'neutral', title: '餐次还不完整', text: `还没记录：${missing.map((x) => x.label).join('、')}。不要求每餐完美，但规律记录更能看出模式。` });
  if (!out.length) out.push({ tone: 'good', title: '今天的饮食结构基本达标', text: '热量、蛋白质、纤维和饮水都在目标附近，保持即可。' });
  return out.slice(0, 4);
}
function hosDietAdherence(days = 7) {
  const dates = hosDates(days);
  const g = hosDietTargets();
  let calorieDays = 0;
  let proteinDays = 0;
  let waterDays = 0;
  let logDays = 0;
  dates.forEach((date) => {
    const t = hosDietTotals(date);
    if (t.kcal) {
      logDays += 1;
      if (Math.abs(t.kcal - g.kcal) / g.kcal <= 0.1) calorieDays += 1;
      if (t.protein >= g.protein * 0.9) proteinDays += 1;
    }
    if (t.water >= g.water * 0.9) waterDays += 1;
  });
  return { days, logDays, calorieDays, proteinDays, waterDays, rate: dates.length ? Math.round((logDays / dates.length) * 100) : 0 };
}
function hosDietSuggest(meal = 'lunch') {
  const g = hosDietTargets();
  const t = hosDietTotals();
  const restrictions = hosDietState().profile.restrictions;
  const remainingKcal = Math.max(180, g.kcal - t.kcal);
  const share = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 }[meal] || 0.3;
  const budget = Math.min(remainingKcal, Math.max(220, Math.round(g.kcal * share)));
  const proteinNeed = Math.max(18, Math.min(g.protein - t.protein, Math.round(g.protein * share)));
  const pick = (cat, min = 0) => (HOS_FOODS.concat(hosDietState().customFoods || []).filter((f) => f.cat === cat && hosFoodAllowed(f, restrictions) && hosNum(f.kcal) >= min));
  const proteinFoods = pick('蛋白质').filter((f) => f.id !== 'whey').sort((a, b) => (b.protein / Math.max(1, b.kcal)) - (a.protein / Math.max(1, a.kcal)));
  const carbFoods = pick('主食').sort((a, b) => (a.kcal - b.kcal));
  const vegFoods = pick('蔬菜');
  const fruitFoods = pick('水果');
  const fatFoods = pick('坚果').concat(pick('油脂'));
  const items = [];
  const add = (food, grams) => {
    if (!food || grams <= 0) return;
    const m = hosFoodMacros(food, grams);
    items.push({ foodId: food.id, name: food.name, grams: Math.round(grams / 5) * 5, ...m });
  };
  const protein = proteinFoods[0] || HOS_FOODS.find((f) => f.id === 'egg');
  if (protein) add(protein, (proteinNeed / Math.max(1, protein.protein)) * 100);
  const carb = carbFoods[0];
  if (carb) add(carb, Math.min(200, (budget * 0.38) / Math.max(1, carb.kcal) * 100));
  add(vegFoods[0] || HOS_FOODS.find((f) => f.id === 'broccoli'), meal === 'snack' ? 100 : 150);
  add(fruitFoods[0] || HOS_FOODS.find((f) => f.id === 'apple'), meal === 'snack' ? 150 : 100);
  const fat = fatFoods[0];
  if (fat) add(fat, fat.cat === '油脂' ? 5 : 10);
  if (meal === 'snack') items.splice(0, items.length, ...items.filter((x) => x.name !== '米饭'));
  const totals = items.reduce((sum, x) => ({ kcal: sum.kcal + x.kcal, protein: hosRound(sum.protein + x.protein, 1), carbs: hosRound(sum.carbs + x.carbs, 1), fat: hosRound(sum.fat + x.fat, 1) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  return { meal, budget, items, totals };
}
function hosDietSummaryCard() {
  const t = hosDietTotals();
  const g = hosDietTargets();
  const score = hosDietScore();
  return `<article class="hos-overview-item"><header><span>NUTRITION</span><b class="${hosScoreTone(score)}">${score == null ? '未记录' : score + '/100'}</b></header><h4>饮食 · 今日摄入</h4><p>${Math.round(t.kcal)} / ${g.kcal} kcal · 蛋白 ${Math.round(t.protein)}/${g.protein}g · 水 ${hosDietWater()}/${g.water}ml</p>${hosProgress(t.kcal, g.kcal, `${Math.round(t.kcal)} / ${g.kcal} kcal`)}<button class="btn btn-small btn-outline" data-action="capability-page" data-page="diet">打开饮食工作台 →</button></article>`;
}

/* ---- 页面 ------------------------------------------------------------- */
function hosDietPersonalFoodReference(){
  const rows=[
    ['🥬 蔬菜','芹菜、番茄、苦瓜、金银花、菊花','降压、降火、清热（个人备注）'],
    ['🍎 水果','番茄、枸杞、红枣','维生素、补血（个人备注）'],
    ['🥩 蛋白质','鸡肝、鱼肉、鸡胸肉、鸡蛋、豆制品','优质蛋白'],
    ['🥜 坚果','核桃、杏仁、腰果','不饱和脂肪酸；每天一小把'],
    ['☕ 茶饮','祛湿茶、金银花茶、枸杞水','祛湿、降火、养肝（个人备注）'],
    ['💧 饮水','温开水（每天 2L+）','饮水习惯参考']
  ];
  return `<section class="card" style="margin-top:14px"><div class="card-head"><div><h3>个人食材参考</h3><p>按分类查看常用食材与个人备注；食物不替代降压或其他治疗。</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>分类</th><th>食材</th><th>作用 / 备注</th></tr></thead><tbody>${rows.map(([cat,food,note])=>`<tr><th>${esc(cat)}</th><td>${esc(food)}</td><td>${esc(note)}</td></tr>`).join('')}</tbody></table></div><p class="micro-copy" style="padding:0 14px 14px">金银花、菊花、枸杞及草本茶可能与个人疾病或药物存在相互作用；如有慢性病、过敏或正在用药，请按医生/药师建议选择。</p></section>`;
}
function renderDietOS() {
  return `${sectionHead('NUTRITION OS · FOOD & WATER', '饮食饮水记录', '用常见中式食物参考库记录每餐份量，自动换算热量、蛋白质、碳水、脂肪、纤维、糖和钠；按身体数据设定目标，再用水和餐次记录观察执行。数值为参考，不是医学处方。', `<button class="btn btn-outline" data-action="capability-page" data-page="health">← 健康总览</button><button class="btn btn-primary" data-action="hos-diet-meal" data-meal="lunch">＋ 记录一餐</button>`)}
  <div class="hos-shell" data-tab-shell data-tab-key="diet" data-default-tab="today">
    <div class="hos-bar"><div class="fit-tabs" data-tabs role="tablist">
      <button class="fit-tab active" data-tab="today" role="tab">今日</button>
      <button class="fit-tab" data-tab="foods" role="tab">食物库</button>
      <button class="fit-tab" data-tab="targets" role="tab">目标</button>
      <button class="fit-tab" data-tab="review" role="tab">复盘</button>
      <button class="fit-tab" data-tab="reference" role="tab">食材参考</button>
    </div><div class="hos-bar-actions"><span class="hos-badge">${esc(hosDietState().profile.goal)} · ${esc(hosDietState().profile.dietStyle)}</span><button class="btn btn-small btn-outline" data-action="hos-diet-water">＋ 饮水</button></div></div>
    <div class="fit-panel active" data-tab-panel="today">${hosDietTodayPanel()}</div>
    <div class="fit-panel" data-tab-panel="foods">${hosDietFoodsPanel()}</div>
    <div class="fit-panel" data-tab-panel="targets">${hosDietTargetsPanel()}</div>
    <div class="fit-panel" data-tab-panel="review">${hosDietReviewPanel()}</div>
    <div class="fit-panel" data-tab-panel="reference">${hosDietPersonalFoodReference()}</div>
  </div>`;
}
function hosDietDateNav() {
  const date = ui.dietDate || hosToday();
  return `<div class="hos-date-nav"><button class="btn btn-small btn-outline" data-action="hos-diet-day" data-delta="-1">← 前一天</button><strong>${esc(hosDateLabel(date))}</strong><button class="btn btn-small btn-outline" data-action="hos-diet-day" data-delta="1">后一天 →</button>${date !== hosToday() ? '<button class="btn btn-small btn-link" data-action="hos-diet-day" data-delta="0">回到今天</button>' : ''}</div>`;
}
function hosDietCategoryTotals(date = hosToday()) {
  const groups = { '蛋白质': 0, '主食': 0, '蔬菜水果': 0, '其他': 0 };
  hosDietMealLogs(date).forEach((log) => {
    const food = hosFoodById(log.foodId);
    const cat = food ? food.cat : '其他';
    if (cat === '蛋白质' || cat === '乳制品') groups['蛋白质'] += hosNum(log.kcal);
    else if (cat === '主食') groups['主食'] += hosNum(log.kcal);
    else if (cat === '蔬菜' || cat === '水果') groups['蔬菜水果'] += hosNum(log.kcal);
    else groups['其他'] += hosNum(log.kcal);
  });
  return groups;
}
function hosDietPlate(date = hosToday()) {
  const groups = hosDietCategoryTotals(date);
  const colors = { '蛋白质': 'var(--accent)', '主食': 'var(--blue)', '蔬菜水果': 'var(--good)', '其他': 'var(--warn)' };
  const total = Object.values(groups).reduce((a, b) => a + b, 0);
  if (!total) return hosEmpty('记录一餐后这里会显示餐盘结构。');
  let acc = 0;
  const stops = Object.entries(groups).filter(([, v]) => v > 0).map(([label, value]) => {
    const from = (acc / total) * 100;
    acc += value;
    const to = (acc / total) * 100;
    return `${colors[label]} ${from}% ${to}%`;
  }).join(',');
  return `<div class="hos-plate-wrap"><div class="hos-plate" style="background:conic-gradient(${stops})"><div><b>${Math.round(total)}</b><small>kcal</small></div></div><div class="hos-plate-legend">${Object.entries(groups).map(([label, value]) => `<span><i style="background:${colors[label]}"></i>${label} · ${Math.round(value)} kcal</span>`).join('')}</div></div>`;
}
function hosDietApplyTemplate(id) {
  const template = HOS_MEAL_TEMPLATES.find((x) => x.id === id);
  if (!template) return;
  const restrictions = hosDietState().profile.restrictions;
  const items = template.items.filter(([foodId]) => {
    const food = hosFoodById(foodId);
    return food && hosFoodAllowed(food, restrictions);
  });
  if (!items.length) { toast('这组模板与当前饮食限制冲突，请换一组或调整限制', true); return; }
  const date = hosToday();
  const d = hosDietState();
  items.forEach(([foodId, grams], i) => {
    const food = hosFoodById(foodId);
    const m = hosFoodMacros(food, grams);
    d.logs.unshift({ id: `meal-${Date.now()}-${i}`, date, meal: template.meal, foodId, name: food.name, grams, ...m, note: `模板：${template.name}`, createdAt: new Date().toISOString() });
  });
  state.healthChecks[date] = state.healthChecks[date] || {};
  state.healthChecks[date].nutrition = true;
  saveAndRender(`已套用「${template.name}」到${(HOS_MEALS.find((m) => m.key === template.meal) || {}).label || '这一餐'}`);
}

function hosDietTodayPanel() {
  const date = ui.dietDate || hosToday();
  const t = hosDietTotals(date);
  const g = hosDietTargets();
  const score = hosDietScore(date);
  const logs = hosDietMealLogs(date);
  const water = hosDietWater(date);
  const recent = [...new Set((hosDietState().logs || []).slice(0, 40).map((x) => x.foodId).filter(Boolean))].slice(0, 8).map(hosFoodById).filter(Boolean);
  return `${hosDietDateNav()}
  <div class="hos-hero"><div><span class="eyebrow">NUTRITION · ${esc(hosDateLabel(date))}</span><h2>${Math.round(t.kcal)}<small> / ${g.kcal} kcal</small></h2><p>${score == null ? '今天还没有饮食记录。' : `饮食评分 ${score}/100 · ${hosScoreLabel(score)}`} · 蛋白 ${Math.round(t.protein)}/${g.protein}g · 水 ${water}/${g.water}ml</p><div class="hos-hero-actions"><button class="btn btn-primary" data-action="hos-diet-meal" data-meal="${logs.length ? 'snack' : 'breakfast'}" data-date="${date}">＋ 记录一餐</button><button class="btn btn-outline" data-action="hos-diet-water" data-date="${date}">＋ 饮水</button><button class="btn btn-outline" data-action="hos-diet-suggest" data-meal="lunch">按剩余目标推荐一餐</button></div></div><div class="hos-hero-rings">${hosRing((t.kcal / Math.max(1, g.kcal)) * 100, Math.round(t.kcal), '热量 kcal', `剩余 ${Math.max(0, Math.round(g.kcal - t.kcal))}`)}${hosRing((water / Math.max(1, g.water)) * 100, water, '饮水 ml', `${Math.round((water / Math.max(1, g.water)) * 100)}%`)}</div></div>
  <div class="hos-kpis">${hosKpi('蛋白质', Math.round(t.protein), `/ ${g.protein}g`, `${Math.round((t.protein / Math.max(1, g.protein)) * 100)}%`, t.protein >= g.protein * 0.9 ? 'good' : '')} ${hosKpi('碳水', Math.round(t.carbs), `/ ${g.carbs}g`, '优先全谷物、薯类')} ${hosKpi('脂肪', Math.round(t.fat), `/ ${g.fat}g`, '坚果、油、乳制品')} ${hosKpi('纤维', hosRound(t.fiber, 1), `/ ${g.fiber}g`, '蔬菜、豆类、水果', t.fiber >= g.fiber * 0.8 ? 'good' : '')}</div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>宏量目标进度</h3><p>以记录份量换算；不是精确到个位数的营养分析。</p></div></div><div class="hos-macro-list">${[['蛋白质', t.protein, g.protein, 'var(--accent)'], ['碳水', t.carbs, g.carbs, 'var(--blue)'], ['脂肪', t.fat, g.fat, 'var(--warn)'], ['纤维', t.fiber, g.fiber, 'var(--good)']].map(([label, value, target, color]) => `<div><span>${label}</span><i><b style="width:${hosClamp((value / Math.max(1, target)) * 100, 0, 100)}%;background:${color}"></b></i><strong>${hosRound(value, 1)}</strong><small>/ ${target}g</small></div>`).join('')}</div><div class="hos-chart-note">糖 ${hosRound(t.sugar, 1)}g（上限 ${g.sugar}g） · 钠 ${Math.round(t.sodium)}mg（参考 ${g.sodium}mg）</div>${hosDietPlate(date)}</section>
  <section class="card"><div class="card-head"><div><h3>今天最值得调整的事</h3><p>按实际记录与目标计算。</p></div></div>${hosInsightCards(hosDietInsights(date))}</section></div>
  <div class="hos-meal-grid">${HOS_MEALS.map((meal) => {
    const items = logs.filter((x) => x.meal === meal.key);
    const kcal = items.reduce((a, x) => a + hosNum(x.kcal), 0);
    return `<section class="card hos-meal-card"><div class="card-head"><div><h3>${meal.icon} ${meal.label}</h3><p>${items.length ? `${items.length} 项 · ${kcal} kcal` : '还没有记录'}</p></div><button class="btn btn-small btn-outline" data-action="hos-diet-meal" data-meal="${meal.key}" data-date="${date}">＋ 添加</button></div><div class="hos-meal-items">${items.map((x) => `<article><div><strong>${esc(x.name)}</strong><small>${hosNum(x.grams)}g · 蛋白 ${hosRound(x.protein, 1)}g · 碳水 ${hosRound(x.carbs, 1)}g</small></div><b>${Math.round(x.kcal)}<em> kcal</em></b><button class="task-delete" data-action="hos-diet-delete-meal" data-id="${esc(x.id)}" title="删除">×</button></article>`).join('') || '<div class="hos-meal-empty">记录主食、蛋白质、蔬菜和水果。</div>'}</div></section>`;
  }).join('')}</div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>饮水</h3><p>${water} / ${g.water} ml · 分次补充，运动或出汗多时调整。</p></div></div><div class="hos-water-actions">${[200, 300, 500].map((ml) => `<button class="btn btn-outline" data-action="hos-diet-water-add" data-ml="${ml}" data-date="${date}">＋${ml}ml</button>`).join('')}<button class="btn btn-outline" data-action="hos-diet-water" data-date="${date}">自定义</button></div><div class="hos-water-list">${(hosDietState().water || []).filter((x) => x.date === date).slice(0, 8).map((x) => `<span>${esc(x.time || '')} · ${hosNum(x.ml)}ml</span>`).join('') || '今天还没有饮水记录。'}</div></section><section class="card"><div class="card-head"><div><h3>最近吃过</h3><p>点一下直接带入记录弹层。</p></div></div><div class="hos-recent-foods">${recent.map((food) => `<button data-action="hos-diet-meal" data-meal="${logs.length ? 'snack' : 'lunch'}" data-date="${date}" data-food-id="${esc(food.id)}"><strong>${esc(food.name)}</strong><small>${food.servingLabel || ''} · ${Math.round(food.kcal)} kcal/100g</small></button>`).join('') || hosEmpty('还没有历史食物。去食物库添加第一项。')}</div></section></div>
  <section class="card"><div class="card-head"><div><h3>一键餐盘模板</h3><p>不是“健康食品清单”，而是一餐的结构示例；套用后会写入今日记录，可再改份量。</p></div></div><div class="hos-template-grid">${HOS_MEAL_TEMPLATES.map((tpl) => `<article><header><strong>${esc(tpl.name)}</strong><span class="tag neutral">${esc((HOS_MEALS.find((m) => m.key === tpl.meal) || {}).label || '')}</span></header><p>${esc(tpl.desc)}</p><button class="btn btn-small btn-outline" data-action="hos-diet-template" data-id="${esc(tpl.id)}">套用到今日</button></article>`).join('')}</div></section>`;
}
function hosDietFilteredFoods() {
  const q = (ui.dietFoodQuery || '').toLowerCase();
  const cat = ui.dietFoodCat || '全部';
  const favorites = new Set(hosDietState().favorites || []);
  const favOnly = !!ui.dietFavOnly;
  return HOS_FOODS.concat(hosDietState().customFoods || []).filter((f) => {
    if (cat !== '全部' && f.cat !== cat) return false;
    if (favOnly && !favorites.has(f.id)) return false;
    if (q && !(`${f.name} ${f.cat} ${(f.tags || []).join(' ')}`.toLowerCase().includes(q))) return false;
    return true;
  });
}
function hosDietFoodRowsHtml(foods) {
  const favorites = new Set(hosDietState().favorites || []);
  return foods.map((f) => `<article class="hos-food-row"><div class="hos-food-main"><strong>${esc(f.name)}</strong><small>${esc(f.cat)} · 每100g · ${esc(f.servingLabel || '')}约${hosNum(f.serving, 100)}g</small></div><div class="hos-food-macros"><span>${Math.round(f.kcal)} kcal</span><span>蛋 ${f.protein}g</span><span>碳 ${f.carbs}g</span><span>脂 ${f.fat}g</span><span>纤维 ${f.fiber}g</span></div><div class="hos-food-actions"><button class="hos-fav ${favorites.has(f.id) ? 'is-on' : ''}" data-action="hos-diet-fav" data-id="${esc(f.id)}" title="收藏">★</button><button class="btn btn-small btn-primary" data-action="hos-diet-meal" data-food-id="${esc(f.id)}" data-meal="lunch">＋ 记录</button></div></article>`).join('') || hosEmpty('没有匹配食物。');
}
function hosDietFoodsPanel() {
  const foods = hosDietFilteredFoods();
  const cat = ui.dietFoodCat || '全部';
  const favOnly = !!ui.dietFavOnly;
  const cats = ['全部', ...new Set(HOS_FOODS.concat(hosDietState().customFoods || []).map((f) => f.cat))];
  return `<div class="hos-lead"><span class="eyebrow">FOOD LIBRARY · ${HOS_FOODS.length} REFERENCE FOODS</span><h2>常见食物参考库</h2><p>每 100g 的参考值；按实际份量换算。包装食品请看营养成分表，外食差异很大，不把参考值当精确值。</p></div>
  <section class="card"><div class="hos-toolbar"><label class="hos-search"><span>⌕</span><input id="hosDietSearch" type="search" value="${esc(ui.dietFoodQuery || '')}" placeholder="搜索食物、分类或标签" autocomplete="off"></label><div class="hos-toolbar-side"><span class="hos-count" id="hosFoodCount">${foods.length} 项</span><button class="btn btn-small btn-outline" data-action="hos-diet-fav-only">${favOnly ? '★ 仅收藏' : '☆ 仅收藏'}</button><button class="btn btn-small btn-primary" data-action="hos-diet-custom-food">＋ 自定义食物</button></div></div>
  ${hosChips(cats.map((c) => ({ value: c, label: c })), cat, 'hos-diet-food-cat')}
  <div class="hos-food-table" id="hosFoodTable">${hosDietFoodRowsHtml(foods)}</div></section>
  <section class="card"><div class="card-head"><div><h3>份量参考</h3><p>用手估份量，比追求克数更可持续；熟练后再精确。</p></div></div><div class="hos-rule-grid"><article><b>蛋白质 · 1 掌心</b><p>鸡胸/鱼/牛肉约 100–150g，蛋白约 20–35g。</p></article><article><b>主食 · 1 拳头</b><p>熟米饭约 150g，或全麦面包 1–2 片。</p></article><article><b>蔬菜 · 2 捧</b><p>约 150–200g，深色蔬菜占一半。</p></article><article><b>脂肪 · 1 拇指</b><p>坚果约 10–15g，或油 5–10g。</p></article></div></section>`;
}
function hosDietTargetsPanel() {
  const p = hosDietState().profile;
  const g = hosDietTargets();
  const bmi = p.height ? hosNum(p.weight) / ((hosNum(p.height) / 100) ** 2) : null;
  return `<div class="hos-lead"><span class="eyebrow">TARGETS · BMR & MACROS</span><h2>先定目标，再谈吃多少</h2><p>用 Mifflin-St Jeor 估算基础代谢，再乘活动系数；目标是起点，不是每天必须精确命中的硬指标。</p></div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>身体与活动</h3><p>用于计算 BMR/TDEE 与宏量目标。</p></div></div><form id="hosDietProfileForm" class="fit-form" autocomplete="off"><div class="fit-grid-2"><label class="fit-field"><span>性别</span>${hosSelect('sex', p.sex, ['男', '女'])}</label><label class="fit-field"><span>年龄</span>${hosNumber('age', p.age, 'min="14" max="90"')}</label><label class="fit-field"><span>身高 cm</span>${hosNumber('height', p.height, 'min="120" max="230"')}</label><label class="fit-field"><span>体重 kg</span>${hosNumber('weight', p.weight, 'min="30" max="250" step="0.1"')}</label><label class="fit-field"><span>活动水平</span>${hosSelect('activity', p.activity, Object.keys(HOS_ACTIVITY_FACTORS))}</label><label class="fit-field"><span>目标</span>${hosSelect('goal', p.goal, HOS_GOALS)}</label><label class="fit-field"><span>饮食风格</span>${hosSelect('dietStyle', p.dietStyle, ['普通', '高蛋白', '素食', '低碳水'])}</label></div><div class="fit-field fit-wide"><span>限制/过敏</span><div class="hos-check-grid">${HOS_RESTRICTIONS.map((r) => `<label class="hos-check"><input type="checkbox" name="restrictions" value="${esc(r.value)}" ${(p.restrictions || []).includes(r.value) ? 'checked' : ''}> ${esc(r.label)}</label>`).join('')}</div></div><div class="hos-calc-note"><span>BMR <b>${g.bmr}</b> kcal</span><span>TDEE <b>${g.tdee}</b> kcal</span><span>BMI <b>${bmi ? hosRound(bmi, 1) : '—'}</b></span></div>${hosFormFoot('hos-diet-recalc', '按身体数据重算目标')}</form></section>
  <section class="card"><div class="card-head"><div><h3>每日目标</h3><p>可直接改；改完以手填值为准。</p></div><button class="btn btn-small btn-outline" data-action="hos-diet-recalc-auto">恢复自动计算</button></div><form id="hosDietTargetForm" class="fit-form" autocomplete="off"><div class="fit-grid-2"><label class="fit-field"><span>热量 kcal</span>${hosNumber('kcal', g.kcal, 'min="800" max="6000" step="10"')}</label><label class="fit-field"><span>蛋白质 g</span>${hosNumber('protein', g.protein, 'min="20" max="400"')}</label><label class="fit-field"><span>碳水 g</span>${hosNumber('carbs', g.carbs, 'min="0" max="800"')}</label><label class="fit-field"><span>脂肪 g</span>${hosNumber('fat', g.fat, 'min="10" max="250"')}</label><label class="fit-field"><span>纤维 g</span>${hosNumber('fiber', g.fiber, 'min="5" max="80"')}</label><label class="fit-field"><span>饮水 ml</span>${hosNumber('water', g.water, 'min="500" max="6000" step="50"')}</label><label class="fit-field"><span>添加糖上限 g</span>${hosNumber('sugar', g.sugar, 'min="0" max="200"')}</label><label class="fit-field"><span>钠参考 mg</span>${hosNumber('sodium', g.sodium, 'min="500" max="6000" step="100"')}</label></div>${hosFormFoot('hos-diet-save-targets', '保存每日目标')}</form></section></div>
  <section class="card"><div class="card-head"><div><h3>计算口径</h3><p>用于个人记录与趋势，不替代营养师或医生建议。</p></div></div><div class="hos-rule-grid"><article><b>BMR</b><p>男：10×体重 + 6.25×身高 − 5×年龄 + 5；女：同式 −161。</p></article><article><b>TDEE</b><p>BMR × 活动系数（久坐 1.2 至很高 1.9）。</p></article><article><b>蛋白质</b><p>减脂/增肌按 1.8g/kg，维持按 1.6g/kg；肾病患者请遵医嘱。</p></article><article><b>脂肪与碳水</b><p>脂肪约 25% 热量，剩余热量给碳水；纤维按 14g/1000kcal。</p></article></div></section>`;
}
function hosDietReviewPanel() {
  const range = hosNum(ui.dietRange, 7) === 30 ? 30 : 7;
  const dates = hosDates(range);
  const kcal = dates.map((d) => hosDietTotals(d).kcal || null);
  const protein = dates.map((d) => hosDietTotals(d).protein || null);
  const water = dates.map((d) => hosDietTotals(d).water || null);
  const g = hosDietTargets();
  const a = hosDietAdherence(range);
  const mealDist = HOS_MEALS.map((m) => ({ label: m.label, value: hosSum((hosDietState().logs || []).filter((x) => dates.includes(x.date) && x.meal === m.key), 'kcal') }));
  return `<div class="hos-lead"><span class="eyebrow">REVIEW · ${range} DAYS</span><h2>吃得够不够，结构对不对</h2><p>热量看趋势，蛋白质、纤维、水和糖看达标；不因单日偏差否定长期执行。</p></div>
  <div class="hos-toolbar"><div class="hos-chips"><button class="hos-chip ${range === 7 ? 'is-on' : ''}" data-action="hos-diet-range" data-range="7">近 7 天</button><button class="hos-chip ${range === 30 ? 'is-on' : ''}" data-action="hos-diet-range" data-range="30">近 30 天</button></div></div>
  <div class="hos-kpis">${hosKpi('记录天数', a.logDays, `/ ${range} 天`, '有热量记录才计入')} ${hosKpi('热量达标', a.calorieDays, '天', '±10% 目标')} ${hosKpi('蛋白达标', a.proteinDays, '天', '≥90% 目标')} ${hosKpi('饮水达标', a.waterDays, '天', '≥90% 目标')}</div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>热量趋势</h3><p>虚线为目标；空白天数未记录。</p></div></div>${hosBarChart(kcal, dates.map((d) => d.slice(5)), { target: g.kcal, unit: 'kcal', height: 150 })}</section><section class="card"><div class="card-head"><div><h3>蛋白质趋势</h3><p>目标 ${g.protein}g；训练日可略高。</p></div></div>${hosLineChart(protein, dates.map((d) => d.slice(5)), { target: g.protein, min: 0, label: '蛋白质趋势' })}</section></div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>饮水趋势</h3><p>目标 ${g.water}ml。</p></div></div>${hosBarChart(water, dates.map((d) => d.slice(5)), { target: g.water, unit: 'ml', height: 140 })}</section><section class="card"><div class="card-head"><div><h3>热量来源构成</h3><p>按餐次汇总，观察是否集中在晚餐或加餐。</p></div></div>${hosStackBar([{ label: '早餐', value: mealDist[0].value, color: 'var(--accent)' }, { label: '午餐', value: mealDist[1].value, color: 'var(--blue)' }, { label: '晚餐', value: mealDist[2].value, color: 'var(--warn)' }, { label: '加餐', value: mealDist[3].value, color: 'var(--bad)' }])}<div class="hos-legend">${mealDist.map((x) => `<span>${esc(x.label)} · ${Math.round(x.value)} kcal</span>`).join('')}</div></section></div>
  <section class="card"><div class="card-head"><div><h3>复盘提示</h3><p>按当前记录生成。</p></div></div>${hosInsightCards(hosDietInsights())}</section>
  <section class="card"><div class="card-head"><div><h3>旧版通用饮食/饮水记录</h3><p>保留原「健康历史记录」中的条目，便于对照。</p></div><span class="tag neutral">${(state.healthLogs || []).filter((x) => ['饮食', '饮水'].includes(x.category)).length} 条</span></div><div class="hos-legacy-list">${(state.healthLogs || []).filter((x) => ['饮食', '饮水'].includes(x.category)).slice(0, 12).map((x) => `<article><b>${esc(x.date)}</b><div><strong>${esc(x.category)} · ${esc(x.title)}</strong><p>${esc(x.detail || x.value || x.note || '')}</p></div></article>`).join('') || hosEmpty('没有旧版饮食记录。')}</div></section>`;
}

/* ---- 弹层与动作 ------------------------------------------------------- */
function hosDietOpenMeal(meal = 'lunch', date = hosToday(), foodId = '') {
  const all = HOS_FOODS.concat(hosDietState().customFoods || []);
  const food = hosFoodById(foodId) || all[0];
  const groups = ['主食', '蛋白质', '蔬菜', '水果', '乳制品', '坚果', '油脂', '饮品', '快餐', '家常菜', '零食', '甜味', '其他'];
  hosOpenSheet('记录一餐', '选择食物与份量，系统按每 100g 参考值换算。', `<form id="hosDietMealForm" class="fit-form" autocomplete="off">
    <div class="fit-grid-2"><label class="fit-field"><span>日期</span><input type="date" name="date" value="${esc(date)}"></label><label class="fit-field"><span>餐次</span>${hosSelect('meal', meal, HOS_MEALS.map((m) => ({ value: m.key, label: m.label })))}</label></div>
    <label class="fit-field fit-wide"><span>食物</span><select name="foodId" id="hosDietMealFood">${groups.map((cat) => { const list = all.filter((f) => f.cat === cat); return list.length ? `<optgroup label="${esc(cat)}">${list.map((f) => `<option value="${esc(f.id)}" ${f.id === (food && food.id) ? 'selected' : ''}>${esc(f.name)} · ${Math.round(f.kcal)} kcal/100g</option>`).join('')}</optgroup>` : ''; }).join('')}</select></label>
    <div class="fit-grid-2"><label class="fit-field"><span>份量 g</span><input name="grams" id="hosDietMealGrams" type="number" min="1" max="2000" step="5" value="${hosNum(food && food.serving, 100)}"></label><label class="fit-field"><span>备注</span><input name="note" placeholder="外食、烹饪方式、酱料等"></label></div>
    <div id="hosDietMealPreview" class="hos-meal-preview"></div>
    ${hosFormFoot('hos-diet-save-meal', '保存这餐')}
  </form>`);
  hosDietUpdateMealPreview();
}
function hosDietUpdateMealPreview() {
  const form = $('#hosDietMealForm');
  const box = $('#hosDietMealPreview');
  if (!form || !box) return;
  const food = hosFoodById(form.querySelector('[name="foodId"]')?.value);
  const grams = hosNum(form.querySelector('[name="grams"]')?.value, 100);
  if (!food) { box.innerHTML = ''; return; }
  const m = hosFoodMacros(food, grams);
  box.innerHTML = `<div><span>${esc(food.name)} · ${grams}g</span><strong>${m.kcal} kcal</strong></div><div class="hos-meal-preview-macros"><span>蛋白质 ${m.protein}g</span><span>碳水 ${m.carbs}g</span><span>脂肪 ${m.fat}g</span><span>纤维 ${m.fiber}g</span><span>糖 ${m.sugar}g</span><span>钠 ${m.sodium}mg</span></div>`;
}
function hosDietSaveMeal() {
  const form = $('#hosDietMealForm');
  if (!form) return;
  const fd = new FormData(form);
  const food = hosFoodById(fd.get('foodId'));
  if (!food) { toast('请选择食物', true); return; }
  const grams = hosNum(fd.get('grams'), 100);
  if (grams <= 0) { toast('份量需要大于 0', true); return; }
  const m = hosFoodMacros(food, grams);
  const date = String(fd.get('date') || hosToday());
  const d = hosDietState();
  d.logs.unshift({ id: `meal-${Date.now()}`, date, meal: String(fd.get('meal') || 'lunch'), foodId: food.id, name: food.name, grams, ...m, note: String(fd.get('note') || ''), createdAt: new Date().toISOString() });
  state.healthChecks[date] = state.healthChecks[date] || {};
  state.healthChecks[date].nutrition = true;
  hosCloseSheet();
  saveAndRender('这一餐已保存，今日目标与趋势已更新');
}
function hosDietOpenWater(date = hosToday()) {
  hosOpenSheet('记录饮水', '分次补充；运动、出汗、天气热时按需增加。', `<form id="hosDietWaterForm" class="fit-form" autocomplete="off"><label class="fit-field"><span>日期</span><input type="date" name="date" value="${esc(date)}"></label><div class="fit-grid-2"><label class="fit-field"><span>水量 ml</span><input name="ml" type="number" min="50" max="3000" step="50" value="300"></label><label class="fit-field"><span>时间</span><input name="time" type="time" value="${hosNowClock()}"></label></div><label class="fit-field"><span>备注</span><input name="note" placeholder="白水、茶、咖啡、汤等"></label><div class="fit-form-foot"><button type="button" class="btn btn-primary" data-action="hos-diet-save-water">保存饮水</button></div></form>`);
}
function hosDietSaveWater() {
  const form = $('#hosDietWaterForm');
  if (!form) return;
  const fd = new FormData(form);
  const ml = hosNum(fd.get('ml'), 0);
  if (ml <= 0) { toast('水量需要大于 0', true); return; }
  const date = String(fd.get('date') || hosToday());
  const d = hosDietState();
  d.water.unshift({ id: `water-${Date.now()}`, date, ml, time: String(fd.get('time') || hosNowClock()), note: String(fd.get('note') || '') });
  state.healthChecks[date] = state.healthChecks[date] || {};
  if (hosDietWater(date) >= hosDietTargets().water * 0.9) state.healthChecks[date].water = true;
  hosCloseSheet();
  saveAndRender('饮水已记录');
}
function hosDietAddWater(ml, date = hosToday()) {
  const d = hosDietState();
  d.water.unshift({ id: `water-${Date.now()}`, date, ml: hosNum(ml), time: hosNowClock(), note: '' });
  state.healthChecks[date] = state.healthChecks[date] || {};
  if (hosDietWater(date) >= hosDietTargets().water * 0.9) state.healthChecks[date].water = true;
  saveAndRender(`已记录 ${hosNum(ml)}ml 饮水`);
}
function hosDietOpenCustomFood() {
  hosOpenSheet('自定义食物', '按包装营养成分表填写每 100g 数值；保存后会出现在食物库。', `<form id="hosDietCustomFoodForm" class="fit-form" autocomplete="off">
    <div class="fit-grid-2"><label class="fit-field"><span>食物名称</span><input name="name" required placeholder="例如：某品牌无糖酸奶"></label><label class="fit-field"><span>分类</span>${hosSelect('cat', '蛋白质', ['主食', '蛋白质', '蔬菜', '水果', '乳制品', '坚果', '油脂', '饮品', '快餐', '家常菜', '零食', '甜味', '其他'])}</label></div>
    <div class="fit-grid-2">${['kcal:热量 kcal', 'protein:蛋白质 g', 'carbs:碳水 g', 'fat:脂肪 g', 'fiber:纤维 g', 'sugar:糖 g', 'sodium:钠 mg'].map((x) => { const [key, label] = x.split(':'); return `<label class="fit-field"><span>${label}/100g</span><input name="${key}" type="number" min="0" step="0.1" value="0"></label>`; }).join('')}</div>
    <div class="fit-grid-2"><label class="fit-field"><span>常用份量 g</span><input name="serving" type="number" min="1" value="100"></label><label class="fit-field"><span>份量描述</span><input name="servingLabel" placeholder="例如：1 杯"></label></div>
    ${hosFormFoot('hos-diet-save-custom-food', '保存自定义食物')}
  </form>`);
}
function hosDietSaveCustomFood() {
  const form = $('#hosDietCustomFoodForm');
  if (!form) return;
  const fd = new FormData(form);
  const name = String(fd.get('name') || '').trim();
  if (!name) { toast('请填写食物名称', true); return; }
  const food = { id: `custom-${Date.now()}`, name, cat: String(fd.get('cat') || '蛋白质'), tags: [], kcal: hosNum(fd.get('kcal')), protein: hosNum(fd.get('protein')), carbs: hosNum(fd.get('carbs')), fat: hosNum(fd.get('fat')), fiber: hosNum(fd.get('fiber')), sugar: hosNum(fd.get('sugar')), sodium: hosNum(fd.get('sodium')), serving: hosNum(fd.get('serving'), 100), servingLabel: String(fd.get('servingLabel') || ''), custom: true };
  hosDietState().customFoods.unshift(food);
  hosCloseSheet();
  saveAndRender('自定义食物已保存');
}
function hosDietOpenSuggestion(meal = 'lunch') {
  const suggestion = hosDietSuggest(meal);
  HOS_DIET_SUGGESTION = suggestion;
  hosOpenSheet('按剩余目标推荐一餐', `按今天剩余热量 ${Math.max(0, Math.round(hosDietTargets().kcal - hosDietTotals().kcal))} kcal 与蛋白质缺口计算；份量可保存后再调整。`, `<div class="hos-suggest-list">${suggestion.items.map((x) => `<article><div><strong>${esc(x.name)}</strong><small>${x.grams}g · ${x.kcal} kcal · 蛋白 ${x.protein}g</small></div><b>${x.grams}<em> g</em></b></article>`).join('')}</div><div class="hos-suggest-total"><span>合计</span><strong>${suggestion.totals.kcal} kcal · 蛋白 ${suggestion.totals.protein}g</strong></div><div class="fit-form-foot"><button class="btn btn-primary" type="button" data-action="hos-diet-add-suggestion">全部加入${esc((HOS_MEALS.find((m) => m.key === meal) || {}).label || '这一餐')}</button></div>`);
}
function hosDietAddSuggestion() {
  const suggestion = HOS_DIET_SUGGESTION;
  if (!suggestion || !suggestion.items.length) { toast('推荐已失效，请重新生成', true); return; }
  const date = hosToday();
  const d = hosDietState();
  suggestion.items.forEach((item) => {
    d.logs.unshift({ id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, date, meal: suggestion.meal, foodId: item.foodId, name: item.name, grams: item.grams, kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat, fiber: item.fiber || 0, sugar: item.sugar || 0, sodium: item.sodium || 0, note: '按目标推荐', createdAt: new Date().toISOString() });
  });
  state.healthChecks[date] = state.healthChecks[date] || {};
  state.healthChecks[date].nutrition = true;
  HOS_DIET_SUGGESTION = null;
  hosCloseSheet();
  saveAndRender('推荐的一餐已全部加入');
}
function hosDietDeleteMeal(id) {
  const d = hosDietState();
  d.logs = d.logs.filter((x) => String(x.id) !== String(id));
  saveAndRender('这一项已删除');
}

/* ---- 事件 ------------------------------------------------------------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest?.('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  if (!a || !a.startsWith('hos-diet-')) return;
  if (a === 'hos-diet-meal') { hosDietOpenMeal(btn.dataset.meal || 'lunch', btn.dataset.date || hosToday(), btn.dataset.foodId || ''); return; }
  if (a === 'hos-diet-save-meal') { hosDietSaveMeal(); return; }
  if (a === 'hos-diet-delete-meal') { hosDietDeleteMeal(btn.dataset.id); return; }
  if (a === 'hos-diet-water') { hosDietOpenWater(btn.dataset.date || hosToday()); return; }
  if (a === 'hos-diet-water-add') { hosDietAddWater(btn.dataset.ml, btn.dataset.date || hosToday()); return; }
  if (a === 'hos-diet-save-water') { hosDietSaveWater(); return; }
  if (a === 'hos-diet-day') { const delta = hosNum(btn.dataset.delta); ui.dietDate = delta === 0 ? hosToday() : shiftDateKey(ui.dietDate || hosToday(), delta); renderPage('diet'); return; }
  if (a === 'hos-diet-range') { ui.dietRange = hosNum(btn.dataset.range, 7); renderPage('diet'); return; }
  if (a === 'hos-diet-food-cat') { ui.dietFoodCat = btn.dataset.value || '全部'; renderPage('diet'); return; }
  if (a === 'hos-diet-fav-only') { ui.dietFavOnly = !ui.dietFavOnly; renderPage('diet'); return; }
  if (a === 'hos-diet-fav') {
    const d = hosDietState();
    const id = String(btn.dataset.id);
    const i = d.favorites.indexOf(id);
    if (i >= 0) d.favorites.splice(i, 1); else d.favorites.push(id);
    btn.classList.toggle('is-on', i < 0);
    persist({ quiet: true });
    return;
  }
  if (a === 'hos-diet-custom-food') { hosDietOpenCustomFood(); return; }
  if (a === 'hos-diet-save-custom-food') { hosDietSaveCustomFood(); return; }
  if (a === 'hos-diet-suggest') { hosDietOpenSuggestion(btn.dataset.meal || 'lunch'); return; }
  if (a === 'hos-diet-add-suggestion') { hosDietAddSuggestion(); return; }
  if (a === 'hos-diet-template') { hosDietApplyTemplate(btn.dataset.id); return; }
  if (a === 'hos-diet-recalc-auto') {
    const d = hosDietState();
    d.targets = hosCalcDietTargets(d.profile);
    saveAndRender('已恢复按身体数据自动计算的目标');
    return;
  }
  if (a === 'hos-diet-recalc') {
    const form = $('#hosDietProfileForm');
    if (!form) { renderPage('diet'); return; }
    const fd = new FormData(form);
    const d = hosDietState();
    d.profile = { sex: String(fd.get('sex') || '男'), age: hosNum(fd.get('age'), 30), height: hosNum(fd.get('height'), 172), weight: hosNum(fd.get('weight'), 70), activity: String(fd.get('activity') || '轻活动'), goal: String(fd.get('goal') || '维持'), dietStyle: String(fd.get('dietStyle') || '普通'), restrictions: [...form.querySelectorAll('input[name="restrictions"]:checked')].map((x) => x.value) };
    d.targets = hosCalcDietTargets(d.profile);
    saveAndRender('已按身体数据重算每日目标');
    return;
  }
  if (a === 'hos-diet-save-targets') {
    const form = $('#hosDietTargetForm');
    if (!form) return;
    const fd = new FormData(form);
    const d = hosDietState();
    d.targets = { ...d.targets, ...Object.fromEntries(['kcal', 'protein', 'carbs', 'fat', 'fiber', 'water', 'sugar', 'sodium'].map((k) => [k, hosNum(fd.get(k))])) };
    saveAndRender('每日目标已保存');
    return;
  }
});
document.addEventListener('input', (e) => {
  if (e.target?.id === 'hosDietSearch') {
    ui.dietFoodQuery = e.target.value;
    const table = $('#hosFoodTable');
    const foods = hosDietFilteredFoods();
    if (table) table.innerHTML = hosDietFoodRowsHtml(foods);
    const count = $('#hosFoodCount');
    if (count) count.textContent = `${foods.length} 项`;
    return;
  }
  if (e.target?.closest?.('#hosDietMealForm')) hosDietUpdateMealPreview();
});
document.addEventListener('change', (e) => {
  if (e.target?.closest?.('#hosDietMealForm')) hosDietUpdateMealPreview();
});
