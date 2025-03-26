// src/app/services/notification.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private showNotificationsSubject = new BehaviorSubject<boolean>(false);
  private notificationsSubject = new BehaviorSubject<any[]>([]);
  private unreadNotificationsCountSubject = new BehaviorSubject<number>(0);

  showNotifications$: Observable<boolean> = this.showNotificationsSubject.asObservable();
  notifications$: Observable<any[]> = this.notificationsSubject.asObservable();
  unreadNotificationsCount$: Observable<number> = this.unreadNotificationsCountSubject.asObservable();

  toggleNotifications() {
    this.showNotificationsSubject.next(!this.showNotificationsSubject.value);
  }

  setNotifications(notifications: any[]) {
    this.notificationsSubject.next(notifications);
    this.unreadNotificationsCountSubject.next(
      notifications.filter((notif: any) => !notif.lue).length
    );
  }

  markNotificationAsRead(notificationId: string) {
    const notifications = this.notificationsSubject.value;
    const notification = notifications.find((notif: any) => notif.id === notificationId);
    if (notification) {
      notification.lue = true;
      this.notificationsSubject.next([...notifications]);
      this.unreadNotificationsCountSubject.next(
        notifications.filter((notif: any) => !notif.lue).length
      );
    }
  }
}