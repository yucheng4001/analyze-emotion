import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2' # 減少 TensorFlow 的日誌干擾

from fastapi import FastAPI, Body, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import cv2
import base64
import numpy as np
from collections import Counter
import json
from typing import List
import asyncio
import paho.mqtt.client as mqtt

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
        frames = payload.get("frames")
        image_data = payload.get("image")
        probabilities = {}
        allowed_emotions = {"happy", "angry", "sad", "neutral"}

        dominant_emotion = None

        if frames:
            emotions = []
            emotion_totals = Counter()
            processed_frames = 0
            for frame in frames:
                img = base64_to_image(frame)
                if img is None:
                    continue

                results = DeepFace.analyze(
                    img_path = img,
                    actions = ['emotion'],
                    enforce_detection = False,
                    detector_backend = 'opencv',
                    align = False
                )

                # DeepFace 可能回傳 list 或 dict
                result_payload = results[0] if isinstance(results, list) else results
                dominant_frame_emotion = result_payload.get('dominant_emotion')
                emotion_distribution = result_payload.get('emotion')
                if dominant_frame_emotion in allowed_emotions:
                    emotions.append(dominant_frame_emotion)
                if isinstance(emotion_distribution, dict):
                    filtered_dist = {k: float(v) for k, v in emotion_distribution.items() if k in allowed_emotions}
                    if filtered_dist:
                        emotion_totals.update(filtered_dist)
                        processed_frames += 1

            if processed_frames:
                probabilities = {k: round(v / processed_frames, 4) for k, v in emotion_totals.items()}

            if probabilities:
                dominant_emotion = max(probabilities, key=probabilities.get)
            elif emotions:
                dominant_emotion = Counter(emotions).most_common(1)[0][0]
            else:
                return {"error": "No valid emotion categories detected"}
        else:
            if not image_data:
                return {"error": "No image data provided"}

            img = base64_to_image(image_data)

            results = DeepFace.analyze(
                img_path = img,
                actions = ['emotion'],
                enforce_detection = False,
                detector_backend = 'MTCNN',
                align = False,
            )

            result_payload = results[0] if isinstance(results, list) else results
            dominant_emotion = result_payload.get('dominant_emotion')
            if dominant_emotion not in allowed_emotions:
                dominant_emotion = None
            emotion_distribution = result_payload.get('emotion')
            if isinstance(emotion_distribution, dict):
                probabilities = {k: round(float(v), 4) for k, v in emotion_distribution.items() if k in allowed_emotions}
                if probabilities:
                    dominant_emotion = max(probabilities, key=probabilities.get)

            if not dominant_emotion:
                if probabilities:
                    dominant_emotion = max(probabilities, key=probabilities.get)
                else:
                    return {"error": "Unable to determine emotion within allowed categories"}
        
        # 簡單的電影推薦邏輯
        recommendation_map = {
            "happy": "Comedy / Musical",
            "sad": "Drama / Inspirational",
            "angry": "Action / Thriller",
            "neutral": "Documentary / Slice of Life"
        }

        frame_count = len(frames) if isinstance(frames, list) else (1 if image_data else 0)
        print(f"[Emotion] frames={frame_count}, dominant={dominant_emotion}, probabilities={probabilities}")

        return {
            "emotion": dominant_emotion,
            "probabilities": probabilities,
            "recommendation": recommendation_map.get(dominant_emotion, "Drama")
        }
    except Exception as e:
        return {"error": str(e)}
    
with open("src\\data\\movie.json", "r", encoding="utf-8") as f:
    MOVIES_DB = json.load(f)

@app.get("/recommend-movies")
def recommend_movies(emotion: str):
    results = [
        m for m in MOVIES_DB
        if m.get("emotion") == emotion
        and isinstance(m.get("title"), dict)
        and "zh" in m["title"]
        and "en" in m["title"]
    ]
    return {
        "emotion": emotion,
        "movies": results
    }

# MQTT & WebSocket
clients = set()

@app.websocket("/ws/button")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except Exception as e:
        print("WebSocket disconnected:", e)
    finally:
        clients.remove(websocket)

# ===== MQTT 客戶端訂閱 HUB topic =====
mqtt_client = mqtt.Client()

def on_connect(client, userdata, flags, rc):
    print("[MQTT] Connected with result code "+str(rc))
    client.subscribe("hub/button")

def on_message(client, userdata, msg):
    payload = msg.payload.decode()
    print(f"[MQTT] Received: {payload}")
    # 將訊息推送給所有 WebSocket clients
    asyncio.run(send_to_clients(payload))

async def send_to_clients(message: str):
    to_remove = set()
    for ws in clients:
        try:
            await ws.send_text(message)
        except:
            to_remove.add(ws)
    for ws in to_remove:
        clients.remove(ws)

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message
mqtt_client.connect("mqttgo.io", 1883, 60)
mqtt_client.loop_start()