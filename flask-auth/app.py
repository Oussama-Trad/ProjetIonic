from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId
import jwt
from datetime import datetime, timedelta
import bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity

app = Flask(__name__)

# Configuration CORS ajustée pour inclure http://localhost:8101
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8100", "http://localhost:8101"],  # Ajoute 8101
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

app.config['JWT_SECRET_KEY'] = "your-secret-key"  # Change ça pour une clé sécurisée
jwt_manager = JWTManager(app)

client = MongoClient('mongodb://localhost:27017/')
db = client['cabinet_medical']
users_collection = db['users']
medecins_collection = db['Medecins']

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# Gestion des requêtes OPTIONS
@app.route('/api/medecin/update', methods=['OPTIONS'])
def update_medecin_options():
    print("Requête OPTIONS reçue pour /api/medecin/update")
    return jsonify({"msg": "OK"}), 200

@app.route('/api/medecin/account', methods=['OPTIONS'])
def update_medecin_account_options():
    print("Requête OPTIONS reçue pour /api/medecin/account")
    return jsonify({"msg": "OK"}), 200

@app.route('/api/user/account', methods=['OPTIONS'])
def update_user_account_options():
    print("Requête OPTIONS reçue pour /api/user/account")
    return jsonify({"msg": "OK"}), 200

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    print(f"Requête register pour email : {email}")
    
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
    print(f"Requête login pour email : {email}")

    medecin = medecins_collection.find_one({'email': email})
    if medecin and verify_password(password, medecin['motDePasse']):
        token = jwt.encode({
            'sub': email,
            'email': email,
            'role': 'medecin',
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['JWT_SECRET_KEY'])
        print(f"Token généré pour médecin : {token}")
        return jsonify({'access_token': token, 'email': email, 'role': 'medecin'}), 200

    user = users_collection.find_one({'email': email})
    if user and verify_password(password, user['password']):
        token = jwt.encode({
            'sub': email,
            'email': email,
            'role': 'patient',
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['JWT_SECRET_KEY'])
        print(f"Token généré pour patient : {token}")
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
    print(f"Requête get_medecin pour email : {email}")
    medecin = medecins_collection.find_one({'email': email}, {'_id': 0, 'motDePasse': 0})
    if medecin:
        return jsonify(medecin), 200
    return jsonify({'msg': 'Médecin non trouvé'}), 404

@app.route('/api/medecin/update', methods=['PUT'])
@jwt_required()
def update_medecin():
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Requête PUT /api/medecin/update pour email: {email}, données: {data}")
    
    allowed_fields = ['prenom', 'nom', 'specialite', 'age', 'dateDeNaissance', 
                      'adresse', 'genre', 'numeroTelephone', 'photoProfil', 'horairesDisponibilite']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_data:
        print("Aucune donnée valide à mettre à jour")
        return jsonify({"msg": "Aucune donnée valide à mettre à jour"}), 400
    
    result = medecins_collection.update_one(
        {"email": email},
        {"$set": update_data}
    )
    
    if result.modified_count > 0:
        print("Profil mis à jour avec succès")
        return jsonify({"msg": "Profil mis à jour avec succès"}), 200
    else:
        print("Aucune modification effectuée")
        return jsonify({"msg": "Aucune modification effectuée"}), 304

@app.route('/api/medecin/account', methods=['PUT'])
@jwt_required()
def update_medecin_account():
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Requête PUT /api/medecin/account pour email: {email}, données: {data}")
    
    if 'oldPassword' in data and 'newPassword' in data:
        medecin = medecins_collection.find_one({'email': email})
        if not medecin or not verify_password(data['oldPassword'], medecin['motDePasse']):
            print("Ancien mot de passe incorrect")
            return jsonify({"msg": "Ancien mot de passe incorrect"}), 401
        update_data = {'motDePasse': hash_password(data['newPassword'])}
    else:
        update_data = {}
    
    allowed_fields = ['email', 'prenom', 'nom', 'specialite', 'age', 'dateDeNaissance', 
                      'adresse', 'genre', 'numeroTelephone', 'photoProfil', 'horairesDisponibilite']
    update_data.update({k: v for k, v in data.items() if k in allowed_fields})
    
    if not update_data:
        print("Aucune donnée valide à mettre à jour")
        return jsonify({"msg": "Aucune donnée valide à mettre à jour"}), 400
    
    if 'email' in update_data and update_data['email'] != email:
        if users_collection.find_one({'email': update_data['email']}) or medecins_collection.find_one({'email': update_data['email']}):
            print("Nouvel email déjà utilisé")
            return jsonify({'msg': 'Nouvel email déjà utilisé'}), 400
    
    result = medecins_collection.update_one(
        {"email": email},
        {"$set": update_data}
    )
    
    if result.modified_count > 0:
        print("Compte mis à jour avec succès")
        if 'email' in update_data:
            new_email = update_data['email']
            token = jwt.encode({
                'sub': new_email,
                'email': new_email,
                'role': 'medecin',
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, app.config['JWT_SECRET_KEY'])
            return jsonify({"msg": "Compte mis à jour avec succès", "access_token": token, "email": new_email}), 200
        return jsonify({"msg": "Compte mis à jour avec succès"}), 200
    else:
        print("Aucune modification effectuée")
        return jsonify({"msg": "Aucune modification effectuée"}), 304

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

@app.route('/api/user/account', methods=['PUT'])
@jwt_required()
def update_user_account():
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Requête PUT /api/user/account pour email: {email}, données: {data}")
    
    if 'oldPassword' in data and 'newPassword' in data:
        user = users_collection.find_one({'email': email})
        if not user or not verify_password(data['oldPassword'], user['password']):
            print("Ancien mot de passe incorrect")
            return jsonify({"msg": "Ancien mot de passe incorrect"}), 401
        update_data = {'password': hash_password(data['newPassword'])}
    else:
        update_data = {}
    
    allowed_fields = ['firstName', 'lastName', 'phoneNumber', 'address', 'birthDate', 'gender', 'profilePicture']
    update_data.update({k: v for k, v in data.items() if k in allowed_fields})
    
    if not update_data:
        print("Aucune donnée valide à mettre à jour")
        return jsonify({"msg": "Aucune donnée valide à mettre à jour"}), 400
    
    result = users_collection.update_one(
        {"email": email},
        {"$set": update_data}
    )
    
    if result.modified_count > 0:
        print("Compte mis à jour avec succès")
        return jsonify({"msg": "Compte mis à jour avec succès"}), 200
    else:
        print("Aucune modification effectuée")
        return jsonify({"msg": "Aucune modification effectuée"}), 304

@app.route('/api/user', methods=['DELETE'])
def delete_user():
    email = request.args.get('email')
    result = users_collection.delete_one({'email': email})
    if result.deleted_count > 0:
        return jsonify({'msg': 'Compte supprimé'}), 200
    return jsonify({'msg': 'Utilisateur non trouvé'}), 404

if __name__ == '__main__':
    app.run(debug=True)