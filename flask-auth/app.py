from pymongo import MongoClient
from bson.objectid import ObjectId
import jwt
from datetime import datetime, timedelta
import bcrypt
from flask import Flask, jsonify, request, make_response, redirect, url_for
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from jwt.exceptions import InvalidTokenError
from authlib.integrations.flask_client import OAuth
import os
from dotenv import load_dotenv
import sqlite3
import firebase_admin
from firebase_admin import credentials, messaging

# Charger les variables d'environnement
load_dotenv()

# Initialiser Firebase
cred = credentials.Certificate("cabinetmedical-75146-firebase-adminsdk-fbsvc-e00a691584.json")
firebase_admin.initialize_app(cred)

app = Flask(__name__)

# Configuration CORS pour inclure localhost:8102 (Ionic)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8100", "http://localhost:8101", "http://localhost:8102", "http://localhost:8104"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Authorization", "Content-Type", "X-Requested-With"],
        "expose_headers": ["Authorization"],
        "supports_credentials": True
    }
}, supports_credentials=True)

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', "ma_cle_secrete_super_securisee")
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', "ma_cle_secrete_super_securisee")
jwt_manager = JWTManager(app)

# Connexion à MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['cabinet_medical']
users_collection = db['users']
medecins_collection = db['Medecins']

# Connexion SQLite pour les documents
def init_sqlite():
    conn = sqlite3.connect('documents.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS documents 
                 (id INTEGER PRIMARY KEY, user_email TEXT, nom TEXT, url TEXT, medecin_email TEXT, timestamp TEXT)''')
    conn.commit()
    conn.close()

init_sqlite()

# Configuration OAuth
oauth = OAuth(app)

google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    access_token_url='https://accounts.google.com/o/oauth2/token',
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    client_kwargs={'scope': 'email profile'},
    redirect_uri='http://localhost:5000/api/auth/google/callback'
)

facebook = oauth.register(
    name='facebook',
    client_id=os.getenv('FACEBOOK_APP_ID'),
    client_secret=os.getenv('FACEBOOK_APP_SECRET'),
    access_token_url='https://graph.facebook.com/v19.0/oauth/access_token',
    authorize_url='https://www.facebook.com/v19.0/dialog/oauth',
    api_base_url='https://graph.facebook.com/v19.0/',
    client_kwargs={'scope': 'email public_profile'},
    redirect_uri='http://localhost:5000/api/auth/facebook/callback'
)

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
    return jsonify({'msg': 'Erreur serveur interne', 'error': str(e)}), 500

# Route de test
@app.route('/')
def test_server():
    return jsonify({'message': 'Flask server is running!'}), 200

# Fonctions utilitaires
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    try:
        if not hashed:
            print("Mot de passe haché vide")
            return False
        # Nettoyer le mot de passe reçu pour éviter espaces ou caractères indésirables
        password_cleaned = password.strip() if password else ""
        hashed_cleaned = hashed.strip() if hashed else ""
        result = bcrypt.checkpw(password_cleaned.encode('utf-8'), hashed_cleaned.encode('utf-8'))
        print(f"Vérification mot de passe - Résultat: {result}, Mot de passe envoyé: '{password_cleaned}', Haché: '{hashed_cleaned}'")
        return result
    except Exception as e:
        print(f"Erreur vérification mot de passe: {str(e)}")
        return False

def send_fcm_notification(fcm_token, title, body):
    if not fcm_token:
        print("Aucun token FCM fourni")
        return
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        token=fcm_token
    )
    try:
        response = messaging.send(message)
        print(f"Notification FCM envoyée: {response}")
    except Exception as e:
        print(f"Erreur envoi FCM: {str(e)}")

# Gestion des requêtes OPTIONS pour CORS
@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    print(f"Requête OPTIONS reçue pour /api/{path}")
    response = make_response('', 200)
    origin = request.headers.get('Origin')
    allowed_origins = ["http://localhost:8100", "http://localhost:8101", "http://localhost:8102", "http://localhost:8104"]
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:8102'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-Requested-With'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# OAuth Routes
@app.route('/api/auth/google')
def google_login():
    redirect_uri = url_for('google_callback', _external=True)
    print(f"Initiating Google OAuth with redirect_uri: {redirect_uri}")
    return google.authorize_redirect(redirect_uri)

@app.route('/api/auth/google/callback')
def google_callback():
    try:
        token = google.authorize_access_token()
        print(f"Google OAuth token: {token}")
        user_info = google.get('userinfo').json()
        print(f"Google user info: {user_info}")
        email = user_info.get('email')
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')

        user = users_collection.find_one({'email': email})
        if not user:
            user_data = {
                'firstName': first_name,
                'lastName': last_name,
                'phoneNumber': '',
                'email': email,
                'password': '',
                'birthDate': '',
                'address': '',
                'gender': '',
                'profilePicture': user_info.get('picture', ''),
                'rendezVousFuturs': [],
                'historiqueRendezVous': [],
                'historiqueMedical': [],
                'documents': [],
                'notifications': [],
                'createdAt': datetime.utcnow(),
                'settings': {'darkMode': False, 'language': 'fr'},
                'authProvider': 'google',
                'fcmToken': request.args.get('fcmToken', '')
            }
            users_collection.insert_one(user_data)
            user = user_data

        jwt_token = jwt.encode({
            'sub': email,
            'email': email,
            'role': 'patient',
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['JWT_SECRET_KEY'], algorithm='HS256')

        frontend_url = f"http://localhost:8102/login?access_token={jwt_token}&email={email}&role=patient"
        print(f"Redirecting to frontend: {frontend_url}")
        return redirect(frontend_url)
    except Exception as e:
        print(f"Error in Google OAuth callback: {str(e)}")
        return jsonify({'error': 'Google OAuth failed', 'details': str(e)}), 500

@app.route('/api/auth/facebook')
def facebook_login():
    redirect_uri = url_for('facebook_callback', _external=True)
    print(f"Initiating Facebook OAuth with redirect_uri: {redirect_uri}")
    return facebook.authorize_redirect(redirect_uri)

@app.route('/api/auth/facebook/callback')
def facebook_callback():
    try:
        token = facebook.authorize_access_token()
        print(f"Facebook OAuth token: {token}")
        user_info = facebook.get('me?fields=id,name,email,first_name,last_name,picture').json()
        print(f"Facebook user info: {user_info}")
        email = user_info.get('email')
        first_name = user_info.get('first_name', '')
        last_name = user_info.get('last_name', '')

        user = users_collection.find_one({'email': email})
        if not user:
            user_data = {
                'firstName': first_name,
                'lastName': last_name,
                'phoneNumber': '',
                'email': email,
                'password': '',
                'birthDate': '',
                'address': '',
                'gender': '',
                'profilePicture': user_info.get('picture', {}).get('data', {}).get('url', ''),
                'rendezVousFuturs': [],
                'historiqueRendezVous': [],
                'historiqueMedical': [],
                'documents': [],
                'notifications': [],
                'createdAt': datetime.utcnow(),
                'settings': {'darkMode': False, 'language': 'fr'},
                'authProvider': 'facebook',
                'fcmToken': request.args.get('fcmToken', '')
            }
            users_collection.insert_one(user_data)
            user = user_data

        jwt_token = jwt.encode({
            'sub': email,
            'email': email,
            'role': 'patient',
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['JWT_SECRET_KEY'], algorithm='HS256')

        frontend_url = f"http://localhost:8102/login?access_token={jwt_token}&email={email}&role=patient"
        print(f"Redirecting to frontend: {frontend_url}")
        return redirect(frontend_url)
    except Exception as e:
        print(f"Error in Facebook OAuth callback: {str(e)}")
        return jsonify({'error': 'Facebook OAuth failed', 'details': str(e)}), 500

# Inscription
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    print(f"Données reçues pour inscription: {data}")
    required_fields = ['email', 'password', 'firstName', 'lastName', 'phoneNumber', 'birthDate', 'address', 'gender']
    for field in required_fields:
        if not data.get(field):
            print(f"Champ manquant: {field}")
            return jsonify({'msg': f'Champ {field} manquant'}), 400

    email = data.get('email')
    if users_collection.find_one({'email': email}) or medecins_collection.find_one({'email': email}):
        print(f"Email déjà utilisé: {email}")
        return jsonify({'msg': 'Email déjà utilisé'}), 400
    
    hashed_password = hash_password(data['password'])
    user_data = {
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
        'historiqueMedical': [],
        'documents': [],
        'notifications': [],
        'createdAt': datetime.utcnow(),
        'settings': {'darkMode': False, 'language': 'fr'},
        'authProvider': 'email',
        'fcmToken': data.get('fcmToken', '')
    }
    users_collection.insert_one(user_data)
    print(f"Utilisateur enregistré: {email}")
    return jsonify({'email': email}), 201

# Connexion (corrigée avec logs détaillés)
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    print(f"Données reçues brutes: {data}")
    email = data.get('email', '').strip()  # Nettoyer les espaces
    password = data.get('password', '').strip()  # Nettoyer les espaces
    fcm_token = data.get('fcmToken', '')
    print(f"Tentative de connexion - Email: '{email}', Mot de passe: '{password}', FCM Token: '{fcm_token}'")
    
    if not email or not password:
        print("Email ou mot de passe manquant dans les données reçues")
        return jsonify({'msg': 'Email ou mot de passe manquant'}), 400

    medecin = medecins_collection.find_one({'email': email})
    if medecin:
        print(f"Médecin trouvé: {medecin}")
        if 'motDePasse' in medecin:
            print(f"Mot de passe haché stocké pour médecin: {medecin['motDePasse']}")
            if verify_password(password, medecin['motDePasse']):
                token = jwt.encode({
                    'sub': email,
                    'email': email,
                    'role': 'medecin',
                    'exp': datetime.utcnow() + timedelta(hours=24)
                }, app.config['JWT_SECRET_KEY'], algorithm='HS256')
                medecins_collection.update_one({'email': email}, {'$set': {'fcmToken': fcm_token}})
                print(f"Token généré pour médecin: {token}")
                return jsonify({'access_token': token, 'email': email, 'role': 'medecin'}), 200
            else:
                print(f"Échec vérification mot de passe pour médecin: {email}")
        else:
            print(f"Clé 'motDePasse' absente dans les données du médecin: {medecin}")

    user = users_collection.find_one({'email': email})
    if user:
        print(f"Utilisateur trouvé: {user}")
        if 'password' in user:
            print(f"Mot de passe haché stocké pour utilisateur: {user['password']}")
            if verify_password(password, user['password']):
                token = jwt.encode({
                    'sub': email,
                    'email': email,
                    'role': 'patient',
                    'exp': datetime.utcnow() + timedelta(hours=24)
                }, app.config['JWT_SECRET_KEY'], algorithm='HS256')
                users_collection.update_one({'email': email}, {'$set': {'fcmToken': fcm_token}})
                print(f"Token généré pour utilisateur: {token}")
                return jsonify({'access_token': token, 'email': email, 'role': 'patient'}), 200
            else:
                print(f"Échec vérification mot de passe pour utilisateur: {email}")
        else:
            print(f"Clé 'password' absente dans les données de l'utilisateur: {user}")

    print(f"Échec connexion: {email} - Aucune correspondance trouvée")
    return jsonify({'msg': 'Email ou mot de passe incorrect'}), 401

# Récupérer un utilisateur
@app.route('/api/user', methods=['GET'])
@jwt_required()
def get_user():
    email = request.args.get('email')
    identity = get_jwt_identity()
    print(f"Requête GET /api/user - email: {email}, identité: {identity}")
    if identity != email:
        print(f"Accès non autorisé: {identity} != {email}")
        return jsonify({'msg': 'Accès non autorisé'}), 403
    user = users_collection.find_one({'email': email}, {'_id': 0, 'password': 0})
    if user:
        print(f"Utilisateur trouvé: {email}")
        return jsonify(user), 200
    print(f"Utilisateur non trouvé: {email}")
    return jsonify({'msg': 'Utilisateur non trouvé'}), 404

# Mise à jour utilisateur
@app.route('/api/user', methods=['PUT'])
@jwt_required()
def update_user():
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Requête PUT /api/user - email: {email}, données: {data}")
    if email != data.get('email'):
        print(f"Accès non autorisé: {email} != {data.get('email')}")
        return jsonify({'msg': 'Accès non autorisé'}), 403
    
    token = request.headers.get('Authorization').split('Bearer ')[1]
    decoded_token = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
    role = decoded_token.get('role')
    
    collection = medecins_collection if role == 'medecin' else users_collection
    update_data = {k: v for k, v in data.items() if v is not None and k != 'email'}
    result = collection.update_one({'email': email}, {'$set': update_data})
    
    if result.matched_count > 0:
        updated_user = collection.find_one({'email': email}, {'_id': 0, 'password': 0, 'motDePasse': 0})
        print(f"Utilisateur mis à jour: {email}")
        return jsonify(updated_user), 200
    print(f"Utilisateur non trouvé: {email}")
    return jsonify({'msg': 'Utilisateur non trouvé'}), 404

# Récupérer un médecin
@app.route('/api/medecin', methods=['GET'])
@jwt_required()
def get_medecin():
    email = request.args.get('email')
    identity = get_jwt_identity()
    print(f"Requête GET /api/medecin - email: {email}, identité: {identity}")
    target_medecin = medecins_collection.find_one({'email': email}, {'_id': 0, 'motDePasse': 0})
    if target_medecin:
        print(f"Médecin trouvé: {email}")
        return jsonify(target_medecin), 200
    print(f"Médecin non trouvé: {email}")
    return jsonify({'msg': 'Médecin non trouvé'}), 404

# Liste des médecins
@app.route('/api/medecins', methods=['GET'])
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
    print(f"Liste médecins: {len(medecins_list)} résultats pour '{search_query}'")
    return jsonify(medecins_list), 200

# Créer un rendez-vous
@app.route('/api/rendezvous', methods=['POST'])
@jwt_required()
def create_rendezvous():
    email = get_jwt_identity()
    data = request.get_json()
    if not isinstance(data, dict):
        print(f"Données invalides: {data}")
        return jsonify({'msg': 'Données invalides'}), 400
    print(f"Requête /api/rendezvous: {data}, identité: {email}")
    
    medecin_email = data.get('medecinEmail')
    date = data.get('date')
    heure = data.get('heure')
    motif = data.get('motif', 'Consultation générale')
    user_email = data.get('userEmail')
    document = data.get('document', None)

    if not all([medecin_email, date, heure, user_email]):
        print("Données manquantes:", data)
        return jsonify({'msg': 'Données manquantes'}), 400

    if email != user_email:
        print(f"Non autorisé: {email} != {user_email}")
        return jsonify({'msg': 'Non autorisé'}), 403

    user = users_collection.find_one({'email': user_email})
    medecin = medecins_collection.find_one({'email': medecin_email})
    if not user or not medecin:
        print(f"Utilisateur ou médecin non trouvé: {user_email}, {medecin_email}")
        return jsonify({'msg': 'Utilisateur ou médecin non trouvé'}), 404

    try:
        parsed_date = datetime.strptime(date, '%Y-%m-%d')
        if parsed_date.weekday() >= 5:
            print(f"Week-end: {date}")
            return jsonify({'msg': 'Pas de disponibilité le week-end'}), 400
    except ValueError:
        print(f"Format date invalide: {date}")
        return jsonify({'msg': 'Format de date invalide'}), 400

    try:
        hour, minute = map(int, heure.split(':'))
        if hour < 8 or hour >= 18 or minute not in [0, 30]:
            print(f"Heure hors plage: {heure}")
            return jsonify({'msg': 'Horaire hors plage (8:00-18:00)'}), 400
    except (ValueError, IndexError):
        print(f"Format heure invalide: {heure}")
        return jsonify({'msg': 'Format d’heure invalide'}), 400

    rdv_conflicts = medecin.get('rendezVousConfirmes', []) + medecin.get('rendezVousDemandes', [])
    for rdv in rdv_conflicts:
        if rdv.get('date') == date and rdv.get('heure') == heure and rdv.get('statut') in ['accepté', 'en attente']:
            print(f"Conflit: {date} à {heure}")
            return jsonify({'msg': 'Créneau déjà réservé'}), 400

    rdv_user = {'medecinId': medecin_email, 'date': date, 'heure': heure, 'motif': motif, 'statut': 'en attente'}
    if document:
        rdv_user['document'] = document

    rdv_medecin = {'userEmail': user_email, 'date': date, 'heure': heure, 'motif': motif, 'statut': 'en attente'}
    if document:
        rdv_medecin['document'] = document

    users_collection.update_one({'email': user_email}, {'$push': {'rendezVousFuturs': rdv_user}})
    medecins_collection.update_one({'email': medecin_email}, {'$push': {'rendezVousDemandes': rdv_medecin}})
    
    notif_user = {
        'id': str(ObjectId()),
        'message': f'Rendez-vous demandé avec {medecin["prenom"]} {medecin["nom"]} le {date} à {heure}',
        'date': datetime.utcnow().isoformat(),
        'lue': False,
        'type': 'rendezvous_demande'
    }
    notif_medecin = {
        'id': str(ObjectId()),
        'message': f'Nouvelle demande de rendez-vous de {user["firstName"]} {user["lastName"]} le {date} à {heure}',
        'date': datetime.utcnow().isoformat(),
        'lue': False,
        'type': 'rendezvous_demande'
    }
    users_collection.update_one({'email': user_email}, {'$push': {'notifications': notif_user}})
    medecins_collection.update_one({'email': medecin_email}, {'$push': {'notifications': notif_medecin}})
    
    send_fcm_notification(user.get('fcmToken'), "Rendez-vous demandé", notif_user['message'])
    send_fcm_notification(medecin.get('fcmToken'), "Nouvelle demande", notif_medecin['message'])
    
    print(f"Rendez-vous créé: {user_email} avec {medecin_email}")
    return jsonify({'msg': 'Rendez-vous demandé avec succès'}), 200

# Gérer les rendez-vous
@app.route('/api/medecin/rendezvous/<action>', methods=['PUT'])
@jwt_required()
def manage_rendezvous(action):
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Gestion rendez-vous ({action}): {data}")

    user_email = data.get('userEmail')
    date = data.get('date')
    heure = data.get('heure')
    if not all([user_email, date, heure]):
        print(f"Données manquantes: {data}")
        return jsonify({'msg': 'Données manquantes'}), 400

    medecin = medecins_collection.find_one({'email': email})
    if not medecin:
        print(f"Médecin non trouvé: {email}")
        return jsonify({'msg': 'Médecin non trouvé'}), 404

    rdv = next((r for r in medecin.get('rendezVousDemandes', []) if r.get('userEmail') == user_email and r.get('date') == date and r.get('heure') == heure), None)
    if not rdv:
        print(f"Rendez-vous non trouvé: {user_email}, {date}, {heure}")
        return jsonify({'msg': 'Rendez-vous non trouvé'}), 404

    user = users_collection.find_one({'email': user_email})
    if action == 'accept':
        medecins_collection.update_one(
            {'email': email},
            {
                '$pull': {'rendezVousDemandes': {'userEmail': user_email, 'date': date, 'heure': heure}},
                '$push': {'rendezVousConfirmes': {**rdv, 'statut': 'accepté'}}
            }
        )
        users_collection.update_one(
            {'email': user_email},
            {
                '$set': {'rendezVousFuturs.$[elem].statut': 'accepté'},
                '$push': {
                    'notifications': {
                        'id': str(ObjectId()),
                        'message': f'Votre rendez-vous avec {medecin["prenom"]} {medecin["nom"]} le {date} à {heure} a été accepté',
                        'date': datetime.utcnow().isoformat(),
                        'lue': False,
                        'type': 'rendezvous_accepte'
                    }
                }
            },
            array_filters=[{'elem.medecinId': email, 'elem.date': date, 'elem.heure': heure}]
        )
        send_fcm_notification(user.get('fcmToken'), "Rendez-vous accepté", f"Votre rendez-vous le {date} à {heure} est confirmé")
        print(f"Rendez-vous accepté: {user_email}, {date}, {heure}")
        return jsonify({'msg': 'Rendez-vous accepté'}), 200
    elif action == 'refuse':
        medecins_collection.update_one(
            {'email': email},
            {'$pull': {'rendezVousDemandes': {'userEmail': user_email, 'date': date, 'heure': heure}}}
        )
        users_collection.update_one(
            {'email': user_email},
            {
                '$pull': {'rendezVousFuturs': {'medecinId': email, 'date': date, 'heure': heure}},
                '$push': {
                    'historiqueRendezVous': {**rdv, 'statut': 'refusé'},
                    'notifications': {
                        'id': str(ObjectId()),
                        'message': f'Votre rendez-vous avec {medecin["prenom"]} {medecin["nom"]} le {date} à {heure} a été refusé',
                        'date': datetime.utcnow().isoformat(),
                        'lue': False,
                        'type': 'rendezvous_refuse'
                    }
                }
            }
        )
        send_fcm_notification(user.get('fcmToken'), "Rendez-vous refusé", f"Votre rendez-vous le {date} à {heure} a été refusé")
        print(f"Rendez-vous refusé: {user_email}, {date}, {heure}")
        return jsonify({'msg': 'Rendez-vous refusé'}), 200
    print(f"Action non reconnue: {action}")
    return jsonify({'msg': 'Action non reconnue'}), 400

# Téléverser un document
@app.route('/api/user/document', methods=['POST'])
@jwt_required()
def upload_document():
    email = get_jwt_identity()
    data = request.get_json()
    nom = data.get('nom')
    url = data.get('url')
    medecin_email = data.get('medecinEmail')

    if not all([nom, url, medecin_email]):
        print(f"Données manquantes: {data}")
        return jsonify({'msg': 'Données manquantes'}), 400

    document = {'nom': nom, 'url': url, 'medecinEmail': medecin_email, 'timestamp': datetime.utcnow().isoformat()}
    conn = sqlite3.connect('documents.db')
    c = conn.cursor()
    c.execute("INSERT INTO documents (user_email, nom, url, medecin_email, timestamp) VALUES (?, ?, ?, ?, ?)",
              (email, nom, url, medecin_email, document['timestamp']))
    conn.commit()
    conn.close()

    users_collection.update_one({'email': email}, {'$push': {'documents': document}})
    medecin = medecins_collection.find_one({'email': medecin_email})
    notif = {
        'id': str(ObjectId()),
        'message': f"{email} vous a envoyé le document '{nom}'",
        'date': datetime.utcnow().isoformat(),
        'lue': False,
        'type': 'document_envoye'
    }
    medecins_collection.update_one({'email': medecin_email}, {'$push': {'notifications': notif}})
    send_fcm_notification(medecin.get('fcmToken'), "Nouveau document", notif['message'])
    print(f"Document téléversé: {email} pour {medecin_email}")
    return jsonify({'msg': 'Document téléversé'}), 201

# Mettre à jour les paramètres
@app.route('/api/user/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Requête /api/user/settings: {data}, identité: {email}")

    if not isinstance(data, dict) or 'darkMode' not in data or 'language' not in data:
        print(f"Données invalides: {data}")
        return jsonify({'msg': 'darkMode et language requis'}), 400

    settings = {'darkMode': data['darkMode'], 'language': data['language']}
    collection = users_collection if users_collection.find_one({'email': email}) else medecins_collection
    result = collection.update_one({'email': email}, {'$set': {'settings': settings}})
    
    if result.modified_count > 0:
        print(f"Paramètres mis à jour: {email}")
        return jsonify({'msg': 'Paramètres mis à jour', 'settings': settings}), 200
    return jsonify({'msg': 'Aucune modification'}), 200

# Récupérer disponibilités médecin
@app.route('/api/medecin/disponibilites', methods=['GET'])
@jwt_required()
def get_medecin_disponibilites():
    email = request.args.get('email')
    medecin = medecins_collection.find_one({'email': email}, {'_id': 0, 'motDePasse': 0})
    if not medecin:
        print(f"Médecin non trouvé: {email}")
        return jsonify({'msg': 'Médecin non trouvé'}), 404
    
    disponibilites = {
        'rendezVousConfirmes': medecin.get('rendezVousConfirmes', []),
        'rendezVousDemandes': medecin.get('rendezVousDemandes', [])
    }
    print(f"Disponibilités: {email}")
    return jsonify(disponibilites), 200

# Marquer notification comme lue
@app.route('/api/user/notification/mark-as-read', methods=['PUT'])
@jwt_required()
def mark_notification_as_read():
    email = get_jwt_identity()
    data = request.get_json()
    notification_id = data.get('notificationId')

    if not notification_id:
        print(f"notificationId manquant: {data}")
        return jsonify({'msg': 'notificationId manquant'}), 400

    collection = users_collection if users_collection.find_one({'email': email}) else medecins_collection
    result = collection.update_one(
        {'email': email, 'notifications.id': notification_id},
        {'$set': {'notifications.$.lue': True}}
    )

    if result.modified_count > 0:
        print(f"Notification marquée lue: {email}, {notification_id}")
        return jsonify({'msg': 'Notification marquée comme lue'}), 200
    print(f"Notification non trouvée: {email}, {notification_id}")
    return jsonify({'msg': 'Notification non trouvée'}), 404

# Gestion des consultations
@app.route('/api/medecin/consultation', methods=['POST'])
@jwt_required()
def save_consultation():
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Enregistrement consultation: {data}")
    
    required_fields = ['userEmail', 'date', 'heure', 'diagnostics', 'prescriptions']
    if not all(field in data for field in required_fields):
        print(f"Champs manquants: {data}")
        return jsonify({'msg': 'Champs manquants'}), 400

    consultation = {
        'userEmail': data['userEmail'],
        'date': data['date'],
        'heure': data['heure'],
        'diagnostics': data['diagnostics'],
        'prescriptions': data['prescriptions'],
        'medecinEmail': email,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    users_collection.update_one(
        {'email': data['userEmail']},
        {'$push': {'historiqueMedical': consultation}}
    )
    medecins_collection.update_one(
        {'email': email},
        {'$push': {'consultations': consultation}}
    )
    
    user = users_collection.find_one({'email': data['userEmail']})
    notif = {
        'id': str(ObjectId()),
        'message': f"Votre consultation du {data['date']} à {data['heure']} a été enregistrée",
        'date': datetime.utcnow().isoformat(),
        'lue': False,
        'type': 'consultation_enregistree'
    }
    users_collection.update_one({'email': data['userEmail']}, {'$push': {'notifications': notif}})
    send_fcm_notification(user.get('fcmToken'), "Consultation enregistrée", notif['message'])
    
    print(f"Consultation enregistrée: {data['userEmail']}")
    return jsonify({'msg': 'Consultation enregistrée'}), 201

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)