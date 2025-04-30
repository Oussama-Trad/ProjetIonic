import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-tous-les-medecins',
  templateUrl: './tous-les-medecins.page.html',
  styleUrls: ['./tous-les-medecins.page.scss'],
  standalone: false,
})
export class TousLesMedecinsPage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  medecins: any[] = [];
  filteredMedecins: any[] = [];
  specialites: string[] = [];
  searchQuery: string = '';
  selectedSpecialite: string = '';
  isLoading: boolean = false;
  
  // Variables pour la modale d'envoi de document
  isDocumentModalOpen: boolean = false;
  selectedMedecin: any = null;
  selectedFile: File | null = null;
  documentName: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.loadMedecins();
  }

  loadMedecins() {
    this.isLoading = true;
    this.authService.getAllMedecins().subscribe({
      next: (response) => {
        this.medecins = response || [];
        this.filteredMedecins = [...this.medecins];
        this.extractSpecialites();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement médecins:', err);
        this.isLoading = false;
        this.showToast('Impossible de charger la liste des médecins', 'danger');
      }
    });
  }

  extractSpecialites() {
    const specialitesSet = new Set<string>();
    this.medecins.forEach(medecin => {
      if (medecin.specialite) {
        specialitesSet.add(medecin.specialite);
      }
    });
    this.specialites = Array.from(specialitesSet).sort();
  }

  filterMedecins() {
    this.filteredMedecins = this.medecins.filter(medecin => {
      const matchesSearch = !this.searchQuery || 
        medecin.nom?.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
        medecin.prenom?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        medecin.specialite?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        medecin.adresse?.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesSpecialite = !this.selectedSpecialite || 
        medecin.specialite === this.selectedSpecialite;
      
      return matchesSearch && matchesSpecialite;
    });
  }

  onSpecialiteChange() {
    this.filterMedecins();
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedSpecialite = '';
    this.filteredMedecins = [...this.medecins];
  }

  goToMedecinCalendar(medecinEmail: string) {
    this.router.navigate(['/rendez-vous'], { queryParams: { medecinEmail } });
  }

  goToConversation(medecinEmail: string) {
    this.router.navigate(['/conversation'], { queryParams: { otherUser: medecinEmail } });
  }

  // Méthodes pour la modale d'envoi de document
  openDocumentModal(medecin: any) {
    console.log('Ouverture de la modale pour le médecin:', medecin);
    this.selectedMedecin = medecin;
    this.documentName = '';
    this.selectedFile = null;
    this.isDocumentModalOpen = true;
  }

  closeDocumentModal() {
    console.log('Fermeture de la modale');
    this.isDocumentModalOpen = false;
    this.selectedMedecin = null;
    this.documentName = '';
    this.selectedFile = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      console.log('Fichier sélectionné:', this.selectedFile.name);
    }
  }

  async uploadDocument() {
    if (!this.selectedFile || !this.documentName || !this.selectedMedecin) {
      this.showToast('Veuillez remplir tous les champs', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Envoi du document en cours...',
      spinner: 'circles'
    });
    await loading.present();
    
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      this.authService.uploadDocument(this.documentName, url, this.selectedMedecin.email).subscribe({
        next: async (response) => {
          console.log('Réponse du serveur:', response);
          loading.dismiss();
          this.showToast('Document envoyé avec succès', 'success');
          this.closeDocumentModal();
          
          // Afficher une confirmation élégante
          const alert = await this.alertController.create({
            header: 'Document envoyé !',
            message: `Votre document "${this.documentName}" a été envoyé avec succès au Dr. ${this.selectedMedecin.prenom} ${this.selectedMedecin.nom}.`,
            buttons: ['OK'],
            cssClass: 'success-alert'
          });
          await alert.present();
        },
        error: (err) => {
          console.error('Erreur lors de l\'envoi du document:', err);
          loading.dismiss();
          this.showToast('Erreur lors de l\'envoi du document : ' + (err.error?.msg || 'Échec de l\'envoi'), 'danger');
        }
      });
    };
    reader.readAsDataURL(this.selectedFile);
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }
}