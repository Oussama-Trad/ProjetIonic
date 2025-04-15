import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { User } from '../../interfaces/user.interface';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-accueil',
  templateUrl: './accueil.page.html',
  styleUrls: ['./accueil.page.scss'],
  standalone: false,

})
export class AccueilPage implements OnInit {
  user: User = {} as User;
  notifications: { id: string; message: string; date: string; lue: boolean; type: string; data?: any }[] = [];
  randomMedecins: any[] = [];
  email: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    this.email = localStorage.getItem('email');
    if (this.email) {
      const loading = await this.loadingController.create({
        message: 'Chargement...',
        spinner: 'crescent'
      });
      await loading.present();
      this.loadUserData(this.email);
      this.loadNotifications(this.email);
      this.loadRandomMedecins();
      loading.dismiss();
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
        console.error('Erreur chargement données utilisateur :', err);
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
        console.error('Erreur chargement notifications :', err);
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
        console.error('Erreur chargement médecins :', err);
        this.randomMedecins = [];
      },
    });
  }

  async markNotificationAsRead(notificationId: string) {
    const loading = await this.loadingController.create({
      message: 'Mise à jour...',
      spinner: 'crescent'
    });
    await loading.present();
    this.authService.markNotificationAsRead(notificationId).subscribe({
      next: () => {
        const notification = this.notifications.find((notif) => notif.id === notificationId);
        if (notification) {
          notification.lue = true;
          console.log('Notification marquée comme lue :', notificationId);
        }
        loading.dismiss();
      },
      error: (err) => {
        console.error('Erreur marquage notification :', err);
        loading.dismiss();
      },
    });
  }

  goToRendezVous() {
    this.router.navigate(['/rendez-vous']);
  }

  goToMedecinCalendar(medecinEmail: string) {
    this.router.navigate(['/rendez-vous'], { queryParams: { medecinEmail } });
  }

  handleNotificationClick(notification: any) {
    if (notification.type === 'rendezvous_demande' || notification.type === 'rendezvous_accepte' || notification.type === 'rendezvous_refuse') {
      this.router.navigate(['/rendez-vous'], {
        queryParams: {
          medecinEmail: notification.data.medecinEmail,
          date: notification.data.rdvDate,
          heure: notification.data.rdvHeure
        }
      });
    } else if (notification.type === 'document_envoye') {
      this.router.navigate(['/documents'], {
        queryParams: { documentUrl: notification.data.documentUrl }
      });
    } else if (notification.type === 'consultation_enregistree') {
      this.router.navigate(['/historique'], {
        queryParams: {
          consultationDate: notification.data.consultationDate,
          consultationHeure: notification.data.consultationHeure
        }
      });
    }
    if (!notification.lue) {
      this.markNotificationAsRead(notification.id);
    }
  }
}