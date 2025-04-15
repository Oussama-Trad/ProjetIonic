import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false,
  
})
export class HeaderComponent implements OnInit {
  user: any = {};
  fullName: string = 'Utilisateur';
  isLoggedIn: boolean = false;
  profilePictureUrl: string | null = null;
  photoPreview: string | null = null;
  unreadNotificationsCount: number = 0;
  role: string | null = null;
  showNotifications: boolean = false;
  notifications: any[] = [];
  popoverTriggerId: string = `notification-popover-${uuidv4()}`;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn: boolean) => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        const email = localStorage.getItem('email');
        this.role = localStorage.getItem('role');
        if (email && this.role) {
          const fetchMethod = this.role === 'medecin' ? this.authService.getMedecin.bind(this.authService) : this.authService.getUser.bind(this.authService);
          fetchMethod(email).subscribe({
            next: (response: any) => {
              this.user = response || {};
              const firstName = this.user?.firstName || this.user?.prenom || '';
              const lastName = this.user?.lastName || this.user?.nom || '';
              this.fullName = `${firstName} ${lastName}`.trim() || 'Utilisateur';
              this.profilePictureUrl = this.role === 'medecin' ? this.user?.photoProfil : this.user?.profilePicture;
              if (!this.profilePictureUrl || !this.profilePictureUrl.startsWith('data:image/')) {
                this.profilePictureUrl = null;
              }
            },
            error: (err: any) => {
              console.error('Erreur chargement utilisateur :', err);
              this.user = {};
              this.fullName = 'Utilisateur';
              this.profilePictureUrl = null;
            },
          });
        }
      } else {
        this.user = {};
        this.fullName = 'Utilisateur';
        this.profilePictureUrl = null;
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

  async toggleNotifications() {
    this.notificationService.toggleNotifications();
    const email = localStorage.getItem('email');
    if (email) {
      const loading = await this.loadingController.create({
        message: 'Chargement des notifications...',
        spinner: 'crescent'
      });
      await loading.present();
      this.authService.getNotifications(email).subscribe({
        next: (notifications: any[]) => {
          this.notificationService.setNotifications(notifications);
          loading.dismiss();
        },
        error: (err: any) => {
          console.error('Erreur chargement notifications :', err);
          loading.dismiss();
        },
      });
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
        this.profilePictureUrl = this.photoPreview;
        this.updateProfilePicture();
      };
      reader.readAsDataURL(file);
    }
  }

  async updateProfilePicture() {
    if (!this.photoPreview) return;
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');
    if (!email || !role) return;

    const loading = await this.loadingController.create({
      message: 'Mise à jour de la photo...',
      spinner: 'crescent'
    });
    await loading.present();

    const updatedData = {
      email,
      profilePicture: role === 'patient' ? this.photoPreview : undefined,
      photoProfil: role === 'medecin' ? this.photoPreview : undefined,
    };

    this.authService.updateUserProfilePicture(email, updatedData).subscribe({
      next: (response: any) => {
        this.user = response;
        this.profilePictureUrl = role === 'medecin' ? response.photoProfil : response.profilePicture;
        this.photoPreview = null;
        loading.dismiss();
      },
      error: (err: any) => {
        console.error('Erreur mise à jour photo :', err);
        this.photoPreview = null;
        loading.dismiss();
      },
    });
  }

  async logout() {
    const loading = await this.loadingController.create({
      message: 'Déconnexion...',
      spinner: 'crescent'
    });
    await loading.present();
    this.authService.logout();
    loading.dismiss();
  }

  handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    this.profilePictureUrl = null;
  }

  async markNotificationAsRead(notificationId: string) {
    const loading = await this.loadingController.create({
      message: 'Mise à jour...',
      spinner: 'crescent'
    });
    await loading.present();
    this.notificationService.markNotificationAsRead(notificationId);
    const email = localStorage.getItem('email');
    if (email) {
      this.authService.markNotificationAsRead(notificationId).subscribe({
        next: () => {
          this.authService.getNotifications(email).subscribe({
            next: (notifications: any[]) => {
              this.notificationService.setNotifications(notifications);
              loading.dismiss();
            },
            error: (err: any) => {
              console.error('Erreur rechargement notifications :', err);
              loading.dismiss();
            },
          });
        },
        error: (err: any) => {
          console.error('Erreur marquage notification :', err);
          loading.dismiss();
        },
      });
    }
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