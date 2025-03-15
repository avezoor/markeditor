import os
from flask import Flask, render_template, request, jsonify, send_file
import markdown
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")

# Create uploads directory if it doesn't exist
UPLOAD_FOLDER = Path('./uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save', methods=['POST'])
def save_file():
    try:
        content = request.json.get('content')
        filename = request.json.get('filename')

        if not filename.endswith('.md'):
            filename += '.md'

        file_path = UPLOAD_FOLDER / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return jsonify({'success': True, 'message': 'File saved successfully'})
    except Exception as e:
        logging.error(f"Error saving file: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/load', methods=['POST'])
def load_file():
    try:
        filename = request.json.get('filename')
        if not filename.endswith('.md'):
            filename += '.md'

        file_path = UPLOAD_FOLDER / filename
        if not file_path.exists():
            return jsonify({'success': False, 'message': 'File not found'}), 404

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        return jsonify({
            'success': True,
            'content': content,
            'size': os.path.getsize(file_path)
        })
    except Exception as e:
        logging.error(f"Error loading file: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/preview', methods=['POST'])
def preview():
    try:
        content = request.json.get('content')
        # Configure markdown with math support
        md = markdown.Markdown(extensions=[
            'tables',
            'fenced_code',
            'codehilite',
            'mdx_math'
        ], extension_configs={
            'mdx_math': {
                'enable_dollar_delimiter': True,
                'add_preview': True
            }
        })
        html = md.convert(content)
        logging.debug(f"Generated HTML preview: {html}")  # Debug log
        return jsonify({'success': True, 'html': html})
    except Exception as e:
        logging.error(f"Error generating preview: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500