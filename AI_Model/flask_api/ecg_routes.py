import os
import sys
import tempfile
from flask import Blueprint, request, jsonify

# Import the service function
from ecg_service import analyze_ecg

ecg_bp = Blueprint('ecg_bp', __name__)

@ecg_bp.route('/analyze', methods=['POST'])
def analyze():
    # 1. Validate file upload
    if 'file' not in request.files:
        return jsonify({
            "status": "error", 
            "message": "No file provided in the request (key must be 'file')"
        }), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({
            "status": "error", 
            "message": "Empty filename"
        }), 400
        
    if not file.filename.endswith('.npy'):
        return jsonify({
            "status": "error", 
            "message": "File must be a .npy array"
        }), 400
        
    # 2. Save file temporarily
    temp_fd, temp_path = tempfile.mkstemp(suffix='.npy')
    try:
        os.close(temp_fd) # Close file descriptor as we'll use Werkzeug's save
        file.save(temp_path)
        
        # 3. Call the service layer
        result = analyze_ecg(temp_path)
        
        # 4. Return the structured JSON
        return jsonify(result), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error", 
            "message": f"Pipeline analysis failed: {str(e)}"
        }), 500
        
    finally:
        # Cleanup temporary file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
