from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import bcrypt

app = Flask(__name__)
CORS(app)

# Connexion à MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['cabinet_medical']
users = db['users']

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    phone_number = data.get('phoneNumber')
    email = data.get('email')
    password = data.get('password')
    birth_date = data.get('birthDate')  # Nouveau champ
    address = data.get('address')       # Nouveau champ
    gender = data.get('gender')         # Nouveau champ

    # Vérifie si l’email existe déjà
    if users.find_one({'email': email}):
        return jsonify({'msg': 'Email already exists'}), 400

    # Hash le mot de passe
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    # Crée l’utilisateur avec les nouveaux champs
    user = {
        'firstName': first_name,
        'lastName': last_name,
        'phoneNumber': phone_number,
        'email': email,
        'password': hashed_password,
        'birthDate': birth_date,
        'address': address,
        'gender': gender
    }
    users.insert_one(user)

    return jsonify({'msg': 'User registered successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = users.find_one({'email': email})
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password']):
        return jsonify({'access_token': 'xyz123'}), 200
    return jsonify({'msg': 'Invalid credentials'}), 401

if __name__ == '__main__':
    app.run(debug=True, port=5000)