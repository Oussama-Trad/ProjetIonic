import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-notifications',
  template: `
    <ion-list *ngIf="notifications.length > 0">
      <ion-item *ngFor="let notification of notifications">
        <ion-label>{{ notification.message }}</ion-label>
        <ion-note slot="end">{{ notification.date | date:'short' }}</ion-note>
      </ion-item>
    </ion-list>
    <ion-label *ngIf="notifications.length === 0">Aucune notification</ion-label>
  `,
  standalone: false, // Déclaré dans un module
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  role: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    const email = localStorage.getItem('email');
    if (email) {
      this.authService.getNotifications(email).subscribe({
        next: (notifications: any[]) => {
          this.notifications = notifications;
        },
        error: (err) => console.error('Erreur chargement notifications :', err),
      });
    }
  }
}