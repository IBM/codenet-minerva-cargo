from flask import Flask, request, jsonify

app = Flask(__name__)

def run(payload):
    # Your code to handle the payload goes here
    print("Received payload:", payload)
    return "Payload processed"

@app.route('/repartition', methods=['POST'])
def app_endpoint():
    try:
        payload = request.json
        result = run(payload)
        return jsonify({'result': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)