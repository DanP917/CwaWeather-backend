require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// CWA API 設定
const CWA_API_BASE_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001";
const CWA_API_KEY = process.env.CWA_API_KEY;

// 英文地區 → 中文地區對應表（前端可用英文代碼）
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * 取得動態地區 36 小時天氣預報
 * 使用 F-C0032-001
 */
const getWeatherByLocation = async (req, res) => {
  try {
    const locationKey = req.params.location; // ex: kaohsiung
    const locationName = locationMap[locationKey];

    if (!locationName) {
      return res.status(400).json({
        error: "無效的地區",
        message: `查無此地區：${locationKey}`,
      });
    }

    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: "伺服器設定錯誤",
        message: "請在 .env 設定 CWA_API_KEY",
      });
    }

    // 呼叫中央氣象局 API
    const response = await axios.get(CWA_API_BASE_URL, {
      params: {
        Authorization: CWA_API_KEY,
        locationName
      },
    });

    const locationData = response.data.records.location[0];

    if (!locationData) {
      return res.status(404).json({
        error: "查無資料",
        message: `無法取得 ${locationName} 天氣資料`,
      });
    }

    const weatherData = {
      city: locationData.locationName,
      updateTime: response.data.records.datasetDescription,
      forecasts: [],
    };

    const weatherElements = locationData.weatherElement;
    const timeCount = weatherElements[0].time.length;

    // 整理資料
    for (let i = 0; i < timeCount; i++) {
      const forecast = {
        startTime: weatherElements[0].time[i].startTime,
        endTime: weatherElements[0].time[i].endTime,
        weather: "",
        rain: "",
        minTemp: "",
        maxTemp: "",
        comfort: "",
        windSpeed: "",
      };

      weatherElements.forEach((element) => {
        const value = element.time[i].parameter;

        switch (element.elementName) {
          case "Wx":
            forecast.weather = value.parameterName;
            break;
          case "PoP":
            forecast.rain = value.parameterName + "%";
            break;
          case "MinT":
            forecast.minTemp = value.parameterName + "°C";
            break;
          case "MaxT":
            forecast.maxTemp = value.parameterName + "°C";
            break;
          case "CI":
            forecast.comfort = value.parameterName;
            break;
          case "WS":
            forecast.windSpeed = value.parameterName;
            break;
        }
      });

      weatherData.forecasts.push(forecast);
    }

    res.json({
      success: true,
      data: weatherData,
    });

  } catch (error) {
    console.error("取得天氣資料失敗:", error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        error: "CWA API 錯誤",
        message: error.response.data.message || "無法取得天氣資料",
        details: error.response.data,
      });
    }

    res.status(500).json({
      error: "伺服器錯誤",
      message: "無法取得天氣資料，請稍後再試",
    });
  }
};

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "歡迎使用 CWA 36 小時天氣預報 API",
    example: "/api/weather/kaohsiung",
  });
});

// 動態地區 API（⭐重點）
app.get("/api/weather/:location", getWeatherByLocation);

// 健康監測
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 啟動
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 伺服器運行中 on port ${PORT}`);
});
