/**
 * ページの状態変更を示すイベントハンドラ。ページの切り替えなどのタイミングで発生する。
 * @param {Number} oldValue 直前に開いていたページのページ番号(1オリジン)。switchPage()以外のタイミングで呼ばれた際はundefined。
 * @param {Number} current 現在開いているページのページ番号(1オリジン)。
 * @param {Number} length ページの最大数。addNewPage()以外のタイミングで呼ばれた際はundefined。
 */
const EVENTNAME_CHANGEPAGE = "changepages"
/**
 * ノートの状態変更を示すイベントハンドラ。ページの読み込み時にも発生する。
 * @param {String} scale 音色を示す文字。cdefgabCのいずれか。ページの全体的な変更の際はundefinedとなる。
 * @param {Number} position 音の位置を示すインデックス。ページの全体的な変更の際はundefinedとなる。
 * @param {Boolean} state 音がオンになったのか、オフになったのかを示す値。ページの全体的な変更の際はundefinedとなる。
 * @param {notes} Array 現在のページのノートリスト。
 */
const EVENTNAME_NOTES = "note";
const scales = "cdefgabC".split("");
/**
 * スコアを管理するクラス
 */
export class ScoreMap {
  /**
   * 初期化
   */
  constructor() {
    this.formatScore();
  }

  /**
   * ノートの状態を取得する
   * @param {String} scale 音階を示す記号(cdefgabC)
   * @param {Number} position 音の位置を示す数値(0-7)
   * @return {Boolean} ノートオン状態であればtrue
   */
  getNotes(scale, position){
    return this.currentPage.notes[scale][position];
  }

  /**
   * ノートの状態を設定する
   * @param {String} scale 音階を示す記号(cdefgabC)
   * @param {Number} position 音の位置を示す数値(0-7)
   * @param {Boolean} state ノートオン状態であればtrue。省略した場合、今の値を反転する
   * @returns {ScoreMap} 自分自身
   */
  setNotes(scale, position, state){
    state = this.currentPage.notes[scale][position] = state != undefined ? state : !this.getNotes(scale, position);
    this.fireEvent({
      "type": EVENTNAME_NOTES,
      "scale": scale,
      "position": position,
      "state": state,
      "notes": this.currentPage.notes,
    });
    return this;
  }

  /**
   * スコアマップを初期化する
   */
  formatScore(){
    this._pages = [];
    this._currentPageIndex = 0;
    this.addNewPage(true);
  }

  /**
   * 新しいページを作成する
   * @param {Boolean} switchCurrent 作成後、そのページを表示する場合はtrue
   */
  addNewPage(switchCurrent){
    let p = new Page();
    p.statusChangeHandler = () => {
      this.fireEvent({
        "type": EVENTNAME_NOTES,
        "notes": this.currentPage.notes,
      });
    };
    this._pages.push(p);
    this.fireEvent({
      "type": EVENTNAME_CHANGEPAGE,
      "current": this._currentPageIndex + 1,
      "length": this._pages.length,
    });
    if (switchCurrent) {
      this.switchPage(this._pages.length - 1);
    }
  }

  /**
   * ページを削除する
   * @param {Number} pageIndex 削除するページ
   */
  removePage(pageIndex){
    if(this._currentPageIndex == pageIndex && this._currentPageIndex > 0){
      this._currentPageIndex = pageIndex - 1;
    }
    this._pages.splice(pageIndex, 1);
    this.fireEvent({
      "type": EVENTNAME_CHANGEPAGE,
      "current": this._currentPageIndex + 1,
      "length": this._pages.length,
    });
    this.switchPage(this._currentPageIndex);
  }

  /**
   * ページを切り替える。
   * 現在のページを再読み込みする場合は、表示中のページインデックスを指定してこのメソッドを呼び出すこと。
   * @param {Number} pageIndex 新しいページのインデックス
   */
  switchPage(pageIndex){
    let oldValue = this._currentPageIndex;
    this._currentPageIndex = pageIndex;
    this.fireEvent({
      "type": EVENTNAME_NOTES,
      "notes": this.currentPage.notes,
    });
    this.fireEvent({
      "type": EVENTNAME_CHANGEPAGE,
      "past": oldValue + 1,
      "current": this._currentPageIndex + 1
    })
  }

  /**
   * 現在開いているページのインデックスを取得する
   * @returns {Number} ページインデックス
   */
  get pageIndex(){
    return this._currentPageIndex;
  }

  /**
   * 現在開いているページを取得する
   * @returns {Page} ページオブジェクト
   */
  get currentPage(){
    return this._pages[this._currentPageIndex];
  }

  /**
   * スコア上のページ数を取得する
   * @returns {Number} ページ数
   */
  get pageLength(){
    return this._pages.length;
  }

  /**
   * 保存するデータを取得する
   * @returns {object} 保存用のデータ
   */
  get saveData(){
    let data = {
      "pages": []
    };
    this._pages.forEach((p) => {
      data.pages.push(p.notes);
    });
    return data;
  }

  /**
   * データをページデータに設定する
   * @param {object}} data 読み込み用のデータ
   */
  loadData(data){
    this._pages = [];
    data.pages.forEach((d) => {
      let p = new Page(d);
      p.statusChangeHandler = () => {
        this.fireEvent({
          "type": EVENTNAME_NOTES,
          "notes": this.currentPage.notes,
        });
      };
      this._pages.push(p);
    });
    this.fireEvent({
      "type": EVENTNAME_CHANGEPAGE,
      "current": this._currentPageIndex + 1,
      "length": this._pages.length,
    });
    this.switchPage(0);
  }
  /**
   * ノート設定をlocalStorageに保存する
   * @param {String} saveSlotName 保存する際の名称
   * @returns {ScoreMap} 自分自身
   */
  saveMap(saveSlotName){
    let data = this.saveData;
    localStorage.setItem(saveSlotName, JSON.stringify(data));
    return this;
  }

  /**
   * ノート設定をlocalStorageから読み込む
   * @param {String} saveSlotName 読み込む際の名称
   * @returns {Array} 読み込んだデータを示す配列
   */
  loadMap(loadSlotName){
    let data = JSON.parse(localStorage.getItem(loadSlotName));
    if(data && data.pages){
      this.loadData(data);
    }else{
      this.formatScore();
    }
    return data;
  }

  // https://qiita.com/yama_mo/items/584584a009dfd518530c
  /**
   * イベントリスナーを追加する
   * @param {String} type イベントタイプ
   * @param {Code} listener イベントリスナー
   */
  addEventListener(type, listener) {
    if(!this.hasOwnProperty("_listeners")){
      this._listeners = [];
    }
    if(typeof this._listeners[type] == 'undefined'){
      this._listeners[type] = [];
    }

    this._listeners[type].push(listener);
  }

  /**
   * イベントを発生させる
   * @param {EventTarget} event イベントオブジェクト
   */
  fireEvent(event) {
    if(!event.target){
      event.target = this;
    }
    if(!event.type){
      throw new Error("Event object missing 'type' property.");
    }
    if(this._listeners && this._listeners[event.type] instanceof Array){
      let listeners = this._listeners[event.type];
      for(let i=0;i<listeners.length;i++){
        listeners[i].call(this, event)
      }
    }
  }

  /**
   * イベントリスナを削除する
   * @param {String} type イベントタイプ
   * @param {Code} listener イベントリスナー
   */
  removeEventListener(type, listener) {
    if(this._listeners && this._listeners[type] instanceof Array){
      let listeners = this._listeners[type];
      for(let i=0;i<listeners.length;i++){
        if(listeners[i] === listener){
          listeners.splice(i,1);
          break;
        }
      }
    }
  }
}

class Page {

  /**
   * ページの状態が変化したときに呼び出されるハンドラ
   */
  statusChangeHandler = undefined;

  constructor(notes) {
    if(notes){
      this.notes = notes;
    }else{
      this.notes = {};
      this.clean();
    }
  }

  /**
   * ページ内のノートをすべて削除する
   */
  clean() {
    scales.forEach((s) => {
      this.notes[s] = Array(8).fill(false);
    });
    if(this.statusChangeHandler) this.statusChangeHandler();
  }
}
