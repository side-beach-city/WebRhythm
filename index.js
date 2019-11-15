import {ScoreMap} from './scoremap.js';
const notes = 8;
const scales = "cdefgabC".split("");
const scaleNotes = [60, 62, 64, 65, 67, 69, 71, 72];
const SETTING_NAMEROOT = "Display_";
const SETTING_SAVETONES = SETTING_NAMEROOT + "Notes";
const SETTING_SAVESPEED = SETTING_NAMEROOT + "Speed";
const PAGE_MAX = 7;
let rhythm = -1;
let tickID;
let audioCtx;
let scoremap;
let timing = 500;
let playState = true;
// https://qiita.com/mohayonao/items/c506f7ddcaac63694eb9
function mtof(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function init(){
  /**
   * 初期化処理
   */
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
  scoremap.addEventListener("note", noteReflect);
  scoremap.addEventListener("changepages", pageChanges);
  scoremap.loadMap(SETTING_SAVETONES);
}

function tick(){
  /**
   * タイミングごとの処理。
   * 再生中は音声を再生する
   * タイミングに指定された秒数経過ごとに呼び出される。
   */
  if(playState){
    let last = null;
    if(last >= 0){
      last = document.getElementById(`nN${rhythm}`);
    }
    rhythm = rhythm < notes - 1 ? rhythm + 1 : 0
    let now = document.getElementById(`nN${rhythm}`);
    if(last){
      last.classList.remove("note");
    }
    now.classList.add("note");
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

/**
 * 次のtick()タイムアウトを設定し、そのIDをtickIDに保存する
 */
function nextTick() {
  tickID = setTimeout(tick, timing);
}

function update_speed(value){
  /**
   * タイミング値のアップデート処理
   * value...設定時は、タイミング値を更新する。未設定時はスライダーの値を反映する。
   */
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

function play(hz) {
  /**
   * 任意の周波数で発声する
   * hz...周波数
   */
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
 */
function playerPlay() {
  playState = true;
  rhythm = -1;
  document.getElementById("playpause").textContent = "■";
  nextTick();
}

/**
 * 音楽の再生をただちに停止する
 */
function playerStop() {
  playState = false;
  document.getElementById("playpause").textContent = "▶";
  if(tickID) clearTimeout(tickID);
  Array.from(document.getElementsByClassName("note")).forEach((n) => {
    n.classList.remove("note");
  });
}

/**
 * 音楽の再生を停止し・再開する
 */
function playerRestart() {
  playerStop();
  playerPlay();
}

document.getElementById("playpause").addEventListener("click", (e) => {
  /**
   * 再生・停止ボタン
   */
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
