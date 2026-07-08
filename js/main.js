/**
 * 「赵云与阿斗」文字合成塔防 - 主入口
 */
(() => {
  let game, renderer, ui;
  let gameLoopId = null;
  let textDropTimer = null;
  let lastTime = 0;

  function init() {
    game = new GameCore();
    const canvas = document.getElementById('battle-canvas');
    renderer = new BattleRenderer(canvas);
    ui = new UIManager();
    ui.init();
    ui.showMenu();

    // 菜单事件
    document.getElementById('btn-start').addEventListener('click', () => {
      document.getElementById('menu-screen').classList.remove('active');
      document.getElementById('chapter-select-screen').classList.add('active');
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
      document.getElementById('chapter-select-screen').classList.remove('active');
      document.getElementById('menu-screen').classList.add('active');
    });

    // 暂停
    document.getElementById('btn-pause').addEventListener('click', togglePause);
    document.getElementById('btn-resume').addEventListener('click', togglePause);
    document.getElementById('btn-quit').addEventListener('click', quitToMenu);

    // 结果界面
    document.getElementById('btn-retry').addEventListener('click', () => {
      startBattle(game.currentChapter);
    });
    document.getElementById('btn-menu').addEventListener('click', quitToMenu);

    // 拖拽事件
    ui.initDragEvents(canvas, game, renderer, (result) => {
      // 合成成功回调 - 可播放特效
      if (result && result.type === 'hero') {
        showToast(`🎉 合成了 ${result.result}！`);
      }
    });

    // 快捷键
    document.addEventListener('keydown', (e) => {
      if (game.state !== 'battle') return;
      switch (e.key) {
        case '1': game.useSkill('farmer'); break;
        case '2': game.useSkill('recruit'); break;
        case '3': game.useSkill('meteor'); break;
        case '4': game.useSkill('bagua'); break;
        case '5': game.useSkill('food'); break;
        case '6': game.useSkill('musou'); break;
        case 'Escape': togglePause(); break;
      }
    });
  }

  window.startBattle = function(chapterId) {
    document.getElementById('chapter-select-screen').classList.remove('active');
    game.reset(chapterId);
    ui.showBattle();
    renderer.resize();
    lastTime = performance.now();
    startLoops();
  };

  window.useSkill = function(key) {
    if (game.state !== 'battle') return;
    const success = game.useSkill(key);
    if (success) {
      showToast(`${CONFIG.SKILLS[key].name}释放！`);
    }
  };

  function startLoops() {
    cancelLoops();
    // 主循环
    gameLoop();
    // 文字掉落
    scheduleTextDrop();
    // 开始第一波
    setTimeout(() => game.startWave(), 1500);
  }

  function cancelLoops() {
    if (gameLoopId) { cancelAnimationFrame(gameLoopId); gameLoopId = null; }
    if (textDropTimer) { clearTimeout(textDropTimer); textDropTimer = null; }
    if (game && game._spawnTimer) { clearTimeout(game._spawnTimer); }
    if (game && game.nextWaveTimer) { clearTimeout(game.nextWaveTimer); }
  }

  function gameLoop(timestamp) {
    if (game.state === 'menu') return;
    if (game.state === 'pause') {
      gameLoopId = requestAnimationFrame(gameLoop);
      return;
    }
    if (!timestamp) timestamp = performance.now();
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // cap dt
    lastTime = timestamp;

    if (game.state === 'battle') {
      game.updateFallingTexts(dt);
      game.updateEnemies(dt);
      game.updateAttacks(dt);
      game.updateSkills(dt);
      ui.updateHUD(game);
      ui.updateSkills(game);
    }

    renderer.render(game);

    if (game.state === 'win' || game.state === 'lose') {
      cancelLoops();
      ui.showResult(game.state === 'win', game);
      return;
    }

    gameLoopId = requestAnimationFrame(gameLoop);
  }

  function scheduleTextDrop() {
    if (game.state !== 'battle') return;
    game.spawnFallingText();
    const interval = CONFIG.TEXT_DROP.MIN_INTERVAL +
      Math.random() * (CONFIG.TEXT_DROP.MAX_INTERVAL - CONFIG.TEXT_DROP.MIN_INTERVAL);
    textDropTimer = setTimeout(scheduleTextDrop, interval);
  }

  function togglePause() {
    if (game.state === 'battle') {
      game.state = 'pause';
      document.getElementById('pause-overlay').classList.add('active');
    } else if (game.state === 'pause') {
      game.state = 'battle';
      document.getElementById('pause-overlay').classList.remove('active');
    }
  }

  function quitToMenu() {
    cancelLoops();
    game.state = 'menu';
    ui.showMenu();
    renderer.render(game);
  }

  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1500);
  }

  // 启动
  document.addEventListener('DOMContentLoaded', init);
})();
