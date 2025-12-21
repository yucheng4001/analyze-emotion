from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import cv2
import time
from collections import Counter

app = FastAPI()

# 允許 React (通常是 localhost:3000) 跨域請求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze-emotion")
async def analyze_emotion():
    cap = cv2.VideoCapture(0)
    emotions_list = []
    start_time = time.time()
    
    # 執行 5 秒辨識
    while (time.time() - start_time) < 5:
        ret, frame = cap.read()
        if not ret: break
        
        try:
            # 使用 DeepFace 分析當前畫面
            results = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)
            emotions_list.append(results[0]['dominant_emotion'])
        except:
            continue
            
    cap.release()
    
    if not emotions_list:
        return {"emotion": "neutral", "recommendation": "Drama"}

    # 取 5 秒內出現頻率最高的情緒
    final_emotion = Counter(emotions_list).most_common(1)[0][0]
    
    # 根據情緒決定電影類型
    recommendation_map = {
        "happy": "Comedy/Adventure",
        "sad": "Inspirational/Feel-good",
        "angry": "Action/Thriller",
        "surprise": "Sci-Fi/Mystery",
        "neutral": "Documentary"
    }
    
    return {
        "emotion": final_emotion,
        "recommendation": recommendation_map.get(final_emotion, "Drama")
    }