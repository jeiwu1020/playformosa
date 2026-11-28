const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEVICE_KEY = 'pf-leaderboard-device-v1';

export const CATEGORY_LABELS = Object.freeze({
  park: '公園遊具',
  decathlon: '十項全能',
  minigames: '小遊戲',
});

export const BOARD_CATALOG = Object.freeze([
  // 公園遊具 (3)
  {
    key: 'swing',
    game: 'swing',
    category: 'park',
    title: '飛天盪鞦韆',
    unitLabel: '公尺',
    ruleNote: '以放手飛出後的總落地距離（公尺）排名，越遠越前面。',
    href: '/games/swing/',
    challengeSupported: true,
  },
  {
    key: 'horizontal-bar',
    game: 'horizontal-bar',
    category: 'park',
    title: '單槓甩到爆',
    unitLabel: '圈',
    ruleNote: '以單槓連續繞圈數（至少 1 圈）排名，越多圈越前面。',
    href: '/games/horizontal-bar/',
    challengeSupported: true,
    integer: true,
  },
  {
    key: 'turbo-slide',
    game: 'turbo-slide',
    category: 'park',
    title: '極速滑梯王',
    unitLabel: '公尺',
    ruleNote: '以衝出滑梯後的總落地距離（公尺）排名，越遠越前面。',
    href: '/games/turbo-slide/',
    challengeSupported: true,
  },
  // 十項全能 (10)
  {
    key: 'sprint-100m',
    game: 'sprint-100m',
    category: 'decathlon',
    title: '100 公尺',
    unitLabel: '秒',
    ruleNote: '四肢各有想法｜100 公尺完賽秒數，越短越前面。',
    href: '/games/sprint-100m/',
  },
  {
    key: 'long-jump',
    game: 'long-jump',
    category: 'decathlon',
    title: '跳遠',
    unitLabel: '公里',
    ruleNote: '四肢各有想法｜合法落地距離，越遠越前面。',
    href: '/games/long-jump/',
  },
  {
    key: 'shot-put',
    game: 'shot-put',
    category: 'decathlon',
    title: '鉛球',
    unitLabel: '公尺',
    ruleNote: '四肢各有想法｜有效投擲距離，越遠越前面。',
    href: '/games/shot-put/',
  },
  {
    key: 'high-jump',
    game: 'high-jump',
    category: 'decathlon',
    title: '跳高',
    unitLabel: '公尺',
    ruleNote: '四肢各有想法｜成功過桿高度，越高越前面。',
    href: '/games/high-jump/',
  },
  {
    key: 'run-400m',
    game: 'run-400m',
    category: 'decathlon',
    title: '400 公尺',
    unitLabel: '秒',
    ruleNote: '四肢各有想法｜固定跑道一圈，完賽秒數越短越前面。',
    href: '/games/run-400m/',
  },
  {
    key: 'hurdles',
    game: 'hurdles',
    category: 'decathlon',
    title: '110 公尺跨欄',
    unitLabel: '秒',
    ruleNote: '四肢各有想法｜跨欄完賽秒數，越短越前面。',
    href: '/games/hurdles/',
  },
  {
    key: 'discus',
    game: 'discus',
    category: 'decathlon',
    title: '鐵餅',
    unitLabel: '公尺',
    ruleNote: '四肢各有想法｜有效投擲距離，越遠越前面。',
    href: '/games/discus/',
  },
  {
    key: 'pole-vault',
    game: 'pole-vault',
    category: 'decathlon',
    title: '撐竿跳',
    unitLabel: '公尺',
    ruleNote: '四肢各有想法｜最高過桿高度，越高越前面。',
    href: '/games/pole-vault/',
  },
  {
    key: 'javelin',
    game: 'javelin',
    category: 'decathlon',
    title: '標槍',
    unitLabel: '公尺',
    ruleNote: '四肢各有想法｜只收錄有效投擲，距離越遠越前面。',
    href: '/games/javelin/',
  },
  {
    key: 'run-1500m',
    game: 'run-1500m',
    category: 'decathlon',
    title: '1500 公尺',
    unitLabel: '秒',
    ruleNote: '四肢各有想法｜以完賽秒數排名，越短越前面。',
    href: '/games/run-1500m/',
  },
  // 小遊戲 (11)
  {
    key: 'overtime-pinball-60s',
    game: 'overtime-pinball-60s',
    category: 'minigames',
    title: '不准加班公司 · 60 秒',
    unitLabel: '分',
    ruleNote: '辦公室人體彈珠台（60 秒模式），分數越高越前面。',
    href: '/games/overtime-pinball/',
  },
  {
    key: 'overtime-pinball-180s',
    game: 'overtime-pinball-180s',
    category: 'minigames',
    title: '不准加班公司 · 3 分鐘',
    unitLabel: '分',
    ruleNote: '辦公室人體彈珠台（3 分鐘模式），分數越高越前面。',
    href: '/games/overtime-pinball/',
  },
  {
    key: 'overtime-pinball-unlimited',
    game: 'overtime-pinball-unlimited',
    category: 'minigames',
    title: '不准加班公司 · 不限時',
    unitLabel: '分',
    ruleNote: '辦公室人體彈珠台（不限時模式），分數越高越前面。',
    href: '/games/overtime-pinball/',
  },
  {
    key: 'courtesy-contest',
    game: 'courtesy-contest',
    category: 'minigames',
    title: '客氣大賽',
    unitLabel: '次',
    secondaryUnitLabel: '秒',
    ruleNote: '發車前有效按下謝謝才入榜；先比互讓完成次數，同次數以剩餘秒數越接近零越前面。',
    href: '/games/courtesy-contest/',
  },
  {
    key: 'fast-hands-mouse',
    game: 'fast-hands',
    mode: 'mouse',
    category: 'minigames',
    title: '快手王｜鴨沒漏補（滑鼠）',
    unitLabel: '秒',
    isMs: true,
    ruleNote: '一筆往返手速挑戰（滑鼠版），完賽秒數越短越前面。',
    href: '/games/fast-hands/?intro=1',
  },
  {
    key: 'fast-hands-touch',
    game: 'fast-hands',
    mode: 'touch',
    category: 'minigames',
    title: '快手王｜鴨沒漏補（觸控）',
    unitLabel: '秒',
    isMs: true,
    ruleNote: '一筆往返手速挑戰（觸控版），完賽秒數越短越前面。',
    href: '/games/fast-hands/?intro=1',
  },
  {
    key: 'fast-hands-catch',
    game: 'fast-hands-catch',
    category: 'minigames',
    title: '快手王｜彈無虛接',
    unitLabel: '關',
    ruleNote: '逐關加速接彈挑戰，過關數越多越前面。',
    href: '/games/fast-hands/catch.html?intro=1',
  },
  {
    key: 'fast-hands-duel',
    game: 'fast-hands-duel',
    category: 'minigames',
    title: '快手王｜快手對決',
    unitLabel: '勝',
    ruleNote: '十回合反應對決，勝場數越多越前面。',
    href: '/games/fast-hands/duel.html?intro=1',
  },
  {
    key: 'beer-slide',
    game: 'beer-slide',
    category: 'minigames',
    title: '別灑啊！',
    unitLabel: '分',
    ruleNote: '啤酒精準推杯，準度與留酒率總分越高越前面。',
    href: '/games/beer-slide/',
  },
  {
    key: 'reaction-rod',
    game: 'reaction-rod',
    category: 'minigames',
    title: '接棒啦！',
    unitLabel: '根',
    secondaryUnitLabel: '分',
    ruleNote: '先比接住根數，再比反應評分。',
    href: '/games/reaction-rod/',
  },
  {
    key: 'tower-climb',
    game: 'tower-climb',
    category: 'minigames',
    title: '上樓不容易',
    unitLabel: '秒',
    ruleNote: '60 秒十層完成時間，越短越前面。',
    href: '/games/tower-climb/',
  },
]);

export function formatBoardNumber(n, board) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  if (board?.isMs) {
    return n > 0 && n < 1 ? '<0.001' : (n / 1000).toFixed(3);
  }
  if (n > 0 && n < 0.001) return '<0.001';
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export function formatBoardScore(row, board) {
  const base = `${formatBoardNumber(row.score, board)} ${board.unitLabel}`;
  if (board.secondaryUnitLabel && typeof row.secondaryScore === 'number' && Number.isFinite(row.secondaryScore)) {
    return `${base} · ${formatBoardNumber(row.secondaryScore)} ${board.secondaryUnitLabel}`;
  }
  return base;
}

export function formatBoardGap(own, board) {
  if (!own || own.gap === null || own.gap === undefined) return '目前領先，繼續保持！';
  const gapUnit =
    own.gapMetric === 'remaining'
      ? '秒'
      : own.gapMetric === 'rating'
        ? '分'
        : board.unitLabel;
  return `追上前方成績還差 ${formatBoardNumber(own.gap, board)} ${gapUnit}`;
}

export function buildParkChallengeHref(board, nickname, score) {
  const cleanScore = board.integer ? Math.round(score) : Math.round(score * 1000) / 1000;
  const cleanNick = String(nickname || '')
    .replace(/[<>\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 20) || '熱血挑戰者';
  const params = new URLSearchParams({
    challenger: cleanNick,
    target: String(cleanScore),
  });
  return `${board.href}?${params.toString()}`;
}

export function readExistingDeviceId(win) {
  try {
    const existing = win.localStorage.getItem(DEVICE_KEY);
    return existing && UUID_V4_RE.test(existing) ? existing.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function findInitialBoard(search) {
  const params = new URLSearchParams(search);
  const game = params.get('game');
  const mode = params.get('mode');
  if (game === 'fast-hands') {
    const matched = BOARD_CATALOG.find((b) => b.game === 'fast-hands' && b.mode === (mode === 'touch' ? 'touch' : 'mouse'));
    if (matched) return matched;
  }
  if (game) {
    const matched = BOARD_CATALOG.find((b) => b.key === game || b.game === game);
    if (matched) return matched;
  }
  return BOARD_CATALOG[0];
}

export function buildLeaderboardApiUrl(board) {
  const params = new URLSearchParams({ game: board.game });
  if (board.mode) params.set('mode', board.mode);
  return `/api/leaderboard?${params.toString()}`;
}

export function mountLeaderboardHub({ document = window.document, fetcher = (...args) => window.fetch(...args) } = {}) {
  const win = document.defaultView;
  const $ = (id) => document.getElementById(id);
  const listEl = $('lb-board-list');
  const detailCatEl = $('lb-detail-cat');
  const detailTitleEl = $('lb-detail-title');
  const detailRuleEl = $('lb-detail-rule');
  const playLinkEl = $('lb-play-link');
  const refreshBtn = $('lb-refresh-btn');
  const scanBtn = $('lb-scan-category');
  const scanStatusEl = $('lb-scan-status');
  const ownScoreEl = $('lb-own-score');
  const ownMetaEl = $('lb-own-meta');
  const ownChallengeBtn = $('lb-own-challenge-btn');
  const copyToastEl = $('lb-copy-toast');
  const statusMsgEl = $('lb-status-msg');
  const rankListEl = $('lb-rank-list');
  const tabButtons = [...document.querySelectorAll('.lb-tab[data-cat]')];

  if (!listEl || !detailTitleEl || !rankListEl) return null;

  const deviceId = win ? readExistingDeviceId(win) : null;
  const cache = new Map();
  let activeCategory = 'all';
  let selectedBoard = findInitialBoard(win?.location?.search || '');
  let requestSeq = 0;
  let scanning = false;

  const visibleBoards = () =>
    activeCategory === 'all'
      ? BOARD_CATALOG
      : BOARD_CATALOG.filter((b) => b.category === activeCategory);

  const showToast = (text) => {
    if (!copyToastEl) return;
    copyToastEl.textContent = text;
    copyToastEl.hidden = !text;
  };

  const renderSidebar = () => {
    const boards = visibleBoards();
    listEl.replaceChildren();
    for (const board of boards) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `lb-board-item${board.key === selectedBoard.key ? ' is-selected' : ''}`;
      btn.dataset.boardKey = board.key;
      btn.setAttribute('aria-current', board.key === selectedBoard.key ? 'true' : 'false');

      const top = document.createElement('div');
      top.className = 'lb-board-item-top';
      const strong = document.createElement('strong');
      strong.textContent = board.title;
      const cat = document.createElement('span');
      cat.className = 'lb-board-item-cat';
      cat.textContent = `${CATEGORY_LABELS[board.category]} · ${board.unitLabel}`;
      top.append(strong, cat);

      const meta = document.createElement('span');
      meta.className = 'lb-board-item-meta';
      const cached = cache.get(board.key);
      if (cached?.data) {
        const topEntry = cached.data.entries[0];
        if (cached.data.own) {
          meta.textContent = `我的第 ${cached.data.own.rank} 名（${formatBoardScore(cached.data.own, board)}）`;
        } else if (topEntry) {
          meta.textContent = `目前第 1 名：${topEntry.nickname}（${formatBoardScore(topEntry, board)}）`;
        } else {
          meta.textContent = '尚無紀錄';
        }
      } else if (cached?.error) {
        meta.textContent = cached.error;
      } else {
        meta.textContent = '點選查看 Top 20';
      }

      btn.append(top, meta);
      btn.addEventListener('click', () => {
        void selectBoard(board);
      });
      li.append(btn);
      listEl.append(li);
    }
  };

  const renderDetail = (state) => {
    detailCatEl.textContent = `${CATEGORY_LABELS[selectedBoard.category]} · 單位：${selectedBoard.unitLabel}`;
    detailTitleEl.textContent = selectedBoard.title;
    detailRuleEl.textContent = selectedBoard.ruleNote;
    playLinkEl.href = selectedBoard.href;
    showToast('');

    if (state?.loading) {
      ownScoreEl.textContent = '讀取中…';
      ownMetaEl.textContent = '';
      ownChallengeBtn.hidden = true;
      statusMsgEl.textContent = '正在讀取線上榮譽榜…';
      statusMsgEl.hidden = false;
      rankListEl.replaceChildren();
      refreshBtn.disabled = true;
      return;
    }

    refreshBtn.disabled = false;

    if (state?.error) {
      ownScoreEl.textContent = '暫時無法讀取';
      ownMetaEl.textContent = state.error;
      ownChallengeBtn.hidden = true;
      statusMsgEl.textContent = state.error;
      statusMsgEl.hidden = false;
      rankListEl.replaceChildren();
      return;
    }

    const data = state?.data || { entries: [], own: null };
    if (data.own) {
      ownScoreEl.textContent = formatBoardScore(data.own, selectedBoard);
      ownMetaEl.textContent = `第 ${data.own.rank} 名 · ${data.own.nickname}（${formatBoardGap(data.own, selectedBoard)}）`;
      if (selectedBoard.challengeSupported && win?.location?.origin) {
        ownChallengeBtn.hidden = false;
        ownChallengeBtn.onclick = async () => {
          const href = buildParkChallengeHref(selectedBoard, data.own.nickname, data.own.score);
          const url = new URL(href, win.location.origin).toString();
          const msg = `${data.own.nickname} 在《四肢各有想法｜${selectedBoard.title}》創下 ${formatBoardScore(data.own, selectedBoard)}，向你下戰帖！\n${url}`;
          try {
            await win.navigator.clipboard.writeText(msg);
            showToast('已複製你的戰帖連結與邀戰文字，直接貼給朋友吧！');
          } catch {
            showToast(`戰帖連結：${url}`);
          }
        };
      } else {
        ownChallengeBtn.hidden = true;
      }
    } else {
      ownScoreEl.textContent = '尚無本機紀錄';
      ownMetaEl.textContent = deviceId
        ? '在此遊戲取得成績並手動上傳後，就會顯示你的名次。'
        : '本瀏覽器尚未建立此遊戲的上傳紀錄。';
      ownChallengeBtn.hidden = true;
    }

    rankListEl.replaceChildren();
    if (!data.entries.length) {
      statusMsgEl.textContent = '這個項目目前還沒有成績，快去搶下第一筆吧！';
      statusMsgEl.hidden = false;
      return;
    }

    statusMsgEl.hidden = true;
    data.entries.slice(0, 20).forEach((entry, idx) => {
      const rank = typeof entry.rank === 'number' && entry.rank > 0 ? entry.rank : idx + 1;
      const li = document.createElement('li');
      li.className = `lb-rank-row${entry.isMe ? ' is-me' : ''}`;

      const medal = document.createElement('span');
      medal.className = `lb-rank-medal${rank <= 3 ? ` rank-${rank}` : ''}`;
      medal.textContent = String(rank);

      const player = document.createElement('div');
      player.className = 'lb-rank-player';
      const nameEl = document.createElement('strong');
      nameEl.textContent = entry.nickname;
      if (entry.isMe) {
        const me = document.createElement('em');
        me.className = 'lb-me-tag';
        me.textContent = '我';
        nameEl.append(me);
      }
      player.append(nameEl);

      const right = document.createElement('div');
      right.className = 'lb-rank-right';
      const scoreEl = document.createElement('span');
      scoreEl.className = 'lb-rank-score';
      scoreEl.textContent = formatBoardScore(entry, selectedBoard);
      right.append(scoreEl);

      if (selectedBoard.challengeSupported) {
        const duel = document.createElement('a');
        duel.className = 'lb-duel-link';
        duel.href = buildParkChallengeHref(selectedBoard, entry.nickname, entry.score);
        duel.textContent = '向他下戰帖 ↗';
        right.append(duel);
      }

      li.append(medal, player, right);
      rankListEl.append(li);
    });
  };

  const fetchBoard = async (board, force = false) => {
    const cached = cache.get(board.key);
    if (!force && cached?.data && Date.now() - cached.fetchedAt < 60000) {
      return { data: cached.data };
    }
    const headers = deviceId ? { 'X-Leaderboard-Device': deviceId } : {};
    const res = await fetcher(buildLeaderboardApiUrl(board), {
      headers,
      cache: 'no-store',
    });
    if (res.status === 503) {
      const msg = '目前網址未啟用線上排行榜連線（預覽測試環境會鎖定正式網域，正式上線後即可讀取 D1 排行榜）。';
      cache.set(board.key, { error: '預覽環境未連線', fetchedAt: Date.now() });
      return { error: msg };
    }
    if (!res.ok) {
      const msg = '排行榜暫時無法讀取，請稍後再試。';
      cache.set(board.key, { error: '暫時無法讀取', fetchedAt: Date.now() });
      return { error: msg };
    }
    const raw = await res.json();
    const entries = Array.isArray(raw?.entries) ? raw.entries.slice(0, 20) : [];
    const data = { entries, own: raw?.own ?? null };
    cache.set(board.key, { data, fetchedAt: Date.now() });
    return { data };
  };

  const selectBoard = async (board, force = false) => {
    selectedBoard = board;
    if (win?.history?.replaceState && win.location) {
      const nextUrl = new URL(win.location.href);
      nextUrl.searchParams.set('game', board.game);
      if (board.mode) nextUrl.searchParams.set('mode', board.mode);
      else nextUrl.searchParams.delete('mode');
      win.history.replaceState(null, '', nextUrl.toString());
    }
    renderSidebar();
    const cached = cache.get(board.key);
    if (!force && cached?.data && Date.now() - cached.fetchedAt < 60000) {
      renderDetail({ data: cached.data });
      return;
    }
    const seq = ++requestSeq;
    renderDetail({ loading: true });
    try {
      const result = await fetchBoard(board, force);
      if (seq !== requestSeq || selectedBoard.key !== board.key) return;
      renderSidebar();
      renderDetail(result);
    } catch {
      if (seq !== requestSeq || selectedBoard.key !== board.key) return;
      renderDetail({ error: '網路連線失敗，請檢查連線後再試。' });
    }
  };

  const scanCategory = async (boardsToScan) => {
    if (scanning || !boardsToScan.length) return;
    scanning = true;
    if (scanBtn) scanBtn.disabled = true;
    let done = 0;
    const total = boardsToScan.length;
    if (scanStatusEl) scanStatusEl.textContent = `正在讀取本分類榜單（0 / ${total}）…`;

    for (let i = 0; i < total; i += 3) {
      const batch = boardsToScan.slice(i, i + 3);
      await Promise.all(
        batch.map(async (b) => {
          try {
            await fetchBoard(b, false);
          } catch {
            // Keep individual failures silent during batch scan
          } finally {
            done += 1;
          }
        }),
      );
      if (scanStatusEl) scanStatusEl.textContent = `已讀取 ${done} / ${total} 個榜單`;
      renderSidebar();
    }

    scanning = false;
    if (scanBtn) scanBtn.disabled = false;
    renderDetail(cache.get(selectedBoard.key) || { data: { entries: [], own: null } });
  };

  for (const tab of tabButtons) {
    tab.addEventListener('click', () => {
      activeCategory = tab.dataset.cat || 'all';
      for (const t of tabButtons) {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      }
      const list = visibleBoards();
      if (list.length && !list.some((b) => b.key === selectedBoard.key)) {
        void selectBoard(list[0]);
      } else {
        renderSidebar();
      }
    });
  }

  refreshBtn?.addEventListener('click', () => {
    void selectBoard(selectedBoard, true);
  });

  scanBtn?.addEventListener('click', () => {
    void scanCategory(visibleBoards());
  });

  renderSidebar();
  void selectBoard(selectedBoard).then(() => {
    // Light preload for the 3 Park boards only (3 lightweight requests)
    if (activeCategory === 'all' || activeCategory === 'park') {
      const others = BOARD_CATALOG.filter((b) => b.category === 'park' && b.key !== selectedBoard.key);
      void Promise.all(others.map((b) => fetchBoard(b, false).catch(() => null))).then(() => {
        renderSidebar();
      });
    }
  });

  return { selectBoard };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.getElementById('lb-board-list')) {
  mountLeaderboardHub();
}
