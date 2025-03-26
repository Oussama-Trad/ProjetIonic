import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api';
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  private settingsSubject = new BehaviorSubject<{ darkMode: boolean; language: string }>({
    darkMode: false,
    language: 'fr',
  });
  isLoggedIn$ = this.isLoggedInSubject.asObservable();
  settings$ = this.settingsSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    if (!this.http) {
      console.error('Erreur : HttpClient n’est pas injecté dans AuthService');
      throw new Error('HttpClient non injecté');
    }
    this.checkInitialLoginStatus();
  }

  private checkInitialLoginStatus() {
    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;
    this.isLoggedInSubject.next(isLoggedIn);
    console.log('État initial de connexion :', isLoggedIn);
    if (isLoggedIn) {
      const email = localStorage.getItem('email');
      const role = localStorage.getItem('role');
      if (email) {
        const fetchMethod = role === 'medecin' ? this.getMedecin.bind(this) : this.getUser.bind(this);
        fetchMethod(email).subscribe({
          next: (response) => {
            const settings = response.settings || { darkMode: false, language: 'fr' };
            this.settingsSubject.next(settings);
            this.applySettings(settings);
          },
          error: (err) => console.error('Erreur chargement settings initiaux :', err),
        });
      }
    }
  }

  login(email: string, password: string): Observable<any> {
    const body = { email, password };
    console.log('Tentative de connexion avec :', body);
    return this.http.post(`${this.apiUrl}/login`, body, {
      headers: { 'Content-Type': 'application/json' },
    }).pipe(
      tap((response: any) => {
        if (response && response.access_token) {
          localStorage.setItem('token', response.access_token);
          localStorage.setItem('email', response.email);
          localStorage.setItem('role', response.role);
          this.isLoggedInSubject.next(true);
          console.log('Connexion réussie, token stocké :', response.access_token);
          const fetchMethod = response.role === 'medecin' ? this.getMedecin.bind(this) : this.getUser.bind(this);
          fetchMethod(response.email).subscribe({
            next: (user) => {
              const settings = user.settings || { darkMode: false, language: 'fr' };
              this.settingsSubject.next(settings);
              this.applySettings(settings);
            },
            error: (err) => console.error('Erreur chargement utilisateur après connexion :', err),
          });
        } else {
          console.error('Aucun token reçu dans la réponse :', response);
          throw new Error('Aucun token reçu du serveur');
        }
      }),
      catchError((error) => {
        console.error('Erreur lors de la connexion :', error);
        const errorMsg = error.error?.msg || 'Échec de la connexion. Vérifiez vos identifiants.';
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  register(
    firstName: string,
    lastName: string,
    phoneNumber: string,
    email: string,
    password: string,
    birthDate: string,
    address: string,
    gender: string,
    profilePicture: string = ''
  ): Observable<any> {
    const body = { firstName, lastName, phoneNumber, email, password, birthDate, address, gender, profilePicture };
    console.log('Tentative d’inscription avec :', body);
    return this.http.post(`${this.apiUrl}/register`, body, {
      headers: { 'Content-Type': 'application/json' },
    }).pipe(
      tap((response) => console.log('Inscription réussie :', response)),
      catchError((error) => {
        console.error('Erreur lors de l’inscription :', error);
        const errorMsg = error.error?.msg || 'Échec de l’inscription';
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  getUser(email: string): Observable<User> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Aucun token trouvé pour getUser');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    console.log('Récupération utilisateur pour email :', email);
    return this.http.get<User>(`${this.apiUrl}/user?email=${email}`, { headers }).pipe(
      tap((response) => console.log('Utilisateur récupéré avec succès :', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération de l’utilisateur :', error);
        if (error.status === 401) {
          this.logout();
          return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
        }
        if (error.status === 404) {
          return throwError(() => new Error('Utilisateur non trouvé dans la base de données'));
        }
        return throwError(() => new Error(error.error?.msg || 'Erreur récupération utilisateur'));
      })
    );
  }

  getMedecin(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Aucun token trouvé pour getMedecin');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    console.log('Récupération médecin pour email :', email);
    return this.http.get(`${this.apiUrl}/medecin?email=${email}`, { headers }).pipe(
      tap((response) => console.log('Médecin récupéré avec succès :', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération du médecin :', error);
        if (error.status === 401) {
          this.logout();
          return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
        }
        if (error.status === 404) {
          return throwError(() => new Error('Médecin non trouvé dans la base de données'));
        }
        return throwError(() => new Error(error.error?.msg || 'Erreur récupération médecin'));
      })
    );
  }

  getAllMedecins(search: string = ''): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : new HttpHeaders();
    console.log('Récupération de tous les médecins avec recherche :', search);
    return this.http.get(`${this.apiUrl}/medecins`, {
      headers,
      params: { search },
    }).pipe(
      tap((response) => console.log('Liste des médecins récupérée :', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des médecins :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur récupération liste médecins'));
      })
    );
  }

  createRendezVous(data: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour createRendezVous');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
    });
    console.log('Création rendez-vous avec données :', data);
    return this.http.post(`${this.apiUrl}/rendezvous`, data, { headers }).pipe(
      tap((response) => console.log('Rendez-vous créé :', response)),
      catchError((error) => {
        console.error('Erreur lors de la création du rendez-vous :', error);
        const errorMsg = error.error?.msg || 'Échec de la création du rendez-vous';
        if (error.status === 401) this.logout();
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  manageRendezVous(userEmail: string, date: string, heure: string, action: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour manageRendezVous');
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    // Validation des données
    if (!userEmail || !date || !heure || !action) {
      console.error('Données invalides pour manageRendezVous :', { userEmail, date, heure, action });
      return throwError(() => new Error('Données invalides : userEmail, date, heure ou action manquant'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { userEmail, date, heure };
    console.log(`Gestion rendez-vous (${action}) avec :`, body);
    return this.http.put(`${this.apiUrl}/medecin/rendezvous/${action}`, body, { headers }).pipe(
      tap((response) => console.log(`Rendez-vous ${action} :`, response)),
      catchError((error) => {
        console.error(`Erreur lors de la gestion du rendez-vous (${action}) :`, error);
        const errorMsg = error.error?.msg || `Échec de l'action ${action} sur le rendez-vous`;
        if (error.status === 401) {
          this.logout();
          return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
        }
        if (error.status === 500) {
          return throwError(() => new Error('Erreur serveur interne : vérifiez les logs du serveur'));
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  cancelRendezVous(medecinEmail: string, userEmail: string, date: string, heure: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour cancelRendezVous');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { medecinEmail, userEmail, date, heure };
    console.log('Annulation rendez-vous avec :', body);
    return this.http.put(`${this.apiUrl}/medecin/rendezvous/cancel`, body, { headers }).pipe(
      tap((response) => console.log('Rendez-vous annulé :', response)),
      catchError((error) => {
        console.error('Erreur lors de l’annulation du rendez-vous :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur annulation rendez-vous'));
      })
    );
  }

  saveConsultation(consultation: { userEmail: string; date: string; heure: string; diagnostics: string[]; prescriptions: string[] }): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour saveConsultation');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    console.log('Enregistrement consultation avec :', consultation);
    return this.http.post(`${this.apiUrl}/medecin/consultation`, consultation, { headers }).pipe(
      tap((response) => console.log('Consultation enregistrée :', response)),
      catchError((error) => {
        console.error('Erreur lors de l’enregistrement de la consultation :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur enregistrement consultation'));
      })
    );
  }

  updateConsultation(userEmail: string, date: string, heure: string, diagnostics: string[], prescriptions: string[]): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateConsultation');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { userEmail, date, heure, diagnostics, prescriptions };
    console.log('Mise à jour consultation avec :', body);
    return this.http.put(`${this.apiUrl}/medecin/consultation`, body, { headers }).pipe(
      tap((response) => console.log('Consultation mise à jour :', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de la consultation :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur mise à jour consultation'));
      })
    );
  }

  getConsultation(userEmail: string, date: string, heure: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour getConsultation');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    console.log('Récupération consultation pour :', { userEmail, date, heure });
    return this.http.get(`${this.apiUrl}/medecin/consultation`, { headers, params: { userEmail, date, heure } }).pipe(
      tap((response) => console.log('Consultation récupérée :', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération de la consultation :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur récupération consultation'));
      })
    );
  }

  uploadDocument(nom: string, url: string, medecinEmail: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour uploadDocument');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { nom, url, medecinEmail };
    console.log('Téléversement document avec :', body);
    return this.http.post(`${this.apiUrl}/user/document`, body, { headers }).pipe(
      tap((response) => console.log('Document téléversé :', response)),
      catchError((error) => {
        console.error('Erreur lors du téléversement du document :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur téléversement document'));
      })
    );
  }

  updateUser(
    email: string,
    firstName: string,
    lastName: string,
    phoneNumber: string,
    address: string,
    birthDate: string,
    gender: string,
    profilePicture?: string
  ): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateUser');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { email, firstName, lastName, phoneNumber, address, birthDate, gender, profilePicture };
    console.log('Mise à jour utilisateur avec :', body);
    return this.http.put(`${this.apiUrl}/user`, body, { headers }).pipe(
      tap((response) => console.log('Utilisateur mis à jour :', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de l’utilisateur :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur mise à jour utilisateur'));
      })
    );
  }

  updateUserProfilePicture(email: string, updatedData: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateUserProfilePicture');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    console.log('Mise à jour de la photo de profil pour :', email, updatedData);
    return this.http.put(`${this.apiUrl}/user`, updatedData, { headers }).pipe(
      tap((response) => console.log('Photo de profil mise à jour :', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de la photo de profil :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur mise à jour photo de profil'));
      })
    );
  }

  updateUserAccount(user: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateUserAccount');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    console.log('Mise à jour compte utilisateur avec :', user);
    return this.http.put(`${this.apiUrl}/user/account`, user, { headers }).pipe(
      tap((response) => console.log('Compte utilisateur mis à jour :', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du compte utilisateur :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur mise à jour compte utilisateur'));
      })
    );
  }

  deleteUser(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour deleteUser');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    console.log('Suppression utilisateur pour email :', email);
    return this.http.delete(`${this.apiUrl}/user`, { headers, params: { email } }).pipe(
      tap((response) => console.log('Utilisateur supprimé :', response)),
      catchError((error) => {
        console.error('Erreur lors de la suppression de l’utilisateur :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur suppression utilisateur'));
      })
    );
  }

  updateMedecin(medecin: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateMedecin');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    console.log('Mise à jour médecin avec :', medecin);
    return this.http.put(`${this.apiUrl}/medecin/update`, medecin, { headers }).pipe(
      tap((response) => console.log('Médecin mis à jour :', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du médecin :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur mise à jour médecin'));
      })
    );
  }

  updateMedecinAccount(medecin: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateMedecinAccount');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    console.log('Mise à jour compte médecin avec :', medecin);
    return this.http.put(`${this.apiUrl}/medecin/account`, medecin, { headers }).pipe(
      tap((response) => console.log('Compte médecin mis à jour :', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du compte médecin :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur mise à jour compte médecin'));
      })
    );
  }

  changePassword(email: string, oldPassword: string, newPassword: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour changePassword');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { email, oldPassword, newPassword };
    console.log('Changement de mot de passe avec :', { email });
    return this.http.put(`${this.apiUrl}/change-password`, body, { headers }).pipe(
      tap((response) => console.log('Mot de passe changé :', response)),
      catchError((error) => {
        console.error('Erreur lors du changement de mot de passe :', error);
        const errorMsg = error.error?.msg || 'Échec du changement de mot de passe';
        if (error.status === 401) this.logout();
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  updateSettings(darkMode: boolean, language: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateSettings');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { darkMode, language };
    console.log('Mise à jour des paramètres avec :', body);
    return this.http.put(`${this.apiUrl}/user/settings`, body, { headers }).pipe(
      tap((response) => {
        console.log('Paramètres mis à jour :', response);
        const newSettings = { darkMode, language };
        this.settingsSubject.next(newSettings);
        this.applySettings(newSettings);
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour des paramètres :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur mise à jour paramètres'));
      })
    );
  }

  getMedecinDisponibilites(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Aucun token trouvé pour getMedecinDisponibilites');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    console.log('Récupération des disponibilités pour le médecin :', email);
    return this.http.get(`${this.apiUrl}/medecin/disponibilites?email=${email}`, { headers }).pipe(
      tap((response) => console.log('Disponibilités récupérées :', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des disponibilités :', error);
        if (error.status === 401) {
          this.logout();
          return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
        }
        return throwError(() => new Error(error.error?.msg || 'Erreur récupération disponibilités'));
      })
    );
  }

  getNotifications(email: string): Observable<User> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour getNotifications');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    console.log('Récupération des notifications pour :', email);
    return this.http.get<User>(`${this.apiUrl}/user?email=${email}`, { headers }).pipe(
      tap((response) => console.log('Notifications récupérées :', response.notifications)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des notifications :', error);
        if (error.status === 401) this.logout();
        return throwError(() => new Error(error.error?.msg || 'Erreur récupération notifications'));
      })
    );
  }

  logout() {
    console.log('Déconnexion initiée');
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    this.isLoggedInSubject.next(false);
    this.settingsSubject.next({ darkMode: false, language: 'fr' });
    this.applySettings({ darkMode: false, language: 'fr' });
    this.router.navigate(['/login'], { replaceUrl: true });
    console.log('Utilisateur déconnecté, redirection vers /login');
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const isAuthenticated = !!token;
    console.log('État authentifié :', isAuthenticated);
    return isAuthenticated;
  }

  private applySettings(settings: { darkMode: boolean; language: string }) {
    if (settings.darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    console.log('Settings appliqués :', settings);
  }
}