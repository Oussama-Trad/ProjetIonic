from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from bson import ObjectId

app = Flask(__name__)

# Configuration
app.config["MONGO_URI"] = "mongodb://localhost:27017/cabinetmedical"  # Base de données MongoDB
app.config["JWT_SECRET_KEY"] = "votre_cle_secrete_ici"  # Clé secrète unique pour JWT

# Initialisation des extensions
mongo = PyMongo(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
CORS(app)  # Ajout de CORS pour Ionic

# Inscription
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    phone_number = data.get('phoneNumber')
    email = data.get('email')
    password = data.get('password')

    # Vérification des champs obligatoires
    if not all([first_name, last_name, phone_number, email, password]):
        return jsonify({"msg": "All fields are required"}), 400

    # Vérification si l'email existe déjà
    if mongo.db.users.find_one({"email": email}):
        return jsonify({"msg": "Email already exists"}), 400

    # Hachage du mot de passe
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    # Insertion dans MongoDB
    user_id = mongo.db.users.insert_one({
        "firstName": first_name,
        "lastName": last_name,
        "phoneNumber": phone_number,
        "email": email,
        "password": hashed_password
    }).inserted_id

    return jsonify({"msg": "User registered", "user_id": str(user_id)}), 201

# Connexion
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"msg": "Email and password are required"}), 400

    user = mongo.db.users.find_one({"email": email})
    if user and bcrypt.check_password_hash(user['password'], password):
        access_token = create_access_token(identity=str(user['_id']))
        return jsonify({"access_token": access_token}), 200

    return jsonify({"msg": "Bad email or password"}), 401

# Profil (protégé)
@app.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if user:
        return jsonify({
            "firstName": user.get("firstName", ""),
            "lastName": user.get("lastName", ""),
            "phoneNumber": user.get("phoneNumber", ""),
            "email": user.get("email", "")
        }), 200
    return jsonify({"msg": "User not found"}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)