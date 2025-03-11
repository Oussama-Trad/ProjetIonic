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
    console.log('Envoi de la requête login au backend :', body);
    return this.http.post(`${this.apiUrl}/login`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
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
    profilePicture: string
  ): Observable<any> {
    const body = { firstName, lastName, phoneNumber, email, password, birthDate, address, gender, profilePicture };
    return this.http.post(`${this.apiUrl}/register`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  getUser(email: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/user`, { params: { email } });
  }

  getMedecin(email: string): Observable<any> {
    console.log(`Appel API getMedecin pour email : ${email}`);
    return this.http.get(`${this.apiUrl}/medecin`, { params: { email } });
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
    const body = { email, firstName, lastName, phoneNumber, address, birthDate, gender, profilePicture };
    return this.http.put(`${this.apiUrl}/user`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  updateUserAccount(user: any): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/user/account`, user, {
      headers: { 
        Authorization: `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      }
    });
  }

  deleteUser(email: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user`, { params: { email } });
  }

  updateMedecin(medecin: any): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/medecin/update`, medecin, {
      headers: { 
        Authorization: `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      }
    });
  }

  updateMedecinAccount(medecin: any): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/medecin/account`, medecin, {
      headers: { 
        Authorization: `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      }
    });
  }

  logout() {
    localStorage.removeItem('email');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    console.log('Déconnexion effectuée, localStorage vidé');
  }
}