import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MedecinGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const isLoggedIn = !!localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!isLoggedIn) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (role !== 'medecin') {
      // Si l'utilisateur est un patient, le rediriger vers la page d'accueil patient
      this.router.navigate(['/tabs/accueil']);
      return false;
    }
    
    return true;
  }
}
