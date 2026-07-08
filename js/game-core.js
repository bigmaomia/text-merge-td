/**
 * 游戏核心状态管理
 */
class GameCore {
  constructor() {
    this.state = 'menu'; // menu | battle | pause | win | lose
    this.gold = 0;
    this.diamond = 0;
    this.currentChapter = 1;
    this.currentWave = 1;
    this.totalWaves = 5;
    this.aDouHp = CONFIG.A_DOU.HP;
    this.aDouMaxHp = CONFIG.A_DOU.HP;

    // 格子上的单位 { 'row,col': { type, text, soldier, hero } }
    this.gridUnits = {};
    this.route = CONFIG.getRoute();

    // 掉落文字
    this.fallingTexts = [];

    // 选中状态
    this.selectedText = null;

    // 敌人
    this.enemies = [];
    this.waveActive = false;
    this.waveEnemiesRemaining = 0;
    this.nextWaveTimer = null;

    // 技能冷却
    this.skillCooldowns = {};
    for (let key in CONFIG.SKILLS) {
      this.skillCooldowns[key] = { remaining: 0, max: CONFIG.SKILLS[key].cd };
    }

    // 效果
    this.activeEffects = {}; // { effectKey: { remaining, data } }

    // 统计
    this.stats = { killed: 0, stars: 0 };
  }

  reset(chapterId) {
    this.state = 'battle';
    const ch = CONFIG.CHAPTERS[chapterId - 1] || CONFIG.CHAPTERS[0];
    this.currentChapter = chapterId || 1;
    this.currentWave = 1;
    this.totalWaves = ch.waves;
    this.gold = 0;
    this.diamond = 0;
    this.aDouHp = CONFIG.A_DOU.HP;
    this.aDouMaxHp = CONFIG.A_DOU.HP;
    this.gridUnits = {};
    this.fallingTexts = [];
    this.selectedText = null;
    this.enemies = [];
    this.waveActive = false;
    this.waveEnemiesRemaining = 0;
    this.stats = { killed: 0, stars: 0 };
    this.activeEffects = {};
    for (let key in CONFIG.SKILLS) {
      this.skillCooldowns[key] = { remaining: 0, max: CONFIG.SKILLS[key].cd };
    }
    if (this.nextWaveTimer) { clearTimeout(this.nextWaveTimer); this.nextWaveTimer = null; }
  }

  /** 获取格子坐标 */
  getCellPos(gridPos) {
    return {
      x: CONFIG.GRID.OFFSET_X + gridPos.col * CONFIG.GRID.CELL_SIZE,
      y: CONFIG.GRID.OFFSET_Y + gridPos.row * CONFIG.GRID.CELL_SIZE,
    };
  }

  /** 将掉落文字放置到格子上 */
  placeTextOnGrid(textObj, row, col) {
    const key = `${row},${col}`;
    if (this.gridUnits[key]) return false; // 格子已占用
    this.gridUnits[key] = {
      type: 'soldier',
      text: textObj.text,
      soldier: CONFIG.SOLDIER_CHAIN[textObj.text],
      hero: null,
      level: CONFIG.SOLDIER_CHAIN[textObj.text]?.level || 1,
    };
    // 从掉落列表移除
    const idx = this.fallingTexts.indexOf(textObj);
    if (idx >= 0) this.fallingTexts.splice(idx, 1);
    return true;
  }

  /** 放置单位到格子（不检查掉落文字列表） */
  placeUnitOnGrid(row, col, unitData) {
    const key = `${row},${col}`;
    this.gridUnits[key] = unitData;
  }

  /** 从格子移除单位 */
  removeUnit(row, col) {
    const key = `${row},${col}`;
    delete this.gridUnits[key];
  }

  /** 获取格子单位 */
  getUnit(row, col) {
    return this.gridUnits[`${row},${col}`] || null;
  }

  /** 点击配对合成 - 返回合成结果 */
  tryMerge(textA, textB) {
    // 同文字合成到下一级
    if (textA === textB) {
      // 检查基础兵种链
      const chain = CONFIG.SOLDIER_CHAIN;
      for (let text in chain) {
        const info = chain[text];
        if (info.mergeFrom && info.mergeFrom[0] === textA && info.mergeFrom[1] === textB) {
          return { success: true, result: text, type: 'soldier', data: info };
        }
      }
      return { success: false, reason: '无法合成' };
    }
    // 检查武将配方
    const recipes = CONFIG.HERO_RECIPES;
    const pair = [textA, textB].sort().join(',');
    for (let name in recipes) {
      const sorted = [...recipes[name].req].sort().join(',');
      if (sorted === pair) {
        return { success: true, result: name, type: 'hero', data: recipes[name] };
      }
    }
    return { success: false, reason: '不匹配的合成配方' };
  }

  /** 尝试三合（武将）/ 特殊配方 */
  tryMergeTriple(texts) {
    if (texts.length !== 3) return { success: false };
    const sorted = [...texts].sort().join(',');
    for (let name in CONFIG.HERO_RECIPES) {
      const recipe = CONFIG.HERO_RECIPES[name];
      if (recipe.req.length === 3) {
        const rSorted = [...recipe.req].sort().join(',');
        if (rSorted === sorted) {
          return { success: true, result: name, type: 'hero', data: recipe };
        }
      }
    }
    return { success: false, reason: '不匹配的合成配方' };
  }

  /** 生成掉落文字 */
  spawnFallingText() {
    if (this.fallingTexts.length >= CONFIG.TEXT_DROP.POOL_CAP) return;
    const pool = CONFIG.DROP_POOL;
    // 按章节扩展掉落池
    let actualPool = [...pool];
    if (this.currentChapter >= 3) actualPool.push('卒', '卒', '卒');
    if (this.currentChapter >= 4) actualPool.push('枪', '枪');
    if (this.currentChapter >= 5) actualPool.push('弓', '弓');
    if (this.currentChapter >= 6) actualPool.push('骑');

    const text = actualPool[Math.floor(Math.random() * actualPool.length)];
    const textObj = {
      id: Date.now() + Math.random(),
      text: text,
      x: Math.random() * (CONFIG.GRID.COLS * CONFIG.GRID.CELL_SIZE - 60) + CONFIG.GRID.OFFSET_X,
      y: 0,
      speed: CONFIG.TEXT_DROP.FALL_SPEED + Math.random() * 30,
      glow: false,
    };
    this.fallingTexts.push(textObj);
  }

  /** 更新掉落文字位置（由tick调用） */
  updateFallingTexts(dt) {
    const floorY = CONFIG.GRID.OFFSET_Y + CONFIG.GRID.ROWS * CONFIG.GRID.CELL_SIZE;
    for (let i = this.fallingTexts.length - 1; i >= 0; i--) {
      const t = this.fallingTexts[i];
      t.y += t.speed * dt;
      if (t.y >= floorY) {
        // 尝试放置到最近空位
        const col = Math.floor((t.x - CONFIG.GRID.OFFSET_X) / CONFIG.GRID.CELL_SIZE);
        const c = Math.max(0, Math.min(CONFIG.GRID.COLS - 1, col));
        let placed = false;
        for (let r = 0; r < CONFIG.GRID.ROWS; r++) {
          if (!this.getUnit(r, c)) {
            this.placeTextOnGrid(t, r, c);
            placed = true;
            break;
          }
        }
        // 找任意空位
        if (!placed) {
          for (let r = 0; r < CONFIG.GRID.ROWS && !placed; r++) {
            for (let co = 0; co < CONFIG.GRID.COLS; co++) {
              if (!this.getUnit(r, co)) {
                this.placeTextOnGrid(t, r, co);
                placed = true;
                break;
              }
            }
          }
        }
        if (!placed) {
          this.fallingTexts.splice(i, 1); // 无处可放，消失
        }
      }
    }
    // 更新发光提示
    this.updateGlowHints();
  }

  /** 更新合成提示发光 */
  updateGlowHints() {
    // 检查掉落文字中是否有可配对的
    const textCounts = {};
    for (let t of this.fallingTexts) {
      textCounts[t.text] = (textCounts[t.text] || 0) + 1;
      t.glow = false;
    }
    // 掉落文字之间配对
    for (let t of this.fallingTexts) {
      if (textCounts[t.text] >= 2) t.glow = true;
    }
    // 掉落文字与格子上文字配对
    for (let t of this.fallingTexts) {
      for (let key in this.gridUnits) {
        if (this.gridUnits[key].text === t.text) {
          t.glow = true;
          break;
        }
      }
    }
    // 格子上单位之间配对
    for (let key in this.gridUnits) {
      this.gridUnits[key].glow = false;
    }
    const gridTexts = [];
    for (let key in this.gridUnits) {
      gridTexts.push({ key, text: this.gridUnits[key].text });
    }
    for (let i = 0; i < gridTexts.length; i++) {
      for (let j = i + 1; j < gridTexts.length; j++) {
        if (gridTexts[i].text === gridTexts[j].text) {
          this.gridUnits[gridTexts[i].key].glow = true;
          this.gridUnits[gridTexts[j].key].glow = true;
        }
      }
    }
  }

  /** 启动一波敌人 */
  startWave() {
    if (this.currentWave > this.totalWaves) return;
    this.waveActive = true;
    const ch = CONFIG.CHAPTERS[this.currentChapter - 1];
    const waveRatio = this.currentWave / this.totalWaves;
    const count = Math.floor(
      CONFIG.ENEMY.WAVE_COUNT_MIN +
      (CONFIG.ENEMY.WAVE_COUNT_MAX - CONFIG.ENEMY.WAVE_COUNT_MIN) * waveRatio
    );
    this.waveEnemiesRemaining = count;
    this._spawnWaveEnemies(count, ch.enemyTypes, waveRatio);
  }

  _spawnWaveEnemies(total, enemyTypes, waveRatio) {
    let spawned = 0;
    const spawnNext = () => {
      if (spawned >= total) return;
      if (this.state !== 'battle') return;
      const typeKey = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      const template = CONFIG.ENEMY.TYPES[typeKey];
      if (!template) { spawned++; spawnNext(); return; }
      const hpMul = 1 + waveRatio * 2;
      const atkMul = 1 + waveRatio * 1.5;
      const enemy = {
        id: Date.now() + Math.random(),
        type: typeKey,
        ...template,
        hp: Math.floor(template.hp * hpMul),
        maxHp: Math.floor(template.hp * hpMul),
        atk: Math.floor(template.atk * atkMul),
        routeIndex: 0,
        x: 0, y: 0,
        progress: 0, // 0-1 在当前两个路径点之间的位置
        alive: true,
      };
      // 如果当前章节有Boss，最后一波生成Boss
      if (CONFIG.CHAPTERS[this.currentChapter - 1].unlockBoss &&
          this.currentWave === this.totalWaves && spawned === 0) {
        const bossTemplate = CONFIG.ENEMY.TYPES.boss;
        enemy.type = 'boss';
        enemy.name = bossTemplate.name;
        enemy.hp = Math.floor(bossTemplate.hp * hpMul * 2);
        enemy.maxHp = enemy.hp;
        enemy.atk = Math.floor(bossTemplate.atk * atkMul);
        enemy.speed = bossTemplate.speed;
        enemy.color = bossTemplate.color;
        enemy.reward = bossTemplate.reward;
      }
      this.enemies.push(enemy);
      spawned++;
      const interval = CONFIG.ENEMY.SPAWN_INTERVAL_MIN +
        Math.random() * (CONFIG.ENEMY.SPAWN_INTERVAL_MAX - CONFIG.ENEMY.SPAWN_INTERVAL_MIN);
      this._spawnTimer = setTimeout(spawnNext, interval);
    };
    spawnNext();
  }

  /** 更新敌人位置 */
  updateEnemies(dt) {
    const route = this.route;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      // 应用减速效果
      let speedMul = 1;
      if (this.activeEffects.slow) speedMul *= 0.5;
      e.progress += (e.speed * 0.3 * speedMul * dt);

      if (e.progress >= 1) {
        e.progress = 0;
        e.routeIndex++;
      }
      if (e.routeIndex >= route.length - 1) {
        // 到达阿斗位置 → 扣血
        this.aDouHp = Math.max(0, this.aDouHp - e.atk);
        if (this.aDouHp <= 0) {
          this.state = 'lose';
          this._calcStars();
        }
        e.alive = false;
      } else {
        const p0 = route[e.routeIndex];
        const p1 = route[Math.min(e.routeIndex + 1, route.length - 1)];
        const pos0 = this.getCellPos(p0);
        const pos1 = this.getCellPos(p1);
        const cx = CONFIG.GRID.CELL_SIZE / 2;
        e.x = pos0.x + cx + (pos1.x - pos0.x) * e.progress;
        e.y = pos0.y + cx + (pos1.y - pos0.y) * e.progress;
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);
    // 检查波次结束
    if (this.waveActive && this.enemies.length === 0 && this.waveEnemiesRemaining === 0) {
      this.waveActive = false;
      if (this.currentWave >= this.totalWaves) {
        this.state = 'win';
        this._calcStars();
      } else {
        // 下一波倒计时
        this.nextWaveTimer = setTimeout(() => {
          this.currentWave++;
          this.startWave();
        }, 3000);
      }
    }
    // 更新 waveEnemiesRemaining（已全部生成后归零）
    if (this.enemies.length === 0) this.waveEnemiesRemaining = 0;
  }

  /** 格子单位攻击敌人 */
  updateAttacks(dt) {
    let atkSpeedMul = 1;
    if (this.activeEffects.atkSpeed) atkSpeedMul *= 1.5;
    for (let key in this.gridUnits) {
      const unit = this.gridUnits[key];
      if (!unit || !unit.soldier) continue;
      unit._lastAtk = unit._lastAtk || 0;
      unit._lastAtk += dt * 1000;
      const interval = (unit.hero ? unit.hero.atkSpeed : unit.soldier.atkSpeed) / atkSpeedMul;
      if (unit._lastAtk < interval) continue;
      unit._lastAtk = 0;
      const [r, c] = key.split(',').map(Number);
      const pos = this.getCellPos({ row: r, col: c });
      const cx = pos.x + CONFIG.GRID.CELL_SIZE / 2;
      const cy = pos.y + CONFIG.GRID.CELL_SIZE / 2;
      const range = (unit.hero ? unit.hero.range : unit.soldier.range) * CONFIG.GRID.CELL_SIZE;
      let damage = unit.hero ? unit.hero.atk : unit.soldier.atk;
      // 诸葛亮被动加成
      if (this._hasHeroActive('诸葛亮')) damage = Math.floor(damage * 1.2);
      // 赵云被动
      if (this._hasHeroActive('赵云')) damage = Math.floor(damage * 1.15);

      let target = null;
      let minDist = Infinity;
      for (let e of this.enemies) {
        if (!e.alive) continue;
        const dx = e.x - cx;
        const dy = e.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= range && dist < minDist) {
          minDist = dist;
          target = e;
        }
      }
      if (target) {
        target.hp -= damage;
        if (target.hp <= 0) {
          target.alive = false;
          this.stats.killed++;
          this.gold += target.reward || 5;
        }
      }
    }
  }

  _hasHeroActive(name) {
    for (let key in this.gridUnits) {
      if (this.gridUnits[key].hero && this.gridUnits[key].hero === CONFIG.HERO_RECIPES[name]) {
        return true;
      }
    }
    return false;
  }

  _calcStars() {
    if (this.state === 'win') {
      const hpRatio = this.aDouHp / this.aDouMaxHp;
      if (hpRatio >= 0.8) this.stats.stars = 3;
      else if (hpRatio >= 0.4) this.stats.stars = 2;
      else this.stats.stars = 1;
    }
  }

  /** 更新技能冷却 */
  updateSkills(dt) {
    for (let key in this.skillCooldowns) {
      if (this.skillCooldowns[key].remaining > 0) {
        this.skillCooldowns[key].remaining = Math.max(0,
          this.skillCooldowns[key].remaining - dt * 1000);
      }
    }
    // 更新效果
    for (let key in this.activeEffects) {
      this.activeEffects[key].remaining -= dt * 1000;
      if (this.activeEffects[key].remaining <= 0) {
        delete this.activeEffects[key];
      }
    }
  }

  /** 释放技能 */
  useSkill(skillKey) {
    if (this.skillCooldowns[skillKey].remaining > 0) return false;
    const skill = CONFIG.SKILLS[skillKey];
    if (!skill) return false;
    this.skillCooldowns[skillKey].remaining = skill.cd;
    switch (skillKey) {
      case 'farmer':
        // 立即收集所有掉落文字到最近空格
        for (let i = this.fallingTexts.length - 1; i >= 0; i--) {
          const t = this.fallingTexts[i];
          let placed = false;
          for (let r = 0; r < CONFIG.GRID.ROWS && !placed; r++) {
            for (let c = 0; c < CONFIG.GRID.COLS && !placed; c++) {
              if (!this.getUnit(r, c)) {
                this.placeTextOnGrid(t, r, c);
                placed = true;
              }
            }
          }
          if (!placed) this.fallingTexts.splice(i, 1);
        }
        break;
      case 'recruit':
        // 召唤高级文字
        const highTexts = ['枪', '弓', '骑', '将'];
        const txt = highTexts[Math.floor(Math.random() * highTexts.length)];
        this.fallingTexts.push({
          id: Date.now() + Math.random(),
          text: txt,
          x: CONFIG.GRID.OFFSET_X + Math.random() * CONFIG.GRID.COLS * CONFIG.GRID.CELL_SIZE * 0.8,
          y: 10,
          speed: CONFIG.TEXT_DROP.FALL_SPEED * 1.5,
          glow: false,
        });
        break;
      case 'meteor':
        // 全场敌人伤害
        for (let e of this.enemies) {
          e.hp -= 80;
          if (e.hp <= 0) { e.alive = false; this.stats.killed++; this.gold += e.reward || 5; }
        }
        this.activeEffects.meteor = { remaining: 1000, data: {} };
        break;
      case 'bagua':
        this.activeEffects.slow = { remaining: 5000, data: {} };
        break;
      case 'food':
        this.activeEffects.atkSpeed = { remaining: 8000, data: {} };
        break;
      case 'musou':
        for (let e of this.enemies) {
          e.hp -= 200;
          if (e.hp <= 0) { e.alive = false; this.stats.killed++; this.gold += e.reward || 5; }
        }
        break;
    }
    return true;
  }
}
