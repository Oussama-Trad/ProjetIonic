from flask import Flask, request, jsonify
from flask_cors import CORS  # Ajoute cette ligne

app = Flask(__name__)
CORS(app)  # Autorise toutes les origines pour tester

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if email == "jean.dupont@example.com" and password == "123456":
        return jsonify({"access_token": "xyz123"}), 200
    return jsonify({"msg": "Invalid credentials"}), 401

if __name__ == '__main__':
    app.run(debug=True, port=5000)  # Port 5000