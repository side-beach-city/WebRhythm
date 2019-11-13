const scales = "cdefgabC".split("");
export class ScoreMap {
  /**
   * スコアを管理するクラス
   */
  constructor() {
    /**
     * 初期化
     */
    this.currentPage = new Page();
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
    this.currentPage.notes[scale][position] = state != undefined ? state : !this.getNotes(scale, position);
    return this;
  }

  saveMap(saveSlotName){
    /**
     * ノート設定をlocalStorageに保存する
     * @param {String} saveSlotName 保存する際の名称
     * @returns {ScoreMap} 自分自身
     */
    localStorage.setItem(saveSlotName, JSON.stringify(this.currentPage.notes));
    return this;
  }

  loadMap(loadSlotName){
    /**
     * ノート設定をlocalStorageから読み込む
     * @param {String} saveSlotName 読み込む際の名称
     * @returns {Array} 読み込んだデータを示す配列
     */
    let data = JSON.parse(localStorage.getItem(loadSlotName));
    if(data){
      this.currentPage.notes = data;
    }
    return data;
  }
}

class Page {
  constructor(notes) {
    this.notes = {}
    scales.forEach((s) => {
      this.notes[s] = Array(8).fill(false);
    });
  }
}
