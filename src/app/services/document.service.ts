import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MedicalDocument {
  id: string;
  patientId: string;
  doctorId: string;
  fileName: string;
  fileType: string;
  uploadDate: Date;
  status: 'pending' | 'reviewed';
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl = 'http://localhost:3000/api/documents';

  constructor(private http: HttpClient) {}

  uploadDocument(file: File, patientId: string, doctorId: string): Observable<MedicalDocument> {
    // Ensure the file is valid and not empty

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patientId);
    formData.append('doctorId', doctorId);
    
    return this.http.post<MedicalDocument>(this.apiUrl, formData);
  }

  getPatientDocuments(patientId: string): Observable<MedicalDocument[]> {
    // Fetch documents for the specified patient

    return this.http.get<MedicalDocument[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  getDoctorDocuments(doctorId: string): Observable<MedicalDocument[]> {
    // Fetch documents for the specified doctor

    return this.http.get<MedicalDocument[]>(`${this.apiUrl}/doctor/${doctorId}`);
  }

  addDocumentNotes(documentId: string, notes: string): Observable<MedicalDocument> {
    return this.http.patch<MedicalDocument>(`${this.apiUrl}/${documentId}/notes`, { notes });
  }
}
