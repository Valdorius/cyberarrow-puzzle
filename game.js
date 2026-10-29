// Симулятор Просмотра Рекламы — Основной игровой движок и логика
document.addEventListener('DOMContentLoaded', () => {
  // DOM Элементы HUD
  const elWeek = document.getElementById('val-week');
  const elDay = document.getElementById('val-day');
  const elMoney = document.getElementById('val-money');
  const elRentDays = document.getElementById('val-rent-days');
  const elRentAmount = document.getElementById('val-rent-amount');
  const elIncomeToast = document.getElementById('income-toast');

  // Кнопки действий
  const btnWatchTv = document.getElementById('btn-watch-tv');
  const btnOpenStore = document.getElementById('btn-open-store');
  const btnTakeShift = document.getElementById('btn-take-shift');
  const btnNextDay = document.getElementById('btn-next-day');
  const btnSound = document.getElementById('btn-sound');
  const btnLang = document.getElementById('btn-lang');

  const shiftBadge = document.getElementById('shift-counter-badge');
  const shiftCooldownBar = document.getElementById('shift-cooldown-bar');
  const cooldownTimerText = document.getElementById('cooldown-timer');

  // Модальные окна
  const modalTv = document.getElementById('modal-tv');
  const modalStore = document.getElementById('modal-store');
  const modalEvent = document.getElementById('modal-event');
  const modalRent = document.getElementById('modal-rent');
  const modalEnding = document.getElementById('modal-ending');

  // Содержимое ТВ
  const adCategory = document.getElementById('ad-category');
  const adIcon = document.getElementById('ad-icon');
  const adTitle = document.getElementById('ad-title');
  const adSlogan = document.getElementById('ad-slogan');
  const adChoicesContainer = document.getElementById('ad-choices-container');
  const adCrossMinigame = document.getElementById('ad-cross-minigame');
  const runawayCrossBtn = document.getElementById('runaway-cross');
  const crossField = document.getElementById('cross-field');
  const crossTimerSpan = document.getElementById('cross-timer');

  // Содержимое События
  const eventIcon = document.getElementById('event-icon');
  const eventTitle = document.getElementById('event-title');
  const eventDesc = document.getElementById('event-desc');
  const eventChoices = document.getElementById('event-choices');

  // Содержимое Аренды
  const rentBillSum = document.getElementById('rent-bill-sum');
  const rentBillBalance = document.getElementById('rent-bill-balance');
  const rentActions = document.getElementById('rent-actions');

  // Содержимое Финала
  const endingIcon = document.getElementById('ending-icon');
  const endingTitle = document.getElementById('ending-title');
  const endingText = document.getElementById('ending-text');
  const endWeeks = document.getElementById('end-weeks');
  const endFakeAds = document.getElementById('end-fake-ads');
  const endRealAds = document.getElementById('end-real-ads');
  const btnRestartGame = document.getElementById('btn-restart-game');

  // Элементы комнаты (SVG)
  const bedDefault = document.getElementById('bed-default');
  const bedUpgraded = document.getElementById('bed-upgraded');
  const deskContent = document.getElementById('desk-content');
  const pcContent = document.getElementById('pc-content');
  const windowContent = document.getElementById('window-content');
  const windowCrack = document.getElementById('window-crack');

  // Игровое состояние
  const STATE_KEY = 'ad_sim_save_v1';
  let state = {
    money: 800,
    week: 1,
    day: 1,
    rentAmount: 3000,
    adBonus: 0,
    shiftsToday: 0,
    lastShiftDay: 1,
    lastShiftTimestamp: 0,
    realAdsWatchedTotal: 0,
    fakeAdsWatchedTotal: 0,
    furniture: {
      desk: false,
      bed: false,
      window: false,
      pc: false
    },
    storyFlags: {
      landlordRaised: false,
      deskBonus: false,
      windowSeen: false,
      pcUnlocked: false
    }
  };

  // Playgama Bridge Wrapper
  const PG = {
    initialized: false,
    async init() {
      if (typeof window.bridge === 'undefined') {
        console.log('[Playgama] Standalone mode (Bridge not found)');
        return;
      }
      try {
        await window.bridge.initialize();
        this.initialized = true;
        console.log('[Playgama] Bridge initialized!');
        if (window.bridge.platform && window.bridge.platform.sendMessage) {
          window.bridge.platform.sendMessage('game_ready');
        }

        // Автопауза звука при открытии рекламы
        if (window.bridge.platform && window.bridge.platform.on) {
          window.bridge.platform.on('pause_state_changed', (isPaused) => {
            if (window.sound) window.sound.enabled = !isPaused;
          });
        }

        // Слушатель Rewarded
        if (window.bridge.advertisement && window.bridge.advertisement.on) {
          window.bridge.advertisement.on('rewarded_state_changed', (status) => {
            if (status === 'rewarded' && window._onShiftRewarded) {
              window._onShiftRewarded();
              window._onShiftRewarded = null;
            }
          });
        }

        // Загрузка из облака
        if (window.bridge.storage) {
          const cloudData = await window.bridge.storage.get(['ad_sim_save']);
          if (cloudData && cloudData.ad_sim_save) {
            try {
              const parsed = JSON.parse(cloudData.ad_sim_save);
              if (parsed && parsed.week) {
                state = parsed;
                updateAllUI();
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('[Playgama] Bridge init error:', err);
      }
    },

    showShiftRewarded(callback) {
      if (this.initialized && window.bridge && window.bridge.advertisement) {
        window._onShiftRewarded = callback;
        try {
          window.bridge.advertisement.showRewarded('take_shift');
        } catch (e) {
          console.warn('[Playgama] showRewarded error, fallback:', e);
          if (callback) callback();
        }
      } else {
        // Fallback для локального тестирования
        if (callback) callback();
      }
    },

    save() {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      if (this.initialized && window.bridge && window.bridge.storage) {
        try {
          window.bridge.storage.set({ 'ad_sim_save': JSON.stringify(state) });
        } catch (e) {}
      }
    }
  };

  // Загрузка локального сохранения
  function loadLocalState() {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      try {
        const loaded = JSON.parse(raw);
        if (loaded && loaded.week) {
          state = loaded;
        }
      } catch (e) {}
    }
  }

  // Обновление интерфейса
  function updateAllUI() {
    elWeek.textContent = state.week;
    elDay.textContent = state.day;
    elMoney.textContent = state.money.toLocaleString('ru-RU');
    elRentAmount.textContent = state.rentAmount.toLocaleString('ru-RU');

    const daysLeft = 8 - state.day;
    elRentDays.textContent = `${daysLeft} дн.`;
    if (daysLeft <= 2) {
      elRentDays.style.color = 'var(--accent-red)';
    } else {
      elRentDays.style.color = 'var(--accent-amber)';
    }

    // Смены
    shiftBadge.textContent = `${3 - state.shiftsToday}/3`;
    checkShiftCooldown();

    // Обновление комнаты
    updateRoomVisuals();
  }

  function updateRoomVisuals() {
    if (state.furniture.bed) {
      bedDefault.style.display = 'none';
      bedUpgraded.style.display = 'block';
    } else {
      bedDefault.style.display = 'block';
      bedUpgraded.style.display = 'none';
    }

    if (state.furniture.desk) {
      deskContent.style.display = 'block';
    } else {
      deskContent.style.display = 'none';
    }

    if (state.furniture.window) {
      windowCrack.style.display = 'none';
      windowContent.style.display = 'block';
    } else {
      windowCrack.style.display = 'block';
      windowContent.style.display = 'none';
    }

    if (state.furniture.pc) {
      pcContent.style.display = 'block';
    } else {
      pcContent.style.display = 'none';
    }
  }

  function showIncomeToast(amount) {
    elIncomeToast.textContent = `+${amount} ₽`;
    elIncomeToast.classList.remove('hidden');
    setTimeout(() => {
      elIncomeToast.classList.add('hidden');
    }, 850);
  }

  // ================= ФЕЙКОВАЯ ТВ-РЕКЛАМА =================
  let currentAd = null;
  let crossTimerInterval = null;
  let crossJumps = 0;

  function watchTvAd() {
    window.sound.playTvOn();

    // Выбираем случайную рекламу
    const availableAds = window.GAME_DATA.FAKE_ADS.filter(ad => {
      if (ad.requirePC && !state.furniture.pc) return false;
      return true;
    });

    currentAd = availableAds[Math.floor(Math.random() * availableAds.length)];

    adCategory.textContent = currentAd.category.toUpperCase();
    adIcon.textContent = currentAd.icon;
    adTitle.textContent = currentAd.title;
    adSlogan.textContent = currentAd.slogan;

    adChoicesContainer.innerHTML = '';
    adChoicesContainer.classList.remove('hidden');
    adCrossMinigame.classList.add('hidden');

    if (currentAd.type === 'choice') {
      currentAd.choices.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'ad-choice-btn';
        const finalReward = ch.reward + state.adBonus;
        btn.textContent = `${ch.text} (+${finalReward} ₽)`;

        btn.onclick = () => {
          grantAdReward(finalReward, ch.comment);
        };
        adChoicesContainer.appendChild(btn);
      });
    } else if (currentAd.type === 'minigame_cross') {
      adChoicesContainer.classList.add('hidden');
      adCrossMinigame.classList.remove('hidden');
      startCrossMinigame();
    }

    modalTv.classList.remove('hidden');
  }

  function grantAdReward(amount, comment) {
    state.money += amount;
    state.fakeAdsWatchedTotal++;
    window.sound.playCash();
    showIncomeToast(amount);
    updateAllUI();
    PG.save();

    setTimeout(() => {
      modalTv.classList.add('hidden');
    }, 300);
  }

  // Мини-игра с убегающим крестиком
  function startCrossMinigame() {
    crossJumps = 0;
    let timeLeft = 5;
    crossTimerSpan.textContent = timeLeft;

    resetCrossPos();

    clearInterval(crossTimerInterval);
    crossTimerInterval = setInterval(() => {
      timeLeft--;
      crossTimerSpan.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(crossTimerInterval);
        // Не успел — базовый доход
        grantAdReward(currentAd.reward, "Крестик ускользнул, но базовый просмотр зачтен.");
      }
    }, 1000);
  }

  function resetCrossPos() {
    const maxX = crossField.clientWidth - 70;
    const maxY = crossField.clientHeight - 40;
    const rx = Math.max(10, Math.floor(Math.random() * maxX));
    const ry = Math.max(10, Math.floor(Math.random() * maxY));
    runawayCrossBtn.style.left = `${rx}px`;
    runawayCrossBtn.style.top = `${ry}px`;
  }

  // При наведении / тапе крестик прыгает первые 3 раза
  runawayCrossBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    crossJumps++;
    if (crossJumps <= 3) {
      window.sound.playMiss();
      resetCrossPos();
    } else {
      // Поймал!
      clearInterval(crossTimerInterval);
      const total = currentAd.reward + currentAd.bonus + state.adBonus;
      grantAdReward(total, "Великолепная реакция! Вы перехитрили рекламный алгоритм!");
    }
  });

  // ================= СМЕНА (PLAYGAMA REWARDED VIDEO) =================
  const SHIFT_COOLDOWN_MS = 10 * 60 * 1000; // 10 минут

  function checkShiftCooldown() {
    const now = Date.now();
    const elapsed = now - state.lastShiftTimestamp;

    if (state.shiftsToday >= 3) {
      btnTakeShift.disabled = true;
      shiftCooldownBar.classList.remove('hidden');
      cooldownTimerText.textContent = "Лимит смен на сегодня исчерпан";
      return;
    }

    if (elapsed < SHIFT_COOLDOWN_MS) {
      btnTakeShift.disabled = true;
      shiftCooldownBar.classList.remove('hidden');
      const remainSec = Math.ceil((SHIFT_COOLDOWN_MS - elapsed) / 1000);
      const mins = Math.floor(remainSec / 60);
      const secs = remainSec % 60;
      cooldownTimerText.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    } else {
      btnTakeShift.disabled = false;
      shiftCooldownBar.classList.add('hidden');
    }
  }

  setInterval(checkShiftCooldown, 1000);

  btnTakeShift.addEventListener('click', () => {
    const now = Date.now();
    if (now - state.lastShiftTimestamp < SHIFT_COOLDOWN_MS) {
      window.sound.playWarning();
      return;
    }
    if (state.shiftsToday >= 3) {
      window.sound.playWarning();
      return;
    }

    window.sound.playClick();

    // Запуск реальной рекламы Playgama Rewarded Video
    PG.showShiftRewarded(() => {
      state.money += 1500;
      state.realAdsWatchedTotal++;
      state.shiftsToday++;
      state.lastShiftTimestamp = Date.now();

      window.sound.playCash();
      showIncomeToast(1500);
      updateAllUI();
      PG.save();
    });
  });

  // ================= СПАТЬ / СЛЕДУЮЩИЙ ДЕНЬ =================
  btnNextDay.addEventListener('click', () => {
    window.sound.playClick();
    advanceDay();
  });

  function advanceDay() {
    state.day++;

    // Сброс смен в новый день
    state.shiftsToday = 0;

    // Проверка дня аренды (день 8 = конец 7-го дня)
    if (state.day > 7) {
      showRentModal();
      return;
    }

    // Проверка случайного события дня (50% шанс)
    triggerDailyEvent();
    updateAllUI();
    PG.save();
  }

  function triggerDailyEvent() {
    const validEvents = window.GAME_DATA.DAILY_EVENTS.filter(ev => {
      if (ev.condition && !ev.condition(state)) return false;
      if (ev.once && ev.id === 'landlord_raise' && state.storyFlags.landlordRaised) return false;
      if (ev.once && ev.id === 'freelance_orders' && state.storyFlags.deskBonus) return false;
      if (ev.once && ev.id === 'window_world' && state.storyFlags.windowSeen) return false;
      if (ev.once && ev.id === 'pc_disconnect_option' && state.storyFlags.pcUnlocked) return false;
      return true;
    });

    if (validEvents.length > 0 && Math.random() < 0.6) {
      const ev = validEvents[Math.floor(Math.random() * validEvents.length)];
      if (ev.action) ev.action(state);

      window.sound.playWarning();
      eventIcon.textContent = ev.icon;
      eventTitle.textContent = ev.title;
      eventDesc.textContent = ev.text;

      eventChoices.innerHTML = '';
      ev.choices.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'ad-choice-btn';
        btn.textContent = ch.text;
        btn.onclick = () => {
          if (ch.cost) {
            state.money = Math.max(0, state.money - ch.cost);
          }
          modalEvent.classList.add('hidden');
          updateAllUI();
          PG.save();
        };
        eventChoices.appendChild(btn);
      });

      modalEvent.classList.remove('hidden');
    }
  }

  // ================= АРЕНДА =================
  function showRentModal() {
    window.sound.playWarning();
    rentBillSum.textContent = `${state.rentAmount.toLocaleString('ru-RU')} ₽`;
    rentBillBalance.textContent = `${state.money.toLocaleString('ru-RU')} ₽`;

    rentActions.innerHTML = '';
    const btnPay = document.createElement('button');
    btnPay.className = 'primary-btn glow-btn';

    if (state.money >= state.rentAmount) {
      btnPay.textContent = `ОПЛАТИТЬ АРЕНДУ (-${state.rentAmount} ₽)`;
      btnPay.onclick = () => {
        state.money -= state.rentAmount;
        state.week++;
        state.day = 1;
        window.sound.playUpgrade();
        modalRent.classList.add('hidden');
        updateAllUI();
        PG.save();
      };
    } else {
      btnPay.textContent = 'ДЕНЕГ НЕ ХВАТАЕТ! ПОСМОТРЕТЬ РЕКЛАМУ';
      btnPay.style.background = 'var(--accent-red)';
      btnPay.onclick = () => {
        modalRent.classList.add('hidden');
        watchTvAd();
      };
    }

    rentActions.appendChild(btnPay);
    modalRent.classList.remove('hidden');
  }

  // ================= МАГАЗИН =================
  btnOpenStore.addEventListener('click', () => {
    window.sound.playClick();
    renderStore();
    modalStore.classList.remove('hidden');
  });

  function renderStore() {
    const list = document.getElementById('store-items-list');
    list.innerHTML = '';

    window.GAME_DATA.STORE_ITEMS.forEach(item => {
      const card = document.createElement('div');
      card.className = 'store-item-card';

      const isBought = item.id === 'apartment_deposit' ? false : state.furniture[item.id];

      card.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-info">
          <div class="item-title">${item.name} — ${item.price.toLocaleString('ru-RU')} ₽</div>
          <div class="item-desc">${item.desc}</div>
        </div>
      `;

      if (isBought) {
        const tag = document.createElement('span');
        tag.className = 'item-bought-tag';
        tag.textContent = '✓ В комнате';
        card.appendChild(tag);
      } else {
        const buyBtn = document.createElement('button');
        buyBtn.className = 'btn-buy-item';
        buyBtn.textContent = 'Купить';
        buyBtn.disabled = state.money < item.price;

        buyBtn.onclick = () => {
          if (state.money >= item.price) {
            state.money -= item.price;
            if (item.id === 'apartment_deposit') {
              // Концовка 1 или 3!
              modalStore.classList.add('hidden');
              triggerEnding(state.realAdsWatchedTotal === 0 ? 'reject' : 'move_out');
              return;
            }

            state.furniture[item.id] = true;
            window.sound.playUpgrade();
            renderStore();
            updateAllUI();
            PG.save();

            // Проверка концовки 2: Дом из рекламы (все куплено + ПК)
            if (state.furniture.desk && state.furniture.bed && state.furniture.window && state.furniture.pc) {
              setTimeout(() => {
                triggerEnding('ad_house');
              }, 1200);
            }
          }
        };
        card.appendChild(buyBtn);
      }

      list.appendChild(card);
    });
  }

  // Закрытие модалок
  document.querySelectorAll('.btn-close-dialog').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close');
      document.getElementById(targetId).classList.add('hidden');
    });
  });

  // ================= КОНЦОВКИ ИГРЫ =================
  function triggerEnding(type) {
    window.sound.playUpgrade();
    endWeeks.textContent = state.week;
    endFakeAds.textContent = state.fakeAdsWatchedTotal;
    endRealAds.textContent = state.realAdsWatchedTotal;

    if (type === 'move_out') {
      endingIcon.textContent = '🔑';
      endingTitle.textContent = 'КОНЦОВКА: ВЫЕЗД';
      endingText.textContent = 'Вы накопили на залог собственной квартиры! Выключаете телевизор, собираете немногочисленные вещи и выходите наружу на свежий ночной воздух. Вы свободны.';
    } else if (type === 'ad_house') {
      endingIcon.textContent = '📺';
      endingTitle.textContent = 'КОНЦОВКА: ДОМ ИЗ РЕКЛАМЫ';
      endingText.textContent = 'Комната обставлена всем необходимым. Экран телевизора и компьютера мерцает теплым неоновым светом. Вы поняли, что реклама — это и есть ваша жизнь. Вы остаетесь здесь навсегда в бесконечном комфортном сне.';
    } else if (type === 'reject') {
      endingIcon.textContent = '🕊️';
      endingTitle.textContent = 'КОНЦОВКА: АБСОЛЮТНЫЙ ОТКАЗ';
      endingText.textContent = 'Специальное достижение! Вы не посмотрели ни одной реальной рекламы, победив систему исключительно терпением и иронией. Вы очистили свой разум.';
    }

    modalEnding.classList.remove('hidden');
  }

  btnRestartGame.addEventListener('click', () => {
    localStorage.removeItem(STATE_KEY);
    location.reload();
  });

  // Кнопки тулбара
  btnWatchTv.addEventListener('click', () => {
    watchTvAd();
  });

  btnSound.addEventListener('click', () => {
    const on = window.sound.toggle();
    btnSound.textContent = on ? '🔊' : '🔇';
  });

  btnLang.addEventListener('click', () => {
    window.sound.playClick();
    alert('Симулятор поддерживает русский язык (оригинал) и локализацию для каталога Playgama.');
  });

  // Старт
  loadLocalState();
  updateAllUI();
  PG.init();
});
