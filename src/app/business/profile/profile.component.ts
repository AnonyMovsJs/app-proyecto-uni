import { Component, OnInit } from '@angular/core';
import { UserService } from '../../shared/services/user.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export default class ProfileComponent implements OnInit {
  userProfile: any;
  userProjects: any[] = [];
  loading = true;
  error = '';
  activeTab = 'profile'; // Pestaña activa por defecto: 'profile', 'activity', 'edit'
  editProfileForm: FormGroup;
  editMode = false;
  saveSuccess = false;

  // Actividad simulada (puedes reemplazar con datos reales)
  recentActivity = [
    {
      type: 'purchase',
      date: new Date(2023, 4, 15),
      title: 'Compra realizada',
      description: 'Televisor Samsung 55"',
      amount: 2799.99,
      status: 'COMPLETADO'
    },
    {
      type: 'payment',
      date: new Date(2023, 4, 10),
      title: 'Pago de cuota',
      description: 'Cuota #2 de crédito',
      amount: 450,
      status: 'PROCESADO'
    },
    {
      type: 'credit',
      date: new Date(2023, 3, 28),
      title: 'Crédito aprobado',
      description: 'Crédito para compra de electrodomésticos',
      amount: 5000,
      status: 'APROBADO'
    }
  ];

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    // Inicializar formulario
    this.editProfileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      lastname: ['', [Validators.required, Validators.minLength(2)]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{9}$')]],
      email: [{value: '', disabled: true}, [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadProfile();
    this.loadSampleProjects(); // Método para cargar proyectos de ejemplo (sustituir por datos reales)
  }

  loadProfile() {
    this.loading = true;
    this.userService.userProfile().subscribe({
      next: (data) => {
        this.userProfile = data;
        this.loading = false;

        // Actualizar formulario con datos de perfil
        this.editProfileForm.patchValue({
          name: this.userProfile.name || '',
          lastname: this.userProfile.lastname || '',
          dni: this.userProfile.dni || '',
          phone: this.userProfile.phone || '',
          email: this.userProfile.email || ''
        });
      },
      error: (error) => {
        console.log(error.error);
        this.error = 'No se pudieron cargar los datos del perfil';
        this.loading = false;
      }
    });
  }

  // Método para cargar proyectos de ejemplo (sustituir por datos reales)
  loadSampleProjects() {
    // Simulación de proyectos (reemplazar con datos reales)
    this.userProjects = [
      {
        id: 1,
        title: 'Proyecto de Remodelación',
        description: 'Remodelación de cocina y baño principal',
        start: '15/03/2023',
        deadline: '30/06/2023',
        progress: 75,
        status: 'En progreso'
      },
      {
        id: 2,
        title: 'Renovación de Fachada',
        description: 'Pintura y arreglos externos',
        start: '10/04/2023',
        deadline: '25/05/2023',
        progress: 40,
        status: 'En progreso'
      }
    ];
  }

  // Cambiar pestaña activa
  setActiveTab(tab: string) {
    this.activeTab = tab;
    // Restablecer mensajes
    this.saveSuccess = false;
  }

  // Entrar en modo edición
  enableEditMode() {
    this.editMode = true;
    this.setActiveTab('edit');
  }

  // Cancelar edición
  cancelEdit() {
    this.editMode = false;
    this.setActiveTab('profile');

    // Restaurar valores originales
    this.editProfileForm.patchValue({
      name: this.userProfile.name || '',
      lastname: this.userProfile.lastname || '',
      dni: this.userProfile.dni || '',
      phone: this.userProfile.phone || '',
      email: this.userProfile.email || ''
    });
  }

  // Guardar cambios en el perfil
  saveProfile() {
    if (this.editProfileForm.valid) {
      // Aquí iría la llamada al servicio para actualizar el perfil
      // Por ejemplo: this.userService.updateProfile(this.editProfileForm.value)

      // Simular actualización exitosa
      setTimeout(() => {
        // Actualizar datos de perfil local
        this.userProfile = {
          ...this.userProfile,
          ...this.editProfileForm.value,
          email: this.userProfile.email // Mantener el email original ya que está deshabilitado
        };

        this.saveSuccess = true;
        this.editMode = false;

        // Volver a la vista de perfil después de un breve retraso
        setTimeout(() => {
          this.setActiveTab('profile');
        }, 1500);
      }, 800);
    }
  }

  // Obtener la fecha formateada para un elemento de actividad
  getFormattedDate(date: Date): string {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  // Obtener clase de ícono para actividad
  getActivityIcon(type: string): string {
    switch (type) {
      case 'purchase':
        return 'fas fa-shopping-bag';
      case 'payment':
        return 'fas fa-money-bill-wave';
      case 'credit':
        return 'fas fa-credit-card';
      default:
        return 'fas fa-star';
    }
  }

  // Obtener color de badge para actividad
  getActivityBadgeColor(type: string): string {
    switch (type) {
      case 'purchase':
        return '#4fc3f7';
      case 'payment':
        return '#2ecc71';
      case 'credit':
        return '#f39c12';
      default:
        return '#3498db';
    }
  }
}
