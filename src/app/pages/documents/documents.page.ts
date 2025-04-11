import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-documents',
  templateUrl: './documents.page.html',
  styleUrls: ['./documents.page.scss'],
  standalone: false, // Déclaré dans un module
})
export class DocumentsPage implements OnInit {
  isLoggedIn: boolean = false;
  role: string | null = null;
  userEmail: string = '';
  patientId: string | null = null;
  documents: any[] = [];
  selectedFile: File | null = null;
  nomDocument: string = '';
  medecinEmail: string = '';

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      this.userEmail = localStorage.getItem('email') || '';
      this.patientId = this.route.snapshot.queryParamMap.get('patientId');
      if (this.isLoggedIn) {
        this.loadDocuments();
      }
    });
  }

  loadDocuments() {
    if (this.role === 'patient') {
      this.authService.getUser(this.userEmail).subscribe({
        next: (response: any) => (this.documents = response.documents || []),
        error: (err: any) => console.error('Erreur chargement documents :', err),
      });
    } else if (this.role === 'medecin' && this.patientId) {
      this.authService.getUser(this.patientId).subscribe({
        next: (response: any) => (this.documents = response.documents || []),
        error: (err: any) => console.error('Erreur chargement documents patient :', err),
      });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
    }
  }

  uploadDocument() {
    if (!this.selectedFile || !this.nomDocument || !this.medecinEmail) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      this.authService.uploadDocument(this.nomDocument, url, this.medecinEmail).subscribe({
        next: () => {
          alert('Document envoyé avec succès');
          this.loadDocuments();
          this.nomDocument = '';
          this.medecinEmail = '';
          this.selectedFile = null;
        },
        error: (err: any) => alert('Erreur : ' + (err.error?.msg || 'Échec')),
      });
    };
    reader.readAsDataURL(this.selectedFile);
  }

  annotateDocument(doc: any) {
    const annotation = prompt('Entrez une annotation pour ce document :', doc.annotations || '');
    if (annotation !== null) {
      doc.annotations = annotation;
      doc.statut = 'consulté';
      this.authService.getUser(this.patientId!).subscribe({
        next: (user: any) => {
          const updatedDocs = user.documents.map((d: any) =>
            d.nom === doc.nom ? { ...d, annotations: annotation, statut: 'consulté' } : d
          );
          this.authService.updateUserAccount({ ...user, documents: updatedDocs }).subscribe({
            next: () => this.loadDocuments(),
            error: (err: any) => console.error('Erreur mise à jour annotation :', err),
          });
        },
      });
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}