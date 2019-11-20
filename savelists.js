/**
 * スコアのデータを管理するクラス
 */
export class SaveList {
  /**
   * 初期化
   * @param {String} saveName データを保存するスロット名
   */
  constructor(saveName) {
    this._saveName = saveName;
    this._document = document;
    let n = localStorage.getItem(saveName);
    if(n){
      this._saveList = JSON.parse(n);
    }else{
      this._saveList = {};
    }
  }

  /**
   * データを読み込む
   * @param {String} name データ名
   */
  getItem(name){
    return this._saveList[name];
  }

  /**
   * データを保存する
   * @param {String} name データ名
   * @param {object} data データ
   */
  setItem(name, data){
    this._saveList[name] = data;
    this._saveDataList();
  }

  /**
   * データリストを保存する
   */
  _saveDataList(){
    localStorage.setItem(this._saveName, JSON.stringify(this._saveList));
  }

}