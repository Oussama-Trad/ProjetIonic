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
      console.log('Email:', email, 'Role:', role);
    }
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((response) => {
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          localStorage.setItem('email', email);
          localStorage.setItem('role', response.role);
          this.isLoggedInSubject.next(true);
          console.log('Connexion réussie pour', email, 'avec le rôle', response.role);
        }
      }),
      catchError((error) => {
        console.error('Erreur de connexion:', error);
        return throwError(() => new Error(error.error?.msg || 'Échec de la connexion'));
      })
    );
  }

  register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string,
    phoneNumber: string = '',
    address: string = '',
    birthDate: string = '',
    gender: string = ''
  ): Observable<any> {
    const userData = {
      email,
      password,
      firstName,
      lastName,
      role,
      phoneNumber,
      address,
      birthDate,
      gender,
    };
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap((response) => {
        console.log('Inscription réussie pour', email);
      }),
      catchError((error) => {
        console.error('Erreur d\'inscription:', error);
        return throwError(() => new Error(error.error?.msg || 'Échec de l\'inscription'));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    this.isLoggedInSubject.next(false);
    this.router.navigate(['/login']);
    console.log('Déconnexion réussie');
  }

  getUser(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getUser');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any>(`${this.apiUrl}/user?email=${email}`, { headers }).pipe(
      tap((user) => console.log('Utilisateur récupéré:', user)),
      catchError((error) => {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        return throwError(() => new Error('Échec de la récupération de l\'utilisateur'));
      })
    );
  }

  getMedecin(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getMedecin');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any>(`${this.apiUrl}/medecin?email=${email}`, { headers }).pipe(
      tap((medecin) => console.log('Médecin chargé:', medecin)),
      catchError((error) => {
        console.error('Erreur lors du chargement du médecin:', error);
        return throwError(() => new Error('Échec du chargement du médecin'));
      })
    );
  }

  getAllMedecins(): Observable<any[]> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getAllMedecins');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any[]>(`${this.apiUrl}/medecins`, { headers }).pipe(
      tap((medecins) => console.log('Médecins récupérés:', medecins.length)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des médecins:', error);
        return throwError(() => new Error('Échec de la récupération des médecins'));
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
    profilePicture: string
  ): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour updateUser');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const userData = {
      email,
      firstName,
      lastName,
      phoneNumber,
      address,
      birthDate,
      gender,
      profilePicture,
    };
    return this.http.put<any>(`${this.apiUrl}/user`, userData, { headers }).pipe(
      tap((response) => console.log('Utilisateur mis à jour:', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        return throwError(() => new Error('Échec de la mise à jour de l\'utilisateur'));
      })
    );
  }

  updateMedecin(medecin: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour updateMedecin');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.put<any>(`${this.apiUrl}/medecin`, medecin, { headers }).pipe(
      tap((response) => console.log('Médecin mis à jour:', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du médecin:', error);
        return throwError(() => new Error('Échec de la mise à jour du médecin'));
      })
    );
  }

  getDisponibilites(medecinEmail: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getDisponibilites');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any>(`${this.apiUrl}/disponibilites?email=${medecinEmail}`, { headers }).pipe(
      tap((disponibilites) => console.log('Disponibilités récupérées pour', medecinEmail)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des disponibilités:', error);
        return throwError(() => new Error('Échec de la récupération des disponibilités'));
      })
    );
  }

  updateDisponibilites(medecinEmail: string, disponibilites: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour updateDisponibilites');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const body = { email: medecinEmail, disponibilites };
    return this.http.put<any>(`${this.apiUrl}/disponibilites`, body, { headers }).pipe(
      tap((response) => console.log('Disponibilités mises à jour pour', medecinEmail)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour des disponibilités:', error);
        return throwError(() => new Error('Échec de la mise à jour des disponibilités'));
      })
    );
  }

  reserverRendezVous(medecinEmail: string, date: string, heure: string, motif: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour reserverRendezVous');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const body = { medecinEmail, date, heure, motif };
    return this.http.post<any>(`${this.apiUrl}/rendez-vous`, body, { headers }).pipe(
      tap((response) => console.log('Rendez-vous réservé avec', medecinEmail, 'pour le', date, 'à', heure)),
      catchError((error) => {
        console.error('Erreur lors de la réservation du rendez-vous:', error);
        return throwError(() => new Error('Échec de la réservation du rendez-vous'));
      })
    );
  }

  getMesRendezVous(): Observable<any[]> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getMesRendezVous');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any[]>(`${this.apiUrl}/mes-rendez-vous`, { headers }).pipe(
      tap((rendezVous) => console.log('Rendez-vous récupérés:', rendezVous.length)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des rendez-vous:', error);
        return throwError(() => new Error('Échec de la récupération des rendez-vous'));
      })
    );
  }

  getRendezVousMedecin(): Observable<any[]> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getRendezVousMedecin');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any[]>(`${this.apiUrl}/rendez-vous-medecin`, { headers }).pipe(
      tap((rendezVous) => console.log('Rendez-vous médecin récupérés:', rendezVous.length)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des rendez-vous médecin:', error);
        return throwError(() => new Error('Échec de la récupération des rendez-vous médecin'));
      })
    );
  }

  annulerRendezVous(rendezVousId: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour annulerRendezVous');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.delete<any>(`${this.apiUrl}/rendez-vous/${rendezVousId}`, { headers }).pipe(
      tap((response) => console.log('Rendez-vous annulé:', rendezVousId)),
      catchError((error) => {
        console.error('Erreur lors de l\'annulation du rendez-vous:', error);
        return throwError(() => new Error('Échec de l\'annulation du rendez-vous'));
      })
    );
  }

  uploadDocument(nomDocument: string, contenuDocument: string, medecinEmail: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour uploadDocument');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const documentData = { 
      nom: nomDocument, 
      contenu: contenuDocument, 
      medecinEmail: medecinEmail 
    };
    
    return this.http.post<any>(`${this.apiUrl}/user/document`, documentData, { headers }).pipe(
      tap((response) => console.log('Document envoyé avec succès:', response)),
      catchError((error) => {
        console.error('Erreur lors de l\'envoi du document:', error);
        return throwError(() => new Error('Échec de l\'envoi du document'));
      })
    );
  }

  getSettings(): Observable<{ darkMode: boolean; language: string; theme: string }> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getSettings');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any>(`${this.apiUrl}/settings`, { headers }).pipe(
      tap((settings) => {
        console.log('Paramètres récupérés:', settings);
        this.settingsSubject.next(settings);
        this.applySettings(settings);
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération des paramètres:', error);
        return throwError(() => new Error('Échec de la récupération des paramètres'));
      })
    );
  }

  updateSettings(darkMode: boolean, language: string, theme: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour updateSettings');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const settings = { darkMode, language, theme };
    return this.http.put<any>(`${this.apiUrl}/settings`, settings, { headers }).pipe(
      tap((response) => {
        console.log('Paramètres mis à jour:', response);
        this.settingsSubject.next(settings);
        this.applySettings(settings);
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour des paramètres:', error);
        return throwError(() => new Error('Échec de la mise à jour des paramètres'));
      })
    );
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

  // Récupérer les statistiques du médecin
  getMedecinStats(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getMedecinStats');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any>(`${this.apiUrl}/medecin/stats?email=${email}`, { headers }).pipe(
      tap((stats) => console.log('Statistiques médecin chargées:', stats)),
      catchError((error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
        return throwError(() => new Error('Échec du chargement des statistiques'));
      })
    );
  }

  // Récupérer tous les patients
  getAllPatients(): Observable<any[]> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getAllPatients');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any[]>(`${this.apiUrl}/patients`, { headers }).pipe(
      tap((patients) => console.log('Patients chargés:', patients.length)),
      catchError((error) => {
        console.error('Erreur lors du chargement des patients:', error);
        return throwError(() => new Error('Échec du chargement des patients'));
      })
    );
  }

  // Mettre à jour le statut d'un document
  updateDocumentStatus(patientEmail: string, documentId: string, statut: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour updateDocumentStatus');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const body = { patientEmail, documentId, statut };
    
    return this.http.put<any>(`${this.apiUrl}/user/document/status`, body, { headers }).pipe(
      tap((response) => console.log('Statut du document mis à jour:', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du statut du document:', error);
        return throwError(() => new Error('Échec de la mise à jour du statut'));
      })
    );
  }

  // Mettre à jour les annotations d'un document
  updateDocumentAnnotation(patientEmail: string, documentId: string, annotations: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour updateDocumentAnnotation');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const body = { patientEmail, documentId, annotations };
    
    return this.http.put<any>(`${this.apiUrl}/user/document/annotation`, body, { headers }).pipe(
      tap((response) => console.log('Annotations du document mises à jour:', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour des annotations:', error);
        return throwError(() => new Error('Échec de la mise à jour des annotations'));
      })
    );
  }

  // Récupérer les notifications
  getNotifications(email: string): Observable<any[]> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getNotifications');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any[]>(`${this.apiUrl}/notifications?email=${email}`, { headers }).pipe(
      tap((notifications) => console.log('Notifications récupérées:', notifications.length)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des notifications:', error);
        return throwError(() => new Error('Échec de la récupération des notifications'));
      })
    );
  }

  // Marquer une notification comme lue
  markNotificationAsRead(notificationId: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour markNotificationAsRead');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.put<any>(`${this.apiUrl}/notification/${notificationId}/read`, {}, { headers }).pipe(
      tap((response) => console.log('Notification marquée comme lue:', notificationId)),
      catchError((error) => {
        console.error('Erreur lors du marquage de la notification:', error);
        return throwError(() => new Error('Échec du marquage de la notification'));
      })
    );
  }

  // Mettre à jour la photo de profil de l'utilisateur
  updateUserProfilePicture(email: string, profileData: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour updateUserProfilePicture');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.put<any>(`${this.apiUrl}/user/profile-picture`, { email, ...profileData }, { headers }).pipe(
      tap((response) => console.log('Photo de profil mise à jour:', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de la photo de profil:', error);
        return throwError(() => new Error('Échec de la mise à jour de la photo de profil'));
      })
    );
  }

  // Mettre à jour le compte utilisateur
  updateUserAccount(userData: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour updateUserAccount');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.put<any>(`${this.apiUrl}/user/account`, userData, { headers }).pipe(
      tap((response) => console.log('Compte utilisateur mis à jour:', response)),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du compte:', error);
        return throwError(() => new Error('Échec de la mise à jour du compte'));
      })
    );
  }

  // Alias pour getDisponibilites pour compatibilité
  getMedecinDisponibilites(medecinEmail: string): Observable<any> {
    return this.getDisponibilites(medecinEmail);
  }

  // Alias pour updateDisponibilites pour compatibilité
  updateMedecinDisponibilites(disponibilites: any): Observable<any> {
    const email = localStorage.getItem('email');
    if (!email) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    return this.updateDisponibilites(email, disponibilites);
  }

  // Créer un rendez-vous (alias pour reserverRendezVous)
  createRendezVous(rdvData: any): Observable<any> {
    return this.reserverRendezVous(
      rdvData.medecinEmail,
      rdvData.date,
      rdvData.heure,
      rdvData.motif
    );
  }

  // Gérer les rendez-vous (confirmer/rejeter)
  manageRendezVous(userEmail: string, date: string, heure: string, action: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour manageRendezVous');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const body = { userEmail, date, heure, action };
    return this.http.put<any>(`${this.apiUrl}/rendez-vous/manage`, body, { headers }).pipe(
      tap((response) => console.log(`Rendez-vous ${action} pour ${userEmail} le ${date} à ${heure}`)),
      catchError((error) => {
        console.error(`Erreur lors de l'action ${action} du rendez-vous:`, error);
        return throwError(() => new Error(`Échec de l'action ${action} du rendez-vous`));
      })
    );
  }

  // Récupérer les créneaux disponibles d'un médecin pour une date
  getMedecinCreneauxDisponibles(medecinEmail: string, date: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getMedecinCreneauxDisponibles');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any>(`${this.apiUrl}/creneaux-disponibles?email=${medecinEmail}&date=${date}`, { headers }).pipe(
      tap((creneaux) => console.log('Créneaux disponibles récupérés pour', medecinEmail, 'le', date)),
      catchError((error) => {
        console.error('Erreur lors de la récupération des créneaux disponibles:', error);
        return throwError(() => new Error('Échec de la récupération des créneaux disponibles'));
      })
    );
  }

  // Récupérer une consultation
  getConsultation(userEmail: string, date: string, heure: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour getConsultation');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any>(`${this.apiUrl}/consultation?userEmail=${userEmail}&date=${date}&heure=${heure}`, { headers }).pipe(
      tap((consultation) => console.log('Consultation récupérée pour', userEmail, 'le', date, 'à', heure)),
      catchError((error) => {
        console.error('Erreur lors de la récupération de la consultation:', error);
        return throwError(() => new Error('Échec de la récupération de la consultation'));
      })
    );
  }

  // Sauvegarder une consultation
  saveConsultation(consultation: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Pas de token JWT pour saveConsultation');
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<any>(`${this.apiUrl}/consultation`, consultation, { headers }).pipe(
      tap((response) => console.log('Consultation sauvegardée avec succès')),
      catchError((error) => {
        console.error('Erreur lors de la sauvegarde de la consultation:', error);
        return throwError(() => new Error('Échec de la sauvegarde de la consultation'));
      })
    );
  }
}