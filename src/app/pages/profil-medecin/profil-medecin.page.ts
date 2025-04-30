import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-profil-medecin',
  templateUrl: './profil-medecin.page.html',
  styleUrls: ['./profil-medecin.page.scss'],
  standalone: false
})
export class ProfilMedecinPage implements OnInit {
  isLoggedIn: boolean = false;
  role: string | null = null;
  medecin: any = {};
  isEditing: boolean = false;
  photoPreview: string | null = null;
  patientDocuments: any[] = [];
  patients: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      if (loggedIn && this.role === 'medecin') {
        const email = localStorage.getItem('email');
        if (email) {
          this.loadMedecinProfile(email);
          this.loadPatientDocuments();
        }
      } else if (this.role === 'patient') {
        this.router.navigate(['/tabs/home']);
      }
    });
  }

  loadMedecinProfile(email: string) {
    this.authService.getMedecin(email).subscribe({
      next: (response) => {
        this.medecin = response;
        console.log('Données médecin chargées :', this.medecin);
      },
      error: (err) => {
        console.error('Erreur chargement profil médecin :', err);
        this.showToast('Impossible de charger votre profil', 'danger');
      },
    });
  }

  loadPatientDocuments() {
    // Charger tous les patients pour récupérer leurs documents
    this.authService.getAllPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        console.log('Patients chargés:', this.patients);
        
        // Extraire tous les documents des patients
        this.patientDocuments = [];
        this.patients.forEach(patient => {
          if (patient.documents && patient.documents.length > 0) {
            // Filtrer les documents destinés à ce médecin
            const medecinEmail = localStorage.getItem('email');
            const docsForThisMedecin = patient.documents.filter(
              (doc: any) => doc.medecinEmail === medecinEmail
            );
            
            // Ajouter le nom du patient à chaque document
            docsForThisMedecin.forEach((doc: any) => {
              this.patientDocuments.push({
                ...doc,
                patientName: `${patient.firstName} ${patient.lastName}`,
                patientEmail: patient.email
              });
            });
          }
        });
        
        console.log('Documents patients chargés:', this.patientDocuments);
      },
      error: (err) => {
        console.error('Erreur chargement patients:', err);
        this.showToast('Impossible de charger les documents patients', 'danger');
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.photoPreview = null;
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile() {
    if (!this.isLoggedIn || this.role !== 'medecin') return;

    const updatedMedecin = {
      email: this.medecin.email,
      firstName: this.medecin.firstName,
      lastName: this.medecin.lastName,
      phoneNumber: this.medecin.phoneNumber,
      address: this.medecin.address,
      specialite: this.medecin.specialite,
      tarif: this.medecin.tarif,
      description: this.medecin.description,
      profilePicture: this.photoPreview || this.medecin.profilePicture || '',
    };

    this.authService.updateMedecin(updatedMedecin).subscribe({
      next: (response) => {
        this.medecin = response;
        this.isEditing = false;
        this.showToast('Profil mis à jour avec succès !', 'success');
      },
      error: (err) => {
        console.error('Erreur mise à jour profil médecin:', err);
        this.showToast('Erreur : ' + (err.error?.msg || 'Échec de la mise à jour'), 'danger');
      },
    });
  }

  async viewDocument(doc: any) {
    // Afficher le document dans une alerte
    const alert = await this.alertController.create({
      header: doc.nom,
      message: `<div class="document-preview">
                  <p><strong>Patient:</strong> ${doc.patientName}</p>
                  <p><strong>Statut:</strong> ${doc.statut}</p>
                  <p><strong>Date:</strong> ${new Date(doc.date).toLocaleDateString()}</p>
                  ${doc.annotations ? `<p><strong>Annotations:</strong> ${doc.annotations}</p>` : ''}
                  <p><strong>Contenu:</strong></p>
                  <div class="document-content">${doc.contenu}</div>
                </div>`,
      buttons: ['Fermer']
    });
    await alert.present();
    
    // Marquer comme consulté si ce n'est pas déjà le cas
    if (doc.statut !== 'consulté') {
      this.updateDocumentStatus(doc, 'consulté');
    }
  }

  async annotateDocument(doc: any) {
    const alert = await this.alertController.create({
      header: 'Annoter le document',
      inputs: [
        {
          name: 'annotations',
          type: 'textarea',
          placeholder: 'Vos annotations...',
          value: doc.annotations || ''
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Enregistrer',
          handler: (data) => {
            this.updateDocumentAnnotation(doc, data.annotations);
          }
        }
      ]
    });
    await alert.present();
  }

  updateDocumentStatus(doc: any, status: string) {
    // Mettre à jour le statut du document
    this.authService.updateDocumentStatus(doc.patientEmail, doc.id, status).subscribe({
      next: () => {
        doc.statut = status;
        this.showToast('Statut du document mis à jour', 'success');
      },
      error: (err) => {
        console.error('Erreur mise à jour statut:', err);
        this.showToast('Erreur lors de la mise à jour du statut', 'danger');
      }
    });
  }

  updateDocumentAnnotation(doc: any, annotations: string) {
    // Mettre à jour les annotations du document
    this.authService.updateDocumentAnnotation(doc.patientEmail, doc.id, annotations).subscribe({
      next: () => {
        doc.annotations = annotations;
        this.showToast('Annotations enregistrées', 'success');
      },
      error: (err) => {
        console.error('Erreur mise à jour annotations:', err);
        this.showToast('Erreur lors de l\'enregistrement des annotations', 'danger');
      }
    });
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
