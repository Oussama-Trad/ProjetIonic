import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

interface Conversation {
  id: string;
  contactName: string;
  avatarUrl: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
}

@Component({
  selector: 'app-messages-list',
  templateUrl: './messages-list.page.html',
  styleUrls: ['./messages-list.page.scss'],
  standalone:false
})
export class MessagesListPage implements OnInit {
  conversations: Conversation[] = [];
  isLoading = true;
  hasError = false;
  errorMessage = 'Impossible de charger les conversations.';

  constructor(
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadConversations();
  }

  async loadConversations() {
    this.isLoading = true;
    this.hasError = false;

    try {
      // Récupérer les conversations depuis le service
      this.authService.getAllMessages().subscribe({
        next: (messages) => {
          if (!messages || messages.length === 0) {
            this.conversations = [];
            this.isLoading = false;
            return;
          }

          // Organiser les messages par expéditeur/destinataire
          const conversationMap = new Map<string, any[]>();
          const currentUserEmail = localStorage.getItem('email') || '';
          
          messages.forEach(msg => {
            const otherUser = msg.sender === currentUserEmail ? msg.receiver : msg.sender;
            if (!conversationMap.has(otherUser)) {
              conversationMap.set(otherUser, []);
            }
            conversationMap.get(otherUser)?.push(msg);
          });
          
          // Créer les objets de conversation
          this.conversations = Array.from(conversationMap.entries()).map(([otherUser, msgs]) => {
            // Trier les messages par date (du plus récent au plus ancien)
            msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            const lastMsg = msgs[0];
            const unreadCount = msgs.filter(m => !m.read && m.receiver === currentUserEmail).length;
            
            return {
              id: otherUser,
              contactName: otherUser, // À remplacer par le vrai nom quand disponible
              avatarUrl: `https://i.pravatar.cc/300?u=${otherUser}`, // Avatar temporaire basé sur l'email
              lastMessage: lastMsg.content,
              timestamp: new Date(lastMsg.timestamp),
              unreadCount: unreadCount
            };
          });
          
          // Trier les conversations par date du dernier message
          this.conversations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des messages:', error);
          this.isLoading = false;
          this.hasError = true;
          this.errorMessage = 'Impossible de charger les conversations. Veuillez réessayer.';
        }
      });
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
      this.isLoading = false;
      this.hasError = true;
    }
  }

  async refreshConversations(event?: any) {
    try {
      await this.loadConversations();
      if (event) {
        event.target.complete();
      }
      
      // Afficher un toast de confirmation
      const toast = await this.toastController.create({
        message: 'Conversations mises à jour',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();
      
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
      if (event) {
        event.target.complete();
      }
      
      // Afficher un toast d'erreur
      const toast = await this.toastController.create({
        message: 'Impossible de mettre à jour les conversations',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }

  openConversation(conversationId: string) {
    // Marquer les messages comme lus
    this.authService.markMessagesAsRead(conversationId).subscribe({
      next: () => console.log('Messages marqués comme lus'),
      error: (err) => console.error('Erreur lors du marquage des messages:', err)
    });
    
    // Naviguer vers la page de conversation spécifique
    this.router.navigate(['/messages', conversationId]);
  }

  startNewConversation() {
    // Naviguer vers la page de nouvelle conversation
    this.router.navigate(['/new-message']);
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const day = 24 * 60 * 60 * 1000;
    
    // Aujourd'hui - afficher l'heure
    if (diff < day && now.getDate() === date.getDate()) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Hier
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (diff < 2 * day && yesterday.getDate() === date.getDate()) {
      return 'Hier';
    }
    
    // Cette semaine - afficher le jour
    if (diff < 7 * day) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    }
    
    // Cette année - afficher le jour et le mois
    if (now.getFullYear() === date.getFullYear()) {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
    
    // Années différentes - afficher date complète
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
  }
} 