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
      this._saveList = [];
    }
  }

  /**
   * データ名のリストを取得する
   * @returns {Array} 保存されているデータの名称リスト
   */
  getNameList(){
    return this._saveList.map(d => d.name);
  }

  /**
   * データを読み込む
   * @param {String} name データ名
   */
  getItem(name){
    return this._saveList.find(d => d.name == name);
  }

  /**
   * データを保存する
   * @param {String} name データ名
   * @param {object} data データ
   */
  setItem(name, data){
    data.name = name;
    let index = this._saveList.findIndex(d => d.name == name);
    if(index >= 0){
      this._saveList[index] = data;
    }else{
      this._saveList.push(data);
    }
    this._saveDataList();
  }

  /**
   * エクスポートのための文字列を取得する
   * @returns {String} エクスポートのための文字列
   */
  export(){
    return btoa(encodeURIComponent(JSON.stringify(this._saveList)));
  }

  /**
   * 文字列データよりデータリストを読み込む
   * @param {String} data エクスポートされた文字列
   */
  import(data){
    this._saveList = JSON.parse(decodeURIComponent(atob(data)));
    this._saveDataList();
  }

  /**
   * データリストを保存する
   */
  _saveDataList(){
    localStorage.setItem(this._saveName, JSON.stringify(this._saveList));
  }

}