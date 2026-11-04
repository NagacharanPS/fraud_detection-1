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

if hasattr(cv2, "utils") and hasattr(cv2.utils, "logging"):
    cv2.utils.logging.setLogLevel(cv2.utils.logging.LOG_LEVEL_ERROR)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
MODEL_DIR = os.environ.get("FACE_MODEL_DIR") or os.path.join(REPO_ROOT, "models", "face")
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
    if len(faces) > 1:
        raise ValueError("Multiple faces detected. Please ensure only one person is in frame.")
    face = faces[0]
    recognizer = cv2.FaceRecognizerSF.create(RECOGNIZER_PATH, "")
    aligned = recognizer.alignCrop(image, face)
    feature = recognizer.feature(aligned).reshape(-1).astype(float)
    norm = float(np.linalg.norm(feature)) or 1.0
    vector = (feature / norm).tolist()

    img_h, img_w = image.shape[:2]
    bbox = {
        "x": int(face[0]),
        "y": int(face[1]),
        "width": int(face[2]),
        "height": int(face[3]),
        "norm_x": float(max(0.0, min(1.0, face[0] / img_w))),
        "norm_y": float(max(0.0, min(1.0, face[1] / img_h))),
        "norm_w": float(max(0.0, min(1.0, face[2] / img_w))),
        "norm_h": float(max(0.0, min(1.0, face[3] / img_h))),
        "score": float(face[-1]),
    }

    return {
        "embedding": vector,
        "algorithm_version": "opencv-yunet-sface-2021dec",
        "face_count": len(faces),
        "bounding_box": bbox,
    }


def main():
    raw_input = sys.stdin.read().strip()
    if not raw_input:
        raise ValueError("Empty request payload")
    request = json.loads(raw_input)
    if "image" not in request or not request["image"]:
        raise ValueError("A data URL image is required")
    ensure_models()
    print(json.dumps(embedding(request["image"])))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)

