import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss'],
  standalone: false,
})
export class TabsComponent implements OnInit {
  isLoggedIn: boolean = false;
  role: string | null = null;
  currentPath: string = '';
  unreadMessageCount: number = 0;

  constructor(private router: Router, private authService: AuthService) {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      console.log('TabsComponent - isLoggedIn:', this.isLoggedIn, 'role:', this.role);
      
      if (this.isLoggedIn) {
        this.checkUnreadMessages();
      }
    });
  }

  ngOnInit() {
    // Surveiller les changements de route pour mettre à jour l'onglet actif
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentPath = event.url;
        console.log('Current path:', this.currentPath);
      });
      
    // Vérifier l'URL actuelle au démarrage
    this.currentPath = this.router.url;
    console.log('Initial path:', this.currentPath);
    
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

  goToAccueil() {
    console.log('Navigation vers Accueil');
    this.router.navigate(['/tabs/accueil']);
  }

  goToMedecins() {
    console.log('Navigation vers Tous les Médecins');
    this.router.navigate(['/tabs/tous-les-medecins']);
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
    console.log('Navigation vers Profil');
    if (this.isLoggedIn) {
      if (this.role === 'patient') {
        this.router.navigate(['/tabs/home']);
      } else if (this.role === 'medecin') {
        this.router.navigate(['/medecin']);
      }
    } else {
      this.showLoginAlert();
      this.router.navigate(['/login']);
    }
  }

  goToParametres() {
    console.log('Navigation vers Paramètres');
    if (this.isLoggedIn) {
      this.router.navigate(['/tabs/parametres']);
    } else {
      this.showLoginAlert();
      this.router.navigate(['/login']);
    }
  }
  
  showLoginAlert() {
    alert('Veuillez vous connecter pour accéder à cette fonctionnalité');
  }
}