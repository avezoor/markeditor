import os
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import logging
from io import BytesIO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")

# Configure upload folder
UPLOAD_FOLDER = '/tmp'
ALLOWED_EXTENSIONS = {'md', 'markdown'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save', methods=['POST'])
def save_file():
    try:
        content = request.json.get('content')
        filename = request.json.get('filename', 'document.md')

        # Create BytesIO object
        mem_file = BytesIO()
        mem_file.write(content.encode('utf-8'))
        mem_file.seek(0)

        return send_file(
            mem_file,
            mimetype='text/markdown',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        logger.error(f"Error saving file: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        if file and allowed_file(file.filename):
            content = file.read().decode('utf-8')
            return jsonify({'content': content})
        else:
            return jsonify({'error': 'Invalid file type'}), 400
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)