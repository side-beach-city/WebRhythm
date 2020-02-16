import {ScoreMap} from './scoremap.js';
import {SaveList} from './savelists.js';
const notes = 8;
const scales = "cdefgabC".split("");
const scaleNotes = [60, 62, 64, 65, 67, 69, 71, 72];
const SETTING_NAMEROOT = "Display_";
const SETTING_SAVETONES = SETTING_NAMEROOT + "Notes";
const SETTING_SAVESPEED = SETTING_NAMEROOT + "Speed";
const SETTING_SAVELISTS = SETTING_NAMEROOT + "SaveList";
const PAGE_MAX = 20;
let rhythm = -1;
let tickID;
let audioCtx;
let savelist;
let scoremap;
let timing = 500;
let playState = true;

// https://clarity.design/icons
ClarityIcons.add({"qr-code": `
<svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <title>qr-code-line</title>
    <path d="M5.6,4A1.6,1.6,0,0,0,4,5.6V12h8V4ZM10,10H6V6h4Z" class="clr-i-outline clr-i-outline-path-1"></path><path d="M4,30.4A1.6,1.6,0,0,0,5.6,32H12V24H4ZM6,26h4v4H6Z" class="clr-i-outline clr-i-outline-path-2"></path><path d="M24,32h6.4A1.6,1.6,0,0,0,32,30.4V24H24Zm2-6h4v4H26Z" class="clr-i-outline clr-i-outline-path-3"></path><path d="M30.4,4H24v8h8V5.6A1.6,1.6,0,0,0,30.4,4ZM30,10H26V6h4Z" class="clr-i-outline clr-i-outline-path-4"></path><polygon points="20 10 20 8 16 8 16 12 18 12 18 10 20 10" class="clr-i-outline clr-i-outline-path-5"></polygon><rect x="12" y="12" width="2" height="2" class="clr-i-outline clr-i-outline-path-6"></rect><rect x="14" y="14" width="4" height="2" class="clr-i-outline clr-i-outline-path-7"></rect><polygon points="20 6 20 8 22 8 22 4 14 4 14 8 16 8 16 6 20 6" class="clr-i-outline clr-i-outline-path-8"></polygon><rect x="4" y="14" width="2" height="4" class="clr-i-outline clr-i-outline-path-9"></rect><polygon points="12 16 12 18 10 18 10 14 8 14 8 18 6 18 6 20 4 20 4 22 8 22 8 20 10 20 10 22 12 22 12 20 14 20 14 16 12 16" class="clr-i-outline clr-i-outline-path-10"></polygon><polygon points="20 16 22 16 22 18 24 18 24 16 26 16 26 14 22 14 22 10 20 10 20 12 18 12 18 14 20 14 20 16" class="clr-i-outline clr-i-outline-path-11"></polygon><polygon points="18 30 14 30 14 32 22 32 22 30 20 30 20 28 18 28 18 30" class="clr-i-outline clr-i-outline-path-12"></polygon><polygon points="22 20 22 18 20 18 20 16 18 16 18 18 16 18 16 20 18 20 18 22 20 22 20 20 22 20" class="clr-i-outline clr-i-outline-path-13"></polygon><rect x="30" y="20" width="2" height="2" class="clr-i-outline clr-i-outline-path-14"></rect><rect x="22" y="20" width="6" height="2" class="clr-i-outline clr-i-outline-path-15"></rect><polygon points="30 14 28 14 28 16 26 16 26 18 28 18 28 20 30 20 30 18 32 18 32 16 30 16 30 14" class="clr-i-outline clr-i-outline-path-16"></polygon><rect x="20" y="22" width="2" height="6" class="clr-i-outline clr-i-outline-path-17"></rect><polygon points="14 28 16 28 16 26 18 26 18 24 16 24 16 20 14 20 14 28" class="clr-i-outline clr-i-outline-path-18"></polygon>
    <rect x="0" y="0" width="36" height="36" fill-opacity="0"/>
</svg>
`});

// https://qiita.com/mohayonao/items/c506f7ddcaac63694eb9
function mtof(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * 初期化処理
 */
function init(){
  let playview = document.getElementById("playview");
  let scalesN = scales.concat();
  scalesN.reverse();
  scalesN = scalesN.concat("N");
  scalesN.forEach((n) => {
    let row = document.createElement("div");
    if(n != "N"){
      row.id = n;
    }
    row.classList.add("row");
    [...Array(notes).keys()].forEach((i) => {
      let cell = document.createElement("div");
      cell.id = `n${n}${i}`;
      cell.classList.add("cell");
      if(n != "N"){
        cell.addEventListener("click", (e) => {
          let scale = e.target.id[1];
          let position = parseInt(e.target.id[2]);
          scoremap.setNotes(scale, position).saveMap(SETTING_SAVETONES);
        });
      }
      row.appendChild(cell);
    });
    playview.appendChild(row);
  });
  tick();
  let v = localStorage.getItem(SETTING_SAVESPEED);
  if(v == undefined){
    v = 500;
  }else{
    v = parseInt(v);
  }
  update_speed(v);

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  scoremap = new ScoreMap();
  let importdata = undefined;
  if(location.search){
    let q = location.search.slice(1).split(/[&;]/);
    let vars = {};
    q.forEach(o => {
      let qs = o.split("=");
      vars[qs[0]] = qs[1];
    });
    importdata = vars["d"];
  }
  savelist = new SaveList(SETTING_SAVELISTS, importdata);
  scoremap.addEventListener("note", noteReflect);
  scoremap.addEventListener("changepages", pageChanges);
  scoremap.loadMap(SETTING_SAVETONES);
}

/**
 * タイミングごとの処理。
 * 再生中は音声を再生する
 * タイミングに指定された秒数経過ごとに呼び出される。
 */
function tick(){
  if(playState){
    let last = null;
    let rewind = !(rhythm < notes - 1);
    let autoroll = document.getElementById("auto_roll").
      getAttribute("aria-pressed").toLowerCase() === "true";
    if(last >= 0){
      last = document.getElementById(`nN${rhythm}`);
    }
    rhythm = rhythm < notes - 1 ? rhythm + 1 : 0
    let now = document.getElementById(`nN${rhythm}`);
    if(last){
      last.classList.remove("note");
    }
    now.classList.add("note");
    if(rewind && autoroll){
      scoremap.switchNext(true);
      playerRestart(true);
      tick();
    }else{
      // note
      scales.forEach((n, i) => {
        let note = document.getElementById(`n${n}${rhythm}`);
        if(note.classList.contains("on")){
          play(mtof(scaleNotes[i]));
        }
      });
      nextTick();
    }
  }
}

/**
 * 次のtick()タイムアウトを設定し、そのIDをtickIDに保存する
 */
function nextTick() {
  tickID = setTimeout(tick, timing);
}

/**
 * タイミング値のアップデート処理
 * @param {Number} value 設定時は、タイミング値を更新する。未設定時はスライダーの値を反映する。
 */
function update_speed(value){
  let slider = document.getElementById("speed");
  let label = document.getElementById("speed_value");

  if(typeof value == 'number'){
    slider.value = value;
  }else{
    localStorage.setItem(SETTING_SAVESPEED, slider.value);
  }
  let trueValue = slider.value > 0 ? slider.value : 50;
  timing = trueValue;
  label.textContent = trueValue;
}

/**
 * 任意の周波数で発声する
 * @param {Number} hz 周波数
 */
function play(hz) {
  var osciillator = audioCtx.createOscillator();
  osciillator.type = "square";
  osciillator.frequency.value = hz;
  var audioDestination = audioCtx.destination;
  osciillator.connect(audioDestination);
  osciillator.start = osciillator.start || osciillator.noteOn;
  osciillator.start();
  setTimeout(function() {
    osciillator.stop();
  }, timing * 0.9);
}

/**
 * 音楽の再生をただちに開始する
 * @param {Boolean} noTimer メソッド内でタイマーの設定を行わない場合true
 */
function playerPlay(noTimer = false) {
  playState = true;
  rhythm = -1;
  document.getElementById("playpause_icon").setAttribute("shape", "stop");
  if(!noTimer) nextTick();
}

/**
 * 音楽の再生をただちに停止する
 */
function playerStop() {
  playState = false;
  document.getElementById("playpause_icon").setAttribute("shape", "play");
  if(tickID) clearTimeout(tickID);
  Array.from(document.getElementsByClassName("note")).forEach((n) => {
    n.classList.remove("note");
  });
}

/**
 * 音楽の再生を停止し・再開する
 * @param {Boolean} noTimer メソッド内でタイマーの設定を行わない場合true
 */
function playerRestart(noTimer = false) {
  playerStop();
  playerPlay(noTimer);
}

/**
 * 再生・停止ボタン
 */
document.getElementById("playpause").addEventListener("click", (e) => {
  if(playState){
    playerStop();
  }else{
    playerPlay();
  }
});

document.getElementById("speed").addEventListener("input", update_speed);

/**
 * 前のページボタン。前のページを表示する
 */
document.getElementById("pagination_prev").addEventListener("click", () => {
  if(scoremap.pageIndex > 0){
    scoremap.switchPage(scoremap.pageIndex - 1);
  }
});

/**
 * 次のページボタン。次のページを表示するか、なければ新しいページを作る
 */
document.getElementById("pagination_next").addEventListener("click", () => {
  if(scoremap.pageIndex < scoremap.pageLength - 1){
    scoremap.switchPage(scoremap.pageIndex + 1);
  }else if(scoremap.pageLength < PAGE_MAX){
    scoremap.addNewPage(true);
  }
});

/**
 * ページ削除ボタン。ページを削除する
 */
document.getElementById("pagination_del").addEventListener("click", () => {
  if(scoremap.pageLength > 1){
    scoremap.removePage(scoremap.pageIndex);
  }
});

/**
 * 現在のページノートをクリアするボタン。
 */
document.getElementById("clear").addEventListener("click", () => {
  scoremap.currentPage.clean();
  scoremap.saveMap(SETTING_SAVETONES);
});

/**
 * データコントロールボタン
 */
document.getElementById("data_control").addEventListener("click", () => {
  let dialog = document.getElementById('save_load_window');
  if(!dialog.close){
    dialog.close = () => { document.getElementById('save_load_window').style.display = "none"; };
  }
  let list = document.getElementById("dc_savedata");
  let newitem = document.getElementById("dc_savedata_newfile");
  // リストクリア
  while (list[0] != newitem) {
    list.remove(0);
  }
  // リスト生成
  savelist.getNameList().forEach(n => {
    let option = document.createElement("option");
    option.text = n;
    list.add(option, newitem);
  });
  list.selectedIndex = 0;
  dialog.style.display = "block";
  let lp = window.innerWidth / 2 - dialog.offsetWidth / 2;
  let tp = window.innerHeight / 2 - dialog.offsetHeight / 2;
  dialog.style.left = `${lp}px`;
  dialog.style.top = `${tp}px`;
});

/**
 * データを保存するボタン
 */
document.getElementById("dc_save_data").addEventListener("click", (e) => {
  let list = document.getElementById("dc_savedata");
  let slider = document.getElementById("speed");
  let data = scoremap.saveData;
  let fclose = false;
  data.speed = slider.value;
  let index = list.selectedIndex;
  if(index >= 0){
    if(list[index].id === "dc_savedata_newfile"){
      let name = prompt("new file?");
      if(name){
        savelist.setItem(name, data);
        fclose = true;
      }
    }else{
      let name = list.options[index].text;
      savelist.setItem(name, data);
      fclose = true;
    }
  }

  if(fclose){
    document.getElementById('save_load_window').close();
  }
})

/**
 * データを読み込むボタン
 */
document.getElementById("dc_load_data").addEventListener("click", (e) => {
  let list = document.getElementById("dc_savedata");
  let index = list.selectedIndex;
  if(index >= 0){
    if(list[index].id === "dc_savedata_newfile"){
      scoremap.formatScore();
    }else{
      let name = list.options[index].text;
      let data = savelist.getItem(name);
      scoremap.loadData(data);
      if(data.speed) update_speed(parseInt(data.speed));
      document.getElementById('save_load_window').close();
    }
  }
})

document.getElementById("dc_export_data").addEventListener("click", (e) => {
  // エクスポート文字列生成
  let exportStr = location.hostname == "127.0.0.1" ?
    "https://side-beach-city.github.io/WebRhythm/" : location.origin + location.pathname;
  exportStr += "?d=";
  exportStr += savelist.export();
  // open
  let url = "https://chart.googleapis.com/chart?cht=qr&cht=qr&chs=500x500&chl=" + exportStr;
  window.open(url, "_blank");
});

document.getElementById("dc_cancel").addEventListener("click", (e) => {
  document.getElementById('save_load_window').close();
});

/**
 * ノートの状態が変更されたときのイベントハンドラ。
 * @param {EventTarget} e イベントオブジェクト
 */
function noteReflect(e){
  if(e.scale){
    // 音を指定して状態チェンジ
    let cell = document.getElementById(`n${e.scale}${e.position}`);
    if(e.state){
      cell.classList.add("on");
    }else{
      cell.classList.remove("on");
    }
  }else{
    // 音色総入れ替え
    scales.forEach((n) => {
      [...Array(notes).keys()].forEach((i) => {
        let cell = document.getElementById(`n${n}${i}`);
        if(e.notes[n][i]){
          cell.classList.add("on");
        }else{
          cell.classList.remove("on");
        }
      });
    });
  }
}

/**
 * ページの状態が変更されたときのイベントハンドラ。
 * @param {EventTarget} e イベントオブジェクト
 */
function pageChanges(e) {
  let ul = document.getElementById("pagination");
  let items = ul.querySelectorAll("li.cont");
  let prev = items[0];
  let next = items[1];
  let del = items[2];
  if(e.length){
    // ページ数変更
    Array.from(ul.querySelectorAll(".item")).forEach((e) => {
      e.remove();
    });
    [...Array(e.length).keys()].forEach((i) => {
      let li = document.createElement("li");
      let a = document.createElement("a");
      li.id = `paginate-${i}`;
      li.classList.add("item");
      a.href = "#"
      a.id = `paginate-a-${i}`;
      a.classList.add("link");
      a.dataset.number = i;
      a.addEventListener("click", (e) => {
        scoremap.switchPage(parseInt(e.target.dataset.number));
      });
      li.appendChild(a);
      ul.insertBefore(li, next);
    });
    if(e.length > 1){
      del.classList.remove("disabled");
    }else{
      del.classList.add("disabled");
    }
    scoremap.saveMap(SETTING_SAVETONES);
  }
  if(e.past){
    let past = document.getElementById(`paginate-a-${e.past-1}`);
    if(past){ past.classList.remove("on"); }
  }
  document.getElementById(`paginate-a-${e.current-1}`).classList.add("on");
  // prev / nextの状態変更
  if(e.current <= 1){
    prev.classList.add("disabled");
  }else{
    prev.classList.remove("disabled");
  }
  if(e.current >= PAGE_MAX){
    next.classList.add("disabled");
  }else{
    next.classList.remove("disabled");
  }
  playerRestart();
}

init();
