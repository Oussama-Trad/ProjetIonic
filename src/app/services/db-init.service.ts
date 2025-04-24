import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DbInitService {
  private apiUrl = 'http://localhost:5000/api'; // URL du backend Flask

  constructor(private http: HttpClient) { }

  initializeDatabase(): Observable<any> {
    // Vérifier si l'initialisation a déjà été effectuée
    const isInitialized = localStorage.getItem('dbInitialized');
    if (isInitialized === 'true') {
      console.log('La base de données a déjà été initialisée');
      return of({ message: 'Base de données déjà initialisée' });
    }

    // Charger les données depuis le fichier JSON
    return this.http.get('assets/db-init.json').pipe(
      tap((data: any) => {
        console.log('Données chargées depuis le fichier JSON:', data);
        // Initialiser les médecins
        this.initializeMedecins(data.medecins);
        // Initialiser les patients
        this.initializePatients(data.patients);
        // Initialiser les rendez-vous
        this.initializeRendezVous(data.rendezvous);
        // Marquer comme initialisé
        localStorage.setItem('dbInitialized', 'true');
      }),
      catchError(error => {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
        return of({ error: 'Échec de l\'initialisation de la base de données' });
      })
    );
  }

  private initializeMedecins(medecins: any[]): void {
    medecins.forEach(medecin => {
      this.http.post(`${this.apiUrl}/register-medecin`, medecin).pipe(
        tap(response => console.log(`Médecin enregistré: ${medecin.email}`, response)),
        catchError(error => {
          console.error(`Erreur lors de l'enregistrement du médecin ${medecin.email}:`, error);
          return of(null);
        })
      ).subscribe();
    });
  }

  private initializePatients(patients: any[]): void {
    patients.forEach(patient => {
      this.http.post(`${this.apiUrl}/register`, patient).pipe(
        tap(response => console.log(`Patient enregistré: ${patient.email}`, response)),
        catchError(error => {
          console.error(`Erreur lors de l'enregistrement du patient ${patient.email}:`, error);
          return of(null);
        })
      ).subscribe();
    });
  }

  private initializeRendezVous(rendezvous: any[]): void {
    rendezvous.forEach(rdv => {
      // Simuler une connexion en tant que l'utilisateur
      this.http.post(`${this.apiUrl}/login`, { 
        email: rdv.userEmail, 
        password: 'pass123' 
      }).pipe(
        tap((response: any) => {
          if (response && response.access_token) {
            const token = response.access_token;
            const headers = { Authorization: `Bearer ${token}` };
            
            // Créer le rendez-vous avec le token de l'utilisateur
            this.http.post(`${this.apiUrl}/rendezvous`, {
              medecinEmail: rdv.medecinEmail,
              date: rdv.date,
              heure: rdv.heure,
              motif: rdv.motif
            }, { headers }).pipe(
              tap(resp => console.log(`Rendez-vous créé pour ${rdv.userEmail}:`, resp)),
              catchError(err => {
                console.error(`Erreur lors de la création du rendez-vous pour ${rdv.userEmail}:`, err);
                return of(null);
              })
            ).subscribe();

            // Mettre à jour le statut si confirmé
            if (rdv.status === 'confirmé') {
              // Simuler une connexion en tant que médecin
              this.http.post(`${this.apiUrl}/login`, { 
                email: rdv.medecinEmail, 
                password: 'pass123' 
              }).pipe(
                tap((medecinResponse: any) => {
                  if (medecinResponse && medecinResponse.access_token) {
                    const medecinToken = medecinResponse.access_token;
                    const medecinHeaders = { Authorization: `Bearer ${medecinToken}` };
                    
                    // Confirmer le rendez-vous avec le token du médecin
                    this.http.put(`${this.apiUrl}/medecin/rendezvous/confirmer`, {
                      userEmail: rdv.userEmail,
                      date: rdv.date,
                      heure: rdv.heure
                    }, { headers: medecinHeaders }).pipe(
                      tap(resp => console.log(`Rendez-vous confirmé pour ${rdv.userEmail}:`, resp)),
                      catchError(err => {
                        console.error(`Erreur lors de la confirmation du rendez-vous pour ${rdv.userEmail}:`, err);
                        return of(null);
                      })
                    ).subscribe();
                  }
                }),
                catchError(err => {
                  console.error(`Erreur lors de la connexion du médecin ${rdv.medecinEmail}:`, err);
                  return of(null);
                })
              ).subscribe();
            }
          }
        }),
        catchError(err => {
          console.error(`Erreur lors de la connexion de l'utilisateur ${rdv.userEmail}:`, err);
          return of(null);
        })
      ).subscribe();
    });
  }
} 