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

# Configuration CORS simplifiée
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8100"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Authorization", "Content-Type", "X-Requested-With"],
        "expose_headers": ["Authorization"],
        "supports_credentials": True
    }
}, supports_credentials=True)

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
    return jsonify({'msg': 'Erreur serveur interne', 'error': str(e)}), 500

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    print(f"Requête OPTIONS reçue pour /api/{path}")
    return make_response('', 200)

# Inscription
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    print(f"Données reçues pour inscription: {data}")

    # Validation des champs requis
    required_fields = ['email', 'password', 'firstName', 'lastName', 'phoneNumber', 'birthDate', 'address', 'gender']
    for field in required_fields:
        if not data.get(field):
            print(f"Champ manquant lors de l'inscription: {field}")
            return jsonify({'msg': f'Champ {field} manquant'}), 400

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
        'createdAt': datetime.utcnow(),
        'settings': {'darkMode': False, 'language': 'fr'}
    }
    users_collection.insert_one(user_data)
    print(f"Utilisateur enregistré: {email}")
    return jsonify({'email': email}), 201

# Connexion
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

# Récupérer un utilisateur
@app.route('/api/user', methods=['GET'])
@jwt_required()
def get_user():
    email = request.args.get('email')
    identity = get_jwt_identity()
    print(f"Requête GET /api/user - email: {email}, identité: {identity}")
    if identity != email:
        print(f"Accès non autorisé: identité ({identity}) ne correspond pas à l'email ({email})")
        return jsonify({'msg': 'Accès non autorisé'}), 403
    user = users_collection.find_one({'email': email}, {'_id': 0, 'password': 0})
    if user:
        print(f"Utilisateur trouvé: {email}, données: {user}")
        required_fields = ['firstName', 'lastName', 'profilePicture']
        for field in required_fields:
            if field not in user:
                print(f"Champ manquant dans les données utilisateur: {field}")
                user[field] = ''
        return jsonify(user), 200
    print(f"Utilisateur non trouvé: {email}")
    return jsonify({'msg': 'Utilisateur non trouvé'}), 404

# Mise à jour d'un utilisateur
@app.route('/api/user', methods=['PUT'])
@jwt_required()
def update_user():
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Requête PUT /api/user - email: {email}, données: {data}")
    if email != data.get('email'):
        print(f"Accès non autorisé: identité ({email}) ne correspond pas à l'email dans les données ({data.get('email')})")
        return jsonify({'msg': 'Accès non autorisé'}), 403
    
    token = request.headers.get('Authorization').split('Bearer ')[1]
    decoded_token = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
    role = decoded_token.get('role')
    print(f"Rôle extrait du token: {role}")

    collection = medecins_collection if role == 'medecin' else users_collection
    
    update_data = {
        'firstName': data.get('firstName'),
        'lastName': data.get('lastName'),
        'phoneNumber': data.get('phoneNumber'),
        'address': data.get('address'),
        'birthDate': data.get('birthDate'),
        'gender': data.get('gender'),
        'profilePicture': data.get('profilePicture') if role == 'patient' else None,
        'photoProfil': data.get('photoProfil') if role == 'medecin' else None
    }
    
    update_data = {k: v for k, v in update_data.items() if v is not None}
    print(f"Données à mettre à jour: {update_data}")
    
    result = collection.update_one(
        {'email': email},
        {'$set': update_data}
    )
    
    if result.matched_count > 0:
        updated_user = collection.find_one({'email': email}, {'_id': 0, 'password': 0, 'motDePasse': 0})
        print(f"Utilisateur mis à jour: {email}, nouvelles données: {updated_user}")
        return jsonify(updated_user), 200
    else:
        print(f"Utilisateur non trouvé pour mise à jour: {email}")
        return jsonify({'msg': 'Utilisateur non trouvé'}), 404

# Récupérer un médecin
@app.route('/api/medecin', methods=['GET'])
@jwt_required()
def get_medecin():
    email = request.args.get('email')
    identity = get_jwt_identity()
    print(f"Requête GET /api/medecin - email: {email}, identité: {identity}")
    user = users_collection.find_one({'email': identity})
    medecin = medecins_collection.find_one({'email': identity})
    if not user and not medecin:
        print(f"Utilisateur ou médecin non trouvé pour identité: {identity}")
        return jsonify({'msg': 'Utilisateur non trouvé'}), 404

    target_medecin = medecins_collection.find_one({'email': email}, {'_id': 0, 'motDePasse': 0})
    if target_medecin:
        print(f"Médecin trouvé pour {email} par {identity}, données: {target_medecin}")
        required_fields = ['prenom', 'nom', 'photoProfil']
        for field in required_fields:
            if field not in target_medecin:
                print(f"Champ manquant dans les données médecin: {field}")
                target_medecin[field] = ''
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
    print(f"Liste des médecins trouvés: {len(medecins_list)} résultats pour recherche '{search_query}'")
    return jsonify(medecins_list), 200

# Créer un rendez-vous
@app.route('/api/rendezvous', methods=['POST'])
@jwt_required()
def create_rendezvous():
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

    # Validation des champs
    if not all([medecin_email, date, heure, user_email]):
        print("Données manquantes dans la requête:", {'medecinEmail': medecin_email, 'date': date, 'heure': heure, 'userEmail': user_email})
        return jsonify({'msg': 'Données manquantes'}), 400

    # Vérifier que l'utilisateur est autorisé à créer ce rendez-vous
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

    # Validation de la date
    try:
        parsed_date = datetime.strptime(date, '%Y-%m-%d')
        day_of_week = parsed_date.weekday()
        print(f"Date {date} validée, jour de la semaine: {day_of_week}")
        if day_of_week >= 5:
            print(f"Date {date} est un week-end")
            return jsonify({'msg': 'Pas de disponibilité le week-end'}), 400
    except ValueError as e:
        print(f"Erreur de format de date: {date}, erreur: {str(e)}")
        return jsonify({'msg': 'Format de date invalide'}), 400

    # Validation de l'heure
    try:
        hour = int(heure.split(':')[0])
        minute = int(heure.split(':')[1])
        if hour < 8 or hour >= 18 or minute not in [0, 30]:
            print(f"Heure {heure} hors plage ou invalide")
            return jsonify({'msg': 'Horaire hors plage (8:00-18:00) ou minutes invalides'}), 400
    except (ValueError, IndexError) as e:
        print(f"Erreur de format d'heure: {heure}, erreur: {str(e)}")
        return jsonify({'msg': 'Format d’heure invalide'}), 400

    # Vérification des conflits
    rdv_conflicts = medecin.get('rendezVousConfirmes', []) + medecin.get('rendezVousDemandes', [])
    print(f"Vérification des conflits pour {date} {heure}: {rdv_conflicts}")
    for rdv in rdv_conflicts:
        if not isinstance(rdv, dict):
            print(f"Donnée mal formée dans rendezVousConfirmes ou rendezVousDemandes: {rdv}")
            continue
        if rdv.get('date') == date and rdv.get('heure') == heure and rdv.get('statut') in ['accepté', 'en attente']:
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
        return jsonify({'msg': 'Erreur serveur interne', 'error': str(e)}), 500

# Gérer les rendez-vous
@app.route('/api/medecin/rendezvous/<action>', methods=['PUT'])
@jwt_required()
def manage_rendezvous(action):
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Données reçues pour gestion rendez-vous ({action}): {data}")

    # Validation des données
    user_email = data.get('userEmail')
    date = data.get('date')
    heure = data.get('heure')
    if not all([user_email, date, heure]):
        print(f"Données manquantes pour gérer le rendez-vous: userEmail={user_email}, date={date}, heure={heure}")
        return jsonify({'msg': 'Données manquantes : userEmail, date ou heure requis'}), 400

    medecin = medecins_collection.find_one({'email': email})
    if not medecin:
        print(f"Médecin non trouvé: {email}")
        return jsonify({'msg': 'Médecin non trouvé'}), 404

    print(f"Gestion du rendez-vous pour {user_email} le {date} à {heure} par {email}")

    # Recherche du rendez-vous avec validation
    rdv = None
    rendez_vous_demandes = medecin.get('rendezVousDemandes', [])
    for r in rendez_vous_demandes:
        if not isinstance(r, dict):
            print(f"Donnée mal formée dans rendezVousDemandes: {r}")
            continue
        if r.get('userEmail') == user_email and r.get('date') == date and r.get('heure') == heure:
            rdv = r
            break

    if not rdv:
        print(f"Rendez-vous non trouvé pour {user_email} le {date} à {heure}")
        return jsonify({'msg': 'Rendez-vous non trouvé'}), 404

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
                        'message': f'Votre rendez-vous avec {medecin["prenom"]} {medecin["nom"]} le {date} à {heure} a été accepté',
                        'date': datetime.utcnow().isoformat(),
                        'lue': False
                    }
                }
            },
            array_filters=[{'elem.medecinId': email, 'elem.date': date, 'elem.heure': heure}]
        )
        print(f"Rendez-vous accepté pour {user_email} le {date} à {heure}")
        return jsonify({'msg': 'Rendez-vous accepté'}), 200
    elif action == 'refuse':
        medecins_collection.update_one(
            {'email': email},
            {'$pull': {'rendezVousDemandes': {'userEmail': user_email, 'date': date, 'heure': heure}}}
        )
        users_collection.update_one(
            {'email': user_email},
            {
                '$set': {'rendezVousFuturs.$[elem].statut': 'refusé'},
                '$push': {
                    'notifications': {
                        'message': f'Votre rendez-vous avec {medecin["prenom"]} {medecin["nom"]} le {date} à {heure} a été refusé',
                        'date': datetime.utcnow().isoformat(),
                        'lue': False
                    }
                }
            },
            array_filters=[{'elem.medecinId': email, 'elem.date': date, 'elem.heure': heure}]
        )
        print(f"Rendez-vous refusé pour {user_email} le {date} à {heure}")
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
        print(f"Données manquantes pour téléverser le document: nom={nom}, url={url}, medecinEmail={medecin_email}")
        return jsonify({'msg': 'Données manquantes : nom, url ou medecinEmail requis'}), 400

    document = {'nom': nom, 'url': url, 'medecinEmail': medecin_email, 'timestamp': datetime.utcnow().isoformat()}
    users_collection.update_one(
        {'email': email},
        {'$push': {'documents': document}}
    )
    medecins_collection.update_one(
        {'email': medecin_email},
        {
            '$push': {
                'notifications': {
                    'message': f"{email} vous a envoyé le document '{nom}'",
                    'date': datetime.utcnow().isoformat(),
                    'lue': False
                }
            }
        }
    )
    print(f"Document téléversé par {email} pour {medecin_email}: {nom}")
    return jsonify({'msg': 'Document téléversé'}), 201

# Mettre à jour les paramètres
@app.route('/api/user/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    email = get_jwt_identity()
    data = request.get_json()
    print(f"Requête reçue pour /api/user/settings avec données: {data}, identité: {email}")

    if not isinstance(data, dict):
        print(f"Données invalides reçues: {data}")
        return jsonify({'msg': 'Les données doivent être un objet JSON valide'}), 400

    dark_mode = data.get('darkMode')
    language = data.get('language')
    if dark_mode is None or language is None:
        print(f"Paramètres manquants: darkMode={dark_mode}, language={language}")
        return jsonify({'msg': 'Les paramètres darkMode et language sont requis'}), 400

    if not isinstance(dark_mode, bool):
        print(f"darkMode doit être un booléen, reçu: {dark_mode}")
        return jsonify({'msg': 'darkMode doit être un booléen'}), 400
    if not isinstance(language, str) or language not in ['fr', 'en', 'es']:
        print(f"language doit être une chaîne valide (fr, en, es), reçu: {language}")
        return jsonify({'msg': 'language doit être fr, en ou es'}), 400

    settings = {'darkMode': dark_mode, 'language': language}
    print(f"Paramètres à mettre à jour: {settings}")

    user = users_collection.find_one({'email': email})
    if user:
        result = users_collection.update_one({'email': email}, {'$set': {'settings': settings}})
        if result.modified_count > 0:
            print(f"Paramètres mis à jour pour l'utilisateur {email}: {settings}")
            return jsonify({'msg': 'Paramètres mis à jour', 'settings': settings}), 200
        else:
            print(f"Aucune modification détectée pour l'utilisateur {email}")
            return jsonify({'msg': 'Aucune modification nécessaire', 'settings': settings}), 200

    medecin = medecins_collection.find_one({'email': email})
    if medecin:
        result = medecins_collection.update_one({'email': email}, {'$set': {'settings': settings}})
        if result.modified_count > 0:
            print(f"Paramètres mis à jour pour le médecin {email}: {settings}")
            return jsonify({'msg': 'Paramètres mis à jour', 'settings': settings}), 200
        else:
            print(f"Aucune modification détectée pour le médecin {email}")
            return jsonify({'msg': 'Aucune modification nécessaire', 'settings': settings}), 200

    print(f"Utilisateur ou médecin non trouvé pour mise à jour des paramètres: {email}")
    return jsonify({'msg': 'Utilisateur non trouvé'}), 404

# Récupérer les disponibilités d'un médecin
@app.route('/api/medecin/disponibilites', methods=['GET'])
@jwt_required()
def get_medecin_disponibilites():
    email = request.args.get('email')
    medecin = medecins_collection.find_one({'email': email}, {'_id': 0, 'motDePasse': 0})
    if not medecin:
        print(f"Médecin non trouvé: {email}")
        return jsonify({'msg': 'Médecin non trouvé'}), 404
    
    rdv_confirmes = medecin.get('rendezVousConfirmes', [])
    rdv_demandes = medecin.get('rendezVousDemandes', [])
    disponibilites = {
        'rendezVousConfirmes': rdv_confirmes,
        'rendezVousDemandes': rdv_demandes
    }
    print(f"Disponibilités récupérées pour {email}: {disponibilites}")
    return jsonify(disponibilites), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)