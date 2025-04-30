import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const isLoggedIn = !!localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    const requiredRole = route.data['role'] as string;
    
    if (!isLoggedIn) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (requiredRole && userRole !== requiredRole) {
      // Redirect to appropriate home page based on user role
      if (userRole === 'patient') {
        this.router.navigate(['/tabs/home']);
      } else if (userRole === 'medecin') {
        this.router.navigate(['/tabs-medecin/accueil-medecin']);
      } else {
        this.router.navigate(['/login']);
      }
      return false;
    }
    
    return true;
  }
}
