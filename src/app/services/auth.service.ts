import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  register(
    firstName: string,
    lastName: string,
    phoneNumber: string,
    email: string,
    password: string,
    birthDate: string,  // Nouveau
    address: string,    // Nouveau
    gender: string      // Nouveau
  ): Observable<any> {
    const body = { firstName, lastName, phoneNumber, email, password, birthDate, address, gender };
    return this.http.post(`${this.apiUrl}/register`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}