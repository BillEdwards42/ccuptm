# CCU 打工地圖 (CCU Part-Time Work Map)

一個互動式地圖網站，展示中正大學附近的打工機會與詳細資訊。

## 功能

- 互動式地圖顯示打工地點位置
- 自動聚合鄰近的標記以避免重疊
- 點擊標記顯示詳細工作資訊
- 響應式設計，支援行動裝置
- 顯示客觀指標（時薪、供餐、試用期等）與主觀評分
- 店家認證標章

## 技術

- HTML5 / CSS3
- JavaScript
- Leaflet.js 地圖庫
- Leaflet.MarkerCluster 插件

## 文件結構

```
/
├── index.html              # 首頁
├── map.html                # 地圖頁面
├── about.html              # 勞工權益頁面
├── src/                    # 源碼目錄
│   ├── css/                # 樣式表
│   │   ├── styles.css      # 主要樣式
│   │   └── intro-mobile.css # 首頁行動版樣式
│   ├── js/                 # JavaScript 文件
│   │   └── script.js       # 主要腳本文件
│   ├── data/               # 資料文件
│   │   └── establishments.geojson # 打工地點資料
│   └── images/             # 圖片資源
│       └── p_logo.png      # 網站標誌
└── README.md               # 專案說明文件
```

## 如何使用

1. 克隆此存儲庫
2. 開啟 `index.html` 或 `map.html` 即可使用

## 打工地點資料

打工地點資料儲存在 `src/data/establishments.geojson` 檔案中，包含以下資訊：

- 名稱
- 位置 (經緯度)
- 時薪
- 福利資訊（供餐、試用期、勞健保、國定雙倍）
- 評分資訊（環境評分、滿意度評分）
- 認證狀態
- 資訊更新日期

## 團隊

此專案是由國立中正大學 2025 畢業專題團隊所開發。

## 授權

© 2025 CCU 打工地圖團隊。保留所有權利。