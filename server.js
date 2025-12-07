require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// CWA API 設定
const CWA_API_BASE_URL = "https://opendata.cwa.gov.tw/api";
const CWA_API_KEY = process.env.CWA_API_KEY;

// 地區對應表（地區名稱對應 API locationName）
const locationMap = {
  taipei: "臺北市",
  newtaipei: "新北市",
  taoyuan: "桃園市",
  taichung: "臺中市",
  tainan: "臺南市",
  kaohsiung: "高雄市",
  keelung: "基隆市",
  hsinchu_city: "新竹市",
  hsinchu_county: "新竹縣",
  miaoli: "苗栗縣",
  changhua: "彰化縣",
  nantou: "南投縣",
  yunlin: "雲林縣",
  chiayi_city: "嘉義市",
  chiayi_county: "嘉義縣",
  pingtung: "屏東縣",
  yilan: "宜蘭縣",
  hualien: "花蓮縣",
  taitung: "臺東縣",
  penghu: "澎湖縣",
  kinmen: "金門縣",
  lienchiang: "連江縣"
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 取得指定地區天氣
const getWeatherByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    const locationName = locationMap[location];
    if (!locationName) {
      return res.status(400).json({ error: "未知地區" });
    }

    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: "伺服器設定錯誤",
        message: "請在 .env 設定 CWA_API_KEY"
      });
    }

    // 呼叫 CWA API
    const response = await axios.get(`${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`, {
      params: { Authorization: CWA_API_KEY, locationName }
    });

    const locationData = response.data.records.location[0];
    if (!locationData) {
      return res.status(404).json({ error: "查無資料" });
    }

    const weatherData = {
      city: locationData.locationName,
      updateTime: response.data.records.datasetDescription,
      forecasts: []
    };

    const weatherElements = locationData.weatherElement;
    const timeCount = weatherElements[0].time.length;

    for (let i = 0; i < timeCount; i++) {
      const forecast = {
        startTime: weatherElements[0].time[i].startTime,  // 正確帶入 startTime
        endTime: weatherElements[0].time[i].endTime,      // 正確帶入 endTime
        weather: "",
        rain: "",
        minTemp: "",
        maxTemp: "",
        comfort: "",
        windSpeed: ""
      };

      weatherElements.forEach(el => {
        const value = el.time[i].parameter;
        switch (el.elementName) {
          case "Wx": forecast.weather = value.parameterName; break;
          case "PoP": forecast.rain = value.parameterName + "%"; break;
          case "MinT": forecast.minTemp = value.parameterName + "°C"; break;
          case "MaxT": forecast.maxTemp = value.parameterName + "°C"; break;
          case "CI": forecast.comfort = value.parameterName; break;
          case "WS": forecast.windSpeed = value.parameterName; break;
        }
      });

      weatherData.forecasts.push(forecast);
    }

    res.json({ success: true, data: weatherData });
  } catch (error) {
    console.error("取得天氣資料失敗:", error.message);
    res.status(500).json({ error: "伺服器錯誤", message: error.message });
  }
};

// Routes
app.get('/api/weather/:location', getWeatherByLocation);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  res.status(500).json({ error: '伺服器錯誤', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: '找不到此路徑' });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 伺服器運行已運作, 監聽埠 ${PORT}`);
});
