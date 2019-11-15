import {ScoreMap} from './scoremap.js';
const notes = 8;
const scales = "cdefgabC".split("");
const scaleNotes = [60, 62, 64, 65, 67, 69, 71, 72];
const SETTING_NAMEROOT = "Display_";
const SETTING_SAVETONES = SETTING_NAMEROOT + "Notes";
const SETTING_SAVESPEED = SETTING_NAMEROOT + "Speed";
let rhythm = -1;
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
  scoremap.addEventListener("note",(e) => {
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
  });
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
    setTimeout(tick, timing);
    }
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

document.getElementById("playpause").addEventListener("click", (e) => {
  /**
   * 再生・停止ボタン
   */
  if(playState){
    playState = false;
    rhythm = 0;
    e.target.textContent = "▶";
    Array.from(document.getElementsByClassName("note")).forEach((n) => {
      n.classList.remove("note");
    });
  }else{
    playState = true;
    rhythm = 0;
    e.target.textContent = "■";
    tick();
  }
});

document.getElementById("speed").addEventListener("input", update_speed);


init();
