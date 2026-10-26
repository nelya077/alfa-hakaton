
/* Azimut: интерфейс подключён к FastAPI.
   Клиенты и инсайты загружаются с сервера, роли и оформление — из data.js. */
(function () {
  'use strict';

  var D = window.DEMO;
  var app = document.getElementById('app');

  var state = {
    client: 'U_9250',
    role: D.roles[0],
    chat: {}
  };

  var clients = [];
  var feed = [];
  var currentCard = null;
  var feedFilter = 'all';
  var loading = false;
  var errorMessage = '';

  try {
    var saved = JSON.parse(sessionStorage.getItem('azimut-ui') || 'null');
    if (saved && saved.client) state.client = saved.client;
    if (saved && saved.role) state.role = saved.role;
  } catch (e) {}

  function save() {
    try {
      sessionStorage.setItem('azimut-ui', JSON.stringify({
        client: state.client,
        role: state.role
      }));
    } catch (e) {}
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#39;'
      }[c];
    });
  }

  async function api(url) {
    var response = await fetch(url);
    if (!response.ok) {
      throw new Error('Ошибка API: ' + response.status + ' (' + url + ')');
    }
    return response.json();
  }

  function client() {
    return clients.find(function (c) {
      return c.id === state.client;
    }) || clients[0] || {
      id: state.client,
      industry: 'Не указана',
      region: 'Не указан',
      productsCap: '',
      chips: []
    };
  }

  function tag(key) {
    var t = D.tags[key] || D.tags.model;
    return '<span class="ch ' + esc(t.cls) + '">' + esc(t.label) + '</span>';
  }

  function level(score) {
    if (score >= 0.65) return 'высокая';
    if (score >= 0.4) return 'средняя';
    return 'низкая';
  }

  function normalizeClient(c) {
    var products = Array.isArray(c.products) ? c.products : [];
    return {
      id: c.id,
      industry: c.industry || 'Не указана',
      region: c.region || 'Не указан',
      city: c.city || '',
      products: products.map(function (p) {
        return ({
          deposit: 'депозит',
          guarantee: 'гарантии',
          leasing: 'лизинг',
          loan: 'кредит',
          payroll: 'зарплатный проект',
          rko: 'расчётное обслуживание'
        })[p] || p;
      }).join(', ') || 'Нет данных о продуктах',
      productsCap: products.map(function (p) {
        return ({
          deposit: 'Депозит',
          guarantee: 'Гарантии',
          leasing: 'Лизинг',
          loan: 'Кредит',
          payroll: 'Зарплатный проект',
          rko: 'Расчётное обслуживание'
        })[p] || p;
      }).join(', ') || 'Нет данных',
      revenue: c.revenue_bucket || 'Нет данных',
      employees: c.employees_bucket || 'Нет данных',
      chips: [
        ['Отрасль: ' + (c.industry || 'не указана'), 'MAINOKVED_*'],
        ['Регион: ' + (c.region || 'не указан'), 'REGION'],
        ['Продукты: ' + (products.join(', ') || 'нет данных'), 'CL_PRODUCT_*'],
        ['Выручка: ' + (c.revenue_bucket || 'нет данных'), 'REVENUE_COMPANY'],
        ['Численность: ' + (c.employees_bucket || 'нет данных'), 'EMPLOYEES']
      ]
    };
  }

  function normalizeInsight(item) {
    return Object.assign({}, item, {
      level: level(Number(item.score) || 0),
      kinds: item.kinds || [],
      foot: item.foot || [],
      text: item.text || 'Описание значимости не предоставлено.',
      why: item.why || 'Почему это важно:',
      title: item.title || 'Без названия'
    });
  }

  async function loadClients() {
    var data = await api('/api/clients');
    clients = data.map(normalizeClient);

    if (!clients.some(function (c) { return c.id === state.client; })) {
      state.client = clients[0] ? clients[0].id : '';
    }
  }

  async function loadFeed() {
    if (!state.client) {
      feed = [];
      return;
    }

    var data = await api('/api/feed?client_id=' + encodeURIComponent(state.client));
    feed = (data.items || []).map(normalizeInsight);
  }

  function sidebar(active) {
    var items = [
      ['main', 'Главная', '#/'],
      ['acc', 'Счета и платежи', '#/stub'],
      ['cred', 'Кредиты и гарантии', '#/stub'],
      ['zp', 'Зарплатный проект', '#/stub'],
      ['ins', 'Инсайты', '#/feed'],
      ['doc', 'Документы', '#/stub']
    ];

    return '<nav class="sd" aria-label="Главное меню">' +
      '<div class="lg"><b>А</b> Альфа-Бизнес</div>' +
      items.map(function (item) {
        var on = item[0] === active;
        var isInsights = item[0] === 'ins';
        return '<a class="nv' + (on ? ' on' : '') + '"' +
          (on ? ' aria-current="page"' : '') +
          (isInsights && !on ? ' style="color:#A81D14;font-weight:600"' : '') +
          ' href="' + item[2] + '">' + item[1] +
          (isInsights ? '<span class="bg">' + feed.length + '</span>' : '') +
          '</a>';
      }).join('') + '</nav>';
  }

  function shell(active, inner) {
    app.innerHTML = sidebar(active) + '<main class="mn" id="main">' + inner + '</main>';
  }

  function statusMessage() {
    if (loading) return '<section class="cd mu">Загружаем данные с сервера…</section>';
    if (errorMessage) {
      return '<section class="cd"><b>Не удалось загрузить данные</b><p>' +
        esc(errorMessage) + '</p><button class="bt" id="retry">Повторить</button></section>';
    }
    return '';
  }

  function bindRetry() {
    var button = document.getElementById('retry');
    if (button) button.onclick = function () { refreshData(); };
  }

  async function refreshData() {
    loading = true;
    errorMessage = '';
    route();

    try {
      await loadClients();
      await loadFeed();
    } catch (e) {
      errorMessage = e.message || 'Неизвестная ошибка';
    }

    loading = false;
    route();
  }

  function viewMain() {
    var c = client();
    shell('main',
      '<header class="hd"><h1>Главная</h1>' +
      '<a class="ch cb" href="#/feed" style="font-size:15px;padding:8px 14px">Инсайты · ' +
      feed.length + '</a>' +
      '<a class="bt g" href="#/select">' + esc(c.id) + ' · Сменить</a></header>' +
      statusMessage() +
      '<section class="cd hero"><span class="sm" style="color:#F5B5B0;font-weight:600">Инсайты</span>' +
      '<h2 style="font-size:28px;max-width:720px">Что происходит на рынке и что это значит именно для вашей компании</h2>' +
      '<div class="stack" style="max-width:760px">' +
      feed.slice(0, 5).map(function (f) {
        return '<a class="row" href="#/card/' + encodeURIComponent(f.id) + '">' +
          '<span>' + esc(f.title) + '</span><span class="sm">Значимость: ' +
          esc(f.level) + '</span></a>';
      }).join('') +
      (feed.length ? '' : '<p class="mu">Для выбранного клиента пока нет подготовленных инсайтов.</p>') +
      '</div><div><a class="bt" href="#/feed">Открыть инсайты</a></div></section>' +
      '<section class="cols">' +
      [['Счета', '[Данные счетов не подключены]'],
       ['Платежи', '[Данные платежей не подключены]'],
       ['Кредиты и лизинг', '[Данные договоров не подключены]']].map(function (b) {
        return '<div class="cd"><h3 style="font-size:18px">' + b[0] +
          '</h3><p class="mu" style="margin-top:8px">' + b[1] + '</p></div>';
      }).join('') + '</section>');
    bindRetry();
  }

  function viewSelect() {
    var pick = { client: state.client, role: state.role };

    function draw() {
      var c = clients.find(function (x) { return x.id === pick.client; }) || client();

      shell('ins',
        '<h1 style="font-size:28px">Инсайты · выбор клиента и роли</h1>' +
        '<p class="notice">Выбор клиента и роли для демонстрации интерфейса.</p>' +
        statusMessage() +
        '<section class="cd cols" style="gap:32px"><div class="stack">' +
        '<h2 style="font-size:20px">Клиент</h2>' +
        clients.map(function (x) {
          var on = x.id === pick.client;
          return '<button class="op' + (on ? ' sel' : '') + '" data-c="' +
            esc(x.id) + '" aria-pressed="' + on + '"><b>' + esc(x.id) +
            '</b><br><span class="mu sm">' + esc(x.industry) + ' · ' +
            esc(x.region) + ' · ' + esc(x.products) + '</span></button>';
        }).join('') +
        '</div><div class="stack"><h2 style="font-size:20px">Роль пользователя</h2>' +
        D.roles.map(function (r) {
          var on = r === pick.role;
          return '<button class="op' + (on ? ' sel' : '') + '" data-r="' +
            esc(r) + '" aria-pressed="' + on + '">' + esc(r) + '</button>';
        }).join('') + '</div></section>' +
        '<section class="cd stack"><h2 style="font-size:20px">Профиль клиента</h2>' +
        '<p class="mu sm">' + esc(c.industry) + ' · ' + esc(c.region) +
        ' · Выручка: ' + esc(c.revenue) +
        ' · Численность: ' + esc(c.employees) + '</p>' +
        '<div class="chips">' + c.chips.map(function (h) {
          return '<span class="ch cb">' + esc(h[0]) + ' · ' + esc(h[1]) + '</span>';
        }).join('') + '</div>' +
        '<div style="display:flex;gap:12px;margin-top:8px">' +
        '<button class="bt" id="ok">Показать инсайты</button>' +
        '<button class="bt g" id="no">Отмена</button></div></section>');

      bindRetry();

      app.querySelectorAll('[data-c]').forEach(function (b) {
        b.onclick = function () { pick.client = b.dataset.c; draw(); };
      });

      app.querySelectorAll('[data-r]').forEach(function (b) {
        b.onclick = function () { pick.role = b.dataset.r; draw(); };
      });

      document.getElementById('ok').onclick = async function () {
        state.client = pick.client;
        state.role = pick.role;
        state.chat = {};
        save();
        await refreshData();
        location.hash = '#/feed';
      };

      document.getElementById('no').onclick = function () {
        history.length > 1 ? history.back() : (location.hash = '#/');
      };
    }

    draw();
  }

  function viewFeed() {
    var c = client();
    var role = state.role.charAt(0).toLowerCase() + state.role.slice(1);
    var items = feed.filter(function (f) {
      return feedFilter === 'all' || f.kinds.indexOf(feedFilter) > -1;
    });

    shell('ins',
      '<header class="hd"><h1>Инсайты</h1>' +
      '<span class="ch cc" style="font-size:14px">Клиент: ' + esc(c.id) + '</span>' +
      '<span class="ch cm" style="font-size:14px">Роль: ' + esc(role) + '</span>' +
      '<a class="bt g" href="#/select">Сменить</a></header>' +
      statusMessage() +
      '<div class="chips" role="group" aria-label="Фильтры">' +
      D.filters.map(function (x) {
        var on = x[0] === feedFilter;
        return '<button class="bt' + (on ? '' : ' g') +
          '" data-f="' + x[0] + '" aria-pressed="' + on + '">' +
          x[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="detail"><section class="stack" style="flex:1;gap:16px;min-width:0" aria-label="Лента карточек">' +
      (items.length ? items.map(function (f) {
        return '<article class="cd stack"><div class="chips" style="align-items:center">' +
          '<span class="ch cb">Значимость: ' + esc(f.level) + '</span>' +
          '<span class="ch ' + esc(f.kindCls || 'cf') + '">' + esc(f.kind) + '</span>' +
          '<span class="mu sm" style="margin-left:auto">' + esc(f.src) +
          (f.date ? ' · ' + esc(f.date) : '') + '</span></div>' +
          '<h2 style="font-size:20px">' + esc(f.title) + '</h2>' +
          '<p><b>' + esc(f.why) + '</b> ' + esc(f.text) + '</p>' +
          '<div class="chips" style="align-items:center">' +
          f.foot.map(function (t) {
            return '<span class="ch ' + esc(t[0]) + '">' + esc(t[1]) + '</span>';
          }).join('') +
          '<a class="bt" style="margin-left:auto" href="#/card/' +
          encodeURIComponent(f.id) + '">Разобрать</a></div></article>';
      }).join('') : '<p class="cd mu">' +
        (loading ? 'Загружаем ленту…' : 'Для этого клиента по выбранному фильтру событий нет.') +
        '</p>') + '</section>' +
      '<aside class="cd stack" style="width:300px;flex:none" aria-label="Профиль компании">' +
      '<h3 style="font-size:18px">Профиль компании</h3>' +
      '<dl class="stack sm" style="margin:0">' +
      [['Отрасль', c.industry, 'MAINOKVED_*'],
       ['Регион регистрации', c.region, 'REGION'],
       ['Продукты банка', c.productsCap, 'CL_PRODUCT_*'],
       ['Выручка', c.revenue, 'REVENUE_COMPANY'],
       ['Численность', c.employees, 'EMPLOYEES']].map(function (r) {
        return '<div><dt class="mu">' + esc(r[0]) + '</dt><dd style="margin:0"><b>' +
          esc(r[1]) + '</b> <span class="mu">' + esc(r[2]) +
          '</span></dd></div>';
      }).join('') +
      '</dl><p class="mu sm">Лента получена из подготовленных инсайтов сервера.</p></aside></div>');

    bindRetry();

    app.querySelectorAll('[data-f]').forEach(function (b) {
      b.onclick = function () {
        feedFilter = b.dataset.f;
        viewFeed();
      };
    });
  }

  async function viewCard(id) {
    shell('ins', '<a class="back" href="#/feed">← К ленте инсайтов</a>' +
      '<section class="cd">Загружаем карточку…</section>');

    try {
      var f = normalizeInsight(await api('/api/card/' + encodeURIComponent(id)));
      currentCard = f;

      var interpretation = f.interpretation || {};
      var consequences = interpretation.possible_consequences || [];
      var actions = interpretation.suggested_actions || [];
      var sourceList = (f.sources || []).map(function (s) {
        return '<li>' + esc(s.title || s.source_type || s.source_id || 'Источник') +
          (s.url_or_doc ? ' — <a href="' + esc(s.url_or_doc) +
          '" target="_blank" rel="noopener noreferrer">Открыть источник</a>' : '') +
          '</li>';
      }).join('');

      var body = '<section class="sc"><h3>1. Что произошло</h3><p>' +
        esc((f.raw && f.raw.event && f.raw.event.summary_facts || []).join(' ' ) ||
          f.text) + '</p></section>' +
        '<section class="sc"><h3>2. Почему это важно для компании</h3><p>' +
        esc(interpretation.why_relevant || f.text || 'Нет описания.') +
        '</p></section>' +
        '<section class="sc"><h3>3. Возможные последствия</h3>' +
        (consequences.length ? '<ul>' + consequences.map(function (item) {
          return '<li><b>' + esc(item.type || 'Вывод') + '.</b> ' +
            esc(item.description || item.text || JSON.stringify(item)) + '</li>';
        }).join('') + '</ul>' : '<p class="mu">Отдельные последствия не указаны.</p>') +
        '</section>' +
        '<section class="sc"><h3>4. Что можно сделать</h3>' +
        (actions.length ? '<ul>' + actions.map(function (item) {
          return '<li>' + esc(typeof item === 'string' ? item :
            (item.description || item.text || JSON.stringify(item))) + '</li>';
        }).join('') + '</ul>' : '<p class="mu">Рекомендации не указаны.</p>') +
        '</section>' +
        '<section class="sc"><h3>5. Позиция банка</h3><p>' +
        esc(interpretation.bank_view || 'Аналитики банка по данной теме нет.') +
        '</p></section>' +
        '<section class="sc"><h3>6. Источники</h3><ul>' +
        (sourceList || '<li>Источники не указаны.</li>') +
        '</ul></section>';

      shell('ins',
        '<a class="back" href="#/feed">← К ленте инсайтов</a>' +
        '<div class="detail"><article class="cd" style="flex:1;min-width:0">' +
        '<div class="chips"><span class="ch cb">Значимость: ' + esc(f.level) +
        '</span><span class="ch cf">' + esc(f.kind) + '</span><span class="mu sm">' +
        esc(f.src) + ' · ' + esc(f.date) + '</span></div>' +
        '<h1 style="font-size:28px;margin:12px 0 8px">' + esc(f.title) + '</h1>' +
        '<p class="mu sm">Для клиента ' + esc(f.client_id) +
        ' · роль: ' + esc(state.role) + '</p>' + body +
        '<details class="sc"><summary>Метаданные и проверка</summary><pre class="sm">' +
        esc(JSON.stringify({
          relevance: f.relevance,
          attribution: f.attribution,
          provenance: f.provenance
        }, null, 2)) + '</pre></details></article>' +
        '<aside class="cd dlg"><h2 style="font-size:20px">Задать вопрос</h2>' +
        '<p class="mu sm">Чат пока не подключён к API.</p></aside></div>');
    } catch (e) {
      shell('ins', '<a class="back" href="#/feed">← К ленте инсайтов</a>' +
        '<section class="cd"><h2>Не удалось загрузить карточку</h2><p>' +
        esc(e.message) + '</p></section>');
    }
  }

  function viewStub() {
    shell('main', '<h1 style="font-size:28px">Раздел не подключён</h1>' +
      '<p class="mu">Этот пункт меню пока служит заглушкой. ' +
      '<a class="back" href="#/">На главную</a></p>');
  }

  function route() {
    var h = location.hash || '#/';
    var match;

    if (h === '#/' || h === '') viewMain();
    else if (h === '#/select') viewSelect();
    else if (h === '#/feed') viewFeed();
    else if ((match = h.match(/^#\/card\/([\w-]+)$/))) viewCard(match[1]);
    else if (h === '#/stub') viewStub();
    else viewMain();

    var main = document.getElementById('main');
    if (main) main.setAttribute('tabindex', '-1');
  }

  window.addEventListener('hashchange', route);

  // Сначала показываем интерфейс, затем загружаем реальные данные.
  route();
  refreshData();
})();
