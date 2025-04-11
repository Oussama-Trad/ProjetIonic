import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { v4 as uuidv4 } from 'uuid';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
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
    private notificationService: NotificationService
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

  toggleNotifications() {
    this.notificationService.toggleNotifications();
    const email = localStorage.getItem('email');
    if (email) {
      this.authService.getNotifications(email).subscribe({
        next: (notifications: any[]) => {
          this.notificationService.setNotifications(notifications);
        },
        error: (err: any) => console.error('Erreur chargement notifications :', err),
      });
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileChange(event: Event) {
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

  updateProfilePicture() {
    if (!this.photoPreview) return;
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');
    if (!email || !role) return;

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
      },
      error: (err: any) => {
        console.error('Erreur mise à jour photo :', err);
        this.photoPreview = null;
      },
    });
  }

  logout() {
    this.authService.logout();
  }

  handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    this.profilePictureUrl = null;
  }

  markNotificationAsRead(notificationId: string) {
    this.notificationService.markNotificationAsRead(notificationId);
    const email = localStorage.getItem('email');
    if (email) {
      this.authService.markNotificationAsRead(notificationId).subscribe({
        next: () => {
          this.authService.getNotifications(email).subscribe({
            next: (notifications: any[]) => {
              this.notificationService.setNotifications(notifications);
            },
            error: (err: any) => console.error('Erreur rechargement notifications :', err),
          });
        },
        error: (err: any) => console.error('Erreur marquage notification :', err),
      });
    }
  }
}