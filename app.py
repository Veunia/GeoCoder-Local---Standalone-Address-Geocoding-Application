from flask import Flask, render_template, request, jsonify, send_file
from services.geocoding import GeocodingManager
from utils.csv_handler import CSVHandler
import json
import io
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Load configuration
try:
    with open('config.json') as f:
        config = json.load(f)
except FileNotFoundError:
    config = {
        "default_service": "nominatim",
        "rate_limits": {"nominatim": 1.0},
        "max_batch_size": 1000
    }

# Initialize services
geocoding_manager = GeocodingManager(config)

@app.route('/')
def home():
    services = geocoding_manager.get_available_services()
    return render_template('index.html', services=services)

@app.route('/geocode', methods=['POST'])
def geocode():
    try:
        data = request.get_json()
        if not data or 'address' not in data:
            return jsonify({'error': 'Address is required'}), 400

        result = geocoding_manager.geocode(
            address=data['address'],
            service_name=data.get('service')
        )
        
        return jsonify({
            'name': data.get('name', ''),
            'address': data['address'],
            'latitude': result['lat'],
            'longitude': result['lon'],
            'status': result['status'],
            'provider': result['provider']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/geocode-csv', methods=['POST'])
def geocode_csv():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Read and validate CSV
        addresses = CSVHandler.read_csv(file)
        
        # Check batch size limit
        max_batch = config.get('max_batch_size', 1000)
        if len(addresses) > max_batch:
            return jsonify({
                'error': f'Batch size exceeds limit of {max_batch} addresses'
            }), 400

        # Process addresses
        results = []
        service_name = request.form.get('service')
        
        for address_data in addresses:
            if not CSVHandler.validate_row(address_data):
                continue
                
            result = geocoding_manager.geocode(
                address=address_data['address'],
                service_name=service_name
            )
            
            results.append({
                'name': address_data.get('name', ''),
                'address': address_data['address'],
                'latitude': result['lat'],
                'longitude': result['lon'],
                'status': result['status'],
                'provider': result['provider']
            })

        return jsonify(results)
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@app.route('/export', methods=['POST'])
def export_results():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        csv_content = CSVHandler.export_results(
            data,
            include_fields=['name', 'address', 'latitude', 'longitude', 'status', 'provider']
        )
        
        # Create in-memory file
        buffer = io.StringIO()
        buffer.write(csv_content)
        buffer.seek(0)
        
        return send_file(
            io.BytesIO(buffer.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name='geocoding_results.csv'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
