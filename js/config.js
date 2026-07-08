/**
 * 游戏全局配置 - 来自飞飞开发文档 v1.0
 */
const CONFIG = {
  // ============ 战场布局 ============
  GRID: {
    ROWS: 6,
    COLS: 10,
    CELL_SIZE: 64,    // 每格像素
    OFFSET_X: 20,
    OFFSET_Y: 100,    // 顶部留出掉落区
  },

  // ============ 阿斗 ============
  A_DOU: {
    HP: 10,
    POSITION: { row: 5, col: 9 }, // 右下角
  },

  // ============ 文字掉落 ============
  TEXT_DROP: {
    MIN_INTERVAL: 3000,   // ms
    MAX_INTERVAL: 8000,
    POOL_CAP: 14,         // 场上文字上限
    FALL_SPEED: 80,       // 像素/秒
  },

  // ============ 敌人 ============
  ENEMY: {
    SPAWN_INTERVAL_MIN: 1000,  // ms
    SPAWN_INTERVAL_MAX: 5000,
    WAVE_COUNT_MIN: 5,
    WAVE_COUNT_MAX: 30,
    BASE_HP: 50,
    BASE_ATK: 10,
    TYPES: {
      infantry:  { name: '步兵', hp: 50,  atk: 10, speed: 1.0, color: '#8B4513', reward: 5 },
      archer:    { name: '弓兵', hp: 35,  atk: 20, speed: 0.8, color: '#228B22', reward: 8, range: 3 },
      cavalry:   { name: '骑兵', hp: 40,  atk: 15, speed: 2.0, color: '#B22222', reward: 10 },
      shield:    { name: '盾兵', hp: 120, atk: 5,  speed: 0.5, color: '#696969', reward: 12 },
      catapult:  { name: '投石车', hp: 60, atk: 30, speed: 0.4, color: '#4B0082', reward: 20, aoe: true },
      boss:      { name: '武将Boss', hp: 500, atk: 40, speed: 0.6, color: '#FFD700', reward: 100, isBoss: true },
    }
  },

  // ============ 兵种合成链 ============
  SOLDIER_CHAIN: {
    '兵': { level: 1, name: '步兵',   range: 1, atk: 5,  atkSpeed: 2000, color: '#aaaaaa' },
    '卒': { level: 2, name: '精锐步兵', range: 1, atk: 10, atkSpeed: 1800, color: '#999999', mergeFrom: ['兵','兵'] },
    '枪': { level: 3, name: '枪兵',   range: 2, atk: 18, atkSpeed: 1600, color: '#00cc00', mergeFrom: ['卒','卒'] },
    '弓': { level: 4, name: '弓兵',   range: 3, atk: 28, atkSpeed: 1400, color: '#009900', mergeFrom: ['枪','枪'] },
    '骑': { level: 5, name: '骑兵',   range: 2, atk: 42, atkSpeed: 1000, color: '#cc6600', mergeFrom: ['弓','弓'] },
    '将': { level: 6, name: '先锋将领', range: 2, atk: 65, atkSpeed: 800,  color: '#cc0000', mergeFrom: ['骑','骑'] },
  },

  // ============ 武将合成 ============
  HERO_RECIPES: {
    '赵云': { req: ['将','将'], rarity: 'SR', atk: 120, range: 3, hp: 300, atkSpeed: 700, color: '#4169E1',
      skill: { name: '龙胆', desc: '攻击力+30%', passive: '赵云在场时全体攻击+15%' } },
    '黄忠': { req: ['弓','弓','弓'], rarity: 'SR', atk: 150, range: 5, hp: 200, atkSpeed: 1200, color: '#FF6347',
      skill: { name: '烈弓', desc: '对Boss伤害+50%' } },
    '张飞': { req: ['骑','骑','骑'], rarity: 'SR', atk: 90, range: 1, hp: 500, atkSpeed: 1500, color: '#2F4F4F',
      skill: { name: '咆哮', desc: '群体嘲讽，吸引附近敌人' } },
    '关羽': { req: ['枪','枪','枪'], rarity: 'SSR', atk: 200, range: 2, hp: 400, atkSpeed: 900, color: '#006400',
      skill: { name: '青龙偃月', desc: '强力单体斩杀' } },
    '马超': { req: ['将','骑'], rarity: 'SR', atk: 110, range: 2, hp: 250, atkSpeed: 600, color: '#8B008B',
      skill: { name: '铁骑', desc: '高速突进，后排切入' } },
    '诸葛亮': { req: ['将','将','将'], rarity: 'SSR', atk: 100, range: 4, hp: 350, atkSpeed: 1000, color: '#000080',
      skill: { name: '八卦', desc: '全场减速30%，持续5秒' } },
    '吕布': { req: ['赵云','关羽','张飞'], rarity: 'UR', atk: 300, range: 4, hp: 800, atkSpeed: 500, color: '#FF1493',
      skill: { name: '无双', desc: '全屏大范围攻击' } },
  },

  // ============ 技能系统 ============
  SKILLS: {
    farmer:  { name: '农民', icon: '🌾', cd: 30000, desc: '召唤农民自动收集文字', unlockChapter: 1 },
    recruit: { name: '招贤令', icon: '📜', cd: 45000, desc: '立即召唤高级文字', unlockChapter: 2 },
    meteor:  { name: '陨石', icon: '🌠', cd: 60000, desc: '全场敌军大范围伤害', unlockChapter: 3 },
    bagua:   { name: '八卦阵', icon: '☯', cd: 50000, desc: '减速全场敌军50%', unlockChapter: 4 },
    food:    { name: '粮草', icon: '🍚', cd: 40000, desc: '士兵攻速+50%', unlockChapter: 5 },
    musou:   { name: '无双', icon: '🔥', cd: 90000, desc: '武将全屏AOE', unlockChapter: 6 },
  },

  // ============ 关卡配置 ============
  CHAPTERS: [
    { id: 1, name: '第1章：乱世初起', waves: 5, enemyTypes: ['infantry'], unlockBoss: false },
    { id: 2, name: '第2章：虎牢关之战', waves: 8, enemyTypes: ['infantry','archer'], unlockBoss: false },
    { id: 3, name: '第3章：官渡之战', waves: 10, enemyTypes: ['infantry','archer','cavalry'], unlockBoss: false },
    { id: 4, name: '第4章：赤壁之战', waves: 12, enemyTypes: ['infantry','archer','cavalry','shield'], unlockBoss: false },
    { id: 5, name: '第5章：华容道', waves: 15, enemyTypes: ['infantry','archer','cavalry','shield','catapult'], unlockBoss: true },
    { id: 6, name: '第6章：定军山', waves: 18, enemyTypes: ['infantry','archer','cavalry','shield','catapult','elite'], unlockBoss: true },
    { id: 7, name: '第7章：长坂坡', waves: 20, enemyTypes: ['infantry','archer','cavalry','shield','catapult','elite'], unlockBoss: true },
  ],

  // ============ 敌军行进路线（蛇形） ============
  // 从左上(0,0)出发，蛇形走到右下阿斗位置
  getRoute() {
    const r = [];
    for (let row = 0; row < this.GRID.ROWS; row++) {
      if (row % 2 === 0) {
        for (let col = 0; col < this.GRID.COLS - 1; col++) r.push({ row, col });
      } else {
        for (let col = this.GRID.COLS - 2; col >= 0; col--) r.push({ row, col });
      }
    }
    return r;
  },

  // ============ 掉落文字池 ============
  DROP_POOL: ['兵', '兵', '兵', '兵', '兵', '兵', '兵', '兵', '卒', '卒', '枪', '枪'],
};
