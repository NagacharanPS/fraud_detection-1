"""OpenCV YuNet + SFace face embedding engine.

Reads one JSON request from stdin and writes one JSON response to stdout.
Raw images are decoded in memory and never written to disk.
"""
import base64
import json
import os
import sys
import urllib.request

import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models", "face")
DETECTOR_PATH = os.path.join(MODEL_DIR, "face_detection_yunet_2023mar.onnx")
RECOGNIZER_PATH = os.path.join(MODEL_DIR, "face_recognition_sface_2021dec.onnx")
DETECTOR_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
RECOGNIZER_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"


def ensure_models():
    os.makedirs(MODEL_DIR, exist_ok=True)
    for path, url in ((DETECTOR_PATH, DETECTOR_URL), (RECOGNIZER_PATH, RECOGNIZER_URL)):
        if not os.path.exists(path):
            urllib.request.urlretrieve(url, path)


def decode_image(data_url):
    if not isinstance(data_url, str) or not data_url.startswith("data:image/"):
        raise ValueError("A data URL image is required")
    try:
        encoded = data_url.split(",", 1)[1]
        image = cv2.imdecode(np.frombuffer(base64.b64decode(encoded), np.uint8), cv2.IMREAD_COLOR)
    except Exception as exc:
        raise ValueError("Invalid image data") from exc
    if image is None or image.size == 0:
        raise ValueError("Invalid image data")
    return image


def embedding(data_url):
    image = decode_image(data_url)
    detector = cv2.FaceDetectorYN.create(DETECTOR_PATH, "", (320, 320), 0.85, 0.3, 5000)
    detector.setInputSize((image.shape[1], image.shape[0]))
    _, faces = detector.detect(image)
    if faces is None or len(faces) == 0:
        raise ValueError("No face detected. Use a clear, front-facing image.")
    face = max(faces, key=lambda row: row[2] * row[3])
    recognizer = cv2.FaceRecognizerSF.create(RECOGNIZER_PATH, "")
    aligned = recognizer.alignCrop(image, face)
    feature = recognizer.feature(aligned).reshape(-1).astype(float)
    norm = float(np.linalg.norm(feature)) or 1.0
    vector = (feature / norm).tolist()
    return {"embedding": vector, "algorithm_version": "opencv-yunet-sface-2021dec", "face_count": len(faces)}


def main():
    request = json.loads(sys.stdin.read())
    ensure_models()
    print(json.dumps(embedding(request["image"])))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
