import sys
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from backend.ml.predict import FraudPredictor

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("model_bridge")

predictor = None

class ModelHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "HEALTHY",
                "model_loaded": predictor.model is not None,
                "model_type": str(type(predictor.model)) if predictor else None
            }).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/predict":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_len)
                data = json.loads(body.decode("utf-8"))
                
                result = predictor.predict(data)
                result["engine_used"] = "PYTHON_ML_MODEL" if predictor.model is not None else "PYTHON_CALIBRATED_FALLBACK"

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))
            except Exception as e:
                logger.error(f"Prediction error: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Silence default request logging to avoid terminal clutter
        pass

def main():
    global predictor
    logger.info("Initializing FraudPredictor from backend.ml.predict...")
    predictor = FraudPredictor()
    logger.info(f"Predictor ready. Model: {type(predictor.model)}")

    port = 5005
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, ModelHandler)
    logger.info(f"Model Bridge Server running on http://127.0.0.1:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == "__main__":
    main()
