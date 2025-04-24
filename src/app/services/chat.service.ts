import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export interface ChatMessage {
  _id?: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: string;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:5000/api';
  private unreadMessagesSubject = new BehaviorSubject<number>(0);
  unreadMessages$ = this.unreadMessagesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.loadUnreadMessagesCount();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Utilisateur non connecté');
    }
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  private loadUnreadMessagesCount(): void {
    const email = localStorage.getItem('email');
    if (!email) return;

    this.authService.getNotifications(email).subscribe({
      next: (notifications) => {
        const unreadCount = notifications.filter(n => n.type === 'nouveau_message' && !n.lue).length;
        this.unreadMessagesSubject.next(unreadCount);
      },
      error: (err) => console.error('Erreur chargement notifications de messages:', err)
    });
  }

  getMessages(otherUser: string): Observable<ChatMessage[]> {
    try {
      const headers = this.getHeaders();
      return this.http.get<ChatMessage[]>(`${this.apiUrl}/chat/messages`, {
        headers,
        params: { otherUser }
      }).pipe(
        tap((messages) => {
          console.log(`${messages.length} messages chargés avec ${otherUser}`);
          this.markAsRead(otherUser).subscribe();
        }),
        catchError((error) => {
          console.error('Erreur lors du chargement des messages:', error);
          return throwError(() => new Error(error.error?.msg || 'Erreur chargement messages'));
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  sendMessage(receiver: string, content: string): Observable<ChatMessage> {
    try {
      const headers = this.getHeaders();
      return this.http.post<ChatMessage>(`${this.apiUrl}/chat/messages`, {
        receiver,
        content
      }, { headers }).pipe(
        tap((message) => console.log('Message envoyé:', message)),
        catchError((error) => {
          console.error('Erreur lors de l\'envoi du message:', error);
          return throwError(() => new Error(error.error?.msg || 'Erreur envoi message'));
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  markAsRead(sender: string): Observable<any> {
    try {
      const headers = this.getHeaders();
      return this.http.put<any>(`${this.apiUrl}/chat/mark-as-read`, {
        sender
      }, { headers }).pipe(
        tap((result) => {
          console.log('Messages marqués comme lus:', result);
          this.loadUnreadMessagesCount();  // Actualiser le compteur
        }),
        catchError((error) => {
          console.error('Erreur lors du marquage des messages comme lus:', error);
          return throwError(() => new Error(error.error?.msg || 'Erreur marquage messages lus'));
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  getContacts(): Observable<string[]> {
    try {
      const headers = this.getHeaders();
      const currentUserEmail = localStorage.getItem('email') || '';
      
      return this.http.get<ChatMessage[]>(`${this.apiUrl}/chat/all-messages`, { headers })
        .pipe(
          map(messages => {
            // Extraire la liste des contacts uniques
            const contacts = new Set<string>();
            messages.forEach(message => {
              if (message.sender === currentUserEmail) {
                contacts.add(message.receiver);
              } else if (message.receiver === currentUserEmail) {
                contacts.add(message.sender);
              }
            });
            return Array.from(contacts);
          }),
          catchError(error => {
            console.error('Erreur lors de la récupération des contacts:', error);
            return throwError(() => new Error(error.error?.msg || 'Erreur récupération contacts'));
          })
        );
    } catch (error) {
      return throwError(() => error);
    }
  }
} 