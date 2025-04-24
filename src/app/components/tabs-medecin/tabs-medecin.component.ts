import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-tabs-medecin',
  templateUrl: './tabs-medecin.component.html',
  styleUrls: ['./tabs-medecin.component.scss'],
  standalone: false,
})
export class TabsMedecinComponent implements OnInit {
  isLoggedIn: boolean = false;
  currentPath: string = '';
  unreadMessageCount: number = 0;

  constructor(private router: Router, private authService: AuthService) {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      
      if (this.isLoggedIn) {
        this.checkUnreadMessages();
      }
    });
  }

  ngOnInit() {
    // Surveiller les changements de route pour mettre à jour l'onglet actif
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentPath = event.url;
        console.log('Current path (medecin):', this.currentPath);
      });
      
    // Vérifier l'URL actuelle au démarrage
    this.currentPath = this.router.url;
    console.log('Initial path (medecin):', this.currentPath);
    
    // Mettre à jour régulièrement le compteur de messages non lus
    setInterval(() => {
      if (this.isLoggedIn) {
        this.checkUnreadMessages();
      }
    }, 60000); // Vérifier toutes les minutes
  }
  
  checkUnreadMessages() {
    const userEmail = localStorage.getItem('email');
    if (!userEmail) return;
    
    this.authService.getAllMessages().subscribe({
      next: (messages: any[]) => {
        if (!messages) {
          this.unreadMessageCount = 0;
          return;
        }
        // Compter les messages non lus où l'utilisateur est le destinataire
        this.unreadMessageCount = messages.filter(msg => 
          msg.receiver === userEmail && !msg.read
        ).length;
      },
      error: (err: Error) => {
        console.error('Erreur chargement messages:', err);
        this.unreadMessageCount = 0;
      }
    });
  }

  isActive(route: string): boolean {
    return this.currentPath.includes(`/${route}`) || this.currentPath.endsWith(route);
  }

  goToTableauBord() {
    console.log('Navigation vers Tableau de bord médecin');
    this.router.navigate(['/accueil-medecin']);
  }

  goToRendezVous() {
    console.log('Navigation vers Rendez-vous médecin');
    this.router.navigate(['/rendez-vous-medecin']);
  }
  
  goToPatients() {
    console.log('Navigation vers Patients');
    this.router.navigate(['/patients-medecin']);
  }
  
  goToMessages() {
    console.log('Navigation vers Messages');
    if (this.isLoggedIn) {
      this.router.navigate(['/tabs/messages-list']);
    } else {
      this.showLoginAlert();
      this.router.navigate(['/login']);
    }
  }

  goToProfile() {
    console.log('Navigation vers Profil médecin');
    this.router.navigate(['/medecin-profile']);
  }
  
  showLoginAlert() {
    alert('Veuillez vous connecter pour accéder à cette fonctionnalité');
  }
} 