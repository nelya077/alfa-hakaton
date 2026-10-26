/* Интерфейс «Альфа-Бизнес · Инсайты». Без сборки, без зависимостей; маршруты через hash.
   Состояние (клиент, роль) живёт в памяти и дублируется в sessionStorage, если он доступен. */
(function(){
'use strict';
var D = window.DEMO, app = document.getElementById('app');
var state = {client: D.clients[0].id, role: D.roles[0], chat: {}};
try{ var s = JSON.parse(sessionStorage.getItem('azimut-ui')||'null'); if(s&&s.client&&s.role){state.client=s.client;state.role=s.role;} }catch(e){}
function save(){ try{ sessionStorage.setItem('azimut-ui', JSON.stringify({client:state.client,role:state.role})); }catch(e){} }

function esc(t){ return String(t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function client(){ return D.clients.filter(function(c){return c.id===state.client;})[0]; }
function tag(k){ var t=D.tags[k]; return '<span class="ch '+t.cls+'">'+t.label+'</span>'; }
/* Тексты демо-карточек написаны для конкретного клиента (card.forClient), а не для выбранного в демо. */
var cardClient0 = 'U_9250';
var cardClient = cardClient0;
function sub(t){ return esc(t).replace('{client}',esc(cardClient)); }

function sidebar(active){
  var items=[['main','Главная','#/'],['acc','Счета и платежи','#/stub'],['cred','Кредиты и гарантии','#/stub'],['zp','Зарплатный проект','#/stub'],['ins','Инсайты','#/feed'],['doc','Документы','#/stub']];
  return '<nav class="sd" aria-label="Главное меню"><div class="lg"><b>А</b> Альфа-Бизнес</div>'+items.map(function(i){
    var on=i[0]===active, ins=i[0]==='ins';
    return '<a class="nv'+(on?' on':'')+'"'+(on?' aria-current="page"':'')+(ins&&!on?' style="color:#A81D14;font-weight:600"':'')+' href="'+i[2]+'">'+i[1]+(ins?'<span class="bg">'+D.feed.length+'</span>':'')+'</a>';
  }).join('')+'</nav>';
}
function shell(active, inner){ app.innerHTML = sidebar(active)+'<main class="mn" id="main">'+inner+'</main>'; }

function viewMain(){
  var c=client();
  shell('main',
   '<header class="hd"><h1>Главная</h1><a class="ch cb" href="#/feed" style="font-size:15px;padding:8px 14px">Инсайты · '+D.feed.length+' новых</a>'+
   '<a class="bt g" href="#/select">ООО «[Название]» · '+esc(c.id)+' · Сменить</a></header>'+
   '<section class="cd hero"><span class="sm" style="color:#F5B5B0;font-weight:600">Новое · Инсайты</span>'+
   '<h2 style="font-size:28px;max-width:720px">Что происходит на рынке и что это значит именно для вашей компании</h2>'+
   '<div class="stack" style="max-width:760px">'+D.feed.map(function(f){return '<a class="row" href="#/card/'+f.id+'"><span>'+esc(f.title)+'</span><span class="sm">Значимость: '+f.level+'</span></a>';}).join('')+'</div>'+
   '<div><a class="bt" href="#/feed">Открыть инсайты</a></div></section>'+
   '<section class="cols">'+[['Счета','[Остаток по счетам]'],['Платежи','[Ближайшие платежи]'],['Кредиты и лизинг','[Условия договоров]']].map(function(b){return '<div class="cd"><h3 style="font-size:18px">'+b[0]+'</h3><p class="mu" style="margin-top:8px">'+b[1]+'</p></div>';}).join('')+'</section>'+
   '<p class="mu sm">Макет. Точка входа «Инсайты» постоянно доступна: пункт меню со счётчиком, кнопка в шапке и блок на главном экране.</p>');
}

function viewSelect(){
  var pick={client:state.client, role:state.role};
  function draw(){
    var c=D.clients.filter(function(x){return x.id===pick.client;})[0];
    shell('ins',
     '<h1 style="font-size:28px">Инсайты · выбор клиента и роли</h1>'+
     '<p class="notice"><b>Демо-режим.</b> В продукте клиент и роль определяются входом в интернет-банк. Здесь они выбираются вручную, чтобы показать, как меняется лента.</p>'+
     '<section class="cd cols" style="gap:32px"><div class="stack"><h2 style="font-size:20px">Клиент</h2>'+
     D.clients.map(function(x){var on=x.id===pick.client;return '<button class="op'+(on?' sel':'')+'" data-c="'+x.id+'" aria-pressed="'+on+'"><b>'+x.id+'</b><br><span class="mu sm">'+esc(x.industry)+' · '+esc(x.region)+' · '+esc(x.products)+'</span></button>';}).join('')+
     '</div><div class="stack"><h2 style="font-size:20px">Роль пользователя</h2>'+
     D.roles.map(function(r){var on=r===pick.role;return '<button class="op'+(on?' sel':'')+'" data-r="'+esc(r)+'" aria-pressed="'+on+'">'+esc(r)+'</button>';}).join('')+'</div></section>'+
     '<section class="cd stack"><h2 style="font-size:20px">Профиль, который получит система</h2>'+
     '<p class="mu sm">Каждый признак хранится со столбцом данных-источником и уверенностью.</p>'+
     '<div class="chips">'+c.chips.map(function(h){return '<span class="ch cb">'+esc(h[0])+' · '+h[1]+'</span>';}).join('')+'</div>'+
     '<div style="display:flex;gap:12px;margin-top:8px"><button class="bt" id="ok">Показать инсайты</button><button class="bt g" id="no">Отмена</button></div></section>');
    app.querySelectorAll('[data-c]').forEach(function(b){b.onclick=function(){pick.client=b.dataset.c;draw();app.querySelector('[data-c="'+pick.client+'"]').focus();};});
    app.querySelectorAll('[data-r]').forEach(function(b){b.onclick=function(){pick.role=b.dataset.r;draw();app.querySelector('[data-r="'+CSS.escape(pick.role)+'"]').focus();};});
    document.getElementById('ok').onclick=function(){state.client=pick.client;state.role=pick.role;state.chat={};save();location.hash='#/feed';};
    document.getElementById('no').onclick=function(){history.length>1?history.back():(location.hash='#/');};
  }
  draw();
}

var feedFilter='all';
function viewFeed(){
  var c=client(), role=state.role.charAt(0).toLowerCase()+state.role.slice(1);
  var items=D.feed.filter(function(f){return feedFilter==='all'||f.kinds.indexOf(feedFilter)>-1;});
  var note=(c.id!==cardClient0)?'<p class="notice sm" style="padding:12px 16px;border-radius:16px"><b>Демо.</b> Тексты карточек подготовлены для '+cardClient0+'. Для '+esc(c.id)+' они появятся после подключения сервера, профиль справа уже его.</p>':'';
  shell('ins',
   '<header class="hd"><h1>Инсайты</h1><span class="ch cc" style="font-size:14px">Клиент: '+esc(c.id)+'</span><span class="ch cm" style="font-size:14px">Роль: '+esc(role)+'</span><a class="bt g" href="#/select">Сменить</a></header>'+
   '<div class="chips" role="group" aria-label="Фильтры">'+D.filters.map(function(x){var on=x[0]===feedFilter;return '<button class="bt'+(on?'':' g')+'" data-f="'+x[0]+'" aria-pressed="'+on+'">'+x[1]+'</button>';}).join('')+'</div>'+note+
   '<div class="detail"><section class="stack" style="flex:1;gap:16px;min-width:0" aria-label="Лента карточек">'+
   (items.length?items.map(function(f){
     return '<article class="cd stack"><div class="chips" style="align-items:center"><span class="ch cb">Значимость: '+f.level+'</span><span class="ch '+f.kindCls+'">'+esc(f.kind)+'</span><span class="mu sm" style="margin-left:auto">'+esc(f.src)+(f.date?' · '+esc(f.date):'')+'</span></div>'+
      '<h2 style="font-size:20px">'+esc(f.title)+'</h2><p><b>'+esc(f.why)+'</b> '+esc(f.text)+'</p>'+
      '<div class="chips" style="align-items:center">'+f.foot.map(function(t){return '<span class="ch '+t[0]+'">'+esc(t[1])+'</span>';}).join('')+'<a class="bt" style="margin-left:auto" href="#/card/'+f.id+'">Разобрать</a></div></article>';
   }).join(''):'<p class="cd mu">По этому фильтру событий нет.</p>')+
   '<p class="mu sm">Демо-контент: формулировки иллюстративны. Ещё [N] событий скрыто: низкая значимость для этого профиля.</p></section>'+
   '<aside class="cd stack" style="width:300px;flex:none" aria-label="Профиль компании"><h3 style="font-size:18px">Профиль компании</h3><dl class="stack sm" style="margin:0">'+
   [['Отрасль',c.industry,'MAINOKVED_*'],['Регион регистрации',c.region,'REGION'],['Продукты банка',c.productsCap,'CL_PRODUCT_*'],['Выручка','[значение]','REVENUE_COMPANY'],['Численность','[диапазон]','ФНС / СПАРК']].map(function(r){return '<div><dt class="mu">'+r[0]+'</dt><dd style="margin:0"><b>'+esc(r[1])+'</b> <span class="mu">'+r[2]+'</span></dd></div>';}).join('')+
   '</dl><p class="mu sm">Лента отсортирована по значимости для этого профиля и роли.</p></aside></div>');
  app.querySelectorAll('[data-f]').forEach(function(b){b.onclick=function(){feedFilter=b.dataset.f;viewFeed();app.querySelector('[data-f="'+feedFilter+'"]').focus();};});
}

function viewCard(id){
  var f=D.feed.filter(function(x){return x.id===id;})[0]; if(!f){return viewFeed();}
  var card=D.cards[id], c=client();
  cardClient = card ? card.forClient : c.id;
  var demoNote = (card && c.id!==card.forClient) ? '<p class="notice sm" style="margin-top:12px;padding:12px 16px;border-radius:16px"><b>Демо.</b> Подробная карточка подготовлена только для '+esc(card.forClient)+'. Для '+esc(c.id)+' она появится после подключения сервера, ниже показан пример.</p>' : '';
  var body;
  if(!card){
    body='<section class="sc" style="margin-top:16px"><p class="mu">[Карточка в разработке: тот же состав из шести разделов, что и у карточки про ключевую ставку.]</p></section>';
  } else {
    body=card.sections.map(function(s){
      var h='<section class="sc"><h3>'+esc(s.h)+'</h3>';
      (s.p||[]).forEach(function(p){h+='<p>'+tag(p[0])+' '+sub(p[1])+'</p>';});
      if(s.li){h+='<ul>'+s.li.map(function(l){return '<li>'+(l[0]?'<b>'+esc(l[0])+'</b> ':'')+(l[3]?sub(l[2])+' '+tag(l[1]):tag(l[1])+' '+sub(l[2]))+'</li>';}).join('')+'</ul>';}
      if(s.note){h+='<p class="mu sm">'+esc(s.note)+'</p>';}
      return h+'</section>';
    }).join('')+
    '<section class="sc"><h3>6. На чём основан вывод</h3><ul class="sm">'+card.basis.map(function(b){return '<li>'+sub(b)+'</li>';}).join('')+'</ul>'+
    '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="bt" data-src="1">Открыть первоисточник [1]</button><button class="bt g" data-src="2">Открыть материал банка [2]</button></div><p class="mu sm" id="srcnote" role="status"></p></section>'+
    '<details class="sc"><summary>Как получен вывод</summary><p class="sm mu">'+esc(card.how)+'</p></details>';
  }
  shell('ins',
   '<a class="back" href="#/feed">← К ленте инсайтов</a><div class="detail"><article class="cd" style="flex:1;min-width:0">'+
   '<div class="chips" style="align-items:center"><span class="ch cb">Значимость: '+f.level+'</span><span class="ch cf">'+esc(f.kind)+'</span><span class="mu sm">'+esc(f.src)+' · '+esc(f.date)+'</span></div>'+
   '<h1 style="font-size:28px;margin:12px 0 8px">'+esc(f.title)+'</h1>'+
   '<p class="mu sm">Для клиента '+esc(cardClient)+' · роль: '+esc(state.role)+'. Ярлыки показывают происхождение каждого вывода.</p>'+demoNote+body+'</article>'+
   (card?dialog(id,card):'')+'</div>');
  app.querySelectorAll('[data-src]').forEach(function(b){b.onclick=function(){document.getElementById('srcnote').textContent='Демо: ссылка на источник ['+b.dataset.src+'] будет подставлена из данных сервера.';};});
  bindChat(id,card);
}

function bubbles(id,card){
  var msgs=state.chat[id]||card.chat;
  return msgs.map(function(m){return '<div class="bl '+m[0]+'">'+esc(m[1]).replace('{model}',tag('model'))+'</div>';}).join('');
}
function dialog(id,card){
  return '<aside class="cd dlg" aria-label="Диалог"><h2 style="font-size:20px">Задать вопрос</h2><div class="stack" id="msgs" aria-live="polite">'+bubbles(id,card)+'</div>'+
   '<div class="chips">'+['В другом разрезе','Сравнить с отраслью','К первоисточнику'].map(function(t){return '<button class="bt g sm" data-q="'+t+'" style="padding:8px 12px">'+t+'</button>';}).join('')+'</div>'+
   '<form class="q" id="qf"><input id="qi" aria-label="Ваш вопрос" placeholder="Ваш вопрос" autocomplete="off"><button class="bt" aria-label="Отправить">→</button></form></aside>';
}
function bindChat(id,card){
  if(!card) return;
  function ask(t){
    t=t.trim(); if(!t) return;
    var m=(state.chat[id]||card.chat).slice();
    m.push(['me',t],['ai','Демо-режим: диалог пока не подключён к серверу. Здесь появится ответ по профилю клиента и материалам банка.']);
    state.chat[id]=m;
    var box=document.getElementById('msgs'); box.innerHTML=bubbles(id,card);
  }
  app.querySelectorAll('[data-q]').forEach(function(b){b.onclick=function(){ask(b.dataset.q);};});
  document.getElementById('qf').onsubmit=function(e){e.preventDefault();var i=document.getElementById('qi');ask(i.value);i.value='';};
}

function viewStub(){
  shell('main','<h1 style="font-size:28px">Раздел не входит в демо</h1><p class="mu">Этот пункт меню нужен только для контекста. <a class="back" href="#/">На главную</a></p>');
}

function route(){
  var h=location.hash||'#/', m;
  if(h==='#/'||h==='') viewMain();
  else if(h==='#/select') viewSelect();
  else if(h==='#/feed') viewFeed();
  else if((m=h.match(/^#\/card\/([\w-]+)$/))) viewCard(m[1]);
  else if(h==='#/stub') viewStub();
  else viewMain();
  window.scrollTo(0,0);
  var t=document.getElementById('main'); if(t){t.setAttribute('tabindex','-1');}
}
window.addEventListener('hashchange',route);
route();
})();
