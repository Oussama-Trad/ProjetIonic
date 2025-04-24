import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';
import { ChatService } from './services/chat.service';
import { DbInitService } from './services/db-init.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone:false
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  role: string | null = null;
  showNotifications: boolean = false;
  notifications: any[] = [];
  unreadNotificationsCount: number = 0;
  isMenuOpen = false;
  darkMode = false;
  unreadMessageCount = 0;

  @ViewChild('notificationDropdown') notificationDropdown!: ElementRef<HTMLDivElement>;

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private chatService: ChatService,
    private dbInitService: DbInitService
  ) {
    // Initialiser la base de données avec les données de test
    this.initializeDatabase();

    this.authService.isLoggedIn$.subscribe((loggedIn: boolean) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      if (loggedIn) {
        const email = localStorage.getItem('email');
        if (email) {
          this.authService.getNotifications(email).subscribe({
            next: (notifications: any[]) => {
              this.notificationService.setNotifications(notifications);
            },
            error: (err: any) => {
              console.error('Erreur lors du chargement initial des notifications :', err);
            },
          });
        }
      }
    });

    this.notificationService.showNotifications$.subscribe((show: boolean) => {
      this.showNotifications = show;
    });

    this.notificationService.notifications$.subscribe((notifications: any[]) => {
      this.notifications = notifications;
    });

    this.notificationService.unreadNotificationsCount$.subscribe((count: number) => {
      this.unreadNotificationsCount = count;
    });
  }

  // Méthode pour initialiser la base de données
  private initializeDatabase(): void {
    this.dbInitService.initializeDatabase().subscribe({
      next: (response) => {
        console.log('Base de données initialisée avec succès:', response);
      },
      error: (err) => {
        console.error('Échec de l\'initialisation de la base de données:', err);
      }
    });
  }

  ngOnInit() {
    // Observer pour les messages non lus
    this.chatService.unreadMessages$.subscribe(count => {
      this.unreadMessageCount = count;
    });
  }

  ngOnDestroy() {
    // Nettoyage des abonnements si nécessaire
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  goToAccueil() {
    this.router.navigate(['/tabs/accueil']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  goToRendezVous() {
    this.router.navigate(['/rendez-vous']);
  }

  goToDocuments() {
    this.router.navigate(['/documents']);
  }

  goToHistorique() {
    this.router.navigate(['/historique']);
  }

  goToAccueilMedecin() {
    this.router.navigate(['/accueil-medecin']);
  }

  goToMedecinProfile() {
    this.router.navigate(['/medecin-profile']);
  }

  goToParametres() {
    this.router.navigate(['/tabs/parametres']);
  }

  logout() {
    this.authService.logout();
  }

  markNotificationAsRead(notificationId: string) {
    this.notificationService.markNotificationAsRead(notificationId);
    const email = localStorage.getItem('email');
    if (email) {
      this.authService.getNotifications(email).subscribe({
        next: (notifications: any[]) => {
          this.notificationService.setNotifications(notifications);
        },
        error: (err: any) => {
          console.error('Erreur lors du rechargement des notifications :', err);
        },
      });
    }
  }
}