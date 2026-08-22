import os
import sys
import logging

from flask import Flask, jsonify
from flask_cors import CORS

# -----------------------------------
# Add Project Paths
# -----------------------------------
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

CURRENT_DIR = os.path.abspath(os.path.dirname(__file__))

if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# -----------------------------------
# Database
# -----------------------------------
from database.database import db

# -----------------------------------
# Import Blueprints
# -----------------------------------
try:
    from backend.routes.dashboard_routes import dashboard_bp
    from backend.routes.transfer_routes import transfer_bp
    from backend.routes.alerts_routes import alerts_bp
    from backend.routes.receiver_routes import receiver_bp
    from backend.routes.payment_routes import payment_bp
except ModuleNotFoundError:
    from routes.dashboard_routes import dashboard_bp
    from routes.transfer_routes import transfer_bp
    from routes.alerts_routes import alerts_bp
    from routes.receiver_routes import receiver_bp
    from routes.payment_routes import payment_bp

# -----------------------------------
# Logging
# -----------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)

    # -----------------------------------
    # Enable CORS
    # -----------------------------------
    CORS(
        app,
        resources={r"/*": {"origins": "*"}},
        supports_credentials=True,
    )

    # -----------------------------------
    # Database Configuration
    # -----------------------------------
    db_path = os.path.join(
    CURRENT_DIR,
    "database",
    "fraud_detection.db",
)

    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    # -----------------------------------
    # Register Blueprints
    # -----------------------------------
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(transfer_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(receiver_bp)
    app.register_blueprint(payment_bp)

    # -----------------------------------
    # Home Route
    # -----------------------------------
    @app.route("/", methods=["GET"])
    def home():
        return jsonify(
            {
                "message": "AI Powered UPI Fraud Detection Backend Running",
                "status": "ONLINE",
                "version": "1.0.0",
            }
        )

    # -----------------------------------
    # Health Check
    # -----------------------------------
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify(
            {
                "status": "HEALTHY",
                "service": "AI Powered UPI Fraud Detection",
                "database": "CONNECTED",
                "version": "1.0.0",
            }
        )

    # -----------------------------------
    # Initialize Database
    # -----------------------------------
    with app.app_context():
        import database.models

        db.create_all()
        logger.info("Database initialized successfully.")

    return app


# -----------------------------------
# Create Flask App
# -----------------------------------
app = create_app()

# -----------------------------------
# Run Server
# -----------------------------------
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
    )