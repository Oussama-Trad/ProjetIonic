export interface User {
  id?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  password?: string;
  birthDate: string;
  address: string;
  gender: string;
  profilePicture: string;
  rendezVousFuturs: any[];
  historiqueRendezVous: any[];
  documents: any[];
  notifications: { id: string; message: string; date: string; lue: boolean; type: string }[];
  createdAt?: string;
  settings: { darkMode: boolean; language: string };
}