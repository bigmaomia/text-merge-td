/**
 * UI 管理模块
 */
class UIManager {
  constructor() {
    this.elements = {};
    this.dragState = null; // { text, startX, startY, origX, origY }
  }

  init() {
    this.elements = {
      menuScreen: document.getElementById('menu-screen'),
      chapterSelect: document.getElementById('chapter-select'),
      battleScreen: document.getElementById('battle-screen'),
      pauseOverlay: document.getElementById('pause-overlay'),
      resultScreen: document.getElementById('result-screen'),
      resultTitle: document.getElementById('result-title'),
      resultStars: document.getElementById('result-stars'),
      resultGold: document.getElementById('result-gold'),
      resultKills: document.getElementById('result-kills'),
      hudWave: document.getElementById('hud-wave'),
      hudGold: document.getElementById('hud-gold'),
      hudHp: document.getElementById('hud-hp'),
      skillBar: document.getElementById('skill-bar'),
      canvas: document.getElementById('battle-canvas'),
      aDouHpBar: document.getElementById('adou-hp-fill'),
    };
    this._buildSkillButtons();
    this._buildChapterSelect();
  }

  _buildChapterSelect() {
    const container = this.elements.chapterSelect;
    if (!container) return;
    container.innerHTML = '';
    CONFIG.CHAPTERS.forEach((ch, idx) => {
      const btn = document.createElement('button');
      btn.className = 'chapter-btn';
      btn.textContent = ch.name;
      btn.addEventListener('click', () => {
        if (window.startBattle) window.startBattle(ch.id);
      });
      container.appendChild(btn);
    });
  }

  _buildSkillButtons() {
    const bar = this.elements.skillBar;
    if (!bar) return;
    bar.innerHTML = '';
    for (let key in CONFIG.SKILLS) {
      const skill = CONFIG.SKILLS[key];
      const btn = document.createElement('button');
      btn.className = 'skill-btn';
      btn.id = `skill-${key}`;
      btn.innerHTML = `<span class="skill-icon">${skill.icon}</span><span class="skill-cd"></span>`;
      btn.title = `${skill.name}: ${skill.desc}`;
      btn.addEventListener('click', () => {
        if (window.useSkill) window.useSkill(key);
      });
      bar.appendChild(btn);
    }
  }

  showMenu() {
    this.elements.menuScreen.classList.add('active');
    this.elements.battleScreen.classList.remove('active');
    this.elements.resultScreen.classList.remove('active');
  }

  showBattle() {
    this.elements.menuScreen.classList.remove('active');
    this.elements.battleScreen.classList.add('active');
    this.elements.resultScreen.classList.remove('active');
    this.elements.pauseOverlay.classList.remove('active');
  }

  showResult(win, game) {
    this.elements.resultScreen.classList.add('active');
    this.elements.resultTitle.textContent = win ? '🎉 胜利！' : '💀 失败';
    this.elements.resultTitle.className = win ? 'result-title win' : 'result-title lose';
    const stars = game.stats.stars;
    let starStr = '';
    for (let i = 0; i < 3; i++) {
      starStr += i < stars ? '⭐' : '☆';
    }
    this.elements.resultStars.textContent = starStr;
    this.elements.resultGold.textContent = game.gold;
    this.elements.resultKills.textContent = game.stats.killed;
  }

  updateHUD(game) {
    this.elements.hudWave.textContent = `波次 ${game.currentWave}/${game.totalWaves}`;
    this.elements.hudGold.textContent = `💰${game.gold}`;
    this.elements.hudHp.textContent = `阿斗 ❤️×${game.aDouHp}`;
    if (this.elements.aDouHpBar) {
      const pct = (game.aDouHp / game.aDouMaxHp) * 100;
      this.elements.aDouHpBar.style.width = pct + '%';
      if (pct > 60) this.elements.aDouHpBar.style.background = '#00cc00';
      else if (pct > 30) this.elements.aDouHpBar.style.background = '#ffcc00';
      else this.elements.aDouHpBar.style.background = '#ff0000';
    }
  }

  updateSkills(game) {
    for (let key in game.skillCooldowns) {
      const btn = document.getElementById(`skill-${key}`);
      if (!btn) continue;
      const cd = game.skillCooldowns[key];
      const cdEl = btn.querySelector('.skill-cd');
      if (cd.remaining > 0) {
        btn.classList.add('on-cd');
        cdEl.textContent = Math.ceil(cd.remaining / 1000) + 's';
      } else {
        btn.classList.remove('on-cd');
        cdEl.textContent = '';
      }
    }
  }

  /** 初始化拖拽事件 */
  initDragEvents(canvas, game, renderer, onDragEnd) {
    let dragObj = null;
    let dragOffsetX = 0, dragOffsetY = 0;
    let isDragging = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const onDown = (e) => {
      const pos = getPos(e);
      // 先检查掉落文字
      const hitText = renderer.hitTestFallingText(pos.x, pos.y, game);
      if (hitText) {
        dragObj = hitText;
        dragOffsetX = pos.x - hitText.x;
        dragOffsetY = pos.y - hitText.y;
        isDragging = false;
        e.preventDefault();
        return;
      }
      // 检查格子上单位
      const gridPos = renderer.screenToGrid(pos.x, pos.y);
      if (gridPos && game.getUnit(gridPos.row, gridPos.col)) {
        const unit = game.getUnit(gridPos.row, gridPos.col);
        if (game.selectedText && game.selectedText !== unit) {
          // 尝试合成两个格子单位
          const result = game.tryMerge(game.selectedText.text, unit.text);
          if (result.success) {
            // 移除两个源，在目标格子放置结果
            for (let key in game.gridUnits) {
              if (game.gridUnits[key] === game.selectedText || game.gridUnits[key] === unit) {
                const [r, c] = key.split(',').map(Number);
                game.removeUnit(r, c);
              }
            }
            game.placeUnitOnGrid(gridPos.row, gridPos.col, {
              type: result.type === 'hero' ? 'hero' : 'soldier',
              text: result.result,
              soldier: result.type === 'soldier' ? result.data : null,
              hero: result.type === 'hero' ? result.data : null,
              level: result.type === 'soldier' ? result.data.level : 99,
            });
            onDragEnd(result);
          }
          game.selectedText = null;
        } else {
          game.selectedText = unit;
        }
        return;
      }
      game.selectedText = null;
    };

    const onMove = (e) => {
      if (!dragObj) return;
      isDragging = true;
      const pos = getPos(e);
      dragObj.x = pos.x - dragOffsetX;
      dragObj.y = pos.y - dragOffsetY;
      e.preventDefault();
    };

    const onUp = (e) => {
      if (!dragObj) return;
      const pos = getPos(e);
      if (isDragging) {
        // 拖拽到空格子 → 放置
        const gridPos = renderer.screenToGrid(pos.x + CONFIG.GRID.CELL_SIZE / 2, pos.y + CONFIG.GRID.CELL_SIZE / 2);
        if (gridPos && !game.getUnit(gridPos.row, gridPos.col)) {
          game.placeTextOnGrid(dragObj, gridPos.row, gridPos.col);
        }
        // 如果拖到已有同文字格子上 → 合成
        if (gridPos && game.getUnit(gridPos.row, gridPos.col)) {
          const target = game.getUnit(gridPos.row, gridPos.col);
          const result = game.tryMerge(dragObj.text, target.text);
          if (result.success) {
            game.removeUnit(gridPos.row, gridPos.col);
            game.placeUnitOnGrid(gridPos.row, gridPos.col, {
              type: result.type === 'hero' ? 'hero' : 'soldier',
              text: result.result,
              soldier: result.type === 'soldier' ? result.data : null,
              hero: result.type === 'hero' ? result.data : null,
              level: result.type === 'soldier' ? result.data.level : 99,
            });
            onDragEnd(result);
          }
        }
      } else {
        // 点击配对
        if (game.selectedText) {
          // 选中的是掉落文字，点击另一个掉落文字
          const hitText = renderer.hitTestFallingText(pos.x, pos.y, game);
          if (hitText && hitText !== game.selectedText) {
            const result = game.tryMerge(game.selectedText.text, hitText.text);
            if (result.success) {
              const idx1 = game.fallingTexts.indexOf(game.selectedText);
              const idx2 = game.fallingTexts.indexOf(hitText);
              if (idx1 >= 0) game.fallingTexts.splice(Math.max(idx1, idx2), 1);
              if (idx2 >= 0) game.fallingTexts.splice(Math.min(idx1, idx2), 1);
              // 将结果放入掉落池
              game.fallingTexts.push({
                id: Date.now() + Math.random(),
                text: result.result,
                x: Math.min(hitText.x, game.selectedText.x),
                y: Math.min(hitText.y, game.selectedText.y),
                speed: CONFIG.TEXT_DROP.FALL_SPEED,
                glow: false,
                isResult: true,
              });
              onDragEnd(result);
            }
            game.selectedText = null;
          } else {
            game.selectedText = null;
          }
        } else {
          const hitText = renderer.hitTestFallingText(pos.x, pos.y, game);
          game.selectedText = hitText;
        }
      }
      dragObj = null;
      isDragging = false;
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);
  }
}
