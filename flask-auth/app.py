from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId
import jwt
from datetime import datetime, timedelta
import bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity

app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": ["http://localhost:8100"], "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}})
app.config['JWT_SECRET_KEY'] = "your-secret-key"
jwt_manager = JWTManager(app)

client = MongoClient('mongodb://localhost:27017/')
db = client['cabinet_medical']
users_collection = db['users']
medecins_collection = db['Medecins']

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
        'rendezVousFuturs': [],
        'historiqueRendezVous': [],
        'documents': [],
        'notifications': [],
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
        token = jwt.encode({'sub': email, 'email': email, 'role': 'medecin', 'exp': datetime.utcnow() + timedelta(hours=24)}, app.config['JWT_SECRET_KEY'])
        return jsonify({'access_token': token, 'email': email, 'role': 'medecin'}), 200

    user = users_collection.find_one({'email': email})
    if user and verify_password(password, user['password']):
        token = jwt.encode({'sub': email, 'email': email, 'role': 'patient', 'exp': datetime.utcnow() + timedelta(hours=24)}, app.config['JWT_SECRET_KEY'])
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
    return jsonify(list(medecins)), 200

@app.route('/api/rendezvous', methods=['POST'])
@jwt_required()
def create_rendezvous():
    email = get_jwt_identity()
    data = request.get_json()
    medecin_email = data.get('medecinEmail')
    date = data.get('date')
    heure = data.get('heure')
    motif = data.get('motif')

    user = users_collection.find_one({'email': email})
    medecin = medecins_collection.find_one({'email': medecin_email})
    if not user or not medecin:
        return jsonify({'msg': 'Utilisateur ou médecin non trouvé'}), 404

    # Vérifier la disponibilité
    if not is_available(medecin, date, heure):
        return jsonify({'msg': 'Créneau non disponible'}), 400

    rdv = {'medecinId': medecin['email'], 'date': date, 'heure': heure, 'motif': motif, 'statut': 'en attente'}
    users_collection.update_one({'email': email}, {'$push': {'rendezVousFuturs': rdv}})
    medecins_collection.update_one({'email': medecin_email}, {'$push': {'rendezVousDemandes': {
        'patientId': user['email'], 'date': date, 'heure': heure, 'motif': motif, 'statut': 'en attente'
    }}})

    users_collection.update_one({'email': email}, {'$push': {'notifications': {
        'message': f'Rendez-vous demandé avec {medecin["prenom"]} {medecin["nom"]} le {date} à {heure}',
        'date': datetime.utcnow().isoformat(),
        'lue': False
    }}})

    return jsonify({'msg': 'Rendez-vous demandé avec succès'}), 201

def is_available(medecin, date, heure):
    horaires = medecin.get('horairesDisponibilite', [])
    for slot in horaires:
        if slot['date'] == date and slot['heure'] == heure and slot['disponible']:
            # Vérifier si aucun rendez-vous n'est déjà pris à ce créneau
            for rdv in medecin.get('rendezVousConfirmes', []) + medecin.get('rendezVousDemandes', []):
                if rdv['date'] == date and rdv['heure'] == heure and rdv['statut'] in ['accepté', 'en attente']:
                    return False
            return True
    return False

@app.route('/api/medecin/rendezvous/<action>', methods=['PUT'])
@jwt_required()
def manage_rendezvous(action):
    email = get_jwt_identity()
    data = request.get_json()
    patient_id = data.get('patientId')
    date = data.get('date')
    heure = data.get('heure')

    if action not in ['accept', 'reject']:
        return jsonify({'msg': 'Action invalide'}), 400

    rdv = medecins_collection.find_one({'email': email, 'rendezVousDemandes': {'$elemMatch': {'patientId': patient_id, 'date': date, 'heure': heure}}})
    if not rdv:
        return jsonify({'msg': 'Rendez-vous non trouvé'}), 404

    if action == 'accept':
        medecins_collection.update_one(
            {'email': email, 'rendezVousDemandes': {'$elemMatch': {'patientId': patient_id, 'date': date, 'heure': heure}}},
            {'$set': {'rendezVousDemandes.$.statut': 'accepté'}}
        )
        medecins_collection.update_one({'email': email}, {'$push': {'rendezVousConfirmes': {
            'patientId': patient_id, 'date': date, 'heure': heure, 'motif': data.get('motif'), 'diagnostics': [], 'prescriptions': [], 'documentsAssocies': []
        }}})
        users_collection.update_one(
            {'email': patient_id, 'rendezVousFuturs': {'$elemMatch': {'date': date, 'heure': heure}}},
            {'$set': {'rendezVousFuturs.$.statut': 'confirmé'}}
        )
        users_collection.update_one({'email': patient_id}, {'$push': {'notifications': {
            'message': f'Votre rendez-vous du {date} à {heure} avec {email} a été accepté',
            'date': datetime.utcnow().isoformat(),
            'lue': False
        }}})
    else:
        medecins_collection.update_one(
            {'email': email, 'rendezVousDemandes': {'$elemMatch': {'patientId': patient_id, 'date': date, 'heure': heure}}},
            {'$set': {'rendezVousDemandes.$.statut': 'rejeté'}}
        )
        users_collection.update_one(
            {'email': patient_id, 'rendezVousFuturs': {'$elemMatch': {'date': date, 'heure': heure}}},
            {'$set': {'rendezVousFuturs.$.statut': 'annulé'}}
        )
        users_collection.update_one({'email': patient_id}, {'$push': {'notifications': {
            'message': f'Votre rendez-vous du {date} à {heure} avec {email} a été rejeté',
            'date': datetime.utcnow().isoformat(),
            'lue': False
        }}})

    return jsonify({'msg': f'Rendez-vous {action}é avec succès'}), 200

@app.route('/api/medecin/rendezvous/cancel', methods=['PUT'])
@jwt_required()
def cancel_rendezvous():
    email = get_jwt_identity()
    data = request.get_json()
    medecin_email = data.get('medecinEmail')
    patient_id = data.get('patientId')
    date = data.get('date')
    heure = data.get('heure')

    medecins_collection.update_one(
        {'email': medecin_email, 'rendezVousConfirmes': {'$elemMatch': {'patientId': patient_id, 'date': date, 'heure': heure}}},
        {'$pull': {'rendezVousConfirmes': {'patientId': patient_id, 'date': date, 'heure': heure}}}
    )
    users_collection.update_one(
        {'email': patient_id, 'rendezVousFuturs': {'$elemMatch': {'date': date, 'heure': heure}}},
        {'$set': {'rendezVousFuturs.$.statut': 'annulé'}}
    )
    users_collection.update_one({'email': patient_id}, {'$push': {'notifications': {
        'message': f'Votre rendez-vous du {date} à {heure} avec {medecin_email} a été annulé',
        'date': datetime.utcnow().isoformat(),
        'lue': False
    }}})

    return jsonify({'msg': 'Rendez-vous annulé avec succès'}), 200

@app.route('/api/user/document', methods=['POST'])
@jwt_required()
def upload_document():
    email = get_jwt_identity()
    data = request.get_json()
    nom = data.get('nom')
    url = data.get('url')
    medecin_email = data.get('medecinEmail')

    doc = {'nom': nom, 'url': url, 'dateEnvoi': datetime.utcnow().isoformat(), 'statut': 'envoyé', 'annotations': ''}
    users_collection.update_one({'email': email}, {'$push': {'documents': doc}})
    return jsonify({'msg': 'Document envoyé avec succès'}), 201

@app.route('/api/medecin/consultation', methods=['PUT'])
@jwt_required()
def update_consultation():
    email = get_jwt_identity()
    data = request.get_json()
    patient_id = data.get('patientId')
    date = data.get('date')
    heure = data.get('heure')
    diagnostics = data.get('diagnostics', [])
    prescriptions = data.get('prescriptions', [])

    medecins_collection.update_one(
        {'email': email, 'rendezVousConfirmes': {'$elemMatch': {'patientId': patient_id, 'date': date, 'heure': heure}}},
        {'$set': {'rendezVousConfirmes.$.diagnostics': diagnostics, 'rendezVousConfirmes.$.prescriptions': prescriptions}}
    )
    users_collection.update_one(
        {'email': patient_id},
        {'$push': {'historiqueRendezVous': {
            'medecinId': email, 'date': date, 'heure': heure, 'motif': data.get('motif'), 'diagnostics': diagnostics, 'prescriptions': prescriptions
        }}}
    )

    return jsonify({'msg': 'Consultation mise à jour'}), 200

@app.route('/api/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    email = get_jwt_identity()
    data = request.get_json()
    old_password = data.get('oldPassword')
    new_password = data.get('newPassword')

    user = users_collection.find_one({'email': email})
    if user and verify_password(old_password, user['password']):
        new_hashed_password = hash_password(new_password)
        users_collection.update_one({'email': email}, {'$set': {'password': new_hashed_password}})
        return jsonify({'msg': 'Mot de passe mis à jour avec succès'}), 200
    
    medecin = medecins_collection.find_one({'email': email})
    if medecin and verify_password(old_password, medecin['motDePasse']):
        new_hashed_password = hash_password(new_password)
        medecins_collection.update_one({'email': email}, {'$set': {'motDePasse': new_hashed_password}})
        return jsonify({'msg': 'Mot de passe mis à jour avec succès'}), 200

    return jsonify({'msg': 'Ancien mot de passe incorrect'}), 401

if __name__ == '__main__':
    app.run(debug=True)