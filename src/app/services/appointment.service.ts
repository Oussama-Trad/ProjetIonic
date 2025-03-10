import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  availableDays: string[];
}

export interface Appointment {

  id: string;
  doctorId: string;
  patientId: string;
  date: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private apiUrl = 'https://mock-api.medcabinet.com/api/appointments';


  constructor(private http: HttpClient) {}

  getDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${this.apiUrl}/doctors`);
  }

  getAvailableSlots(doctorId: string, date: Date): Observable<Date[]> {
    // Convert date to ISO string without timezone
    const isoDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
    return this.http.get<Date[]>(`${this.apiUrl}/available?doctorId=${doctorId}&date=${isoDate}`);
  }


  bookAppointment(appointment: Omit<Appointment, 'id' | 'status'>): Observable<Appointment> {
    // Ensure date is in correct format
    const formattedAppointment = {
      ...appointment,
      date: new Date(appointment.date).toISOString()
    };
    return this.http.post<Appointment>(this.apiUrl, formattedAppointment);
  }


  getPatientAppointments(patientId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  getDoctorAppointments(doctorId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/doctor/${doctorId}`);
  }

  cancelAppointment(appointmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${appointmentId}`);
  }

  sendAppointmentConfirmation(appointmentId: string, patientId: string): Observable<void> {

    return this.http.post<void>(`${this.apiUrl}/${appointmentId}/confirm`, {});
  }
}
