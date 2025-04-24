from pymongo import MongoClient
import bcrypt
from datetime import datetime

# Connexion à MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['cabinet_medical']
medecins_collection = db['Medecins']

# Hachage du mot de passe
hashed_password = bcrypt.hashpw('password123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Préparation des données du médecin
medecin = {
    'email': 'dr.martin@example.com',
    'prenom': 'Pierre',
    'nom': 'Martin',
    'specialite': 'Médecine générale',
    'motDePasse': hashed_password,
    'adresse': '123 Rue de la Santé, Paris',
    'telephone': '0123456789',
    'disponibilites': [],
    'rendezVousConfirmes': [],
    'rendezVousDemandes': [],
    'notifications': [],
    'consultations': [],
    'fcmToken': '',
    'photoProfil': 'assets/default-doctor.png',
    'createdAt': datetime.utcnow()
}

# Vérifier si le médecin existe déjà
existing_doctor = medecins_collection.find_one({'email': medecin['email']})
if existing_doctor:
    print(f"Le médecin {medecin['email']} existe déjà dans la base de données.")
else:
    # Insertion dans la collection
    result = medecins_collection.insert_one(medecin)
    print(f"Médecin ajouté avec succès. ID: {result.inserted_id}") 