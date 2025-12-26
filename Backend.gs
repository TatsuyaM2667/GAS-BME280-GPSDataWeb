
const SPREADSHEET_ID = '';
const SHEET_NAME = 'Sheet1';


// HTMLファイルを表示する関数
function doGet(e) {
  if (e && e.parameter && e.parameter.mode === 'getChartData') {
    const chartData = getChartData();
    return ContentService.createTextOutput(JSON.stringify(chartData))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.mode === 'getLatestData') {
    const latest = getLatestData();
    return ContentService.createTextOutput(JSON.stringify(latest))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // デフォルトは従来のHTMLページ
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}// データ初期化関数（ヘッダーを残してデータクリア）
function resetSheetData() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return { result: 'error', message: `シート " ${SHEET_NAME} " が見つかりません` };
    }
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    return { result: 'success', message: 'データが初期化されました（ヘッダーは残ります）' };
  } catch (e) {
    return { result: 'error', message: e.toString() };
  }
}

function testSpreadsheetConnection() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('スプレッドシート名:', spreadsheet.getName());

    const sheets = spreadsheet.getSheets();
    console.log('利用可能なシート:');
    sheets.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.getName()}`);
    });

    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      console.log(`エラー: シート " ${SHEET_NAME} " が見つかりません`);
      return;
    }

    const range = sheet.getDataRange();
    const values = range.getValues();

    console.log('データ範囲:', range.getA1Notation());
    console.log('行数:', values.length);
    console.log('列数:', values[0] ? values[0].length : 0);

    if (values.length > 0) {
      console.log('ヘッダー行:', values[0]);
    }
    if (values.length > 1) {
      console.log('最初のデータ行:', values[1]);
      console.log('最後のデータ行:', values[values.length - 1]);
    }

    return {
      spreadsheetName: spreadsheet.getName(),
      sheetName: sheet.getName(),
      dataRange: range.getA1Notation(),
      rows: values.length,
      columns: values[0] ? values[0].length : 0,
      headers: values[0] || [],
      sampleData: values[1] || []
    };

  } catch (error) {
    console.error('スプレッドシート接続エラー:', error);
    return { error: error.toString() };
  }
}


function getLatestData() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    const range = sheet.getDataRange();
    const values = range.getValues();

    console.log('取得したデータ行数:', values.length);
    console.log('ヘッダー行:', values[0]);
    if (values.length > 1) {
      console.log('最新データ行:', values[values.length - 1]);
    }

    if (values.length <= 1) {
      return { error: 'データが見つかりません' };
    }

    let currentData = null;
    for (let i = values.length - 1; i >= 1; i--) {   // インデックス1から開始（ヘッダーをスキップ）
      const row = values[i];

      const tempValid = row[0] !== null && row[0] !== undefined && row[0] !== '' && !isNaN(parseFloat(row[0])) && parseFloat(row[0]) !== 0;
      const humidityValid = row[1] !== null && row[1] !== undefined && row[1] !== '' && !isNaN(parseFloat(row[1])) && parseFloat(row[1]) !== 0;
      const pressureValid = row[2] !== null && row[2] !== undefined && row[2] !== '' && !isNaN(parseFloat(row[2])) && parseFloat(row[2]) !== 0;

      const hasValidData = tempValid || humidityValid || pressureValid;

      console.log(`行 ${i + 1} をチェック中:`, row);
      console.log(`  温度有効:  ${tempValid}, 湿度有効:  ${humidityValid}, 気圧有効:  ${pressureValid}`);

      if (hasValidData) {
        currentData = row;
        console.log('有効なデータ行を発見 (行番号:', i + 1, '):', currentData);
        break;
      }
    }

    
    if (!currentData) {
      currentData = values[values.length - 1];
      console.log('有効なデータが見つからないため最後の行を使用:', currentData);
    }

    
    function safeValue(value, defaultValue = 0) {
      if (value === null || value === undefined || value === '') {
        return defaultValue;
      }
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return numValue;
      }
      return defaultValue;
    }

    
    let timestampString;
    if (currentData[5]) {
      if (currentData[5] instanceof Date) {
        timestampString = currentData[5].toLocaleString('ja-JP');
      } else {
        try {
          const dateObj = new Date(currentData[5]);
          if (!isNaN(dateObj.getTime())) {
            timestampString = dateObj.toLocaleString('ja-JP');
          } else {
            timestampString = currentData[5].toString();
          }
        } catch (e) {
          timestampString = currentData[5].toString();
        }
      }
    } else {
      timestampString = new Date().toLocaleString('ja-JP');
    }

    const result = {
      temperature: safeValue(currentData[0]),
      humidity: safeValue(currentData[1]),
      pressure: safeValue(currentData[2]),
      latitude: safeValue(currentData[3]),
      longitude: safeValue(currentData[4]),
      timestamp: timestampString
    };

    console.log('返すデータ:', result);
    return result;

  } catch (error) {
    console.error('データ取得エラー:', error);
    return {
      error: error.toString(),
      temperature: 0,
      humidity: 0,
      pressure: 0,
      latitude: 0,
      longitude: 0,
      timestamp: new Date().toLocaleString('ja-JP')
    };
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const temperature = data.temperature;
    const humidity = data.humidity;
    const pressure = data.pressure;
    const latitude = data.latitude;
    const longitude = data.longitude;
    const timestamp = new Date();

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    sheet.appendRow([temperature, humidity, pressure, latitude, longitude, timestamp]);

    return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log(err);
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: err }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


function getChartData() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    const range = sheet.getDataRange();
    const values = range.getValues();

    if (values.length <= 1) {
      return [];
    }

    const dataRows = values.slice(1).filter(row => {
      const tempValid = row[0] !== null && row[0] !== undefined && row[0] !== '' && !isNaN(parseFloat(row[0])) && parseFloat(row[0]) !== 0;
      const humidityValid = row[1] !== null && row[1] !== undefined && row[1] !== '' && !isNaN(parseFloat(row[1])) && parseFloat(row[1]) !== 0;
      const pressureValid = row[2] !== null && row[2] !== undefined && row[2] !== '' && !isNaN(parseFloat(row[2])) && parseFloat(row[2]) !== 0;
      return tempValid || humidityValid || pressureValid;
    });

    if (dataRows.length === 0) {
      return [];
    }

    function safeValue(value) {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return numValue;
      }
      return null;
    }

    return dataRows.map((row, index) => {
      let timestampString;
      if (row[5]) {
        if (row[5] instanceof Date) {
          timestampString = row[5].toLocaleString('ja-JP');
        } else {
          try {
            const dateObj = new Date(row[5]);
            if (!isNaN(dateObj.getTime())) {
              timestampString = dateObj.toLocaleString('ja-JP');
            } else {
              timestampString = `データ ${index + 1}`;
            }
          } catch (e) {
            timestampString = `データ ${index + 1}`;
          }
        }
      } else {
        timestampString = `データ ${index + 1}`;
      }
      return {
        temperature: safeValue(row[0]),
        humidity: safeValue(row[1]),
        pressure: safeValue(row[2]),
        latitude: safeValue(row[3]),
        longitude: safeValue(row[4]),
        timestamp: timestampString
      };
    });

  } catch (error) {
    console.error('グラフデータ取得エラー:', error);
    return [];
  }
}

// デバッグ用の関数を追加
function debugLatestData() {
  console.log('=== デバッグ開始 ===');
  const result = getLatestData();
  console.log('=== デバッグ結果 ===');
  console.log('結果:', result);
  return result;
}

// より詳細なデバッグ関数
function debugSpreadsheetData() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    const range = sheet.getDataRange();
    const values = range.getValues();

    console.log('=== スプレッドシート詳細デバッグ ===');
    console.log('総行数:', values.length);

    const lastRows = values.slice(-5);
    lastRows.forEach((row, index) => {
      const actualIndex = values.length - 5 + index;
      console.log(`行 ${actualIndex + 1}:`, row);
      console.log(`  - 温度:  ${row[0]}  (型:  ${typeof row[0]})`);
      console.log(`  - 湿度:  ${row[1]}  (型:  ${typeof row[1]})`);
      console.log(`  - 気圧:  ${row[2]}  (型:  ${typeof row[2]})`);
      console.log(`  - 緯度:  ${row[3]}  (型:  ${typeof row[3]})`);
      console.log(`  - 経度:  ${row[4]}  (型:  ${typeof row[4]})`);
      console.log(`  - タイムスタンプ:  ${row[5]}  (型:  ${typeof row[5]})`);
    });

    return lastRows;
  } catch (error) {
    console.error('デバッグエラー:', error);
    return { error: error.toString() };
  }
}

// 定期実行用の関数（トリガーで設定）
function checkForUpdates() {
  const data = getLatestData();
  console.log('最新データ:', data);
  const properties = PropertiesService.getScriptProperties();
  const lastTimestamp = properties.getProperty('lastTimestamp');
  if (data.timestamp && data.timestamp !== lastTimestamp) {
    console.log('新しいデータが検出されました');
    properties.setProperty('lastTimestamp', data.timestamp);
    // ここで必要に応じて通知処理などを実行
  }
}

// 初期設定用の関数
function setup() {
  ScriptApp.newTrigger('checkForUpdates')
    .timeBased()
    .everyMinutes(1)
    .create();
  console.log('トリガーが設定されました');
}

// トリガーを削除する関数（必要に応じて）
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  console.log('すべてのトリガーが削除されました');
}


/**
 * Open-Meteo APIから時間ごとの天気予報データを取得。
 * @param {number} latitude 地点の緯度。
 * @param {number} longitude 地点の経度。
 * @return {Object} 時間ごとの予報データまたはエラーメッセージを含むオブジェクト。
 */
function getWeatherForecast(latitude, longitude) {
  if (!latitude || !longitude || latitude === 0 || longitude === 0) {
    return { error: "位置情報が利用できません。天気予報を表示できません。" };
  }

  // Open-Meteo.comのAPIエンドポイント
  // hourly=temperature_2m,weathercode: 温度と天気コードを取得
  // timezone=Asia%2FTokyo: 日本のタイムゾーンに設定
  // forecast_hours=24: 次の24時間分の予報
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weathercode&timezone=Asia%2FTokyo&forecast_hours=24`;

  try {
    const response = UrlFetchApp.fetch(url);
    const json = JSON.parse(response.getContentText());

    if (json.error) {
      return { error: `天気予報の取得中にエラーが発生しました: ${json.reason || "不明なエラー"}` };
    }

    const hourly = json.hourly;
    const forecastData = [];

    // 次の24時間分のデータ（Open-Meteoは1時間ステップで提供）
    for (let i = 0; i < hourly.time.length; i++) {
      const time = new Date(hourly.time[i]);
      // 日本語のHH:mm形式にフォーマット
      const formattedTime = Utilities.formatDate(time, "JST", "HH:mm");
      const temperature = hourly.temperature_2m[i];
      const weathercode = hourly.weathercode[i];

      // WMO Weather interpretation codes (天気コードを分かりやすい説明に変換)
      const description = getWeatherDescription(weathercode);
      const icon = getWeatherIcon(weathercode); // 天気コードからOpenWeatherMapのアイコンに似たものを推測

      forecastData.push({
        time: formattedTime,
        temperature: temperature,
        description: description,
        icon: icon
      });
      // 次の8つ（24時間分）だけ取得
      if (forecastData.length >= 8) break;
    }

    return { forecast: forecastData };

  } catch (e) {
    return { error: `天気予報の取得中に例外が発生しました: ${e.message}` };
  }
}

/**
 * WMO Weather interpretation codesに基づいて天気の説明を返します。
 * Open-Meteoのドキュメント: https://www.open-meteo.com/en/docs#weathercodes
 */
function getWeatherDescription(code) {
  switch (code) {
    case 0: return "快晴";
    case 1: return "晴れ"; // 主に晴れ
    case 2: return "一部曇り"; // 部分的に曇り
    case 3: return "曇り"; // 曇り
    case 45: return "霧";
    case 48: return "霧氷";
    case 51: return "霧雨 (小)";
    case 53: return "霧雨 (中)";
    case 55: return "霧雨 (強)";
    case 56: return "着氷性霧雨 (小)";
    case 57: return "着氷性霧雨 (強)";
    case 61: return "小雨";
    case 63: return "中程度の雨";
    case 65: return "大雨";
    case 66: return "着氷性小雨";
    case 67: return "着氷性大雨";
    case 71: return "小雪";
    case 73: return "中程度の雪";
    case 75: return "大雪";
    case 77: return "雪の粒";
    case 80: return "小雨の通り雨";
    case 81: return "中程度の雨の通り雨";
    case 82: return "激しい雨の通り雨";
    case 85: return "小雪の通り雨";
    case 86: return "大雪の通り雨";
    case 95: return "雷雨 (軽度/中程度)";
    case 96: return "雷雨 (小雨/雪)";
    case 99: return "雷雨 (雹)";
    default: return "不明";
  }
}

/**
 * Open-Meteoの天気コードに基づいてOpenWeatherMapに似たアイコンコードを返します。
 

 */
function getWeatherIcon(code) {
  switch (code) {
    case 0: return "01d"; // 快晴
    case 1: return "01d"; // 晴れ（一部雲）
    case 2: return "02d"; // 一部曇り
    case 3: return "04d"; // 曇り
    case 45:
    case 48: return "50d"; // 霧
    case 51:
    case 53:
    case 55: return "09d"; // 霧雨
    case 56:
    case 57: return "13d"; // 着氷性霧雨 (雪アイコンに分類)
    case 61:
    case 63:
    case 65: return "10d"; // 雨
    case 66:
    case 67: return "13d"; // 着氷性雨 (雪アイコンに分類)
    case 71:
    case 73:
    case 75:
    case 77: return "13d"; // 雪
    case 80:
    case 81:
    case 82: return "09d"; // 通り雨
    case 85:
    case 86: return "13d"; // 雪の通り雨
    case 95:
    case 96:
    case 99: return "11d"; // 雷雨
    default: return "01d"; // デフォルト（晴れ）
  }
}
