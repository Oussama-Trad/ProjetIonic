import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  isRead: boolean;
  isSent: boolean;
}

@Component({
  selector: 'app-message-detail',
  templateUrl: './message-detail.page.html',
  styleUrls: ['./message-detail.page.scss'],
  standalone:false
})
export class MessageDetailPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  
  contactId!: string;
  contactName: string = '';
  newMessage: string = '';
  messages: Message[] = [];
  isLoading: boolean = true;
  hasError: boolean = false;
  errorMessage: string = "Impossible de charger les messages.";
  currentUserEmail: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.contactId = this.route.snapshot.paramMap.get('id') || '';
    this.contactName = this.contactId; // Temporaire, à remplacer par le vrai nom
    this.currentUserEmail = localStorage.getItem('email');
    
    if (this.contactId) {
      this.loadMessages();
      
      // Configurer une actualisation périodique
      setInterval(() => {
        this.loadMessages(false);
      }, 30000); // Toutes les 30 secondes
    }
  }

  loadMessages(showLoading: boolean = true) {
    if (showLoading) {
      this.isLoading = true;
    }
    
    this.authService.getChatMessages(this.contactId).subscribe({
      next: (messages) => {
        if (messages) {
          this.messages = messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp),
            isRead: msg.read,
            isSent: msg.sender === this.currentUserEmail
          }));
          
          // Trier les messages par date (du plus ancien au plus récent)
          this.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          // Marquer les messages comme lus
          this.authService.markMessagesAsRead(this.contactId).subscribe();
        } else {
          this.messages = [];
        }
        
        this.isLoading = false;
        this.hasError = false;
        
        // Faire défiler jusqu'au dernier message
        setTimeout(() => {
          this.scrollToBottom();
        }, 300);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des messages:', error);
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = "Impossible de charger les messages. Veuillez réessayer.";
      }
    });
  }

  async sendMessage() {
    if (!this.newMessage.trim()) {
      return;
    }
    
    const messageContent = this.newMessage.trim();
    this.newMessage = ''; // Réinitialiser le champ
    
    const tempId = 'temp-' + Date.now();
    
    // Ajouter temporairement le message à la liste locale
    this.messages.push({
      id: tempId,
      content: messageContent,
      sender: this.currentUserEmail || '',
      timestamp: new Date(),
      isRead: false,
      isSent: true
    });
    
    // Faire défiler jusqu'au nouveau message
    this.scrollToBottom();
    
    // Envoyer le message via le service
    this.authService.sendChatMessage(this.contactId, messageContent).subscribe({
      next: (response) => {
        console.log('Message envoyé avec succès:', response);
        // Remplacer le message temporaire par la réponse du serveur si nécessaire
        this.loadMessages(false);
      },
      error: async (error) => {
        console.error('Erreur lors de l\'envoi du message:', error);
        
        // Marquer le message comme non envoyé
        const failedMessageIndex = this.messages.findIndex(m => m.id === tempId);
        if (failedMessageIndex >= 0) {
          this.messages[failedMessageIndex] = {
            ...this.messages[failedMessageIndex],
            id: 'failed-' + Date.now()
          };
        }
        
        // Afficher un toast d'erreur
        const toast = await this.toastController.create({
          message: 'Impossible d\'envoyer le message. Veuillez réessayer.',
          duration: 3000,
          position: 'bottom',
          color: 'danger',
          buttons: [
            {
              text: 'Réessayer',
              handler: () => {
                this.newMessage = messageContent;
              }
            }
          ]
        });
        await toast.present();
      }
    });
  }

  async refreshMessages(event?: any) {
    await this.loadMessages(false);
    if (event) {
      event.target.complete();
    }
  }

  scrollToBottom() {
    if (this.content) {
      this.content.scrollToBottom(300);
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatMessageDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    }
  }

  shouldShowDate(message: Message, index: number): boolean {
    if (index === 0) {
      return true;
    }
    
    const previousMessage = this.messages[index - 1];
    const currentDate = new Date(message.timestamp);
    const previousDate = new Date(previousMessage.timestamp);
    
    return currentDate.toDateString() !== previousDate.toDateString();
  }
} 