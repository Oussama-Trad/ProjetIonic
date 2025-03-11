import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AccueilPage } from './pages/accueil/accueil.page'; // Standalone component
import { HomePage } from './pages/home/home.page'; // Standalone component
import { LoginPage } from './pages/login/login.page'; // Standalone component
import { RegisterPage } from './pages/register/register.page'; // Standalone component
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';

@NgModule({
  declarations: [
    AppComponent,
     AccueilPage,
     HomePage,
     LoginPage,
     RegisterPage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [AuthService],
  bootstrap: [AppComponent]
})
export class AppModule {}
