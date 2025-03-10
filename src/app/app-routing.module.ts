import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { LoginPage } from './pages/login/login.page';
import { RegisterPage } from './pages/register/register.page';
import { AppointmentBookingPage } from './pages/appointment-booking/appointment-booking.page';
import { AppointmentConfirmationPage } from './pages/appointment-confirmation/appointment-confirmation.page';

const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'appointment-booking', component: AppointmentBookingPage },
  {
    path: 'appointment-confirmation/:id',
    component: AppointmentConfirmationPage
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
