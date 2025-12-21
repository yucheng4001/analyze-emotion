import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2' # 減少 TensorFlow 的日誌干擾
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import cv2
import base64
import numpy as np

app = FastAPI()

# 必須開啟 CORS，React 才能跨 Port 呼叫
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def base64_to_image(base64_string):
    # 移除 Base64 前綴 (例如 data:image/jpeg;base64,)
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

@app.post("/analyze-emotion")
async def analyze_emotion(payload: dict = Body(...)):
    try:
        # 接收前端傳來的 base64 圖片
        image_data = payload.get("image")
        if not image_data:
            return {"error": "No image data provided"}

        img = base64_to_image(image_data)
        
        # 使用 DeepFace 進行分析
        # enforce_detection=False 可以避免因為沒抓到完整人臉就報 400 錯誤
        results = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
        
        dominant_emotion = results[0]['dominant_emotion']
        
        # 簡單的電影推薦邏輯
        recommendation_map = {
            "happy": "Comedy / Musical",
            "sad": "Drama / Inspirational",
            "angry": "Action / Thriller",
            "surprise": "Sci-Fi / Mystery",
            "fear": "Horror / Suspense",
            "neutral": "Documentary / Slice of Life"
        }

        return {
            "emotion": dominant_emotion,
            "recommendation": recommendation_map.get(dominant_emotion, "Drama")
        }
    except Exception as e:
        return {"error": str(e)}