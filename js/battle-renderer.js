/**
 * Canvas 战斗渲染器
 */
class BattleRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = Math.min(window.innerWidth, 800);
    const h = Math.min(window.innerHeight, 700);
    this.canvas.width = w;
    this.canvas.height = h;
  }

  /** 主渲染 */
  render(game) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 背景
    this._drawBackground(ctx, w, h);

    // 网格
    this._drawGrid(ctx, game);

    // 格子上的单位
    this._drawGridUnits(ctx, game);

    // 掉落文字
    this._drawFallingTexts(ctx, game);

    // 敌人
    this._drawEnemies(ctx, game);

    // 阿斗
    this._drawADou(ctx, game);

    // 特效
    this._drawEffects(ctx, game);
  }

  _drawBackground(ctx, w, h) {
    // 战场背景
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.6, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  _drawGrid(ctx, game) {
    const cs = CONFIG.GRID.CELL_SIZE;
    const ox = CONFIG.GRID.OFFSET_X;
    const oy = CONFIG.GRID.OFFSET_Y;
    for (let r = 0; r < CONFIG.GRID.ROWS; r++) {
      for (let c = 0; c < CONFIG.GRID.COLS; c++) {
        const x = ox + c * cs;
        const y = oy + r * cs;
        // 格子背景
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeRect(x, y, cs, cs);
      }
    }
    // 路线指示
    const route = game.route;
    ctx.strokeStyle = 'rgba(255,200,0,0.15)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    for (let i = 0; i < route.length; i++) {
      const pos = game.getCellPos(route[i]);
      const cx = pos.x + cs / 2;
      const cy = pos.y + cs / 2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
  }

  _drawFallingTexts(ctx, game) {
    const cs = CONFIG.GRID.CELL_SIZE;
    for (let t of game.fallingTexts) {
      const x = t.x;
      const y = t.y;
      // 发光效果
      if (t.glow) {
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 15;
      }
      // 背景
      const color = CONFIG.SOLDIER_CHAIN[t.text]?.color || '#888';
      ctx.fillStyle = color;
      this._roundRect(ctx, x + 2, y + 2, cs - 8, cs - 8, 8);
      ctx.fill();
      // 文字
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px "SimHei", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, x + cs / 2 - 4, y + cs / 2 - 4);
      // 边框
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      this._roundRect(ctx, x, y, cs - 4, cs - 4, 8);
      ctx.stroke();
    }
  }

  _drawGridUnits(ctx, game) {
    const cs = CONFIG.GRID.CELL_SIZE;
    for (let key in game.gridUnits) {
      const unit = game.gridUnits[key];
      const [r, c] = key.split(',').map(Number);
      const pos = game.getCellPos({ row: r, col: c });
      const x = pos.x + 2;
      const y = pos.y + 2;
      const s = cs - 4;

      // 发光
      if (unit.glow) {
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 12;
      }

      if (unit.hero) {
        this._drawHero(ctx, x, y, s, unit);
      } else if (unit.soldier) {
        this._drawSoldier(ctx, x, y, s, unit);
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }

  _drawSoldier(ctx, x, y, s, unit) {
    const grad = ctx.createLinearGradient(x, y, x, y + s);
    const c = unit.soldier.color;
    grad.addColorStop(0, c);
    grad.addColorStop(1, this._darken(c, 0.3));
    ctx.fillStyle = grad;
    this._roundRect(ctx, x, y, s, s, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    this._roundRect(ctx, x, y, s, s, 6);
    ctx.stroke();
    // 文字
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${s * 0.45}px "SimHei", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unit.text, x + s / 2, y + s / 2);
    // 等级小标
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${s * 0.2}px sans-serif`;
    ctx.fillText(`Lv${unit.level || 1}`, x + s / 2, y + s - 8);
  }

  _drawHero(ctx, x, y, s, unit) {
    const c = unit.hero.color;
    // 英雄有更大的视觉
    const grad = ctx.createRadialGradient(x + s / 2, y + s / 2, s * 0.1, x + s / 2, y + s / 2, s * 0.6);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, c);
    grad.addColorStop(1, this._darken(c, 0.4));
    ctx.fillStyle = grad;
    this._roundRect(ctx, x, y, s, s, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    this._roundRect(ctx, x, y, s, s, 8);
    ctx.stroke();
    // 星形标记
    ctx.fillStyle = '#ffd700';
    ctx.font = `${s * 0.3}px sans-serif`;
    ctx.fillText('⭐', x + s / 2, y + 10);
    // 名称
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${s * 0.35}px "SimHei", sans-serif`;
    ctx.fillText(unit.text, x + s / 2, y + s / 2 + 2);
  }

  _drawEnemies(ctx, game) {
    const cs = CONFIG.GRID.CELL_SIZE;
    for (let e of game.enemies) {
      if (!e.alive) continue;
      const r = cs * 0.35;

      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(e.x + 2, e.y + 2, r, 0, Math.PI * 2);
      ctx.fill();

      // 身体
      const grad = ctx.createRadialGradient(e.x - 2, e.y - 2, r * 0.1, e.x, e.y, r);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.5, e.color);
      grad.addColorStop(1, this._darken(e.color, 0.4));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.fill();

      // 边框
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Boss标记
      if (e.isBoss) {
        ctx.fillStyle = '#ffd700';
        ctx.font = `${r * 1.2}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('👑', e.x, e.y - r - 5);
      }

      // 血条
      const barW = r * 2.5;
      const barH = 4;
      const barX = e.x - barW / 2;
      const barY = e.y - r - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      const hpPct = e.hp / e.maxHp;
      ctx.fillStyle = hpPct > 0.5 ? '#00cc00' : hpPct > 0.25 ? '#ffcc00' : '#ff0000';
      ctx.fillRect(barX, barY, barW * hpPct, barH);
    }
  }

  _drawADou(ctx, game) {
    const cs = CONFIG.GRID.CELL_SIZE;
    const pos = game.getCellPos(CONFIG.A_DOU.POSITION);
    const x = pos.x + cs / 2;
    const y = pos.y + cs / 2;

    // 保护光环
    ctx.fillStyle = 'rgba(100,200,255,0.1)';
    ctx.beginPath();
    ctx.arc(x, y, cs * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,200,255,0.3)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;

    // 阿斗
    ctx.fillStyle = '#ffffff';
    ctx.font = `${cs * 0.5}px "SimHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('阿斗', x, y - 5);

    // 血量心形
    const hearts = [];
    for (let i = 0; i < game.aDouHp; i++) {
      if (i % 5 === 0 && i > 0) continue;
      hearts.push('❤️');
    }
    ctx.font = `${cs * 0.2}px sans-serif`;
    ctx.fillText(`❤️×${game.aDouHp}`, x, y + cs * 0.35);
  }

  _drawEffects(ctx, game) {
    // 陨石特效
    if (game.activeEffects.meteor) {
      ctx.fillStyle = 'rgba(255,100,0,0.15)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      // 粒子效果
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(
          Math.random() * this.canvas.width,
          Math.random() * this.canvas.height * 0.5,
          3, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
    // 减速效果
    if (game.activeEffects.slow) {
      ctx.fillStyle = 'rgba(0,100,255,0.08)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /** 将屏幕坐标转为网格坐标 */
  screenToGrid(x, y) {
    const cs = CONFIG.GRID.CELL_SIZE;
    const col = Math.floor((x - CONFIG.GRID.OFFSET_X) / cs);
    const row = Math.floor((y - CONFIG.GRID.OFFSET_Y) / cs);
    if (row < 0 || row >= CONFIG.GRID.ROWS || col < 0 || col >= CONFIG.GRID.COLS) return null;
    return { row, col };
  }

  /** 检测点中的掉落文字 */
  hitTestFallingText(x, y, game) {
    const cs = CONFIG.GRID.CELL_SIZE;
    for (let i = game.fallingTexts.length - 1; i >= 0; i--) {
      const t = game.fallingTexts[i];
      if (x >= t.x && x <= t.x + cs - 4 && y >= t.y && y <= t.y + cs - 4) {
        return t;
      }
    }
    return null;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _darken(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const d = (c) => Math.floor(c * (1 - factor));
    return `rgb(${d(r)},${d(g)},${d(b)})`;
  }
}
