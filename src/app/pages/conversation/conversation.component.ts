import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.scss'],
  standalone:false
})
export class ConversationComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  
  otherUserEmail: string = '';
  currentUserEmail: string = '';
  otherUser: any = null;
  currentUser: any = null;
  messages: ChatMessage[] = [];
  newMessage: string = '';
  isLoading: boolean = false;
  refreshSubscription: Subscription = new Subscription();
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private chatService: ChatService,
    private loadingController: LoadingController
  ) {}
  
  ngOnInit() {
    this.currentUserEmail = localStorage.getItem('email') || '';
    
    this.route.queryParams.subscribe(params => {
      if (params['otherUser']) {
        this.otherUserEmail = params['otherUser'];
        this.loadOtherUserDetails();
        this.loadCurrentUserDetails();
        this.loadMessages();
        
        // Rafraîchir les messages toutes les 10 secondes
        this.refreshSubscription = interval(10000).subscribe(() => {
          this.loadMessages(false);
        });
      } else {
        this.router.navigate(['/tabs/accueil']);
      }
    });
  }
  
  ngAfterViewChecked() {
    this.scrollToBottom();
  }
  
  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }
  
  private scrollToBottom() {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = 
          this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Erreur de défilement:', err);
    }
  }
  
  async loadOtherUserDetails() {
    const userRole = localStorage.getItem('role') || '';
    
    if (userRole === 'patient') {
      // Le current user est patient, l'autre est médecin
      this.authService.getMedecin(this.otherUserEmail).subscribe({
        next: (medecin) => {
          this.otherUser = medecin;
        },
        error: (err) => {
          console.error('Erreur chargement médecin:', err);
        }
      });
    } else {
      // Le current user est médecin, l'autre est patient
      this.authService.getUser(this.otherUserEmail).subscribe({
        next: (user) => {
          this.otherUser = user;
        },
        error: (err) => {
          console.error('Erreur chargement patient:', err);
        }
      });
    }
  }

  async loadCurrentUserDetails() {
    const userRole = localStorage.getItem('role') || '';
    
    if (userRole === 'patient') {
      // Le current user est patient
      this.authService.getUser(this.currentUserEmail).subscribe({
        next: (user) => {
          this.currentUser = user;
        },
        error: (err) => {
          console.error('Erreur chargement utilisateur courant:', err);
        }
      });
    } else {
      // Le current user est médecin
      this.authService.getMedecin(this.currentUserEmail).subscribe({
        next: (medecin) => {
          this.currentUser = medecin;
        },
        error: (err) => {
          console.error('Erreur chargement médecin courant:', err);
        }
      });
    }
  }
  
  async loadMessages(showLoading: boolean = true) {
    if (showLoading) {
      this.isLoading = true;
      const loading = await this.loadingController.create({
        message: 'Chargement des messages...',
        spinner: 'crescent'
      });
      await loading.present();
      
      this.chatService.getMessages(this.otherUserEmail).subscribe({
        next: (messages) => {
          this.messages = messages;
          loading.dismiss();
          this.isLoading = false;
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (err) => {
          console.error('Erreur chargement messages:', err);
          loading.dismiss();
          this.isLoading = false;
        }
      });
    } else {
      // Actualisation silencieuse
      this.chatService.getMessages(this.otherUserEmail).subscribe({
        next: (messages) => {
          if (messages.length !== this.messages.length) {
            this.messages = messages;
            setTimeout(() => this.scrollToBottom(), 100);
          }
        },
        error: (err) => {
          console.error('Erreur actualisation messages:', err);
        }
      });
    }
  }
  
  sendMessage() {
    if (!this.newMessage.trim()) return;
    
    this.chatService.sendMessage(this.otherUserEmail, this.newMessage.trim()).subscribe({
      next: (message) => {
        this.messages.push(message);
        this.newMessage = '';
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        console.error('Erreur envoi message:', err);
      }
    });
  }
  
  getOtherUserName(): string {
    if (!this.otherUser) return 'Chargement...';
    
    if (this.otherUser.prenom && this.otherUser.nom) {
      return `Dr. ${this.otherUser.prenom} ${this.otherUser.nom}`;
    } else if (this.otherUser.firstName && this.otherUser.lastName) {
      return `${this.otherUser.firstName} ${this.otherUser.lastName}`;
    } else {
      return this.otherUserEmail;
    }
  }
  
  getOtherUserPhoto(): string {
    if (!this.otherUser) return 'assets/default-avatar.png';
    
    return this.otherUser.photoProfil || 
           this.otherUser.profilePicture || 
           'assets/default-avatar.png';
  }

  getCurrentUserPhoto(): string {
    if (!this.currentUser) return 'assets/default-avatar.png';

    return this.currentUser.photoProfil ||
           this.currentUser.profilePicture ||
           'assets/default-avatar.png';
  }
  
  formatTime(timestamp: string): string {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  
  formatDate(timestamp: string): string {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }
  
  isOwnMessage(message: ChatMessage): boolean {
    return message.sender === this.currentUserEmail;
  }
}
