import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AlertController, ToastController, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-parametres',
  templateUrl: './parametres.page.html',
  styleUrls: ['./parametres.page.scss'],
  standalone: false
})
export class ParametresPage implements OnInit {
  darkMode: boolean = false;
  language: string = 'fr';
  theme: string = 'light';
  isLoggedIn: boolean = false;
  role: string | null = null;
  userEmail: string = '';
  
  // Variables pour les documents
  documents: any[] = [];
  patientDocuments: any[] = [];

  constructor(
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.authService.settings$.subscribe((settings) => {
      this.darkMode = settings.darkMode;
      this.language = settings.language;
      this.theme = settings.theme;
    });
    
    this.authService.isLoggedIn$.subscribe((isLoggedIn) => {
      this.isLoggedIn = isLoggedIn;
      this.role = localStorage.getItem('role');
      this.userEmail = localStorage.getItem('email') || '';
      
      if (isLoggedIn) {
        this.loadDocuments();
      }
    });
  }

  loadDocuments() {
    if (this.role === 'patient') {
      // Charger les documents du patient
      this.authService.getUser(this.userEmail).subscribe({
        next: (response: any) => {
          this.documents = response.documents || [];
          console.log('Documents chargés:', this.documents);
        },
        error: (err: any) => {
          console.error('Erreur lors du chargement des documents:', err);
          this.showToast('Impossible de charger vos documents', 'danger');
        }
      });
    } else if (this.role === 'medecin') {
      // Charger les documents des patients pour le médecin
      this.authService.getAllPatients().subscribe({
        next: (patients: any[]) => {
          this.patientDocuments = [];
          patients.forEach(patient => {
            if (patient.documents && patient.documents.length > 0) {
              patient.documents.forEach((doc: any) => {
                if (doc.medecinEmail === this.userEmail) {
                  this.patientDocuments.push({
                    ...doc,
                    patientName: `${patient.prenom} ${patient.nom}`,
                    patientEmail: patient.email
                  });
                }
              });
            }
          });
          console.log('Documents patients chargés:', this.patientDocuments);
        },
        error: (err: any) => {
          console.error('Erreur lors du chargement des documents patients:', err);
          this.showToast('Impossible de charger les documents patients', 'danger');
        }
      });
    }
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    this.theme = this.darkMode ? 'dark' : 'light';
    this.authService.updateSettings(this.darkMode, this.language, this.theme).subscribe({
      next: () => console.log('Mode sombre mis à jour'),
      error: (err) => console.error('Erreur lors de la mise à jour du mode sombre:', err),
    });
  }

  changeLanguage(event: any) {
    this.language = event.detail.value;
    this.authService.updateSettings(this.darkMode, this.language, this.theme).subscribe({
      next: () => console.log('Langue mise à jour'),
      error: (err) => console.error('Erreur lors de la mise à jour de la langue:', err),
    });
  }

  async viewDocument(doc: any) {
    // Afficher le document dans une alerte ou une modale
    const alert = await this.alertController.create({
      header: doc.nom,
      message: `<div class="document-preview">
                  <p><strong>Statut:</strong> ${doc.statut}</p>
                  <p><strong>Date:</strong> ${new Date(doc.date).toLocaleDateString()}</p>
                  ${doc.annotations ? `<p><strong>Annotations:</strong> ${doc.annotations}</p>` : ''}
                  ${this.role === 'medecin' ? `<p><strong>Patient:</strong> ${doc.patientName}</p>` : ''}
                </div>`,
      buttons: ['Fermer']
    });
    await alert.present();
  }

  async annotateDocument(doc: any) {
    if (this.role !== 'medecin') return;
    
    const alert = await this.alertController.create({
      header: 'Annoter le document',
      inputs: [
        {
          name: 'annotations',
          type: 'textarea',
          placeholder: 'Entrez vos annotations...',
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
            this.saveAnnotations(doc, data.annotations);
          }
        }
      ]
    });
    await alert.present();
  }

  saveAnnotations(doc: any, annotations: string) {
    // Mettre à jour les annotations du document
    this.authService.getUser(doc.patientEmail).subscribe({
      next: (user: any) => {
        const updatedDocs = user.documents.map((d: any) =>
          d.nom === doc.nom && d.date === doc.date ? { ...d, annotations, statut: 'consulté' } : d
        );
        
        this.authService.updateUserAccount({ ...user, documents: updatedDocs }).subscribe({
          next: () => {
            this.showToast('Annotations enregistrées avec succès', 'success');
            this.loadDocuments(); // Recharger les documents
          },
          error: (err: any) => {
            console.error('Erreur lors de la mise à jour des annotations:', err);
            this.showToast('Impossible d\'enregistrer les annotations', 'danger');
          }
        });
      },
      error: (err: any) => {
        console.error('Erreur lors de la récupération du patient:', err);
        this.showToast('Impossible de récupérer les informations du patient', 'danger');
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
}