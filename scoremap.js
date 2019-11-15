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
export class ScoreMap {
  /**
   * スコアを管理するクラス
   */
  constructor() {
    /**
     * 初期化
     */
    this.formatScore();
  }

  getNotes(scale, position){
    /**
     * ノートの状態を取得する
     * @param {String} scale 音階を示す記号(cdefgabC)
     * @param {Number} position 音の位置を示す数値(0-7)
     * @return {Boolean} ノートオン状態であればtrue
     */
    return this.currentPage.notes[scale][position];
  }

  setNotes(scale, position, state){
    /**
     * ノートの状態を設定する
     * @param {String} scale 音階を示す記号(cdefgabC)
     * @param {Number} position 音の位置を示す数値(0-7)
     * @param {Boolean} state ノートオン状態であればtrue。省略した場合、今の値を反転する
     * @returns {ScoreMap} 自分自身
     */
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
    this._pages.push(new Page());
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

  saveMap(saveSlotName){
    /**
     * ノート設定をlocalStorageに保存する
     * @param {String} saveSlotName 保存する際の名称
     * @returns {ScoreMap} 自分自身
     */
    let data = {
      "pages": []
    };
    this._pages.forEach((p) => {
      data.pages.push(p.notes);
    });
    localStorage.setItem(saveSlotName, JSON.stringify(data));
    return this;
  }

  loadMap(loadSlotName){
    /**
     * ノート設定をlocalStorageから読み込む
     * @param {String} saveSlotName 読み込む際の名称
     * @returns {Array} 読み込んだデータを示す配列
     */
    let data = JSON.parse(localStorage.getItem(loadSlotName));
    if(data && data.pages){
      this._pages = [];
      data.pages.forEach((d) => {
        this._pages.push(new Page(d));
      });
      this.fireEvent({
        "type": EVENTNAME_CHANGEPAGE,
        "current": this._currentPageIndex + 1,
        "length": this._pages.length,
      });
      this.switchPage(0);
    }else{
      this.formatScore();
    }
    return data;
  }

  // https://qiita.com/yama_mo/items/584584a009dfd518530c
  addEventListener(type, listener) {
    if(!this.hasOwnProperty("_listeners")){
      this._listeners = [];
    }
    if(typeof this._listeners[type] == 'undefined'){
      this._listeners[type] = [];
    }

    this._listeners[type].push(listener);
  }

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

  removeEventListener(type, listener) {
    if(this._listeners && this._listeners[type] instanceof Array){
      let listeners = this._listeners[type];
      for(let i=0;i<listeners.length;i++){
        if(listeners[i] === listeners){
          listeners.splice(i,1);
          break;
        }
      }
    }
  }
}

class Page {
  constructor(notes) {
    if(notes){
      this.notes = notes;
    }else{
      this.notes = {};
      scales.forEach((s) => {
        this.notes[s] = Array(8).fill(false);
      });
    }
  }
}
