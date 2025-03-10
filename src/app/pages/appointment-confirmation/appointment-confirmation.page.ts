import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-appointment-confirmation',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './appointment-confirmation.page.html',
  styleUrls: ['./appointment-confirmation.page.scss']
})
export class AppointmentConfirmationPage {
  appointmentId: string = '';
  appointmentDetails: any = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private appointmentService: AppointmentService
  ) {}

  ngOnInit() {
    this.appointmentId = this.route.snapshot.paramMap.get('id') || '';
    this.loadAppointmentDetails();
  }

  async loadAppointmentDetails() {
    try {
      this.appointmentDetails = await this.appointmentService
        .getPatientAppointments('current-user-id') // TODO: Replace with actual user ID
        .toPromise()
        .then(appointments => 
          appointments?.find(a => a.id === this.appointmentId)
        );
    } catch (error) {
      console.error('Error loading appointment:', error);
    } finally {
      this.loading = false;
    }
  }
}
