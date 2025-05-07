import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

interface Contact {
  email: string;
  displayName: string;
  role: string;
  profilePicture?: string;
}

@Component({
  selector: 'app-new-message',
  templateUrl: './new-message.page.html',
  styleUrls: ['./new-message.page.scss'],
  standalone:false
})
export class NewMessagePage implements OnInit {
  searchTerm: string = '';
  contacts: Contact[] = [];
  filteredContacts: Contact[] = [];
  isLoading: boolean = false;
  hasError: boolean = false;
  isSearching: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.loadContacts();
  }

  async loadContacts() {
    this.isLoading = true;

    try {
      // Charger la liste des médecins comme contacts possibles
      this.authService.getAllMedecins().subscribe({
        next: (medecins) => {
          if (medecins && Array.isArray(medecins)) {
            this.contacts = medecins.map(medecin => {
              const firstName = medecin.firstName || medecin.prenom || 'Inconnu';
              const lastName = medecin.lastName || medecin.nom || 'Inconnu';
              const profilePic = medecin.profilePicture || medecin.photoProfil || `https://i.pravatar.cc/300?u=${medecin.email}`;
              return {
                email: medecin.email,
                displayName: `${firstName} ${lastName}`,
                role: 'medecin',
                profilePicture: profilePic
              };
            });
            this.filteredContacts = [...this.contacts];
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des contacts:', error);
          this.isLoading = false;
          this.hasError = true;
          this.showErrorToast('Impossible de charger la liste des contacts');
        }
      });
    } catch (error) {
      console.error('Erreur globale:', error);
      this.isLoading = false;
      this.hasError = true;
    }
  }

  filterContacts() {
    this.isSearching = true;
    
    if (!this.searchTerm.trim()) {
      this.filteredContacts = [...this.contacts];
      this.isSearching = false;
      return;
    }
    
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredContacts = this.contacts.filter(contact => 
      contact.displayName.toLowerCase().includes(search) || 
      contact.email.toLowerCase().includes(search)
    );
    
    this.isSearching = false;
  }

  async refreshContacts(event?: any) {
    await this.loadContacts();
    if (event) {
      event.target.complete();
    }
  }

  startConversation(contact: Contact) {
    // Naviguer vers la page de conversation avec l'email du contact
    this.router.navigate(['/messages', contact.email]);
  }

  async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }
}
