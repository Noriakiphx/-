'use strict';

const crew = [
  {id:'haru',name:'ハル',role:'音響',region:'東京',experience:'PA / 5年',photo:'assets/crew-1.jpg',purpose:'仲間づくり',bio:'ライブの音づくりが好き。終演後のコーヒーと、ゆっくり話せる時間を大切にしています。',tags:['ライブ','コーヒー','レコード']},
  {id:'aki',name:'アキ',role:'照明',region:'神奈川',experience:'照明 / 4年',photo:'assets/crew-2.jpg',purpose:'趣味の交流',bio:'ステージの空気を、光で変える仕事。休日はカメラを持って、知らない街へ。',tags:['写真','街歩き','音楽']},
  {id:'ren',name:'レン',role:'映像',region:'東京',experience:'映像 / 7年',photo:'assets/crew-3.jpg',purpose:'仲間づくり',bio:'ライブ配信と映像制作がメイン。現場の話も、好きな映画の話もできる仲間を探しています。',tags:['映画','キャンプ','映像制作']},
  {id:'mio',name:'ミオ',role:'舞台',region:'大阪',experience:'舞台 / 3年',photo:'assets/crew-4.jpg',purpose:'恋愛',bio:'仕込みから本番まで、チームでつくる時間が好き。不規則な毎日も一緒に楽しめたら。',tags:['演劇','料理','旅行']},
  {id:'sora',name:'ソラ',role:'音響',region:'神奈川',experience:'音響 / 6年',photo:'assets/crew-5.jpg',purpose:'趣味の交流',bio:'フェスやホールの現場で働いています。休みの日は、山へ行ったりギターを弾いたり。',tags:['フェス','登山','ギター']},
  {id:'yui',name:'ユイ',role:'照明',region:'東京',experience:'照明 / 8年',photo:'assets/crew-6.jpg',purpose:'仲間づくり',bio:'ツアーの照明を担当しています。遠征先のおいしいお店や、現場の小さな発見を共有したい。',tags:['旅行','グルメ','ライブ']}
];
const $ = selector => document.querySelector(selector);
const icons = {'音響':'audio-lines','照明':'lightbulb','映像':'video','舞台':'clapperboard'};
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name => `<i data-lucide="${name}"></i>`;
function refreshIcons(){ if(window.lucide) window.lucide.createIcons(); }
let storageAvailable = true;
function readLocal(key,fallback){try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{storageAvailable=false;return fallback;}}
function writeLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{storageAvailable=false;return false;}}
const storedSaved = readLocal('crew-link-ui-saved',[]);
const saved = new Set(Array.isArray(storedSaved) ? storedSaved.filter(id=>crew.some(p=>p.id===id)) : []);
const storedProfile = readLocal('crew-link-ui-profile',{});
const profile = {name:'あなた',role:'音響',region:'東京',interests:'',bio:''};
for(const key of Object.keys(profile)) if(typeof storedProfile?.[key]==='string') profile[key]=storedProfile[key];
let currentView = 'discover';
let selectedPerson = null;
let toastTimer;
let selectedConversation = 'haru';
const conversations = new Map([
  ['haru',[{mine:false,text:'お疲れさまです！プロフィールのライブの話、気になりました。'}, {mine:true,text:'お疲れさまです。音楽の話ができると嬉しいです！'}]],
  ['aki',[{mine:false,text:'こんにちは。休日に写真を撮るのが好きです。好きな場所はありますか？'}]]
]);

function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3200);}
function filters(){const params=new URLSearchParams(location.search);return {role:params.get('role')||'all',region:params.get('region')||'all',purpose:params.get('purpose')||'all',q:params.get('q')||'',sort:params.get('sort')||'recommended'};}
function updateFilters(changes){const params=new URLSearchParams(location.search);for(const [key,value] of Object.entries(changes)){if(value==='all'||value===''||value==='recommended')params.delete(key);else params.set(key,value);}const url=new URL(location.href);url.search=params.toString();history.replaceState(null,'',url);renderCrew();}
function renderCrew(){
  const f=filters();$('#search').value=f.q;$('#region').value=f.region;$('#sort').value=f.sort;
  document.querySelectorAll('[data-role]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.role===f.role)));
  $('#saved-count').textContent=saved.size;
  let people=crew.filter(p=>(currentView!=='saved'||saved.has(p.id))&&(f.role==='all'||p.role===f.role)&&(f.region==='all'||p.region===f.region)&&(f.purpose==='all'||p.purpose===f.purpose)&&`${p.name} ${p.role} ${p.bio} ${p.tags.join(' ')}`.toLowerCase().includes(f.q.toLowerCase().trim()));
  if(f.sort==='name')people.sort((a,b)=>a.name.localeCompare(b.name,'ja'));
  $('#results-heading').innerHTML=`${currentView==='saved'?'気になるクルー':'クルーを探す'} <span id="result-count">${people.length}人</span>`;
  $('#empty-state').hidden=people.length>0;
  $('#crew-grid').innerHTML=people.map(p=>`<article class="crew-card"><div class="crew-photo"><img src="${p.photo}" alt="${p.name}のサンプルプロフィール写真" width="500" height="400" loading="lazy"><span class="role-badge">${icon(icons[p.role])}${p.role}</span><button class="save-button" data-save="${p.id}" aria-label="${p.name}を${saved.has(p.id)?'保存から削除':'保存'}" title="気になる人に保存" aria-pressed="${saved.has(p.id)}">${icon('bookmark')}</button></div><div class="crew-body"><div class="crew-name-row"><h3>${p.name}</h3><span>${p.experience}</span></div><p class="crew-region">${icon('map-pin')}${p.region} <span> / ${p.purpose}</span></p><p class="crew-bio">${p.bio}</p><div class="tags">${p.tags.map(tag=>`<span>${tag}</span>`).join('')}</div><div class="card-bottom"><span>サンプルプロフィール</span><button class="detail-button" data-person="${p.id}">プロフィールを見る${icon('arrow-up-right')}</button></div></div></article>`).join('');
  refreshIcons();
}
function toggleSaved(id){if(!crew.some(p=>p.id===id))return;if(saved.has(id)){saved.delete(id);toast('気になる人から削除しました');}else{saved.add(id);toast('気になる人に保存しました');}if(!writeLocal('crew-link-ui-saved',[...saved]))toast('端末に保存できませんでした。この画面のみで保持します。');renderCrew();}
function showPerson(id){const p=crew.find(p=>p.id===id);if(!p)return;selectedPerson=id;$('#person-details').innerHTML=`<div class="dialog-heading"><div><p class="eyebrow">SAMPLE PROFILE</p><h2>${p.name}</h2></div><button class="icon-button" data-close type="button" aria-label="閉じる">${icon('x')}</button></div><img class="person-detail-image" src="${p.photo}" alt="${p.name}のサンプルプロフィール写真" width="500" height="400"><p class="crew-region">${icon('map-pin')}${p.region} / ${p.role} / ${p.purpose}</p><p class="person-detail-bio">${p.bio}</p><div class="tags">${p.tags.map(t=>`<span>${t}</span>`).join('')}</div><div class="person-detail-actions"><button class="primary-button" id="start-conversation">${icon('message-circle')}デモで会話を開く</button><button class="outline-button" data-save="${p.id}">${icon('bookmark')}気になる人</button></div>`;refreshIcons();$('#person-dialog').showModal();}
function renderMessages(){
  $('#conversation-list').innerHTML=[...conversations.keys()].map(id=>{const p=crew.find(p=>p.id===id);return `<button class="conversation ${id===selectedConversation?'active':''}" data-conversation="${id}" aria-pressed="${id===selectedConversation}"><img src="${p.photo}" alt="" width="40" height="40"><span><strong>${p.name}</strong><small>${p.role} / デモ会話</small></span></button>`;}).join('');
  const p=crew.find(p=>p.id===selectedConversation);$('#thread-header').innerHTML=`${p.name}<small>${p.role} / サンプルプロフィール</small>`;
  $('#thread-messages').innerHTML=(conversations.get(selectedConversation)||[]).map(m=>`<p class="bubble ${m.mine?'mine':''}">${escapeHTML(m.text)}</p>`).join('');
  $('#thread-messages').scrollTop=$('#thread-messages').scrollHeight;
}
function renderProfile(){
  const form=$('#profile-form');for(const key of Object.keys(profile))form.elements[key].value=profile[key];
  $('#preview-name').textContent=profile.name||'あなた';$('#account-name').textContent=profile.name||'あなた';$('#preview-role').textContent=`${profile.role} / ${profile.region}`;$('#preview-bio').textContent=profile.bio||'あなたのことを、少しずつ。';
  $('#preview-interests').innerHTML=profile.interests.split(/[,、]/).map(t=>t.trim()).filter(Boolean).map(t=>`<span>${escapeHTML(t)}</span>`).join('');
  if(!storageAvailable)$('#storage-notice').textContent='ブラウザの保存領域が利用できません。入力内容はこの画面のみで保持されます。';
}
function route(){
  const hash=location.hash.slice(1)||'discover';currentView=['discover','saved','messages','profile','billing'].includes(hash)?hash:'discover';
  document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===currentView;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  $('#discover-view').hidden=!['discover','saved'].includes(currentView);$('#messages-view').hidden=currentView!=='messages';$('#profile-view').hidden=currentView!=='profile';
  $('#billing-view').hidden=currentView!=='billing';
  $('#page-crumb').textContent={discover:'DISCOVER',saved:'SAVED',messages:'MESSAGES',profile:'PROFILE',billing:'PAYMENTS'}[currentView];
  renderCrew();if(currentView==='messages')renderMessages();if(currentView==='profile')renderProfile();refreshIcons();
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.role)updateFilters({role:button.dataset.role});
  if(button.dataset.save)toggleSaved(button.dataset.save);
  if(button.dataset.person)showPerson(button.dataset.person);
  if(button.hasAttribute('data-close'))button.closest('dialog').close();
  if(button.dataset.conversation){selectedConversation=button.dataset.conversation;renderMessages();}
  if(button.id==='start-conversation'){selectedConversation=selectedPerson;if(!conversations.has(selectedPerson))conversations.set(selectedPerson,[]);$('#person-dialog').close();location.hash='messages';if(currentView==='messages')renderMessages();}
});
$('#search').addEventListener('input',e=>updateFilters({q:e.target.value}));$('#region').addEventListener('change',e=>updateFilters({region:e.target.value}));$('#sort').addEventListener('change',e=>updateFilters({sort:e.target.value}));
$('#reset-filters').addEventListener('click',()=>updateFilters({role:'all',region:'all',purpose:'all',q:'',sort:'recommended'}));
$('#open-preferences').addEventListener('click',()=>{const f=filters();$('#preferences-form').elements.purpose.value=f.purpose;$('#preferences-form').elements.region.value=f.region;$('#preferences-dialog').showModal();});
$('#preferences-form').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.target);updateFilters({purpose:data.get('purpose'),region:data.get('region')});$('#preferences-dialog').close();toast('希望条件を適用しました');});
$('#message-form').addEventListener('submit',e=>{e.preventDefault();const text=$('#message-input').value.trim();if(!text)return;conversations.get(selectedConversation).push({mine:true,text});$('#message-input').value='';renderMessages();});
$('#profile-form').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.target);for(const key of Object.keys(profile))profile[key]=String(data.get(key)||'').trim();if(!profile.name){e.target.elements.name.setCustomValidity('表示名を入力してください。');e.target.elements.name.reportValidity();return;}const persisted=writeLocal('crew-link-ui-profile',profile);renderProfile();$('#storage-notice').textContent=persisted?'この端末に保存しました。公開はされません。':'端末に保存できませんでした。この画面のみで保持します。';toast(persisted?'プロフィールを保存しました':'この画面に反映しました');});
$('#profile-form').elements.name.addEventListener('input',e=>e.target.setCustomValidity(''));
window.addEventListener('hashchange',route);window.addEventListener('popstate',route);
route();
