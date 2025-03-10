import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;

  diagnosis: string;
  prescriptions: string[];
  notes: string;
  relatedDocuments?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MedicalRecordService {
  private apiUrl = 'http://localhost:3000/api/medical-records';

  constructor(private http: HttpClient) {}

  getPatientRecords(patientId: string): Observable<MedicalRecord[]> {
    return this.http.get<MedicalRecord[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  getDoctorRecords(doctorId: string): Observable<MedicalRecord[]> {
    return this.http.get<MedicalRecord[]>(`${this.apiUrl}/doctor/${doctorId}`);
  }

  createRecord(record: Omit<MedicalRecord, 'id'>): Observable<MedicalRecord> {
    // Ensure the record has all required fields
    if (!record.diagnosis || !record.prescriptions) {
      throw new Error('Diagnosis and prescriptions are required fields.');
    }


    return this.http.post<MedicalRecord>(this.apiUrl, record);
  }

  updateRecord(recordId: string, updates: Partial<MedicalRecord>): Observable<MedicalRecord> {
    // Update the specified medical record with new information
    if (!updates.diagnosis && !updates.prescriptions) {
      throw new Error('At least one of diagnosis or prescriptions must be provided for update.');
    }


    return this.http.patch<MedicalRecord>(`${this.apiUrl}/${recordId}`, updates);
  }
}
