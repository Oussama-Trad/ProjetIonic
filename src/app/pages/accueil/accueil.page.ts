import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { User } from '../../interfaces/user.interface';

@Component({
  selector: 'app-accueil',
  templateUrl: './accueil.page.html',
  styleUrls: ['./accueil.page.scss'],
  standalone: false
})
export class AccueilPage implements OnInit {
  user: User = {} as User;
  notifications: { id: string; message: string; date: string; lue: boolean; type: string }[] = [];
  randomMedecins: any[] = [];
  email: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.email = localStorage.getItem('email');
    if (this.email) {
      this.loadUserData(this.email);
      this.loadNotifications(this.email);
      this.loadRandomMedecins();
    } else {
      console.error('Email non trouvé dans localStorage');
      this.router.navigate(['/login']);
    }
  }

  loadUserData(email: string) {
    this.authService.getUser(email).subscribe({
      next: (response) => {
        this.user = response;
        console.log('Utilisateur chargé :', this.user);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des données utilisateur :', err);
        this.router.navigate(['/login']);
      },
    });
  }

  loadNotifications(email: string) {
    this.authService.getNotifications(email).subscribe({
      next: (notifications) => {
        this.notifications = notifications || [];
        console.log('Notifications chargées :', this.notifications);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des notifications :', err);
        this.notifications = [];
      },
    });
  }

  loadRandomMedecins() {
    this.authService.getAllMedecins().subscribe({
      next: (response) => {
        const medecins = response || [];
        this.randomMedecins = medecins.sort(() => 0.5 - Math.random()).slice(0, 3);
        console.log('Médecins aléatoires chargés :', this.randomMedecins);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des médecins :', err);
        this.randomMedecins = [];
      },
    });
  }

  markNotificationAsRead(notificationId: string) {
    this.authService.markNotificationAsRead(notificationId).subscribe({
      next: () => {
        const notification = this.notifications.find((notif) => notif.id === notificationId);
        if (notification) {
          notification.lue = true;
          console.log('Notification marquée comme lue :', notificationId);
        }
      },
      error: (err) => {
        console.error('Erreur lors du marquage de la notification comme lue :', err);
      },
    });
  }

  goToRendezVous() {
    this.router.navigate(['/rendez-vous']);
  }

  goToMedecinCalendar(medecinEmail: string) {
    this.router.navigate(['/rendez-vous'], { queryParams: { medecinEmail } });
  }
}