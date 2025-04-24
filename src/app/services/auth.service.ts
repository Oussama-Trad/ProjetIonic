import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User } from '../interfaces/user.interface';
import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api'; // URL du backend Flask
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  private settingsSubject = new BehaviorSubject<{ darkMode: boolean; language: string; theme: string }>({
    darkMode: false,
    language: 'fr',
    theme: 'light',
  });
  isLoggedIn$ = this.isLoggedInSubject.asObservable();
  settings$ = this.settingsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private afMessaging: AngularFireMessaging,
    private toastController: ToastController
  ) {
    if (!this.http) {
      console.error('Erreur : HttpClient n\'est pas injecté dans AuthService');
      throw new Error('HttpClient non injecté');
    }
    this.checkInitialLoginStatus();
    this.initializeFCM();
  }

  // Gestion améliorée de FCM pour les notifications push
  private initializeFCM(): void {
    this.requestPermission();
    this.listenToMessages();
  }

  requestPermission(): void {
    this.afMessaging.requestToken.subscribe({
      next: (token: string | null) => {
        if (token) {
          console.log('FCM Token obtenu:', token);
          localStorage.setItem('fcmToken', token);
          const email = localStorage.getItem('email');
          if (email) {
            this.updateFcmToken(email, token).subscribe({
              next: () => console.log('Token FCM envoyé au backend avec succès'),
              error: (err) => console.error('Erreur lors de l\'envoi du token FCM:', err),
            });
          }
        } else {
          console.warn('Aucun token FCM obtenu');
        }
      },
      error: (err: Error) => {
        console.error('Erreur lors de la demande de permission FCM:', err);
      },
    });
  }

  listenToMessages(): void {
    this.afMessaging.messages.subscribe({
      next: (message: any) => {
        console.log('Message FCM reçu:', message);
        this.showNotificationToast(message?.notification?.title, message?.notification?.body);
      },
      error: (err: Error) => console.error('Erreur lors de la réception des messages FCM:', err),
    });
  }

  updateFcmToken(email: string, fcmToken: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour updateFcmToken');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const body = { email, fcmToken };
    return this.http.put(`${this.apiUrl}/user`, body, { headers }).pipe(
      tap(() => console.log('Token FCM mis à jour pour', email)),
      catchError((err) => {
        console.error('Erreur lors de la mise à jour du token FCM:', err);
        this.showNotificationToast('Erreur', 'Échec de la mise à jour des notifications');
        return throwError(() => new Error('Échec de la mise à jour du token FCM'));
      })
    );
  }

  private checkInitialLoginStatus(): void {
    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;
    this.isLoggedInSubject.next(isLoggedIn);
    console.log('État initial de connexion:', isLoggedIn);
    if (isLoggedIn) {
      const email = localStorage.getItem('email');
      const role = localStorage.getItem('role');
      if (email && role) {
        const fetchMethod = role === 'medecin' ? this.getMedecin.bind(this) : this.getUser.bind(this);
        fetchMethod(email).subscribe({
          next: (response) => {
            const settings = response.settings || { darkMode: false, language: 'fr', theme: 'light' };
            this.settingsSubject.next(settings);
            this.applySettings(settings);
            const fcmToken = localStorage.getItem('fcmToken');
            if (fcmToken) {
              this.updateFcmToken(email, fcmToken).subscribe();
            }
          },
          error: (err) => console.error('Erreur lors du chargement des settings initiaux:', err),
        });
      }
    }
  }

  login(email: string, password: string): Observable<any> {
    const cleanedEmail = email.trim();
    const cleanedPassword = password.trim();
    if (!cleanedEmail || !cleanedPassword) {
      console.error('Email ou mot de passe vide après nettoyage:', { email: cleanedEmail, password: cleanedPassword });
      this.showNotificationToast('Erreur', 'Email ou mot de passe ne peut pas être vide');
      return throwError(() => new Error('Email ou mot de passe ne peut pas être vide'));
    }

    const fcmToken = localStorage.getItem('fcmToken') || '';
    const body = { email: cleanedEmail, password: cleanedPassword, fcmToken };
    console.log('Tentative de connexion avec données nettoyées:', body);
    return this.http
      .post(`${this.apiUrl}/login`, body, { headers: { 'Content-Type': 'application/json' } })
      .pipe(
        tap((response: any) => {
          if (response && response.access_token) {
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('email', response.email);
            localStorage.setItem('role', response.role);
            this.isLoggedInSubject.next(true);
            this.showNotificationToast('Succès', 'Connexion réussie', 'success');
            const fetchMethod = response.role === 'medecin' ? this.getMedecin.bind(this) : this.getUser.bind(this);
            fetchMethod(response.email).subscribe({
              next: (user) => {
                const settings = user.settings || { darkMode: false, language: 'fr', theme: 'light' };
                this.settingsSubject.next(settings);
                this.applySettings(settings);
                if (fcmToken) {
                  this.updateFcmToken(response.email, fcmToken).subscribe();
                }
                this.router.navigate([response.role === 'medecin' ? '/accueil-medecin' : '/tabs/accueil']);
              },
              error: (err) => console.error('Erreur lors du chargement de l\'utilisateur après connexion:', err),
            });
          } else {
            console.error('Aucun token reçu dans la réponse:', response);
            throw new Error('Aucun token reçu du serveur');
          }
        }),
        catchError((error) => {
          console.error('Erreur lors de la connexion:', error);
          const errorMsg = error.error?.msg || 'Échec de la connexion. Vérifiez vos identifiants.';
          this.showNotificationToast('Erreur', errorMsg);
          return throwError(() => new Error(errorMsg));
        })
      );
  }

  loginWithGoogle(): void {
    const fcmToken = localStorage.getItem('fcmToken') || '';
    window.location.href = `${this.apiUrl}/auth/google?fcmToken=${fcmToken}`;
  }

  loginWithFacebook(): void {
    const fcmToken = localStorage.getItem('fcmToken') || '';
    window.location.href = `${this.apiUrl}/auth/facebook?fcmToken=${fcmToken}`;
  }

  handleOAuthCallback(params: any): void {
    const token = params.access_token;
    const email = params.email;
    const role = params.role;

    if (token && email && role) {
      localStorage.setItem('token', token);
      localStorage.setItem('email', email);
      localStorage.setItem('role', role);
      this.isLoggedInSubject.next(true);
      console.log('Connexion OAuth réussie, token stocké:', token);
      this.showNotificationToast('Succès', 'Connexion via OAuth réussie', 'success');

      const fetchMethod = role === 'medecin' ? this.getMedecin.bind(this) : this.getUser.bind(this);
      fetchMethod(email).subscribe({
        next: (user) => {
          const settings = user.settings || { darkMode: false, language: 'fr', theme: 'light' };
          this.settingsSubject.next(settings);
          this.applySettings(settings);
          const fcmToken = localStorage.getItem('fcmToken');
          if (fcmToken) {
            this.updateFcmToken(email, fcmToken).subscribe();
          }
          this.router.navigate([role === 'medecin' ? '/accueil-medecin' : '/tabs/accueil']);
        },
        error: (err) => console.error('Erreur lors du chargement de l\'utilisateur après OAuth:', err),
      });
    } else {
      console.error('Paramètres manquants dans le callback OAuth:', params);
      this.showNotificationToast('Erreur', 'Échec de l\'authentification OAuth');
      this.router.navigate(['/login']);
    }
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
  ): Observable<{ email: string }> {
    const fcmToken = localStorage.getItem('fcmToken') || '';
    const body = { firstName, lastName, phoneNumber, email, password, birthDate, address, gender, profilePicture, fcmToken };
    console.log('Tentative d\'inscription avec:', body);
    return this.http
      .post<{ email: string }>(`${this.apiUrl}/register`, body, { headers: { 'Content-Type': 'application/json' } })
      .pipe(
        tap((response) => {
          console.log('Inscription réussie:', response);
          this.showNotificationToast('Succès', 'Inscription réussie', 'success');
          if (response && response.email) {
            localStorage.setItem('email', email);
            localStorage.setItem('role', 'patient');
            this.isLoggedInSubject.next(true);
            if (fcmToken) {
              this.updateFcmToken(email, fcmToken).subscribe();
            }
            this.router.navigate(['/tabs/accueil']);
          }
        }),
        catchError((error) => {
          console.error('Erreur lors de l\'inscription:', error);
          const errorMsg = error.error?.msg || 'Échec de l\'inscription';
          this.showNotificationToast('Erreur', errorMsg);
          return throwError(() => new Error(errorMsg));
        })
      );
  }

  getUser(email: string): Observable<User> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Aucun token trouvé pour getUser');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    console.log('Récupération utilisateur pour email:', email);
    return this.http.get<User>(`${this.apiUrl}/user?email=${email}`, { headers }).pipe(
      tap((response) => console.log('Utilisateur récupéré avec succès:', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        if (error.status === 401) {
          this.logout();
          this.showNotificationToast('Erreur', 'Session expirée, veuillez vous reconnecter');
          return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
        }
        if (error.status === 404) {
          this.showNotificationToast('Erreur', 'Utilisateur non trouvé');
          return throwError(() => new Error('Utilisateur non trouvé dans la base de données'));
        }
        this.showNotificationToast('Erreur', 'Erreur lors du chargement des données utilisateur');
        return throwError(() => new Error(error.error?.msg || 'Erreur récupération utilisateur'));
      })
    );
  }

  getMedecin(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Aucun token trouvé pour getMedecin');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    console.log('Récupération médecin pour email:', email);
    return this.http.get(`${this.apiUrl}/medecin?email=${email}`, { headers }).pipe(
      tap((response) => console.log('Médecin récupéré avec succès:', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération du médecin:', error);
        if (error.status === 401) {
          this.logout();
          this.showNotificationToast('Erreur', 'Session expirée, veuillez vous reconnecter');
          return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
        }
        if (error.status === 404) {
          this.showNotificationToast('Erreur', 'Médecin non trouvé');
          return throwError(() => new Error('Médecin non trouvé dans la base de données'));
        }
        this.showNotificationToast('Erreur', 'Erreur lors du chargement des données médecin');
        return throwError(() => new Error(error.error?.msg || 'Erreur récupération médecin'));
      })
    );
  }

  getAllMedecins(search: string = '', specialite: string = ''): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    console.log('Récupération de tous les médecins avec recherche:', search, 'et spécialité:', specialite);
    
    let params: any = {};
    if (search) params.search = search;
    if (specialite) params.specialite = specialite;
    
    return this.http.get(`${this.apiUrl}/medecins`, { headers, params }).pipe(
      tap((response) => console.log('Liste des médecins récupérée:', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des médecins:', error);
        if (error.status === 401) {
          this.logout();
          this.showNotificationToast('Erreur', 'Session expirée, veuillez vous reconnecter');
        }
        this.showNotificationToast('Erreur', 'Erreur lors du chargement des médecins');
        return throwError(() => new Error(error.error?.msg || 'Erreur récupération liste médecins'));
      })
    );
  }

  getAllSpecialites(): Observable<any> {
    console.log('Récupération de toutes les spécialités');
    return this.http.get(`${this.apiUrl}/specialites`).pipe(
      tap((response) => console.log('Liste des spécialités récupérée:', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des spécialités:', error);
        this.showNotificationToast('Erreur', 'Erreur lors du chargement des spécialités');
        return throwError(() => new Error(error.error?.msg || 'Erreur récupération liste spécialités'));
      })
    );
  }

  getMedecinCreneauxDisponibles(email: string, date: string): Observable<any> {
    console.log('Récupération des créneaux disponibles pour le médecin:', email, 'à la date:', date);
    return this.http.get(`${this.apiUrl}/medecin/creneaux-disponibles`, { 
      params: { email, date } 
    }).pipe(
      tap((response) => console.log('Créneaux disponibles récupérés:', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des créneaux disponibles:', error);
        this.showNotificationToast('Erreur', 'Erreur lors du chargement des créneaux disponibles');
        return throwError(() => new Error(error.error?.msg || 'Erreur récupération créneaux disponibles'));
      })
    );
  }

  updateMedecinDisponibilites(disponibilites: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateMedecinDisponibilites');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    
    console.log('Mise à jour des disponibilités:', disponibilites);
    return this.http.put(`${this.apiUrl}/medecin/disponibilites`, { disponibilites }, { headers }).pipe(
      tap((response) => {
        console.log('Disponibilités mises à jour:', response);
        this.showNotificationToast('Succès', 'Vos disponibilités ont été mises à jour avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour des disponibilités:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de la mise à jour des disponibilités';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  createRendezVous(data: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour createRendezVous');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
    });
    console.log('Création rendez-vous avec données:', data);
    return this.http.post(`${this.apiUrl}/rendezvous`, data, { headers }).pipe(
      tap((response) => {
        console.log('Rendez-vous créé:', response);
        this.showNotificationToast('Succès', 'Rendez-vous demandé avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors de la création du rendez-vous:', error);
        const errorMsg = error.error?.msg || 'Échec de la création du rendez-vous';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  manageRendezVous(userEmail: string, date: string, heure: string, action: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour manageRendezVous');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    if (!userEmail || !date || !heure || !action) {
      console.error('Données invalides pour manageRendezVous:', { userEmail, date, heure, action });
      this.showNotificationToast('Erreur', 'Données invalides pour le rendez-vous');
      return throwError(() => new Error('Données invalides: userEmail, date, heure ou action manquant'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { userEmail, date, heure };
    console.log(`Gestion rendez-vous (${action}) avec:`, body);
    return this.http.put(`${this.apiUrl}/medecin/rendezvous/${action}`, body, { headers }).pipe(
      tap((response) => {
        console.log(`Rendez-vous ${action}:`, response);
        this.showNotificationToast('Succès', `Rendez-vous ${action} avec succès`, 'success');
      }),
      catchError((error) => {
        console.error(`Erreur lors de la gestion du rendez-vous (${action}):`, error);
        const errorMsg = error.error?.msg || `Échec de l'action ${action} sur le rendez-vous`;
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
          return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  cancelRendezVous(medecinEmail: string, date: string, heure: string): Observable<any> {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('email');
    if (!token) {
      console.error('Aucun token trouvé pour cancelRendezVous');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    if (!userEmail) {
      console.error('Email utilisateur non trouvé dans localStorage');
      this.showNotificationToast('Erreur', 'Email utilisateur non disponible');
      return throwError(() => new Error('Email utilisateur non disponible'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { medecinEmail, userEmail, date, heure };
    console.log('Annulation rendez-vous avec:', body);
    return this.http.put(`${this.apiUrl}/user/rendezvous/cancel`, body, { headers }).pipe(
      tap((response) => {
        console.log('Rendez-vous annulé par le patient:', response);
        this.showNotificationToast('Succès', 'Rendez-vous annulé avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors de l\'annulation du rendez-vous:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de l\'annulation du rendez-vous';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
          return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  saveConsultation(consultation: {
    userEmail: string;
    date: string;
    heure: string;
    diagnostics: string[];
    prescriptions: string[];
  }): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour saveConsultation');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { ...consultation, fcmToken: localStorage.getItem('fcmToken') || '' };
    console.log('Enregistrement consultation avec:', body);
    return this.http.post(`${this.apiUrl}/medecin/consultation`, body, { headers }).pipe(
      tap((response) => {
        console.log('Consultation enregistrée:', response);
        this.showNotificationToast('Succès', 'Consultation enregistrée avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors de l\'enregistrement de la consultation:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de l\'enregistrement de la consultation';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  updateConsultation(
    userEmail: string,
    date: string,
    heure: string,
    diagnostics: string[],
    prescriptions: string[]
  ): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateConsultation');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { userEmail, date, heure, diagnostics, prescriptions };
    console.log('Mise à jour consultation avec:', body);
    return this.http.put(`${this.apiUrl}/medecin/consultation`, body, { headers }).pipe(
      tap((response) => {
        console.log('Consultation mise à jour:', response);
        this.showNotificationToast('Succès', 'Consultation mise à jour avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de la consultation:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de la mise à jour de la consultation';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  getConsultation(userEmail: string, date: string, heure: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour getConsultation');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    console.log('Récupération consultation pour:', { userEmail, date, heure });
    return this.http.get(`${this.apiUrl}/medecin/consultation`, { headers, params: { userEmail, date, heure } }).pipe(
      tap((response) => console.log('Consultation récupérée:', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération de la consultation:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de la récupération de la consultation';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  uploadDocument(nom: string, url: string, medecinEmail: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour uploadDocument');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { nom, url, medecinEmail, fcmToken: localStorage.getItem('fcmToken') || '' };
    console.log('Téléversement document avec:', body);
    return this.http.post(`${this.apiUrl}/user/document`, body, { headers }).pipe(
      tap((response) => {
        console.log('Document téléversé:', response);
        this.showNotificationToast('Succès', 'Document envoyé avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors du téléversement du document:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de l\'envoi du document';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
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
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { email, firstName, lastName, phoneNumber, address, birthDate, gender, profilePicture };
    console.log('Mise à jour utilisateur avec:', body);
    return this.http.put(`${this.apiUrl}/user`, body, { headers }).pipe(
      tap((response) => {
        console.log('Utilisateur mis à jour:', response);
        this.showNotificationToast('Succès', 'Profil mis à jour avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de la mise à jour du profil';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  updateUserProfilePicture(email: string, updatedData: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateUserProfilePicture');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    console.log('Mise à jour de la photo de profil pour:', email, updatedData);
    return this.http.put(`${this.apiUrl}/user`, updatedData, { headers }).pipe(
      tap((response) => {
        console.log('Photo de profil mise à jour:', response);
        this.showNotificationToast('Succès', 'Photo de profil mise à jour', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de la photo de profil:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de la mise à jour de la photo';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  updateUserAccount(user: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateUserAccount');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    console.log('Mise à jour compte utilisateur avec:', user);
    return this.http.put(`${this.apiUrl}/user/account`, user, { headers }).pipe(
      tap((response) => {
        console.log('Compte utilisateur mis à jour:', response);
        this.showNotificationToast('Succès', 'Compte mis à jour avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du compte utilisateur:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de la mise à jour du compte';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  deleteUser(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour deleteUser');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    console.log('Suppression utilisateur pour email:', email);
    return this.http.delete(`${this.apiUrl}/user`, { headers, params: { email } }).pipe(
      tap((response) => {
        console.log('Utilisateur supprimé:', response);
        this.showNotificationToast('Succès', 'Compte supprimé avec succès', 'success');
        this.logout();
      }),
      catchError((error) => {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de la suppression du compte';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  updateMedecin(medecin: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateMedecin');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    console.log('Mise à jour médecin avec:', medecin);
    return this.http.put(`${this.apiUrl}/medecin/update`, medecin, { headers }).pipe(
      tap((response) => {
        console.log('Médecin mis à jour:', response);
        this.showNotificationToast('Succès', 'Profil médecin mis à jour avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du médecin:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de la mise à jour du profil médecin';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  updateMedecinAccount(medecin: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateMedecinAccount');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    console.log('Mise à jour compte médecin avec:', medecin);
    return this.http.put(`${this.apiUrl}/medecin/account`, medecin, { headers }).pipe(
      tap((response) => {
        console.log('Compte médecin mis à jour:', response);
        this.showNotificationToast('Succès', 'Compte médecin mis à jour avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du compte médecin:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de la mise à jour du compte médecin';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  changePassword(email: string, oldPassword: string, newPassword: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour changePassword');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { email, oldPassword, newPassword };
    console.log('Changement de mot de passe avec:', { email });
    return this.http.put(`${this.apiUrl}/change-password`, body, { headers }).pipe(
      tap((response) => {
        console.log('Mot de passe changé:', response);
        this.showNotificationToast('Succès', 'Mot de passe changé avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors du changement de mot de passe:', error);
        const errorMsg = error.error?.msg || 'Échec du changement de mot de passe';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  updateSettings(darkMode: boolean, language: string, theme: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour updateSettings');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const body = { darkMode, language, theme };
    console.log('Mise à jour des paramètres avec:', body);
    return this.http.put(`${this.apiUrl}/user/settings`, body, { headers }).pipe(
      tap((response) => {
        console.log('Paramètres mis à jour:', response);
        const newSettings = { darkMode, language, theme };
        this.settingsSubject.next(newSettings);
        this.applySettings(newSettings);
        this.showNotificationToast('Succès', 'Paramètres mis à jour avec succès', 'success');
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour des paramètres:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de la mise à jour des paramètres';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  getMedecinDisponibilites(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Aucun token trouvé pour getMedecinDisponibilites');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    console.log('Récupération des disponibilités pour le médecin:', email);
    return this.http.get(`${this.apiUrl}/medecin/disponibilites?email=${email}`, { headers }).pipe(
      tap((response) => console.log('Disponibilités récupérées:', response)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des disponibilités:', error);
        const errorMsg = error.error?.msg || 'Erreur lors de la récupération des disponibilités';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
          return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  getNotifications(email: string): Observable<any[]> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé pour getNotifications');
      this.showNotificationToast('Erreur', 'Utilisateur non connecté');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    console.log('Récupération des notifications pour:', email);
    const role = localStorage.getItem('role');
    const fetchMethod = role === 'medecin' ? this.getMedecin.bind(this) : this.getUser.bind(this);
    return fetchMethod(email).pipe(
      tap((response) => console.log('Réponse brute pour notifications:', response)),
      map((response) => response.notifications || []),
      catchError((error) => {
        console.error('Erreur lors de la récupération des notifications:', error);
        const errorMsg = error.error?.msg || 'Erreur lors du chargement des notifications';
        this.showNotificationToast('Erreur', errorMsg);
        if (error.status === 401) {
          this.logout();
          return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  markNotificationAsRead(notificationId: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour markNotificationAsRead');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const body = { notificationId };
    return this.http.put(`${this.apiUrl}/user/notification/mark-as-read`, body, { headers }).pipe(
      tap((response) => console.log('Notification marquée comme lue:', response)),
      catchError((error) => {
        console.error('Erreur lors du marquage de la notification:', error);
        return throwError(() => new Error('Échec du marquage de la notification'));
      })
    );
  }

  logout(): void {
    console.log('Déconnexion initiée');
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    localStorage.removeItem('fcmToken');
    this.isLoggedInSubject.next(false);
    this.settingsSubject.next({ darkMode: false, language: 'fr', theme: 'light' });
    this.applySettings({ darkMode: false, language: 'fr', theme: 'light' });
    this.router.navigate(['/login'], { replaceUrl: true });
    this.showNotificationToast('Succès', 'Déconnexion réussie', 'success');
    console.log('Utilisateur déconnecté, redirection vers /login');
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const isAuthenticated = !!token;
    console.log('État authentifié:', isAuthenticated);
    return isAuthenticated;
  }

  private applySettings(settings: { darkMode: boolean; language: string; theme: string }): void {
    if (settings.darkMode || settings.theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    // Appliquer la langue si nécessaire (ex. pour i18n)
    console.log('Settings appliqués:', settings);
  }

  private showNotificationToast(header: string, message: string, color: string = 'danger'): Promise<void> {
    return this.toastController
      .create({
        header,
        message,
        duration: 3000,
        position: 'top',
        color: color === 'success' ? 'success' : 'danger',
        buttons: [{ text: 'OK', role: 'cancel' }],
      })
      .then((toast) => toast.present());
  }

  // Méthodes pour la messagerie
  getAllMessages(): Observable<any[]> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getAllMessages');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any[]>(`${this.apiUrl}/chat/all-messages`, { headers }).pipe(
      tap((messages) => console.log(`${messages.length} messages récupérés`)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des messages:', error);
        return throwError(() => new Error('Échec de la récupération des messages'));
      })
    );
  }
  
  getChatMessages(otherUser: string): Observable<any[]> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getChatMessages');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any[]>(`${this.apiUrl}/chat/messages?otherUser=${otherUser}`, { headers }).pipe(
      tap((messages) => console.log(`${messages.length} messages récupérés pour la conversation avec ${otherUser}`)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des messages de chat:', error);
        return throwError(() => new Error('Échec de la récupération des messages de chat'));
      })
    );
  }
  
  sendChatMessage(receiver: string, content: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour sendChatMessage');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const body = { receiver, content };
    return this.http.post(`${this.apiUrl}/chat/messages`, body, { headers }).pipe(
      tap((response) => console.log('Message envoyé avec succès:', response)),
      catchError((error) => {
        console.error('Erreur lors de l\'envoi du message:', error);
        return throwError(() => new Error('Échec de l\'envoi du message'));
      })
    );
  }
  
  markMessagesAsRead(sender: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour markMessagesAsRead');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const body = { sender };
    return this.http.put(`${this.apiUrl}/chat/mark-as-read`, body, { headers }).pipe(
      tap((response) => console.log('Messages marqués comme lus:', response)),
      catchError((error) => {
        console.error('Erreur lors du marquage des messages:', error);
        return throwError(() => new Error('Échec du marquage des messages comme lus'));
      })
    );
  }
}