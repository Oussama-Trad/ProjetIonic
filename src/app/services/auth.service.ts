import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<any> {
    const body = { email, password };
    return this.http.post(`${this.apiUrl}/login`, body, {
      headers: { 'Content-Type': 'application/json' },
    }).pipe(
      tap((response: any) => {
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          localStorage.setItem('email', response.email);
          localStorage.setItem('role', response.role);
          console.log('Token stocké :', response.access_token); // Débogage
        } else {
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

  register(firstName: string, lastName: string, phoneNumber: string, email: string, password: string, birthDate: string, address: string, gender: string, profilePicture: string = ''): Observable<any> {
    const body = { firstName, lastName, phoneNumber, email, password, birthDate, address, gender, profilePicture };
    return this.http.post(`${this.apiUrl}/register`, body, {
      headers: { 'Content-Type': 'application/json' },
    }).pipe(
      catchError((error) => {
        console.error('Erreur lors de l\'inscription :', error);
        const errorMsg = error.error?.msg || 'Échec de l\'inscription';
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  getUser(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé'));
    }
    return this.http.get(`${this.apiUrl}/user`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { email }
    }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la récupération de l\'utilisateur :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  getMedecin(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé'));
    }
    return this.http.get(`${this.apiUrl}/medecin`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { email }
    }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la récupération du médecin :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  getAllMedecins(search: string = ''): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé'));
    }
    return this.http.get(`${this.apiUrl}/medecins`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { search }
    }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la récupération des médecins :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  createRendezVous(data: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token.trim()}`, // .trim() pour éviter les espaces
      'Content-Type': 'application/json'
    });
    console.log('Données envoyées à /rendezvous :', data); // Débogage
    return this.http.post(`${this.apiUrl}/rendezvous`, data, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la création du rendez-vous :', error);
        const errorMsg = error.error?.msg || 'Échec de la création du rendez-vous';
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  manageRendezVous(userEmail: string, date: string, heure: string, action: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.put(`${this.apiUrl}/medecin/rendezvous/${action}`, { userEmail, date, heure }, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la gestion du rendez-vous :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  cancelRendezVous(medecinEmail: string, userEmail: string, date: string, heure: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.put(`${this.apiUrl}/medecin/rendezvous/cancel`, { medecinEmail, userEmail, date, heure }, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors de l\'annulation du rendez-vous :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  saveConsultation(consultation: { userEmail: string; date: string; heure: string; diagnostics: string[]; prescriptions: string[] }): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.apiUrl}/medecin/consultation`, consultation, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors de l\'enregistrement de la consultation :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  updateConsultation(userEmail: string, date: string, heure: string, diagnostics: string[], prescriptions: string[]): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.put(`${this.apiUrl}/medecin/consultation`, { userEmail, date, heure, diagnostics, prescriptions }, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de la consultation :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  getConsultation(userEmail: string, date: string, heure: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get(`${this.apiUrl}/medecin/consultation`, { headers, params: { userEmail, date, heure } }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la récupération de la consultation :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  uploadDocument(nom: string, url: string, medecinEmail: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.apiUrl}/user/document`, { nom, url, medecinEmail }, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors du téléversement du document :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  updateUser(email: string, firstName: string, lastName: string, phoneNumber: string, address: string, birthDate: string, gender: string, profilePicture?: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const body = { email, firstName, lastName, phoneNumber, address, birthDate, gender, profilePicture };
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.put(`${this.apiUrl}/user`, body, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de l\'utilisateur :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  updateUserAccount(user: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.put(`${this.apiUrl}/user/account`, user, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du compte utilisateur :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  deleteUser(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.delete(`${this.apiUrl}/user`, { headers, params: { email } }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la suppression de l\'utilisateur :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  updateMedecin(medecin: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.put(`${this.apiUrl}/medecin/update`, medecin, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du médecin :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  updateMedecinAccount(medecin: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.put(`${this.apiUrl}/medecin/account`, medecin, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du compte médecin :', error);
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  changePassword(email: string, oldPassword: string, newPassword: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
      return throwError(() => new Error('Aucun token trouvé. Veuillez vous connecter.'));
    }
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.put(`${this.apiUrl}/change-password`, { email, oldPassword, newPassword }, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors du changement de mot de passe :', error);
        const errorMsg = error.error?.msg || 'Échec du changement de mot de passe';
        if (error.status === 401) this.router.navigate(['/login']);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  logout() {
    localStorage.removeItem('email');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.router.navigate(['/login']);
  }
}