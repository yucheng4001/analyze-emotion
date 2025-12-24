import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import mqtt from 'mqtt';



// --- 子頁面 1：首頁 ---
const HomePage = ({ viewDate, setViewDate, diaries, COLORS, setEditingDate, setDiaryTitle, setSelectedEmotion, setDiaryContent, setCurrentPage }) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  return (
    <div className="p-8">
      <div className="flex space-x-4 mb-6">
        {Object.entries(COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
            <span className="text-sm text-gray-600">{label}</span>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-100 rounded-full text-xl text-gray-400">◀</button>
          <h2 className="text-2xl font-bold text-gray-700">{year} 年 {month + 1} 月</h2>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-100 rounded-full text-xl text-gray-400">▶</button>
        </div>
        <div className="grid grid-cols-7 border-t border-l border-gray-300">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} className="bg-gray-50 p-3 font-bold text-center border-r border-b border-gray-300 text-gray-500">{d}</div>
          ))}
          {[...Array(firstDayIndex)].map((_, i) => (
            <div key={`empty-${i}`} className="h-24 border-r border-b border-gray-300 bg-gray-50/30"></div>
          ))}
          {[...Array(daysInMonth)].map((_, i) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
            const savedData = diaries[dateStr];
            const tooltipMovies = Array.isArray(savedData?.recommendedMovies) ? savedData.recommendedMovies : [];
            const hasDetection = Boolean(savedData?.detectedEmotion || tooltipMovies.length > 0);
            const emotionLabel = savedData?.detectedEmotion || savedData?.emotion;
            const bubbleColor = emotionLabel && COLORS[emotionLabel] ? COLORS[emotionLabel] : null;
            const hasDiaryContent = Boolean(savedData?.content);

            return (
              <div
                key={i}
                onClick={() => {
                  setEditingDate(dateStr);
                  const data = diaries[dateStr];
                  setDiaryTitle(data ? data.title : "");
                  setSelectedEmotion(data ? data.emotion : "");
                  setDiaryContent(data ? data.content : "");
                  setCurrentPage('日記');
                }}
                className="group h-24 border-r border-b border-gray-300 p-2 relative hover:bg-orange-50 cursor-pointer transition-colors"
              >
                <span className="text-gray-700 font-medium">{i + 1}</span>
                {hasDetection && emotionLabel && (
                  <p className="mt-1 pr-6 text-[11px] leading-snug text-gray-600">
                    當日心情：{emotionLabel}
                  </p>
                )}
                {(hasDetection || hasDiaryContent) && (
                  <span className="absolute bottom-2 left-2 flex items-center text-[10px] font-semibold">
                    {hasDetection && <span className="text-blue-500">已推薦電影</span>}
                    {hasDetection && hasDiaryContent && <span className="mx-1 text-gray-400">|</span>}
                    {hasDiaryContent && <span className="text-emerald-500">已留下日記</span>}
                  </span>
                )}
                {bubbleColor && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: bubbleColor }}
                  ></div>
                )}
                {hasDetection && (
                  <div className="pointer-events-none absolute left-1/2 bottom-full z-20 hidden w-56 -translate-x-1/2 flex-col rounded-xl bg-gray-900/95 px-4 py-3 text-white shadow-xl ring-1 ring-black/10 group-hover:flex">
                    <p className="text-xs font-semibold tracking-wide text-amber-300">已推薦電影</p>
                    {tooltipMovies.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {tooltipMovies.slice(0, 3).map((movie, idx) => (
                          <li key={idx} className="text-xs leading-snug">
                            {movie?.title?.zh || movie?.title?.en || movie?.title || '未命名作品'}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[11px] text-gray-300">目前沒有可顯示的推薦清單。</p>
                    )}
                    {tooltipMovies.length > 3 && (
                      <p className="mt-2 text-[11px] text-gray-300">還有 {tooltipMovies.length - 3} 部推薦</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- 子頁面 2：日記頁 ---
const DiaryPage = ({ editingDate, setEditingDate, diaries, diaryTitle, setDiaryTitle, selectedEmotion, setSelectedEmotion, diaryContent, setDiaryContent, handleSaveDiary, titleRef, contentRef, COLORS }) => (
  <div className="p-8 flex justify-center">
    <div className="w-full max-w-6xl border-2 border-green-200 rounded-[40px] p-12 bg-white shadow-sm">
      <div className="flex flex-row items-center justify-between mb-10">
        <div className="flex items-center flex-1 mr-10">
          <span className="text-3xl font-bold text-gray-700 mr-6 tracking-widest whitespace-nowrap">標題：</span>
          <input
            key={`title-${editingDate}`}
            type="text"
            ref={titleRef}
            defaultValue={diaryTitle}
            placeholder="請輸入今天的標題..."
            className="w-full text-2xl border-b-2 border-blue-400 outline-none py-3 px-1 focus:border-blue-600 transition-colors text-gray-700 bg-transparent font-medium"
          />
        </div>
        <input
          type="date"
          value={editingDate}
          onChange={(e) => {
            setEditingDate(e.target.value);
            const data = diaries[e.target.value];
            setDiaryTitle(data ? data.title : "");
            setSelectedEmotion(data ? data.emotion : "");
            setDiaryContent(data ? data.content : "");
          }}
          className="text-2xl border-b-2 border-gray-300 outline-none py-2 text-gray-600 focus:border-blue-400"
        />
      </div>

      <textarea
        key={`content-${editingDate}`}
        ref={contentRef}
        defaultValue={diaryContent}
        className="w-full h-[500px] border-2 border-blue-300 rounded-[30px] p-8 text-2xl outline-none focus:ring-8 ring-blue-50 text-gray-700 resize-none leading-relaxed"
        placeholder="今天過得如何？寫下你的心路歷程吧..."
      ></textarea>

      <div className="mt-12 flex justify-end">
        <button onClick={handleSaveDiary} className="bg-blue-500 text-white px-16 py-5 rounded-full hover:bg-blue-600 transition-all font-bold text-2xl shadow-xl active:transform active:scale-95">儲存日記</button>
      </div>
    </div>
  </div>
);

// --- 子頁面 3：推薦頁 ---
const RecommendationPage = ({ COLORS, onDetectionResult }) => {
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState('開心');
  const videoRef = useRef(null);
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [movies, setMovies] = useState([]);
  const wsRef = useRef(null);

  const startCamera = async () => {
    setShowResult(false);
    setIsStreamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("無法開啟相機，請檢查權限或確保在 HTTPS/localhost 下運行");
      setIsStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop()); // 徹底關閉硬體
      videoRef.current.srcObject = null;
    }
    setIsStreamActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const captureFrames = async (durationMs = 3000, intervalMs = 300) => {
    const video = videoRef.current;
    if (!video) return [];
    if (!video.videoWidth || !video.videoHeight) return [];

    const frames = [];
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    const start = performance.now();
    while (performance.now() - start < durationMs) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.8));
      await sleep(intervalMs);
    }

    return frames;
  };

  const handleDetection = async () => {
    if (!videoRef.current) return;
    setIsScanning(true);
    let pendingEmotion = detectedEmotion;
    let shouldShowResult = false;
    let errorMessage = null;

    try {
      await waitForVideoReady();
      const frames = await captureFrames();
      if (frames.length === 0) {
        throw new Error("未能擷取到足夠的影像畫格，請重新嘗試。");
      }

      const response = await fetch("http://localhost:8000/analyze-emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames }),
      });

      if (!response.ok) {
        throw new Error("辨識服務回應異常。");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.emotion) {
        pendingEmotion = data.emotion;

        const movieRes = await fetch(
          `http://localhost:8000/recommend-movies?emotion=${data.emotion}`
        );

        if (!movieRes.ok) {
          throw new Error("推薦服務回應異常。");
        }

        const movieData = await movieRes.json();
        const movieList = Array.isArray(movieData.movies) ? movieData.movies : [];
        setMovies(movieList);

        if (typeof onDetectionResult === "function") {
          onDetectionResult({ emotion: pendingEmotion, movies: movieList });
        }

        shouldShowResult = true;
      }


    } catch (err) {
      console.error("辨識失敗:", err);
      errorMessage = err.message || "無法連線至辨識伺服器，請確保後端已啟動。";
    } finally {
      if (shouldShowResult) {
        setDetectedEmotion(pendingEmotion);
        stopCamera();
        setShowResult(true);
        setShowMovieModal(true);
      }
      
      setIsScanning(false);

      if (errorMessage) {
        alert(errorMessage);
      }
    }
  };

  const waitForVideoReady = () => new Promise((resolve) => {
    const video = videoRef.current;
    if (!video) {
      resolve();
      return;
    }
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      resolve();
      return;
    }
    const handleLoaded = () => {
      video.removeEventListener("loadeddata", handleLoaded);
      resolve();
    };
    video.addEventListener("loadeddata", handleLoaded, { once: true });
  });

  const handleRedetect = async () => {
    if (isScanning) return;
    setShowResult(false);
    stopCamera();
    await startCamera();
    if (!videoRef.current || !videoRef.current.srcObject) return;
    await handleDetection();
  };
  // 模擬辨識結果按鈕處理函式
  // const handleMockDetection = () => {
  //   if (isScanning) return;
  //   stopCamera();
  //   const mockEmotion = '開心';
  //   const mockMovies = [
  //     {
  //       title: { zh: '天氣之子', en: 'Weathering With You' },
  //       director: '新海誠',
  //       genres: ['動畫', '奇幻'],
  //       runtime: 112,
  //       release_date: '2019-07-19',
  //       trailer: 'https://www.youtube.com/watch?v=Q6iK6DjV_iE',
  //     },
  //     {
  //       title: { zh: '怪獸與牠們的產地', en: 'Fantastic Beasts and Where to Find Them' },
  //       director: 'David Yates',
  //       genres: ['奇幻', '冒險'],
  //       runtime: 133,
  //       release_date: '2016-11-18',
  //       trailer: 'https://www.youtube.com/watch?v=ViuDsy7yb8M',
  //     },
  //   ];

  //   setDetectedEmotion(mockEmotion);
  //   setMovies(mockMovies);
  //   setShowResult(true);
  //   setShowMovieModal(true);

  //   if (typeof onDetectionResult === 'function') {
  //     onDetectionResult({ emotion: mockEmotion, movies: mockMovies });
  //   }
  // };

  // 建立 WebSocket 連線
  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:8000/ws/button");
    wsRef.current.onmessage = (event) => {
      if (event.data === "ok") {
        console.log("收到 HUB 按鈕訊號 → 自動開啟鏡頭");
        if (!isStreamActive && !showResult) {
          startCamera();
        } else if (isStreamActive && !isScanning) {
          handleDetection();
        }
      }
    };
    return () => {
      wsRef.current.close();
    };
  }, [isStreamActive, showResult, isScanning]);

  return (
    <div className="p-10 flex flex-col items-center min-h-screen">
      <div className="max-w-3xl text-center mb-10">
        <p className="text-gray-500 text-lg">系統將啟動相機捕捉您的即時神情，並推薦最能共鳴您當下情緒的影視作品。</p>
      </div>
      <div className="relative w-full max-w-2xl aspect-video bg-black rounded-[32px] overflow-hidden shadow-2xl border-8 border-white">
        {!isStreamActive && !showResult && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
            <span className="text-6xl animate-pulse">📷</span>
            <p className="text-gray-400">相機尚未啟動</p>
          </div>
        )}
        <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${isStreamActive ? 'block' : 'hidden'}`} />
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_cyan] animate-scan-move"></div>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/50 text-cyan-300 px-4 py-1 rounded-full text-xs tracking-widest font-mono">ANALYZING...</div>
          </div>
        )}
        {showResult && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center animate-fade-in text-center p-8">
            <p className="text-gray-400 font-bold mb-2 uppercase tracking-tighter">偵測結果</p>
            <h3 className="text-7xl font-black mb-4" style={{ color: COLORS[detectedEmotion] }}>{detectedEmotion}</h3>
            <p className="text-gray-500 italic">為您生成專屬電影清單中...</p>
          </div>
        )}
        {showResult && showMovieModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl relative">
              <button
                onClick={() => setShowMovieModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-black"
              >
                ✕
              </button>

              <h2 className="text-3xl font-black mb-6 text-center">
                🎬 為您推薦的電影
              </h2>

              <div className="space-y-6">
                {movies.map((m, idx) => (
                  <div key={idx} className="border rounded-2xl p-4">
                    <h3 className="text-xl font-bold">
                      {m.title.zh} ({m.title.en})
                    </h3>
                    <p className="text-sm text-gray-500">
                      導演：{m.director}
                    </p>
                    <p className="text-sm">
                      類型：{m.genres.join(" / ")}｜片長：{m.runtime} 分鐘
                    </p>
                    <p className="text-sm text-gray-500">
                      上映日期：{m.release_date}
                    </p>
                    <a
                      href={m.trailer}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 text-blue-600 font-bold"
                    >
                      ▶ 查看預告片
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
      <div className="mt-10 flex space-x-4">
        {(() => {
          if (!isStreamActive && !showResult) {
            return <button onClick={startCamera} className="bg-blue-600 text-white px-12 py-4 rounded-full font-bold text-xl shadow-lg">開啟鏡頭</button>;
          }
          if (isStreamActive && !isScanning) {
            return <button onClick={handleDetection} className="bg-purple-600 text-white px-12 py-4 rounded-full font-bold text-xl shadow-lg animate-bounce">開始辨識表情</button>;
          }
          if (showResult && !isScanning) {
            return <button onClick={handleRedetect} className="bg-gray-200 text-gray-600 px-12 py-4 rounded-full font-bold text-xl">重新辨識</button>;
          }
          return <button disabled className="bg-gray-300 text-gray-500 px-12 py-4 rounded-full font-bold text-xl cursor-not-allowed">辨識中...</button>;
        })()}
      </div>

      {/* 模擬辨識結果按鈕

        <div className="mt-4">
        <button
          onClick={handleMockDetection}
          className="rounded-full border border-dashed border-gray-400 px-6 py-2 text-sm font-semibold text-gray-500 transition hover:border-gray-600 hover:text-gray-700"
        >
          模擬辨識結果
        </button>
      </div> */}

    </div>
  );
};

// --- 子頁面 4：分析頁 (加大內容區 + 完美平手邏輯版) ---
const AnalysisPage = ({ diaries, COLORS }) => {
  const [filterType, setFilterType] = useState('month');
  const todayKey = new Date().toISOString().split('T')[0];
  const todayLog = diaries[todayKey] && typeof diaries[todayKey] === 'object' ? diaries[todayKey] : null;
  const todayEmotion = todayLog?.detectedEmotion || todayLog?.emotion || '';
  const todayMovies = Array.isArray(todayLog?.recommendedMovies) ? todayLog.recommendedMovies : [];

  // 1. 根據日期篩選日記數據
  const stats = useMemo(() => {
    const counts = { '生氣': 0, '開心': 0, '平淡': 0, '難過': 0 };
    const now = new Date();

    const filteredEntries = Object.entries(diaries).filter(([dateStr]) => {
      const logDate = new Date(dateStr);
      if (filterType === 'day') return dateStr === now.toISOString().split('T')[0];
      if (filterType === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return logDate >= startOfWeek;
      }
      return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    });

    filteredEntries.forEach(([_, d]) => {
      if (counts[d.emotion] !== undefined) counts[d.emotion]++;
    });

    return Object.keys(counts)
      .map(key => ({ name: key, value: counts[key] }))
      .filter(item => item.value > 0);
  }, [diaries, filterType]);

  const totalLogs = stats.reduce((sum, item) => sum + item.value, 0);

  // 2. 找出所有最高頻率的情緒 (處理平手)
  const topEmotions = useMemo(() => {
    if (stats.length === 0) return [];
    const maxVal = Math.max(...stats.map(s => s.value));
    return stats.filter(s => s.value === maxVal);
  }, [stats]);

  return (
    <div className="p-10 flex flex-col items-center min-h-screen bg-[#FFFBF0]">
      {/* 頂部切換按鈕 */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black text-gray-800 mb-8">情緒分析報告</h2>
        <div className="inline-flex bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          {['day', 'week', 'month'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-10 py-3 rounded-xl font-bold transition-all text-lg ${filterType === t ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400'
                }`}
            >
              {t === 'day' ? '每日' : t === 'week' ? '每週' : '每月'}
            </button>
          ))}
        </div>
      </div>

      {filterType === 'day' ? (
        <div className="w-full max-w-4xl bg-white rounded-[40px] shadow-2xl p-12 border border-orange-50">
          {todayEmotion || todayMovies.length > 0 ? (
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-400">今日心情</p>
                  <h3 className="text-5xl font-black mt-3" style={{ color: COLORS[todayEmotion] || '#6b7280' }}>{todayEmotion || '尚未辨識'}</h3>
                </div>
                {todayLog?.lastDetectedAt && (
                  <span className="rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-500">
                    最近更新：{new Date(todayLog.lastDetectedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="rounded-[30px] border border-gray-100 bg-gray-50/60 p-8">
                <h4 className="text-2xl font-bold text-gray-700 mb-4">今日電影清單</h4>
                {todayMovies.length > 0 ? (
                  <ul className="space-y-4">
                    {todayMovies.map((movie, idx) => (
                      <li key={idx} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-xl font-bold text-gray-800">
                              {movie?.title?.zh || movie?.title?.en || movie?.title || '未命名作品'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">導演：{movie?.director || '未知'}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              類型：{Array.isArray(movie?.genres) ? movie.genres.join(' / ') : '未知'}
                              {movie?.runtime ? `｜片長：${movie.runtime} 分鐘` : ''}
                            </p>
                          </div>
                          {movie?.trailer && (
                            <a
                              href={movie.trailer}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center text-blue-600 font-semibold hover:underline"
                            >
                              ▶ 預告片
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">今日尚未產生推薦電影，請至推薦頁進行一次辨識。</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-[40px] border-4 border-dashed border-gray-200 bg-white p-16 text-center">
              <span className="text-6xl block mb-4 opacity-30">🎯</span>
              <p className="text-gray-500 text-lg">今日尚未有辨識紀錄，請至推薦頁進行一次情緒偵測。</p>
            </div>
          )}
        </div>
      ) : totalLogs > 0 ? (
        /* 外層大框格：寬度 max-w-6xl，垂直內距加大 p-20 */
        <div className="w-full max-w-6xl bg-white rounded-[50px] shadow-2xl p-16 md:p-20 flex flex-col md:flex-row items-stretch border border-orange-50">

          {/* 左側：加大圓餅圖，不再限制高度 */}
          <div className="w-full md:w-1/2 flex items-center justify-center relative min-h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats}
                  innerRadius={110}
                  outerRadius={180}
                  paddingAngle={10}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.map((entry, index) => (
                    <Cell key={index} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-gray-400 text-lg font-bold">目前紀錄</span>
              <span className="text-7xl font-black text-gray-700">{totalLogs}</span>
              <span className="text-gray-400 text-sm">次數</span>
            </div>
          </div>

          {/* 右側：數據細節 */}
          <div className="w-full md:w-1/2 flex flex-col justify-center space-y-10 px-0 md:px-16 mt-12 md:mt-0">
            <div className="border-l-8 border-blue-500 pl-8">
              <h3 className="text-4xl font-black text-gray-800 tracking-tight">情緒佔比趨勢</h3>
            </div>

            <div className="space-y-8">
              {stats.map(item => {
                const percentage = ((item.value / totalLogs) * 100).toFixed(0);
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full mr-6 shadow-md" style={{ backgroundColor: COLORS[item.name] }}></div>
                      <span className="text-2xl font-bold text-gray-600">{item.name}</span>
                    </div>
                    <div className="flex items-baseline space-x-3">
                      <span className="text-4xl font-black text-gray-800">{percentage}%</span>
                      <span className="text-gray-400 text-xl font-bold">({item.value}次)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 下方摘要文字：平手顯示邏輯 */}
            {topEmotions.length > 0 && (
              <div className="mt-6 p-8 bg-blue-50 rounded-[30px] border border-blue-100 animate-fade-in">
                <p className="text-blue-700 text-xl leading-relaxed font-medium">
                  本階段您的
                  {topEmotions.map((emo, idx) => (
                    <span key={emo.name}>
                      「<span className="font-black underline" style={{ color: COLORS[emo.name] }}>{emo.name}</span>」
                      {idx < topEmotions.length - 1 ? " 與 " : ""}
                    </span>
                  ))}
                  情緒出現頻率最高。
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-32 rounded-[50px] shadow-xl text-center border-4 border-dashed border-gray-100">
          <span className="text-9xl mb-8 block opacity-10">📊</span>
          <h3 className="text-3xl font-bold text-gray-400">目前尚無數據</h3>
        </div>
      )}
    </div>
  );
};
// --- 主組件 App (加入持久化儲存) ---
const App = () => {
  const [currentPage, setCurrentPage] = useState('首頁');
  const [viewDate, setViewDate] = useState(new Date());

  // 初始化時從 LocalStorage 讀取資料
  const [diaries, setDiaries] = useState(() => {
    const saved = localStorage.getItem('emotion_diaries');
    return saved ? JSON.parse(saved) : {};
  });

  const [editingDate, setEditingDate] = useState(new Date().toISOString().split('T')[0]);
  const [diaryTitle, setDiaryTitle] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState('開心');
  const [diaryContent, setDiaryContent] = useState("");

  const COLORS = { '生氣': '#ef4444', '開心': '#fbbf24', '平淡': '#34d399', '難過': '#60a5fa' };
  const titleRef = useRef(null);
  const contentRef = useRef(null);

  const handleDetectionLog = useCallback(({ emotion, movies }) => {
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    setDiaries(prev => {
      const prevEntry = prev[dateKey] && typeof prev[dateKey] === 'object' ? prev[dateKey] : {};
      const movieList = Array.isArray(movies) ? movies : [];
      const detectedEmotion = emotion || prevEntry.detectedEmotion || prevEntry.emotion || '平淡';

      return {
        ...prev,
        [dateKey]: {
          ...prevEntry,
          title: prevEntry.title ?? '',
          content: prevEntry.content ?? '',
          emotion: detectedEmotion,
          detectedEmotion,
          recommendedMovies: movieList,
          lastDetectedAt: now.toISOString(),
        },
      };
    });
  }, [setDiaries]);

  const handleResetDiaries = useCallback(() => {
    const confirmed = window.confirm('確定要清空所有心情紀錄嗎？此操作無法復原。');
    if (!confirmed) return;
    localStorage.removeItem('emotion_diaries');
    setDiaries({});
    alert('已清空所有心情紀錄。');
  }, [setDiaries]);

  // 當 diaries 更新時，自動存入 LocalStorage
  useEffect(() => {
    localStorage.setItem('emotion_diaries', JSON.stringify(diaries));
  }, [diaries]);

  const handleSaveDiary = () => {
    const finalTitle = titleRef.current ? titleRef.current.value : diaryTitle;
    const finalContent = contentRef.current ? contentRef.current.value : diaryContent;
    setDiaries(prev => ({
      ...prev,
      [editingDate]: {
        ...(prev[editingDate] && typeof prev[editingDate] === 'object' ? prev[editingDate] : {}),
        emotion: selectedEmotion,
        title: finalTitle,
        content: finalContent,
      }
    }));
    alert(`儲存成功！`);
    setCurrentPage('首頁');
  };

  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      <nav className="flex items-center justify-between bg-cyan-100 p-4 text-xl font-bold shadow-sm">
        <div className="flex space-x-8">
          {['首頁', '推薦', '分析'].map((item) => (
            <button key={item} onClick={() => setCurrentPage(item)} className={`${currentPage === item ? 'text-blue-500' : 'text-gray-600'} hover:text-blue-400 transition-colors`}>{item}</button>
          ))}
        </div>
        {/*   // 右側清空按鈕
        <button
          onClick={handleResetDiaries}
          className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 transition hover:border-red-300 hover:text-red-600"
        >
          清空紀錄
        </button> */}
      </nav>
      <main className="container mx-auto">
        {currentPage === '首頁' && <HomePage viewDate={viewDate} setViewDate={setViewDate} diaries={diaries} COLORS={COLORS} setEditingDate={setEditingDate} setDiaryTitle={setDiaryTitle} setSelectedEmotion={setSelectedEmotion} setDiaryContent={setDiaryContent} setCurrentPage={setCurrentPage} />}
        {currentPage === '日記' && <DiaryPage editingDate={editingDate} setEditingDate={setEditingDate} diaries={diaries} diaryTitle={diaryTitle} setDiaryTitle={setDiaryTitle} selectedEmotion={selectedEmotion} setSelectedEmotion={setSelectedEmotion} diaryContent={diaryContent} setDiaryContent={setDiaryContent} handleSaveDiary={handleSaveDiary} titleRef={titleRef} contentRef={contentRef} COLORS={COLORS} />}
        {currentPage === '推薦' && <RecommendationPage COLORS={COLORS} onDetectionResult={handleDetectionLog} />}
        {currentPage === '分析' && <AnalysisPage diaries={diaries} COLORS={COLORS} />}
      </main>
    </div>
  );
};

export default App;