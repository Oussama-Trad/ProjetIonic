from flask import Flask, request, jsonify, make_response
from pymongo import MongoClient
from bson.objectid import ObjectId
import jwt
from datetime import datetime, timedelta
import bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from jwt.exceptions import InvalidTokenError

app = Flask(__name__)

# Configuration CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8100"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Authorization", "Content-Type", "X-Requested-With"],
        "expose_headers": ["Authorization"],
        "supports_credentials": True
    }
}, supports_credentials=True)

@app.after_request
def add_cors_headers(response):
    print(f"Réponse envoyée pour {request.path}: {response.status} - Headers: {dict(response.headers)}")
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:8100'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-Requested-With'
    return response

app.config['JWT_SECRET_KEY'] = "ma_cle_secrete_super_securisee"
jwt_manager = JWTManager(app)

# Connexion à MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['cabinet_medical']
users_collection = db['users']
medecins_collection = db['Medecins']

# Gestion des erreurs JWT
@jwt_manager.invalid_token_loader
def invalid_token_callback(error):
    print(f"Token invalide détecté: {error}")
    return jsonify({'msg': 'Token invalide ou mal formé'}), 401

@jwt_manager.unauthorized_loader
def unauthorized_callback(error):
    print(f"Accès non autorisé: {error}")
    return jsonify({'msg': 'Token manquant ou non autorisé'}), 401

@app.errorhandler(Exception)
def handle_exception(e):
    print(f"Erreur inattendue dans {request.path}: {str(e)}")
    response = jsonify({'msg': 'Erreur serveur interne', 'error': str(e)})
    response.status_code = 500
    return add_cors_headers(response)

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    print(f"Requête OPTIONS reçue pour /api/{path}")
    response = make_response('', 200)
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:8100'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-Requested-With'
    response.headers['Access-Control-Max-Age'] = '86400'
    return response

@app.route('/api/rendezvous', methods=['POST'])
@jwt_required()
def create_rendezvous():
    auth_header = request.headers.get('Authorization', '')
    print(f"En-tête Authorization reçu: {auth_header}")
    if not auth_header or 'Bearer ' not in auth_header:
        print("Aucun token Bearer trouvé dans l'en-tête")
        return jsonify({'msg': 'Token manquant ou mal formé'}), 401
    
    token = auth_header.split('Bearer ')[1].strip()
    print(f"Token extrait: {token}")
    
    try:
        decoded = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        print(f"Token décodé avec succès: {decoded}")
    except Exception as e:
        print(f"Erreur lors du décodage manuel du token: {str(e)}")
        return jsonify({'msg': 'Token invalide ou mal formé'}), 401

    email = get_jwt_identity()
    data = request.get_json()
    if not isinstance(data, dict):
        print(f"Données reçues invalides, type: {type(data)}, valeur: {data}")
        return jsonify({'msg': 'Les données doivent être un objet JSON valide'}), 400
    print(f"Requête reçue pour /api/rendezvous avec données: {data}, identité: {email}")
    
    medecin_email = data.get('medecinEmail')
    date = data.get('date')
    heure = data.get('heure')
    motif = data.get('motif', 'Consultation générale')
    user_email = data.get('userEmail')

    if not all([medecin_email, date, heure, user_email]):
        print("Données manquantes dans la requête")
        return jsonify({'msg': 'Données manquantes'}), 400

    if email != user_email:
        print(f"Non autorisé: email utilisateur ({email}) différent de userEmail ({user_email})")
        return jsonify({'msg': 'Non autorisé'}), 403

    user = users_collection.find_one({'email': user_email})
    medecin = medecins_collection.find_one({'email': medecin_email})
    if not user:
        print(f"Utilisateur non trouvé: {user_email}")
        return jsonify({'msg': 'Utilisateur non trouvé'}), 404
    if not medecin:
        print(f"Médecin non trouvé: {medecin_email}")
        return jsonify({'msg': 'Médecin non trouvé'}), 404

    # Vérification du type de medecin pour éviter l'erreur 'str'
    if not isinstance(medecin, dict):
        print(f"Erreur: medecin n'est pas un dictionnaire, valeur: {medecin}")
        return jsonify({'msg': 'Erreur interne: données médecin invalides'}), 500

    try:
        parsed_date = datetime.strptime(date, '%Y-%m-%d')
        day_of_week = parsed_date.weekday()
        print(f"Date {date} validée, jour de la semaine: {day_of_week}")
        if day_of_week >= 5:  # 5 = samedi, 6 = dimanche
            print(f"Date {date} est un week-end")
            return jsonify({'msg': 'Pas de disponibilité le week-end'}), 400
    except ValueError as e:
        print(f"Erreur de format de date: {date}, erreur: {str(e)}")
        return jsonify({'msg': 'Format de date invalide'}), 400

    try:
        hour = int(heure.split(':')[0])
        minute = int(heure.split(':')[1])
        if hour < 8 or hour >= 18 or minute not in [0, 30]:
            print(f"Heure {heure} hors plage ou invalide")
            return jsonify({'msg': 'Horaire hors plage (8:00-18:00) ou minutes invalides'}), 400
    except (ValueError, IndexError) as e:
        print(f"Erreur de format d'heure: {heure}, erreur: {str(e)}")
        return jsonify({'msg': 'Format d’heure invalide'}), 400

    # Gestion sécurisée des conflits
    rdv_conflicts = medecin.get('rendezVousConfirmes', []) + medecin.get('rendezVousDemandes', [])
    print(f"Vérification des conflits pour {date} {heure}: {rdv_conflicts}")
    if any(isinstance(rdv, dict) and rdv.get('date') == date and rdv.get('heure') == heure and rdv.get('statut') in ['accepté', 'en attente'] for rdv in rdv_conflicts):
        print(f"Conflit détecté pour {date} à {heure}")
        return jsonify({'msg': 'Créneau déjà réservé'}), 400

    rdv_user = {'medecinId': medecin_email, 'date': date, 'heure': heure, 'motif': motif, 'statut': 'en attente'}
    rdv_medecin = {'userEmail': user_email, 'date': date, 'heure': heure, 'motif': motif, 'statut': 'en attente'}
    
    try:
        users_collection.update_one({'email': user_email}, {'$push': {'rendezVousFuturs': rdv_user}})
        medecins_collection.update_one({'email': medecin_email}, {'$push': {'rendezVousDemandes': rdv_medecin}})
        users_collection.update_one(
            {'email': user_email}, 
            {
                '$push': {
                    'notifications': {
                        'message': f'Rendez-vous demandé avec {medecin["prenom"]} {medecin["nom"]} le {date} à {heure}',
                        'date': datetime.utcnow().isoformat(),
                        'lue': False
                    }
                }
            }
        )
        print(f"Rendez-vous créé avec succès pour {user_email} avec {medecin_email} le {date} à {heure}")
        return jsonify({'msg': 'Rendez-vous demandé avec succès'}), 200
    except Exception as e:
        print(f"Erreur lors de l'insertion dans MongoDB: {str(e)}")
        raise e

# Inclure les autres routes ici (non modifiées pour brièveté)
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    if users_collection.find_one({'email': email}) or medecins_collection.find_one({'email': email}):
        print(f"Email déjà utilisé: {email}")
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
        'rendezVousFuturs': [],
        'historiqueRendezVous': [],
        'documents': [],
        'notifications': [],
        'createdAt': datetime.utcnow()
    }
    users_collection.insert_one(user_data)
    print(f"Utilisateur enregistré: {email}")
    return jsonify({'email': email}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    print(f"Tentative de connexion avec email: {email}")
    
    medecin = medecins_collection.find_one({'email': email})
    if medecin and verify_password(password, medecin['motDePasse']):
        token = jwt.encode({'sub': email, 'email': email, 'role': 'medecin', 'exp': datetime.utcnow() + timedelta(hours=24)}, app.config['JWT_SECRET_KEY'])
        print(f"Token généré pour médecin: {token}")
        return jsonify({'access_token': token, 'email': email, 'role': 'medecin'}), 200

    user = users_collection.find_one({'email': email})
    if user and verify_password(password, user['password']):
        token = jwt.encode({'sub': email, 'email': email, 'role': 'patient', 'exp': datetime.utcnow() + timedelta(hours=24)}, app.config['JWT_SECRET_KEY'])
        print(f"Token généré pour utilisateur: {token}")
        return jsonify({'access_token': token, 'email': email, 'role': 'patient'}), 200

    print(f"Aucun utilisateur ou médecin trouvé avec cet email ou mot de passe incorrect: {email}")
    return jsonify({'msg': 'Email ou mot de passe incorrect'}), 401

@app.route('/api/user', methods=['GET'])
@jwt_required()
def get_user():
    email = request.args.get('email')
    user = users_collection.find_one({'email': email}, {'_id': 0, 'password': 0})
    if user:
        print(f"Utilisateur trouvé: {email}")
        return jsonify(user), 200
    print(f"Utilisateur non trouvé: {email}")
    return jsonify({'msg': 'Utilisateur non trouvé'}), 404

@app.route('/api/medecin', methods=['GET'])
@jwt_required()
def get_medecin():
    email = request.args.get('email')
    medecin = medecins_collection.find_one({'email': email}, {'_id': 0, 'motDePasse': 0})
    if medecin:
        print(f"Médecin trouvé: {email}")
        return jsonify(medecin), 200
    print(f"Médecin non trouvé: {email}")
    return jsonify({'msg': 'Médecin non trouvé'}), 404

@app.route('/api/medecins', methods=['GET'])
@jwt_required()
def get_all_medecins():
    search_query = request.args.get('search', '')
    medecins = medecins_collection.find({
        '$or': [
            {'prenom': {'$regex': search_query, '$options': 'i'}},
            {'nom': {'$regex': search_query, '$options': 'i'}},
            {'specialite': {'$regex': search_query, '$options': 'i'}}
        ]
    }, {'_id': 0, 'motDePasse': 0})
    medecins_list = list(medecins)
    print(f"Liste des médecins trouvés: {len(medecins_list)} résultats pour recherche '{search_query}'")
    return jsonify(medecins_list), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)