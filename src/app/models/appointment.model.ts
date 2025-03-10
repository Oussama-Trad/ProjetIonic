export interface Appointment {
  id?: string; // Optional, as it may not be needed when creating a new appointment
  doctorId: string;
  patientId: string;
  date: Date;
  status?: string; // Optional, to track the status of the appointment
}
