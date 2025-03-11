from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import bcrypt
import base64

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
    birth_date = data.get('birthDate')
    address = data.get('address')
    gender = data.get('gender')
    profile_picture = data.get('profilePicture')  # Nouveau champ obligatoire

    # Vérifie si tous les champs requis sont présents
    if not all([first_name, last_name, phone_number, email, password, birth_date, address, gender, profile_picture]):
        return jsonify({'msg': 'Tous les champs, y compris la photo de profil, sont requis'}), 400

    if users.find_one({'email': email}):
        return jsonify({'msg': 'Email already exists'}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    user = {
        'firstName': first_name,
        'lastName': last_name,
        'phoneNumber': phone_number,
        'email': email,
        'password': hashed_password,
        'birthDate': birth_date,
        'address': address,
        'gender': gender,
        'profilePicture': profile_picture  # Stocke la photo (base64)
    }
    users.insert_one(user)
    return jsonify({'msg': 'User registered successfully', 'email': email}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = users.find_one({'email': email})
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password']):
        return jsonify({'access_token': 'xyz123', 'email': email}), 200
    return jsonify({'msg': 'Invalid credentials'}), 401

@app.route('/api/user', methods=['GET'])
def get_user():
    email = request.args.get('email')
    user = users.find_one({'email': email}, {'_id': 0, 'password': 0})
    if user:
        return jsonify(user), 200
    return jsonify({'msg': 'User not found'}), 404

@app.route('/api/user', methods=['PUT'])
def update_user():
    data = request.get_json()
    email = data.get('email')
    updates = {
        'firstName': data.get('firstName'),
        'lastName': data.get('lastName'),
        'phoneNumber': data.get('phoneNumber'),
        'address': data.get('address'),
        'birthDate': data.get('birthDate'),
        'gender': data.get('gender'),
        'profilePicture': data.get('profilePicture')
    }
    result = users.update_one({'email': email}, {'$set': updates})
    if result.matched_count > 0:
        return jsonify({'msg': 'User updated successfully'}), 200
    return jsonify({'msg': 'User not found'}), 404

@app.route('/api/user', methods=['DELETE'])
def delete_user():
    email = request.args.get('email')
    result = users.delete_one({'email': email})
    if result.deleted_count > 0:
        return jsonify({'msg': 'User deleted successfully'}), 200
    return jsonify({'msg': 'User not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)