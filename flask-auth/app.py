from pymongo import MongoClient
from bson.objectid import ObjectId
import jwt
from datetime import datetime, timedelta
import bcrypt
from flask import Flask, jsonify, request, make_response, redirect, url_for
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, get_jwt
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

# Configuration CORS
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
messages_collection = db['messages']

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
    return jsonify({'msg': 'Token invalide ou mal formé', 'error': str(error)}), 401

@jwt_manager.unauthorized_loader
def unauthorized_callback(error):
    print(f"Accès non autorisé: {error}")
    return jsonify({'msg': 'Token manquant ou non autorisé', 'error': str(error)}), 401

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
        password_cleaned = password.strip() if password else ""
        hashed_cleaned = hashed.strip() if hashed else ""
        result = bcrypt.checkpw(password_cleaned.encode('utf-8'), hashed_cleaned.encode('utf-8'))
        print(f"Vérification mot de passe - Résultat: {result}, Mot de passe envoyé: '{password_cleaned}', Haché: '{hashed_cleaned}'")
        return result
    except Exception as e:
        print(f"Erreur vérification mot de passe: {str(e)}")
        return False

def send_fcm_notification(fcm_token, title, body, data=None):
    if not fcm_token:
        print("Aucun token FCM fourni")
        return
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        token=fcm_token,
        data=data or {}
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
                'settings': {'darkMode': False, 'language': 'fr', 'theme': 'light'},
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
        return jsonify({'error': 'Échec de l\'authentification Google', 'details': str(e)}), 500

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
                'settings': {'darkMode': False, 'language': 'fr', 'theme': 'light'},
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
        return jsonify({'error': 'Échec de l\'authentification Facebook', 'details': str(e)}), 500

# Inscription
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    print(f"Données reçues pour inscription: {data}")
    required_fields = ['email', 'password', 'firstName', 'lastName', 'phoneNumber', 'birthDate', 'address', 'gender']
    for field in required_fields:
        if not data.get(field):
            print(f"Champ manquant: {field}")
            return jsonify({'msg': f'Le champ {field} est requis'}), 400

    email = data.get('email').strip()
    if users_collection.find_one({'email': email}) or medecins_collection.find_one({'email': email}):
        print(f"Email déjà utilisé: {email}")
        return jsonify({'msg': 'Cet email est déjà associé à un compte'}), 400
    
    hashed_password = hash_password(data['password'])
    user_data = {
        'firstName': data['firstName'].strip(),
        'lastName': data['lastName'].strip(),
        'phoneNumber': data['phoneNumber'].strip(),
        'email': email,
        'password': hashed_password,
        'birthDate': data['birthDate'],
        'address': data['address'].strip(),
        'gender': data['gender'],
        'profilePicture': data.get('profilePicture', ''),
        'rendezVousFuturs': [],
        'historiqueRendezVous': [],
        'historiqueMedical': [],
        'documents': [],
        'notifications': [],
        'createdAt': datetime.utcnow(),
        'settings': {'darkMode': False, 'language': 'fr', 'theme': 'light'},
        'authProvider': 'email',
        'fcmToken': data.get('fcmToken', '')
    }
    users_collection.insert_one(user_data)
    print(f"Utilisateur enregistré: {email}")
    return jsonify({'email': email, 'msg': 'Inscription réussie'}), 201

# Connexion
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    print(f"Données reçues brutes: {data}")
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    fcm_token = data.get('fcmToken', '')
    print(f"Tentative de connexion - Email: '{email}', Mot de passe: '{password}', FCM Token: '{fcm_token}'")
    
    if not email or not password:
        print("Email ou mot de passe manquant dans les données reçues")
        return jsonify({'msg': 'Veuillez fournir un email et un mot de passe'}), 400

    medecin = medecins_collection.find_one({'email': email})
    if medecin and 'motDePasse' in medecin:
        print(f"Médecin trouvé: {medecin}")
        if verify_password(password, medecin['motDePasse']):
            token = jwt.encode({
                'sub': email,
                'email': email,
                'role': 'medecin',
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, app.config['JWT_SECRET_KEY'], algorithm='HS256')
            medecins_collection.update_one({'email': email}, {'$set': {'fcmToken': fcm_token}})
            print(f"Token généré pour médecin: {token}")
            return jsonify({'access_token': token, 'email': email, 'role': 'medecin', 'msg': 'Connexion réussie'}), 200
        else:
            print(f"Échec vérification mot de passe pour médecin: {email}")
            return jsonify({'msg': 'Email ou mot de passe incorrect'}), 401

    user = users_collection.find_one({'email': email})
    if user and 'password' in user:
        print(f"Utilisateur trouvé: {user}")
        if verify_password(password, user['password']):
            token = jwt.encode({
                'sub': email,
                'email': email,
                'role': 'patient',
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, app.config['JWT_SECRET_KEY'], algorithm='HS256')
            users_collection.update_one({'email': email}, {'$set': {'fcmToken': fcm_token}})
            print(f"Token généré pour utilisateur: {token}")
            return jsonify({'access_token': token, 'email': email, 'role': 'patient', 'msg': 'Connexion réussie'}), 200
        else:
            print(f"Échec vérification mot de passe pour utilisateur: {email}")
            return jsonify({'msg': 'Email ou mot de passe incorrect'}), 401

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
    specialite = request.args.get('specialite', '')
    
    query = {}
    
    # Ajouter la recherche textuelle si présente
    if search_query:
        query['$or'] = [
            {'prenom': {'$regex': search_query, '$options': 'i'}},
            {'nom': {'$regex': search_query, '$options': 'i'}},
            {'specialite': {'$regex': search_query, '$options': 'i'}}
        ]
    
    # Ajouter le filtre par spécialité si présent
    if specialite:
        query['specialite'] = specialite
    
    medecins = medecins_collection.find(query, {'_id': 0, 'motDePasse': 0})
    medecins_list = list(medecins)
    print(f"Liste médecins: {len(medecins_list)} résultats pour '{search_query}' et spécialité '{specialite}'")
    return jsonify(medecins_list), 200

# Récupérer toutes les spécialités disponibles
@app.route('/api/specialites', methods=['GET'])
def get_all_specialites():
    specialites = medecins_collection.distinct('specialite')
    specialites = [s for s in specialites if s]  # Filtrer les valeurs vides
    print(f"Liste des spécialités: {len(specialites)} trouvées")
    return jsonify(specialites), 200

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
        return jsonify({'msg': 'Veuillez fournir toutes les informations requises'}), 400

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
            return jsonify({'msg': 'Les rendez-vous ne sont pas disponibles le week-end'}), 400
        if parsed_date.date() < datetime.utcnow().date():
            print(f"Date passée: {date}")
            return jsonify({'msg': 'Impossible de prendre un rendez-vous dans le passé'}), 400
    except ValueError:
        print(f"Format date invalide: {date}")
        return jsonify({'msg': 'Format de date invalide (YYYY-MM-DD)'}), 400

    try:
        hour, minute = map(int, heure.split(':'))
        if hour < 8 or hour >= 18 or minute not in [0, 30]:
            print(f"Heure hors plage: {heure}")
            return jsonify({'msg': 'Les rendez-vous doivent être pris entre 8:00 et 18:00, par tranches de 30 minutes'}), 400
    except (ValueError, IndexError):
        print(f"Format heure invalide: {heure}")
        return jsonify({'msg': 'Format d\'heure invalide (HH:MM)'}), 400

    rdv_conflicts = medecin.get('rendezVousConfirmes', []) + medecin.get('rendezVousDemandes', [])
    for rdv in rdv_conflicts:
        if rdv.get('date') == date and rdv.get('heure') == heure and rdv.get('statut') in ['accepté', 'en attente']:
            print(f"Conflit: {date} à {heure}")
            return jsonify({'msg': 'Ce créneau est déjà réservé'}), 400

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
        'type': 'rendezvous_demande',
        'data': {'rdvDate': date, 'rdvHeure': heure, 'medecinEmail': medecin_email}
    }
    notif_medecin = {
        'id': str(ObjectId()),
        'message': f'Nouvelle demande de rendez-vous de {user["firstName"]} {user["lastName"]} le {date} à {heure}',
        'date': datetime.utcnow().isoformat(),
        'lue': False,
        'type': 'rendezvous_demande',
        'data': {'rdvDate': date, 'rdvHeure': heure, 'userEmail': user_email}
    }
    users_collection.update_one({'email': user_email}, {'$push': {'notifications': notif_user}})
    medecins_collection.update_one({'email': medecin_email}, {'$push': {'notifications': notif_medecin}})
    
    send_fcm_notification(
        user.get('fcmToken'), 
        "Rendez-vous demandé", 
        notif_user['message'],
        {'rdvDate': date, 'rdvHeure': heure, 'medecinEmail': medecin_email}
    )
    send_fcm_notification(
        medecin.get('fcmToken'), 
        "Nouvelle demande", 
        notif_medecin['message'],
        {'rdvDate': date, 'rdvHeure': heure, 'userEmail': user_email}
    )
    
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
        return jsonify({'msg': 'Veuillez fournir toutes les informations requises'}), 400

    medecin = medecins_collection.find_one({'email': email})
    if not medecin:
        print(f"Médecin non trouvé: {email}")
        return jsonify({'msg': 'Médecin non trouvé'}), 404

    rdv = next((r for r in medecin.get('rendezVousDemandes', []) if r.get('userEmail') == user_email and r.get('date') == date and r.get('heure') == heure), None)
    if not rdv:
        print(f"Rendez-vous non trouvé: {user_email}, {date}, {heure}")
        return jsonify({'msg': 'Rendez-vous non trouvé'}), 404

    user = users_collection.find_one({'email': user_email})
    if not user:
        print(f"Utilisateur non trouvé: {user_email}")
        return jsonify({'msg': 'Utilisateur non trouvé'}), 404

    try:
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
                            'type': 'rendezvous_accepte',
                            'data': {'rdvDate': date, 'rdvHeure': heure, 'medecinEmail': email}
                        }
                    }
                },
                array_filters=[{'elem.medecinId': email, 'elem.date': date, 'elem.heure': heure}]
            )
            send_fcm_notification(
                user.get('fcmToken'), 
                "Rendez-vous accepté", 
                f"Votre rendez-vous le {date} à {heure} est confirmé",
                {'rdvDate': date, 'rdvHeure': heure, 'medecinEmail': email}
            )
            send_fcm_notification(
                medecin.get('fcmToken'), 
                "Rendez-vous accepté", 
                f"Le rendez-vous de {user['firstName']} {user['lastName']} le {date} à {heure} a été accepté",
                {'rdvDate': date, 'rdvHeure': heure, 'userEmail': user_email}
            )
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
                            'type': 'rendezvous_refuse',
                            'data': {'rdvDate': date, 'rdvHeure': heure, 'medecinEmail': email}
                        }
                    }
                }
            )
            send_fcm_notification(
                user.get('fcmToken'), 
                "Rendez-vous refusé", 
                f"Votre rendez-vous le {date} à {heure} a été refusé",
                {'rdvDate': date, 'rdvHeure': heure, 'medecinEmail': email}
            )
            send_fcm_notification(
                medecin.get('fcmToken'), 
                "Rendez-vous refusé", 
                f"Le rendez-vous de {user['firstName']} {user['lastName']} le {date} à {heure} a été refusé",
                {'rdvDate': date, 'rdvHeure': heure, 'userEmail': user_email}
            )
            print(f"Rendez-vous refusé: {user_email}, {date}, {heure}")
            return jsonify({'msg': 'Rendez-vous refusé'}), 200
        else:
            print(f"Action non reconnue: {action}")
            return jsonify({'msg': 'Action non reconnue'}), 400
    except Exception as e:
        print(f"Erreur lors de la gestion du rendez-vous ({action}): {str(e)}")
        return jsonify({'msg': 'Erreur serveur interne', 'error': str(e)}), 500

# Annuler un rendez-vous par le patient
@app.route('/api/user/rendezvous/cancel', methods=['PUT'])
@jwt_required()
def cancel_rendezvous():
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Annulation rendez-vous: {data}")

    medecin_email = data.get('medecinEmail')
    user_email = data.get('userEmail')
    date = data.get('date')
    heure = data.get('heure')

    if not all([medecin_email, user_email, date, heure]):
        print(f"Données manquantes: {data}")
        return jsonify({'msg': 'Veuillez fournir toutes les informations requises'}), 400

    if email != user_email:
        print(f"Non autorisé: {email} != {user_email}")
        return jsonify({'msg': 'Non autorisé'}), 403

    user = users_collection.find_one({'email': user_email})
    medecin = medecins_collection.find_one({'email': medecin_email})
    if not user or not medecin:
        print(f"Utilisateur ou médecin non trouvé: {user_email}, {medecin_email}")
        return jsonify({'msg': 'Utilisateur ou médecin non trouvé'}), 404

    rdv_user = next((r for r in user.get('rendezVousFuturs', []) if r.get('medecinId') == medecin_email and r.get('date') == date and r.get('heure') == heure), None)
    if not rdv_user:
        print(f"Rendez-vous non trouvé pour utilisateur: {user_email}, {date}, {heure}")
        return jsonify({'msg': 'Rendez-vous non trouvé'}), 404

    try:
        users_collection.update_one(
            {'email': user_email},
            {
                '$pull': {'rendezVousFuturs': {'medecinId': medecin_email, 'date': date, 'heure': heure}},
                '$push': {
                    'historiqueRendezVous': {**rdv_user, 'statut': 'annulé'},
                    'notifications': {
                        'id': str(ObjectId()),
                        'message': f'Vous avez annulé votre rendez-vous du {date} à {heure}',
                        'date': datetime.utcnow().isoformat(),
                        'lue': False,
                        'type': 'rendezvous_annule',
                        'data': {'rdvDate': date, 'rdvHeure': heure, 'medecinEmail': medecin_email}
                    }
                }
            }
        )
        medecins_collection.update_one(
            {'email': medecin_email},
            {
                '$pull': {
                    'rendezVousDemandes': {'userEmail': user_email, 'date': date, 'heure': heure},
                    'rendezVousConfirmes': {'userEmail': user_email, 'date': date, 'heure': heure}
                },
                '$push': {
                    'notifications': {
                        'id': str(ObjectId()),
                        'message': f'{user["firstName"]} {user["lastName"]} a annulé le rendez-vous du {date} à {heure}',
                        'date': datetime.utcnow().isoformat(),
                        'lue': False,
                        'type': 'rendezvous_annule',
                        'data': {'rdvDate': date, 'rdvHeure': heure, 'userEmail': user_email}
                    }
                }
            }
        )
        send_fcm_notification(
            user.get('fcmToken'),
            "Rendez-vous annulé",
            f"Votre rendez-vous du {date} à {heure} a été annulé",
            {'rdvDate': date, 'rdvHeure': heure, 'medecinEmail': medecin_email}
        )
        send_fcm_notification(
            medecin.get('fcmToken'),
            "Rendez-vous annulé",
            f"Le rendez-vous de {user['firstName']} {user['lastName']} du {date} à {heure} a été annulé",
            {'rdvDate': date, 'rdvHeure': heure, 'userEmail': user_email}
        )
        print(f"Rendez-vous annulé: {user_email}, {date}, {heure}")
        return jsonify({'msg': 'Rendez-vous annulé avec succès'}), 200
    except Exception as e:
        print(f"Erreur lors de l'annulation du rendez-vous: {str(e)}")
        return jsonify({'msg': 'Erreur serveur interne', 'error': str(e)}), 500

# Téléverser un document
@app.route('/api/user/document', methods=['POST'])
@jwt_required()
def upload_patient_document():
    email = get_jwt_identity()
    data = request.get_json()
    nom = data.get('nom')
    contenu = data.get('contenu')
    medecin_email = data.get('medecinEmail')

    if not all([nom, contenu, medecin_email]):
        print(f"Données manquantes: {data}")
        return jsonify({'msg': 'Veuillez fournir toutes les informations requises'}), 400

    # Récupérer l'utilisateur
    user = users_collection.find_one({'email': email})
    if not user:
        return jsonify({'msg': 'Utilisateur non trouvé'}), 404

    # Récupérer le médecin
    medecin = medecins_collection.find_one({'email': medecin_email})
    if not medecin:
        return jsonify({'msg': 'Médecin non trouvé'}), 404

    # Créer le document
    document = {
        'id': str(ObjectId()),
        'nom': nom, 
        'contenu': contenu, 
        'medecinEmail': medecin_email, 
        'date': datetime.utcnow().isoformat(),
        'statut': 'non consulté',
        'annotations': ''
    }

    # Ajouter le document à la liste des documents de l'utilisateur
    users_collection.update_one({'email': email}, {'$push': {'documents': document}})
    
    # Créer une notification pour le médecin
    notif = {
        'id': str(ObjectId()),
        'message': f"{user.get('firstName', '')} {user.get('lastName', '')} vous a envoyé le document '{nom}'",
        'date': datetime.utcnow().isoformat(),
        'lue': False,
        'type': 'document_envoye',
        'data': {'documentId': document['id'], 'userEmail': email}
    }
    
    # Ajouter la notification au médecin
    medecins_collection.update_one({'email': medecin_email}, {'$push': {'notifications': notif}})
    
    # Envoyer une notification push si le token FCM est disponible
    if 'fcmToken' in medecin and medecin['fcmToken']:
        send_fcm_notification(
            medecin.get('fcmToken'), 
            "Nouveau document", 
            notif['message'],
            {'documentId': document['id'], 'userEmail': email}
        )
    
    print(f"Document envoyé avec succès: {email} -> {medecin_email}, document: {nom}")
    return jsonify({'msg': 'Document envoyé avec succès', 'document': document}), 201

# Mettre à jour les paramètres
@app.route('/api/user/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Requête /api/user/settings: {data}, identité: {email}")

    if not isinstance(data, dict) or 'darkMode' not in data or 'language' not in data or 'theme' not in data:
        print(f"Données invalides: {data}")
        return jsonify({'msg': 'darkMode, language et theme sont requis'}), 400

    settings = {'darkMode': data['darkMode'], 'language': data['language'], 'theme': data['theme']}
    collection = users_collection if users_collection.find_one({'email': email}) else medecins_collection
    result = collection.update_one({'email': email}, {'$set': {'settings': settings}})
    
    if result.modified_count > 0:
        print(f"Paramètres mis à jour: {email}")
        return jsonify({'msg': 'Paramètres mis à jour avec succès', 'settings': settings}), 200
    return jsonify({'msg': 'Aucune modification effectuée'}), 200

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

# Récupérer les créneaux disponibles pour une date spécifique
@app.route('/api/medecin/creneaux-disponibles', methods=['GET'])
def get_medecin_creneaux_disponibles():
    email = request.args.get('email')
    date = request.args.get('date')
    
    if not email or not date:
        return jsonify({'msg': 'Email du médecin et date requis'}), 400
    
    try:
        # Valider le format de la date
        parsed_date = datetime.strptime(date, '%Y-%m-%d')
        
        # Vérifier si c'est un weekend
        if parsed_date.weekday() >= 5:
            return jsonify({
                'disponible': False,
                'message': 'Les rendez-vous ne sont pas disponibles le week-end',
                'creneaux': []
            }), 200
            
        # Vérifier si la date est dans le passé
        if parsed_date.date() < datetime.utcnow().date():
            return jsonify({
                'disponible': False,
                'message': 'Impossible de prendre un rendez-vous dans le passé',
                'creneaux': []
            }), 200
    except ValueError:
        return jsonify({'msg': 'Format de date invalide (YYYY-MM-DD)'}), 400
    
    # Récupérer le médecin
    medecin = medecins_collection.find_one({'email': email})
    if not medecin:
        return jsonify({'msg': 'Médecin non trouvé'}), 404
    
    # Créer tous les créneaux possibles (8h-18h par tranches de 30min)
    tous_creneaux = []
    for heure in range(8, 18):
        for minute in [0, 30]:
            tous_creneaux.append(f"{heure:02d}:{minute:02d}")
    
    # Récupérer les rendez-vous existants pour cette date
    rdv_existants = []
    for rdv in medecin.get('rendezVousConfirmes', []) + medecin.get('rendezVousDemandes', []):
        if rdv.get('date') == date and rdv.get('statut') in ['accepté', 'en attente']:
            rdv_existants.append(rdv.get('heure'))
    
    # Filtrer les créneaux disponibles
    creneaux_disponibles = [creneau for creneau in tous_creneaux if creneau not in rdv_existants]
    
    print(f"Créneaux disponibles pour {email} le {date}: {len(creneaux_disponibles)}/{len(tous_creneaux)}")
    return jsonify({
        'disponible': True,
        'message': 'Créneaux disponibles',
        'creneaux': creneaux_disponibles
    }), 200

# Mettre à jour les disponibilités du médecin
@app.route('/api/medecin/disponibilites', methods=['PUT'])
@jwt_required()
def update_medecin_disponibilites():
    email = get_jwt_identity()
    role = get_jwt().get('role', '')
    
    # Vérifier que l'utilisateur est bien un médecin
    if role != 'medecin':
        print(f"Tentative non autorisée de mise à jour des disponibilités: {email}, rôle: {role}")
        return jsonify({'msg': 'Seuls les médecins peuvent mettre à jour leurs disponibilités'}), 403
    
    data = request.get_json()
    if not data or not isinstance(data, dict) or 'disponibilites' not in data:
        print(f"Données invalides pour la mise à jour des disponibilités: {data}")
        return jsonify({'msg': 'Veuillez fournir des disponibilités valides'}), 400
    
    disponibilites = data.get('disponibilites')
    
    # Valider le format des disponibilités
    jours_semaine = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    for jour in disponibilites:
        if jour not in jours_semaine:
            print(f"Jour invalide: {jour}")
            return jsonify({'msg': f'Jour invalide: {jour}'}), 400
        
        if not isinstance(disponibilites[jour], list):
            print(f"Format invalide pour {jour}: {disponibilites[jour]}")
            return jsonify({'msg': f'Les disponibilités pour {jour} doivent être une liste d\'heures'}), 400
        
        for heure in disponibilites[jour]:
            try:
                h, m = map(int, heure.split(':'))
                if h < 8 or h >= 18 or m not in [0, 30]:
                    print(f"Heure invalide: {heure}")
                    return jsonify({'msg': 'Les heures doivent être entre 8:00 et 18:00, par tranches de 30 minutes'}), 400
            except (ValueError, IndexError):
                print(f"Format d'heure invalide: {heure}")
                return jsonify({'msg': 'Format d\'heure invalide (HH:MM)'}), 400
    
    # Mettre à jour les disponibilités du médecin
    result = medecins_collection.update_one(
        {'email': email},
        {'$set': {'disponibilites': disponibilites}}
    )
    
    if result.modified_count > 0:
        print(f"Disponibilités mises à jour pour {email}")
        
        # Créer une notification pour le médecin
        notif = {
            'id': str(ObjectId()),
            'message': 'Vos disponibilités ont été mises à jour avec succès',
            'date': datetime.utcnow().isoformat(),
            'lue': False,
            'type': 'disponibilites_update',
            'data': {}
        }
        medecins_collection.update_one({'email': email}, {'$push': {'notifications': notif}})
        
        return jsonify({
            'msg': 'Disponibilités mises à jour avec succès',
            'disponibilites': disponibilites
        }), 200
    
    print(f"Aucune modification effectuée pour {email}")
    return jsonify({'msg': 'Aucune modification effectuée'}), 200

# Marquer notification comme lue
@app.route('/api/user/notification/mark-as-read', methods=['PUT'])
@jwt_required()
def mark_notification_as_read():
    email = get_jwt_identity()
    data = request.get_json()
    notification_id = data.get('notificationId')

    if not notification_id:
        print(f"notificationId manquant: {data}")
        return jsonify({'msg': 'notificationId requis'}), 400

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
        return jsonify({'msg': 'Tous les champs requis ne sont pas fournis'}), 400

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
        'type': 'consultation_enregistree',
        'data': {'consultationDate': data['date'], 'consultationHeure': data['heure'], 'medecinEmail': email}
    }
    users_collection.update_one({'email': data['userEmail']}, {'$push': {'notifications': notif}})
    send_fcm_notification(
        user.get('fcmToken'), 
        "Consultation enregistrée", 
        notif['message'],
        {'consultationDate': data['date'], 'consultationHeure': data['heure'], 'medecinEmail': email}
    )
    
    print(f"Consultation enregistrée: {data['userEmail']}")
    return jsonify({'msg': 'Consultation enregistrée avec succès'}), 201

# Statistiques pour les médecins
@app.route('/api/medecin/stats', methods=['GET'])
@jwt_required()
def get_medecin_stats():
    email = request.args.get('email')
    identity = get_jwt_identity()
    
    if identity != email:
        return jsonify({'msg': 'Accès non autorisé'}), 403
    
    medecin = medecins_collection.find_one({'email': email})
    if not medecin:
        return jsonify({'msg': 'Médecin non trouvé'}), 404
    
    # Récupérer tous les rendez-vous du médecin
    rendez_vous = []
    for patient in users_collection.find():
        for rdv in patient.get('rendezVousFuturs', []) + patient.get('historiqueRendezVous', []):
            if rdv.get('medecinEmail') == email:
                rdv['patientEmail'] = patient['email']
                rdv['patientNom'] = f"{patient['firstName']} {patient['lastName']}"
                rendez_vous.append(rdv)
    
    # Calculer les statistiques
    total_patients = len(set([rdv.get('patientEmail') for rdv in rendez_vous]))
    total_rendez_vous = len(rendez_vous)
    rdv_confirmes = len([rdv for rdv in rendez_vous if rdv.get('status') == 'confirmé'])
    rdv_en_attente = len([rdv for rdv in rendez_vous if rdv.get('status') == 'en attente'])
    rdv_annules = len([rdv for rdv in rendez_vous if rdv.get('status') == 'annulé'])
    rdv_termines = len([rdv for rdv in rendez_vous if rdv.get('status') == 'terminé'])
    
    # Calculer le taux de présence
    patients_presents = len([rdv for rdv in rendez_vous if rdv.get('status') == 'terminé' and rdv.get('patientPresent', True)])
    patients_absents = len([rdv for rdv in rendez_vous if rdv.get('status') == 'terminé' and not rdv.get('patientPresent', True)])
    taux_presence = 0
    if patients_presents + patients_absents > 0:
        taux_presence = round((patients_presents / (patients_presents + patients_absents)) * 100)
    
    # Calculer le temps moyen de consultation
    consultations = [rdv for rdv in rendez_vous if rdv.get('status') == 'terminé' and rdv.get('dureeConsultation')]
    temps_moyen = 0
    if consultations:
        temps_moyen = round(sum([rdv.get('dureeConsultation', 0) for rdv in consultations]) / len(consultations))
    
    # Calculer les rendez-vous par mois
    rendez_vous_par_mois = {}
    mois_fr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    for i in range(12):
        rendez_vous_par_mois[mois_fr[i]] = 0
    
    for rdv in rendez_vous:
        if 'date' in rdv:
            try:
                date = datetime.strptime(rdv['date'], '%Y-%m-%d')
                mois = date.month - 1  # 0-indexed
                rendez_vous_par_mois[mois_fr[mois]] += 1
            except:
                pass
    
    # Calculer les rendez-vous par statut
    rendez_vous_par_statut = {
        'confirmé': rdv_confirmes,
        'en attente': rdv_en_attente,
        'annulé': rdv_annules,
        'terminé': rdv_termines
    }
    
    stats = {
        'totalPatients': total_patients,
        'totalRendezVous': total_rendez_vous,
        'rdvConfirmes': rdv_confirmes,
        'rdvEnAttente': rdv_en_attente,
        'rdvAnnules': rdv_annules,
        'rdvTermines': rdv_termines,
        'patientsPresents': patients_presents,
        'patientsAbsents': patients_absents,
        'tauxPresence': taux_presence,
        'tempsMoyenConsultation': temps_moyen,
        'rendezVousParMois': rendez_vous_par_mois,
        'rendezVousParStatut': rendez_vous_par_statut
    }
    
    return jsonify(stats), 200

# Récupérer tous les patients (pour le chat)
@app.route('/api/patients', methods=['GET'])
@jwt_required()
def get_all_patients():
    email = get_jwt_identity()
    role = get_jwt().get('role', '')
    
    if role != 'medecin':
        return jsonify({'msg': 'Accès non autorisé'}), 403
    
    patients = list(users_collection.find({}, {
        '_id': 0,
        'email': 1,
        'firstName': 1,
        'lastName': 1,
        'profilePicture': 1
    }))
    
    return jsonify(patients), 200

# Chat API routes
@app.route('/api/chat/messages', methods=['GET'])
@jwt_required()
def get_chat_messages():
    email = get_jwt_identity()
    other_user = request.args.get('otherUser')
    
    if not other_user:
        return jsonify({'msg': 'Utilisateur de chat non spécifié'}), 400
    
    # Trouvez les messages entre les deux utilisateurs
    messages = list(messages_collection.find({
        '$or': [
            {'sender': email, 'receiver': other_user},
            {'sender': other_user, 'receiver': email}
        ]
    }).sort('timestamp', 1))
    
    # Convertir ObjectId en string pour la sérialisation JSON
    for message in messages:
        message['_id'] = str(message['_id'])
    
    print(f"Messages trouvés: {len(messages)} entre {email} et {other_user}")
    return jsonify(messages), 200

@app.route('/api/chat/messages', methods=['POST'])
@jwt_required()
def send_chat_message():
    email = get_jwt_identity()
    data = request.get_json()
    
    if not data or not isinstance(data, dict):
        return jsonify({'msg': 'Données invalides'}), 400
    
    receiver = data.get('receiver')
    content = data.get('content')
    
    if not receiver or not content:
        return jsonify({'msg': 'Destinataire et contenu requis'}), 400
    
    # Vérifier si le destinataire existe (patient ou médecin)
    user = users_collection.find_one({'email': receiver}) or medecins_collection.find_one({'email': receiver})
    if not user:
        return jsonify({'msg': 'Destinataire non trouvé'}), 404
    
    # Créer le message
    message = {
        'sender': email,
        'receiver': receiver,
        'content': content,
        'timestamp': datetime.utcnow().isoformat(),
        'read': False
    }
    
    result = messages_collection.insert_one(message)
    message['_id'] = str(result.inserted_id)
    
    # Envoyer une notification
    notif = {
        'id': str(ObjectId()),
        'message': f'Nouveau message de {email}',
        'date': datetime.utcnow().isoformat(),
        'lue': False,
        'type': 'nouveau_message',
        'data': {'senderEmail': email}
    }
    
    if receivers_collection := users_collection.find_one({'email': receiver}):
        users_collection.update_one({'email': receiver}, {'$push': {'notifications': notif}})
        send_fcm_notification(
            receivers_collection.get('fcmToken'), 
            "Nouveau message", 
            notif['message'],
            {'senderEmail': email}
        )
    elif receivers_collection := medecins_collection.find_one({'email': receiver}):
        medecins_collection.update_one({'email': receiver}, {'$push': {'notifications': notif}})
        send_fcm_notification(
            receivers_collection.get('fcmToken'), 
            "Nouveau message", 
            notif['message'],
            {'senderEmail': email}
        )
    
    print(f"Message envoyé: {email} -> {receiver}")
    return jsonify(message), 200

@app.route('/api/chat/mark-as-read', methods=['PUT'])
@jwt_required()
def mark_messages_as_read():
    email = get_jwt_identity()
    data = request.get_json()
    
    if not data or not isinstance(data, dict):
        return jsonify({'msg': 'Données invalides'}), 400
    
    sender = data.get('sender')
    
    if not sender:
        return jsonify({'msg': 'Expéditeur requis'}), 400
    
    # Marquer tous les messages de l'expéditeur comme lus
    result = messages_collection.update_many(
        {'sender': sender, 'receiver': email, 'read': False},
        {'$set': {'read': True}}
    )
    
    print(f"{result.modified_count} messages marqués comme lus")
    return jsonify({'msg': 'Messages marqués comme lus', 'count': result.modified_count}), 200

@app.route('/api/chat/all-messages', methods=['GET'])
@jwt_required()
def get_all_user_messages():
    email = get_jwt_identity()
    
    # Récupérer tous les messages où l'utilisateur est soit expéditeur soit destinataire
    messages = list(messages_collection.find({
        '$or': [
            {'sender': email},
            {'receiver': email}
        ]
    }).sort('timestamp', 1))
    
    # Convertir ObjectId en string pour la sérialisation JSON
    for message in messages:
        message['_id'] = str(message['_id'])
    
    print(f"Tous les messages trouvés pour {email}: {len(messages)}")
    return jsonify(messages), 200

# Endpoint pour l'envoi de documents - SUPPRIMÉ POUR ÉVITER LES CONFLITS
# Nous utilisons déjà /api/user/document pour cette fonctionnalité

# Mettre à jour le statut d'un document
@app.route('/api/user/document/status', methods=['PUT'])
@jwt_required()
def update_document_status():
    email = get_jwt_identity()
    data = request.get_json()
    patient_email = data.get('patientEmail')
    document_id = data.get('documentId')
    statut = data.get('statut')

    if not all([patient_email, document_id, statut]):
        return jsonify({'msg': 'Informations manquantes'}), 400

    # Vérifier que l'utilisateur est un médecin
    medecin = medecins_collection.find_one({'email': email})
    if not medecin:
        return jsonify({'msg': 'Accès non autorisé'}), 403

    # Mettre à jour le statut du document
    result = users_collection.update_one(
        {'email': patient_email, 'documents.id': document_id},
        {'$set': {'documents.$.statut': statut}}
    )

    if result.modified_count == 0:
        return jsonify({'msg': 'Document non trouvé ou statut inchangé'}), 404

    print(f"Statut du document mis à jour: {document_id} -> {statut}")
    return jsonify({'msg': 'Statut du document mis à jour avec succès'}), 200

# Mettre à jour les annotations d'un document
@app.route('/api/user/document/annotation', methods=['PUT'])
@jwt_required()
def update_document_annotation():
    email = get_jwt_identity()
    data = request.get_json()
    patient_email = data.get('patientEmail')
    document_id = data.get('documentId')
    annotations = data.get('annotations')

    if not all([patient_email, document_id]) or annotations is None:
        return jsonify({'msg': 'Informations manquantes'}), 400

    # Vérifier que l'utilisateur est un médecin
    medecin = medecins_collection.find_one({'email': email})
    if not medecin:
        return jsonify({'msg': 'Accès non autorisé'}), 403

    # Mettre à jour les annotations du document
    result = users_collection.update_one(
        {'email': patient_email, 'documents.id': document_id},
        {'$set': {'documents.$.annotations': annotations}}
    )

    if result.modified_count == 0:
        return jsonify({'msg': 'Document non trouvé ou annotations inchangées'}), 404

    # Créer une notification pour le patient
    notif = {
        'id': str(ObjectId()),
        'message': f"Dr. {medecin.get('firstName', '')} {medecin.get('lastName', '')} a annoté votre document",
        'date': datetime.utcnow().isoformat(),
        'lue': False,
        'type': 'document_annote',
        'data': {'documentId': document_id}
    }

    # Ajouter la notification au patient
    users_collection.update_one({'email': patient_email}, {'$push': {'notifications': notif}})

    # Envoyer une notification push si le patient a un token FCM
    patient = users_collection.find_one({'email': patient_email})
    if patient and patient.get('fcmToken'):
        send_fcm_notification(
            patient.get('fcmToken'), 
            "Document annoté", 
            notif['message'],
            {'documentId': document_id}
        )

    print(f"Annotations du document mises à jour: {document_id}")
    return jsonify({'msg': 'Annotations du document mises à jour avec succès'}), 200

# Récupérer tous les patients (pour les médecins)
@app.route('/api/patients', methods=['GET'])
@jwt_required()
def get_all_patients_for_medecin():
    email = get_jwt_identity()
    
    # Vérifier que l'utilisateur est un médecin
    medecin = medecins_collection.find_one({'email': email})
    if not medecin:
        return jsonify({'msg': 'Accès non autorisé'}), 403
    
    # Récupérer tous les patients
    patients = list(users_collection.find({'role': 'patient'}))
    
    # Convertir ObjectId en string pour la sérialisation JSON
    for patient in patients:
        patient['_id'] = str(patient['_id'])
        
        # Filtrer les documents pour ne montrer que ceux destinés à ce médecin
        if 'documents' in patient:
            patient['documents'] = [doc for doc in patient['documents'] if doc.get('medecinEmail') == email]
    
    print(f"Patients récupérés: {len(patients)}")
    return jsonify(patients), 200

# Récupérer les informations d'un médecin
@app.route('/api/medecin', methods=['GET'])
@jwt_required()
def get_medecin_info():
    email = get_jwt_identity()
    medecin_email = request.args.get('email')
    
    if not medecin_email:
        return jsonify({'msg': 'Email du médecin requis'}), 400
    
    # Vérifier que l'utilisateur est autorisé à accéder aux informations du médecin
    if email != medecin_email:
        user = users_collection.find_one({'email': email})
        if not user or user.get('role') != 'admin':
            return jsonify({'msg': 'Accès non autorisé'}), 403
    
    # Récupérer le médecin
    medecin = medecins_collection.find_one({'email': medecin_email})
    if not medecin:
        return jsonify({'msg': 'Médecin non trouvé'}), 404
    
    # Convertir ObjectId en string pour la sérialisation JSON
    medecin['_id'] = str(medecin['_id'])
    
    print(f"Informations du médecin récupérées: {medecin_email}")
    return jsonify(medecin), 200

# Mettre à jour les informations d'un médecin
@app.route('/api/medecin', methods=['PUT'])
@jwt_required()
def update_medecin():
    email = get_jwt_identity()
    data = request.get_json()
    
    if not data or not isinstance(data, dict):
        return jsonify({'msg': 'Données invalides'}), 400
    
    medecin_email = data.get('email')
    if not medecin_email:
        return jsonify({'msg': 'Email du médecin requis'}), 400
    
    # Vérifier que l'utilisateur est autorisé à modifier les informations du médecin
    if email != medecin_email:
        user = users_collection.find_one({'email': email})
        if not user or user.get('role') != 'admin':
            return jsonify({'msg': 'Accès non autorisé'}), 403
    
    # Récupérer le médecin existant
    existing_medecin = medecins_collection.find_one({'email': medecin_email})
    if not existing_medecin:
        return jsonify({'msg': 'Médecin non trouvé'}), 404
    
    # Champs autorisés à être mis à jour
    allowed_fields = [
        'firstName', 'lastName', 'phoneNumber', 'address', 
        'specialite', 'tarif', 'description', 'profilePicture'
    ]
    
    # Créer un dictionnaire avec les champs à mettre à jour
    update_data = {}
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
    
    if not update_data:
        return jsonify({'msg': 'Aucune donnée à mettre à jour'}), 400
    
    # Mettre à jour le médecin
    medecins_collection.update_one({'email': medecin_email}, {'$set': update_data})
    
    # Récupérer le médecin mis à jour
    updated_medecin = medecins_collection.find_one({'email': medecin_email})
    updated_medecin['_id'] = str(updated_medecin['_id'])
    
    print(f"Informations du médecin mises à jour: {medecin_email}")
    return jsonify(updated_medecin), 200

if __name__ == '__main__':
    # Initialiser les disponibilités des médecins qui n'en ont pas
    print("Vérification des disponibilités des médecins...")
    medecins_sans_disponibilites = medecins_collection.find({"disponibilites": {"$exists": False}})
    count = 0
    
    # Disponibilités par défaut pour tous les jours de la semaine (lundi-vendredi)
    disponibilites_par_defaut = {
        "lundi": ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
                 "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"],
        "mardi": ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
                 "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"],
        "mercredi": ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
                     "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"],
        "jeudi": ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
                 "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"],
        "vendredi": ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
                    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"],
        "samedi": [],
        "dimanche": []
    }
    
    for medecin in medecins_sans_disponibilites:
        medecins_collection.update_one(
            {"_id": medecin["_id"]},
            {"$set": {"disponibilites": disponibilites_par_defaut}}
        )
        count += 1
    
    # Vérifier également les médecins qui ont un tableau disponibilités vide
    medecins_disponibilites_vides = medecins_collection.find({"disponibilites": []})
    for medecin in medecins_disponibilites_vides:
        medecins_collection.update_one(
            {"_id": medecin["_id"]},
            {"$set": {"disponibilites": disponibilites_par_defaut}}
        )
        count += 1
    
    # Vérifier également les médecins qui ont un objet disponibilités vide
    medecins_disponibilites_objet_vide = medecins_collection.find({"disponibilites": {}})
    for medecin in medecins_disponibilites_objet_vide:
        medecins_collection.update_one(
            {"_id": medecin["_id"]},
            {"$set": {"disponibilites": disponibilites_par_defaut}}
        )
        count += 1
    
    print(f"Disponibilités ajoutées pour {count} médecins")
    
    app.run(debug=True, host='0.0.0.0', port=5000)