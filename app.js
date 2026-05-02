import { db } from "./firebase.js";
import {
  ref, set, onValue, runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import { civIcons, rows } from "./config.js";
import { onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
let roomId, playerId="p"+Math.random().toString(36).slice(2,8);
let selectedCiv="";
let players = [];

/* ================= 科学 ================= */
function calcScience(s){
  let g0 = s.science_gear || 0;
  let c0 = s.science_compass || 0;
  let t0 = s.science_tablet || 0;
  let a  = s.science_all || 0;

  // 科学点を計算する関数
  function score(g, c, t){
    const sets = Math.min(g, c, t);
    return g*g + c*c + t*t + sets * 7;
  }

  let best = 0;

  // ALL を g, c, t にどう割り振るか総当たり
  for(let ag = 0; ag <= a; ag++){
    for(let ac = 0; ac <= a - ag; ac++){
      let at = a - ag - ac;

      let g = g0 + ag;
      let c = c0 + ac;
      let t = t0 + at;

      best = Math.max(best, score(g, c, t));
    }
  }

  return best;
}

/* ================= 合計 ================= */
function calc(s){
  return (
    (s.military_land||0)+
    (s.military_sea||0)+
    Math.floor((s.economy_coin||0) / 3) +
    (s.economy_debt||0)+
    (s.economy_trade||0)+
    (s.build_wonder||0)+
    (s.build_point||0)+
    (s.expansion_guild||0)+
    (s.expansion_leader||0)+
    (s.expansion_city||0)+
    (s.expansion_naval||0) +
    (s.expansion_palm||0) +
    calcScience(s)
  );
}

/* ================= UI ================= */
function row(label,key,val){
  return `
  <div class="row">
    <div>${label}</div>
    <button onclick="change('${key}',-1)">-</button>
    <div>${val||0}</div>
    <button onclick="change('${key}',1)">+</button>
  </div>`;
}

/* ================= start ================= */


function start(){
  const name = document.getElementById("name").value.trim();
  if(!name){
    alert("名前を入力してください");
    return;
  }

  if(!selectedCiv){
    alert("文明を選択してください");
    return;
  }

  // ★ roomId を最初に確定
  if(!roomId){
    roomId = Math.random().toString(36).slice(2,8);
    history.replaceState(null, "", "?room=" + roomId);
  }

  // ★ QR / コピー ボタンを表示
  showGameUI()

  // ★ roomId 確定後に QR 生成
  renderQR(roomId);

  // UI 表示
  document.getElementById("mainUI").classList.remove("hidden");

  // タブ初期化
  document.getElementById("inputPanel").style.display = "block";
  document.getElementById("resultPanel").style.display = "none";
  document.getElementById("tabInput").classList.add("active");
  document.getElementById("tabResult").classList.remove("active");

  // Firebase 登録
  const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);

  set(playerRef, {
    name,
    civilization:selectedCiv,
    scores:{
      military_land:0,military_sea:0,
      economy_coin:0,economy_debt:0,economy_trade:0,
      build_wonder:0,build_point:0,
      expansion_guild:0,expansion_leader:0,expansion_city:0,
      expansion_naval:0,expansion_palm:0,
      science_gear:0,science_compass:0,science_tablet:0,science_all:0
    }
  });
  // ★ ここが最重要：スマホでも確実に削除される
  onDisconnect(playerRef).remove();
  
  // リスナー開始
  listen();
}


function showGameUI(){
  document.getElementById("civSelect").classList.remove("hidden");
  document.getElementById("copyBtn").classList.remove("hidden");
  document.getElementById("qr").classList.remove("hidden");
  document.getElementById("mainUI").classList.remove("hidden");
}

/* ================= listen ================= */
function listen(){

  onValue(ref(db,"rooms/"+roomId+"/players"),snap=>{

    const data=snap.val()||{};

    let arr=Object.entries(data).map(([id,v])=>({
      id,
      ...v,
      total:calc(v.scores||{})
      
    }));

    arr.sort((a,b)=>b.total-a.total);

    let rank=0,prev=null;
    arr=arr.map((p,i)=>{
      if(p.total!==prev){rank=i+1;prev=p.total;}
      return {...p,rank};
    });

    // ★ ここで players を更新
    players = arr;

    // ★ トップバー更新
    updateTopBar();

    renderInput(arr.find(p=>p.id===playerId)?.scores||{});

    document.getElementById("resultPanel").innerHTML=
      renderTable(arr);
  });
}

/* ================= render ================= */
function renderInput(s){

  let h = ""; // ← ★これが必須

  let grouped = {};

  rows.forEach(r=>{
    grouped[r[0]] ??= [];
    grouped[r[0]].push(r);
  });

  const sections = [...new Set(rows.map(r => r[0]))];

  sections.forEach(sec => {
    h += `<div class="section"><h3>${sec}</h3>`;
    rows.filter(r => r[0] === sec).forEach(r => {
    h += row(r[1], r[2], s[r[2]]);
    });
    h += "</div>";
  });
/*
  for(let sec in grouped){

    h += `<div class="section"><h3>${sec}</h3>`;

    grouped[sec].forEach(r=>{
      h += row(r[1], r[2], s[r[2]]);
    });

    h += "</div>";
  }
*/
  document.getElementById("inputPanel").innerHTML = h;
}

/* ================= change ================= */
window.change=function(key,d){
  runTransaction(ref(db,`rooms/${roomId}/players/${playerId}/scores/${key}`),
    v=>(v||0)+d
  );

  // ★ 入力した瞬間に更新
  updateTopBar();
};

/* ================= table ================= */
function renderTable(arr){

  const me = playerId;
  let h = "<table>";
  
  /* ===== ヘッダー ===== */
  h += "<tr>";
  h += "<th>セクション</th><th>項目</th>";
  arr.forEach((p, i)=>{
    const cls = (i===0) ? "first" : (p.id===me ? "me" : "");
    h += `<th class="${cls}">
        ${p.name}<br>
        ${p.civilization}
      </th>`;
  });
  h += "</tr>";

  /* ===== 順位 ===== */
  h += `<tr class="rankRow">`;
  h += "<td></td><td>順位</td>";
  arr.forEach((p, i)=>{
    const cls = (i===0) ? "first" : (p.id===me ? "me" : "");
    h += `<td class="${cls}">${p.rank}</td>`;
  });
  h += "</tr>";

  /* ===== 合計 ===== */
  h += `<tr class="totalRow">`;
  h += `<td></td><td>合計</td>`;
  arr.forEach((p, i)=>{
    const cls = (i===0) ? "first" : (p.id===me ? "me" : "");
    h += `<td class="${cls}">${p.total}</td>`;
  });
  h += "</tr>";

  /* ===== セクションごとにまとめる ===== */
  const sections = [...new Set(rows.map(r => r[0]))];

  sections.forEach(sec => {

    const items = rows.filter(r => r[0] === sec);
    const rowspan = items.length;

    items.forEach((r, idx) => {
      const label = r[1];
      const key   = r[2];

      h += `<tr class="section-${sec} item-${key}">`;

      // ★ 最初の行だけセクション名を rowspan で結合
      if(idx === 0){
        h += `<td class="sectionCell" rowspan="${rowspan}">${sec}</td>`;
      }

      // 項目名
      h += `<td class="labelCell">${label}</td>`;

      // 各プレイヤーの値
      arr.forEach((p, i)=>{
        const cls = (i===0) ? "first" : (p.id===me ? "me" : "");
        h += `<td class="${cls}">${p.scores?.[key] || 0}</td>`;
      });

      h += "</tr>";
    });

  });

  h += "</table>";
  return h;
}


function renderCivs(){
  const div = document.getElementById("civSelect");

  div.innerHTML = Object.entries(civIcons).map(([name,icon])=>{
    return `
      <button class="civBtn" data-civ="${name}">
        ${icon} ${name}
      </button>
    `;
  }).join("");

  window.selectCiv = function(name, el){

  selectedCiv = name;

  // 全部解除
  document.querySelectorAll(".civBtn")
    .forEach(b=>b.classList.remove("active"));

  // 自分だけON
  el.classList.add("active");

  console.log("文明選択:", selectedCiv);
  };

  document.querySelectorAll(".civBtn").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      selectCiv(e.currentTarget.dataset.civ, e.currentTarget);
    });
  });
}

function updateTopBar(){
  const p = players.find(x => x.id === playerId);
  if(!p) return;

  const total = calc(p.scores || {});

  document.getElementById("topScore").innerHTML =
    `${p.name}（${p.civilization}） : ${total} 点`;
}

function copyUrl(){
  const url = location.href;

  if(navigator.clipboard){
    navigator.clipboard.writeText(url)
      .then(()=>alert("URLをコピーしました"))
      .catch(()=>fallbackCopy(url));
  }else{
    fallbackCopy(url);
  }
}

function fallbackCopy(text){
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  alert("URLをコピーしました");
}

function renderQR(roomId){
  const qrDiv = document.getElementById("qr");
  if(!qrDiv) return;

  qrDiv.innerHTML = "";

  const url = location.origin + location.pathname + "?room=" + roomId;

  new QRCode(qrDiv, {
    text: url,
    width: 120,
    height: 120
  });
}

function init(){
  console.log("INIT OK");

  const room = new URLSearchParams(location.search).get("room");

  renderCivs();
  renderInput({});

  document.getElementById("startBtn")
    .addEventListener("click", start);

  document.getElementById("copyBtn")
    .addEventListener("click", copyUrl);

  // ★ タブ切り替え（確実に動く版）
  const tabInput = document.getElementById("tabInput");
  const tabResult = document.getElementById("tabResult");
  const inputPanel = document.getElementById("inputPanel");
  const resultPanel = document.getElementById("resultPanel");

  tabInput.addEventListener("click", ()=>{
    inputPanel.style.display = "block";
    resultPanel.style.display = "none";

    tabInput.classList.add("active");
    tabResult.classList.remove("active");
  });

  tabResult.addEventListener("click", ()=>{
    inputPanel.style.display = "none";
    resultPanel.style.display = "block";

    tabResult.classList.add("active");
    tabInput.classList.remove("active");
  });

  // 初期状態は入力タブ
  inputPanel.style.display = "block";
  resultPanel.style.display = "none";

  if(room){
    roomId = room;
    listen();
  }

  window.addEventListener("beforeunload", ()=>{
  if(roomId && playerId){
    set(ref(db, `rooms/${roomId}/players/${playerId}`), null);
  }
});

}

init();