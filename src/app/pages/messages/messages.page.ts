import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, ActionSheetController, ToastController } from '@ionic/angular';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription } from 'rxjs';
import { ChatMessage } from '../../services/chat.service';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss'],
  standalone: false
})
export class MessagesPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  
  contactId: string = '';
  contactName: string = '';
  currentUserEmail: string = '';
  messages: ChatMessage[] = [];
  messagesByDate: Map<string, ChatMessage[]> = new Map();
  newMessage: string = '';
  isLoading: boolean = false;
  refreshSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.contactId = this.route.snapshot.paramMap.get('id') || '';
    this.contactName = this.contactId; // Temporaire, à remplacer par le vrai nom
    this.currentUserEmail = localStorage.getItem('email') || '';
    
    this.loadMessages();
    
    // Rafraîchir les messages toutes les 10 secondes
    this.refreshSubscription = interval(10000).subscribe(() => {
      this.loadMessages(false);
    });
    
    // Marquer les messages comme lus
    this.chatService.markAsRead(this.contactId).subscribe();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadMessages(showLoading: boolean = true) {
    if (showLoading) {
      this.isLoading = true;
    }
    
    this.chatService.getMessages(this.contactId).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.groupMessagesByDate();
        this.isLoading = false;
        
        // Faire défiler vers le bas après le chargement des messages
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des messages:', error);
        this.isLoading = false;
        this.showToast('Impossible de charger les messages', 'danger');
      }
    });
  }

  groupMessagesByDate() {
    this.messagesByDate = new Map();
    
    this.messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      if (!this.messagesByDate.has(dateKey)) {
        this.messagesByDate.set(dateKey, []);
      }
      
      this.messagesByDate.get(dateKey)?.push(message);
    });
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;
    
    const messageContent = this.newMessage.trim();
    this.newMessage = ''; // Réinitialiser le champ de saisie immédiatement
    
    this.chatService.sendMessage(this.contactId, messageContent).subscribe({
      next: (message) => {
        // Ajouter le message à la liste et regrouper
        this.messages.push(message);
        this.groupMessagesByDate();
        
        // Faire défiler vers le bas
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      },
      error: (error) => {
        console.error('Erreur lors de l\'envoi du message:', error);
        this.showToast('Impossible d\'envoyer le message', 'danger');
      }
    });
  }

  scrollToBottom() {
    if (this.content) {
      this.content.scrollToBottom(300);
    }
  }

  formatDateLabel(dateKey: string): string {
    const [year, month, day] = dateKey.split('-').map(num => parseInt(num));
    const date = new Date(year, month, day);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.getDate() === today.getDate() && 
        date.getMonth() === today.getMonth() && 
        date.getFullYear() === today.getFullYear()) {
      return 'Aujourd\'hui';
    } else if (date.getDate() === yesterday.getDate() && 
               date.getMonth() === yesterday.getMonth() && 
               date.getFullYear() === yesterday.getFullYear()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    }
  }

  formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  async showOptions() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Options',
      buttons: [
        {
          text: 'Rafraîchir les messages',
          icon: 'refresh',
          handler: () => {
            this.loadMessages();
          }
        },
        {
          text: 'Effacer l\'historique',
          icon: 'trash',
          role: 'destructive',
          handler: () => {
            this.confirmDeleteHistory();
          }
        },
        {
          text: 'Annuler',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async confirmDeleteHistory() {
    // Cette fonctionnalité pourrait être implémentée plus tard
    this.showToast('Cette fonctionnalité n\'est pas encore disponible', 'warning');
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
}
