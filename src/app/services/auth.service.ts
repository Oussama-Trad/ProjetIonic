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

  deleteUser(email: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user`, { params: { email } });
  }
}