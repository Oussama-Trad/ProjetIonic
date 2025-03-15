import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    const body = { email, password };
    return this.http.post(`${this.apiUrl}/login`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  register(firstName: string, lastName: string, phoneNumber: string, email: string, password: string, birthDate: string, address: string, gender: string, profilePicture: string): Observable<any> {
    const body = { firstName, lastName, phoneNumber, email, password, birthDate, address, gender, profilePicture };
    return this.http.post(`${this.apiUrl}/register`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  getUser(email: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/user`, { params: { email } });
  }

  getMedecin(email: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/medecin`, { params: { email } });
  }

  getAllMedecins(search: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/medecins`, { params: { search } });
  }

  createRendezVous(data: any): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.post(`${this.apiUrl}/rendezvous`, data, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  }

  manageRendezVous(userEmail: string, date: string, heure: string, action: string): Observable<any> { // Changé patientId à userEmail
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/medecin/rendezvous/${action}`, { userEmail, date, heure }, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  }

  cancelRendezVous(medecinEmail: string, userEmail: string, date: string, heure: string): Observable<any> { // Changé patientId à userEmail
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/medecin/rendezvous/cancel`, { medecinEmail, userEmail, date, heure }, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  }

  // Ajout de saveConsultation pour créer une nouvelle consultation
  saveConsultation(consultation: { userEmail: string, date: string, heure: string, diagnostics: string[], prescriptions: string[] }): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.post(`${this.apiUrl}/medecin/consultation`, consultation, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  }

  // Méthode existante updateConsultation ajustée pour userEmail
  updateConsultation(userEmail: string, date: string, heure: string, diagnostics: string[], prescriptions: string[]): Observable<any> { // Changé patientId à userEmail
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/medecin/consultation`, { userEmail, date, heure, diagnostics, prescriptions }, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  }

  // Ajout de getConsultation pour récupérer une consultation existante
  getConsultation(userEmail: string, date: string, heure: string): Observable<any> { // Nouvelle méthode
    const token = localStorage.getItem('token');
    return this.http.get(`${this.apiUrl}/medecin/consultation`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { userEmail, date, heure }
    });
  }

  uploadDocument(nom: string, url: string, medecinEmail: string): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.post(`${this.apiUrl}/user/document`, { nom, url, medecinEmail }, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  }

  updateUser(email: string, firstName: string, lastName: string, phoneNumber: string, address: string, birthDate: string, gender: string, profilePicture?: string): Observable<any> {
    const body = { email, firstName, lastName, phoneNumber, address, birthDate, gender, profilePicture };
    return this.http.put(`${this.apiUrl}/user`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  updateUserAccount(user: any): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/user/account`, user, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  }

  deleteUser(email: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user`, { params: { email } });
  }

  updateMedecin(medecin: any): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/medecin/update`, medecin, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  }

  updateMedecinAccount(medecin: any): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/medecin/account`, medecin, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  }

  changePassword(email: string, oldPassword: string, newPassword: string): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/change-password`, { email, oldPassword, newPassword }, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  }

  logout() {
    localStorage.removeItem('email');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  }
}