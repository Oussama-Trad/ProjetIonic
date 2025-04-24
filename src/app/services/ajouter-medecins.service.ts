import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AjouterMedecinsService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) { }

  ajouterMedecins(): Observable<any> {
    const medecins = this.getMedecinsList();
    
    // Créer un tableau d'observables pour chaque médecin à ajouter
    const requests = medecins.map(medecin => 
      this.http.post(`${this.apiUrl}/register-medecin`, medecin).pipe(
        tap(response => console.log(`Médecin enregistré: ${medecin.email}`, response)),
        catchError(error => {
          console.error(`Erreur lors de l'enregistrement du médecin ${medecin.email}:`, error);
          return of(null);
        })
      )
    );
    
    // Exécuter toutes les requêtes en parallèle
    return forkJoin(requests).pipe(
      tap(() => console.log('Tous les médecins ont été ajoutés')),
      catchError(error => {
        console.error('Erreur lors de l\'ajout des médecins:', error);
        return of({ error: 'Échec de l\'ajout des médecins' });
      })
    );
  }

  private getMedecinsList(): any[] {
    return [
      {
        "email": "dr.dubois@example.com",
        "password": "pass123",
        "firstName": "Marie",
        "lastName": "Dubois",
        "phoneNumber": "0623456789",
        "specialite": "Dermatologie",
        "address": "25 Rue de la République, 69002 Lyon",
        "description": "Dermatologue spécialisée dans les maladies de la peau, des ongles et des cheveux.",
        "disponibilites": {
          "lundi": ["09:30", "10:30", "11:30", "14:30", "15:30", "16:30"],
          "mardi": ["09:30", "10:30", "11:30", "14:30", "15:30", "16:30"],
          "mercredi": [],
          "jeudi": ["09:30", "10:30", "11:30", "14:30", "15:30", "16:30"],
          "vendredi": ["09:30", "10:30", "11:30", "14:30", "15:30", "16:30"]
        },
        "profilePicture": "https://i.pravatar.cc/300?img=5",
        "gender": "F"
      },
      {
        "email": "dr.petit@example.com",
        "password": "pass123",
        "firstName": "Jean",
        "lastName": "Petit",
        "phoneNumber": "0634567890",
        "specialite": "Pédiatrie",
        "address": "8 Place du Capitole, 31000 Toulouse",
        "description": "Pédiatre avec une approche bienveillante centrée sur l'enfant et sa famille.",
        "disponibilites": {
          "lundi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
          "mardi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
          "mercredi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
          "jeudi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
          "vendredi": []
        },
        "profilePicture": "https://i.pravatar.cc/300?img=11",
        "gender": "M"
      },
      {
        "email": "dr.bernard@example.com",
        "password": "pass123",
        "firstName": "Sophie",
        "lastName": "Bernard",
        "phoneNumber": "0645678901",
        "specialite": "Ophtalmologie",
        "address": "45 Boulevard Carnot, 13100 Aix-en-Provence",
        "description": "Ophtalmologue pratiquant des examens visuels complets et le traitement des pathologies oculaires.",
        "disponibilites": {
          "lundi": ["14:00", "15:00", "16:00", "17:00"],
          "mardi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
          "mercredi": ["09:00", "10:00", "11:00"],
          "jeudi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
          "vendredi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]
        },
        "profilePicture": "https://i.pravatar.cc/300?img=9",
        "gender": "F"
      },
      {
        "email": "dr.lambert@example.com",
        "password": "pass123",
        "firstName": "Philippe",
        "lastName": "Lambert",
        "phoneNumber": "0656789012",
        "specialite": "Médecine générale",
        "address": "12 Rue des Fleurs, 44000 Nantes",
        "description": "Médecin généraliste à l'écoute des patients de tout âge pour des consultations variées.",
        "disponibilites": {
          "lundi": ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"],
          "mardi": ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"],
          "mercredi": ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
          "jeudi": ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"],
          "vendredi": ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"]
        },
        "profilePicture": "https://i.pravatar.cc/300?img=13",
        "gender": "M"
      },
      {
        "email": "dr.moreau@example.com",
        "password": "pass123",
        "firstName": "Isabelle",
        "lastName": "Moreau",
        "phoneNumber": "0678901234",
        "specialite": "Cardiologie",
        "address": "32 Rue Saint-Dominique, 75007 Paris",
        "description": "Cardiologue spécialisée dans les maladies cardiovasculaires et la prévention.",
        "disponibilites": {
          "lundi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
          "mardi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
          "mercredi": ["09:00", "10:00", "11:00"],
          "jeudi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
          "vendredi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
        },
        "profilePicture": "https://i.pravatar.cc/300?img=20",
        "gender": "F"
      },
      {
        "email": "dr.leroy@example.com",
        "password": "pass123",
        "firstName": "Pierre",
        "lastName": "Leroy",
        "phoneNumber": "0689012345",
        "specialite": "Psychiatrie",
        "address": "18 Rue Sainte-Catherine, 33000 Bordeaux",
        "description": "Psychiatre spécialisé dans le traitement des troubles anxieux et dépressifs.",
        "disponibilites": {
          "lundi": ["10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
          "mardi": ["10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
          "mercredi": [],
          "jeudi": ["10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
          "vendredi": ["10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]
        },
        "profilePicture": "https://i.pravatar.cc/300?img=25",
        "gender": "M"
      },
      {
        "email": "dr.mercier@example.com",
        "password": "pass123",
        "firstName": "Juliette",
        "lastName": "Mercier",
        "phoneNumber": "0690123456",
        "specialite": "Orthopédie",
        "address": "5 Avenue Foch, 57000 Metz",
        "description": "Orthopédiste spécialisée dans les troubles musculo-squelettiques et la médecine du sport.",
        "disponibilites": {
          "lundi": ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
          "mardi": ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
          "mercredi": ["08:00", "09:00", "10:00", "11:00"],
          "jeudi": ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
          "vendredi": ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
        },
        "profilePicture": "https://i.pravatar.cc/300?img=26",
        "gender": "F"
      },
      {
        "email": "dr.rousseau@example.com",
        "password": "pass123",
        "firstName": "Antoine",
        "lastName": "Rousseau",
        "phoneNumber": "0701234567",
        "specialite": "Neurologie",
        "address": "15 Rue de la Liberté, 21000 Dijon",
        "description": "Neurologue spécialisé dans les troubles du système nerveux et les maladies neurodégénératives.",
        "disponibilites": {
          "lundi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
          "mardi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
          "mercredi": ["09:00", "10:00", "11:00"],
          "jeudi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
          "vendredi": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
        },
        "profilePicture": "https://i.pravatar.cc/300?img=51",
        "gender": "M"
      },
      {
        "email": "dr.faure@example.com",
        "password": "pass123",
        "firstName": "Camille",
        "lastName": "Faure",
        "phoneNumber": "0712345678",
        "specialite": "Gastro-entérologie",
        "address": "28 Rue du Vieux Marché, 76000 Rouen",
        "description": "Gastro-entérologue spécialisée dans les maladies digestives et l'endoscopie.",
        "disponibilites": {
          "lundi": ["09:30", "10:30", "11:30", "14:30", "15:30", "16:30"],
          "mardi": ["09:30", "10:30", "11:30", "14:30", "15:30", "16:30"],
          "mercredi": [],
          "jeudi": ["09:30", "10:30", "11:30", "14:30", "15:30", "16:30"],
          "vendredi": ["09:30", "10:30", "11:30", "14:30", "15:30", "16:30"]
        },
        "profilePicture": "https://i.pravatar.cc/300?img=32",
        "gender": "F"
      }
    ];
  }
} 