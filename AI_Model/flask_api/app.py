from flask import Flask
from flask_cors import CORS
from ecg_routes import ecg_bp

def create_app():
    app = Flask(__name__)
    
    # Enable Cross-Origin Resource Sharing
    CORS(app)
    
    # Register the routes blueprint
    app.register_blueprint(ecg_bp, url_prefix='/api/ecg')
    
    @app.route('/health', methods=['GET'])
    def health():
        return {"status": "ok", "service": "Deterministic ECG Pipeline API"}
        
    return app

if __name__ == '__main__':
    app = create_app()
    # Running on a distinct port from the FastAPI (8001)
    app.run(host='0.0.0.0', port=5002, debug=True)
