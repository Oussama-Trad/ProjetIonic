from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId
import jwt
from datetime import datetime, timedelta
import bcrypt
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:*"}})

client = MongoClient('mongodb://localhost:27017/')
db = client['cabinet_medical']
users_collection = db['users']
medecins_collection = db['Medecins']

SECRET_KEY = "your-secret-key"

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    
    if users_collection.find_one({'email': email}) or medecins_collection.find_one({'email': email}):
        return jsonify({'msg': 'Email déjà utilisé'}), 400
    
    hashed_password = hash_password(data['password'])
    user_data = {
        'id': str(ObjectId()),
        'firstName': data['firstName'],
        'lastName': data['lastName'],
        'phoneNumber': data['phoneNumber'],
        'email': email,
        'password': hashed_password,
        'birthDate': data['birthDate'],
        'address': data['address'],
        'gender': data['gender'],
        'profilePicture': data.get('profilePicture', ''),
        'historiqueRendezVous': [],
        'createdAt': datetime.utcnow()
    }
    users_collection.insert_one(user_data)
    return jsonify({'email': email}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    medecin = medecins_collection.find_one({'email': email})
    if medecin and verify_password(password, medecin['motDePasse']):
        token = jwt.encode({
            'email': email,
            'role': 'medecin',
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, SECRET_KEY)
        return jsonify({'access_token': token, 'email': email, 'role': 'medecin'}), 200

    user = users_collection.find_one({'email': email})
    if user and verify_password(password, user['password']):
        token = jwt.encode({
            'email': email,
            'role': 'patient',
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, SECRET_KEY)
        return jsonify({'access_token': token, 'email': email, 'role': 'patient'}), 200

    return jsonify({'msg': 'Email ou mot de passe incorrect'}), 401

@app.route('/api/user', methods=['GET'])
def get_user():
    email = request.args.get('email')
    user = users_collection.find_one({'email': email}, {'_id': 0, 'password': 0})
    if user:
        return jsonify(user), 200
    return jsonify({'msg': 'Utilisateur non trouvé'}), 404

@app.route('/api/medecin', methods=['GET'])
def get_medecin():
    email = request.args.get('email')
    medecin = medecins_collection.find_one({'email': email}, {'_id': 0, 'motDePasse': 0})
    if medecin:
        return jsonify(medecin), 200
    return jsonify({'msg': 'Médecin non trouvé'}), 404

@app.route('/api/user', methods=['PUT'])
def update_user():
    data = request.get_json()
    email = data.get('email')
    update_data = {
        'firstName': data.get('firstName'),
        'lastName': data.get('lastName'),
        'phoneNumber': data.get('phoneNumber'),
        'address': data.get('address'),
        'birthDate': data.get('birthDate'),
        'gender': data.get('gender'),
        'profilePicture': data.get('profilePicture')
    }
    result = users_collection.update_one({'email': email}, {'$set': update_data})
    if result.modified_count > 0:
        return jsonify({'msg': 'Profil mis à jour'}), 200
    return jsonify({'msg': 'Aucune mise à jour effectuée'}), 400

@app.route('/api/user', methods=['DELETE'])
def delete_user():
    email = request.args.get('email')
    result = users_collection.delete_one({'email': email})
    if result.deleted_count > 0:
        return jsonify({'msg': 'Compte supprimé'}), 200
    return jsonify({'msg': 'Utilisateur non trouvé'}), 404

if __name__ == '__main__':
    app.run(debug=True)