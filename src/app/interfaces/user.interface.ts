export interface User {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    password?: string; // Optionnel, car exclu dans les réponses API
    birthDate: string;
    address: string;
    gender: string;
    profilePicture: string;
    rendezVousFuturs: any[];
    historiqueRendezVous: any[];
    documents: any[];
    historiqueMedical: any[];
    notifications: { message: string; date: string; lue: boolean }[];
    createdAt: string;
    settings?: { darkMode: boolean; language: string }; // Optionnel, car peut ne pas être présent
  }