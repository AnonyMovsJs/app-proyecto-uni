import { Component, OnInit } from '@angular/core';
import { UserService } from '../../shared/services/user.service';
import { VentaService } from '../../shared/services/venta.service';
import { CreditoService } from '../../shared/services/credito.service';
import { PagoService } from '../../shared/services/pago.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export default class ProfileComponent implements OnInit {
  userProfile: any;
  ventas: any[] = [];
  creditos: any[] = [];
  cuotas: any[] = [];
  pagos: any[] = [];
  recentActivity: any[] = [];

  loading = true;
  error = '';
  activeTab = 'profile'; // Pestaña activa por defecto: 'profile', 'activity', 'edit'
  editProfileForm: FormGroup;
  editMode = false;
  saveSuccess = false;

  // Estadísticas calculadas
  totalCompras = 0;
  totalGastado = 0;
  totalDeuda = 0;
  totalPagado = 0;
  cuotasPendientes = 0;
  cuotasVencidas = 0;
  cuotasPagadas = 0;

  constructor(
    private userService: UserService,
    private ventaService: VentaService,
    private creditoService: CreditoService,
    private pagoService: PagoService,
    private fb: FormBuilder
  ) {
    // Inicializar formulario
    this.editProfileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      lastname: ['', [Validators.required, Validators.minLength(2)]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{9}$')]],
      address: ['', [Validators.required]],
      email: [
        { value: '', disabled: true },
        [Validators.required, Validators.email],
      ],
    });
  }

  ngOnInit(): void {
    this.loadProfileData();
  }

  loadProfileData() {
    this.loading = true;
    this.error = '';

    // Limpiar datos previos
    this.ventas = [];
    this.creditos = [];
    this.cuotas = [];
    this.pagos = [];
    this.recentActivity = [];

    this.userService.userProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;

        // Actualizar formulario con datos de perfil
        this.editProfileForm.patchValue({
          name: this.userProfile.name || '',
          lastname: this.userProfile.lastname || '',
          dni: this.userProfile.dni || '',
          phone: this.userProfile.phone || '',
          address: this.userProfile.address || '',
          email: this.userProfile.email || '',
        });

        // Cargar datos relacionados
        this.loadUserTransactions(profile.id);
      },
      error: (error) => {
        console.error('Error al cargar perfil:', error);
        this.error = 'No se pudieron cargar los datos del perfil';
        this.loading = false;
      },
    });
  }

  loadUserTransactions(userId: number) {
    let operacionesCompletadas = 0;
    const totalOperaciones = 3; // ventas, creditos, pagos

    const finalizarCarga = () => {
      operacionesCompletadas++;
      if (operacionesCompletadas === totalOperaciones) {
        this.calcularEstadisticas();
        this.prepararActividadReciente();
        this.loading = false;
      }
    };

    // Cargar ventas
    this.ventaService.obtenerVentasPorCliente(userId).subscribe({
      next: (ventas) => {
        this.ventas = ventas.sort(
          (a, b) =>
            new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime()
        );
        finalizarCarga();
      },
      error: (error) => {
        console.error('Error al cargar ventas:', error);
        finalizarCarga();
      },
    });

    // Cargar créditos y cuotas
    this.creditoService.obtenerCreditosPorCliente(userId).subscribe({
      next: (creditos) => {
        this.creditos = creditos;

        if (creditos.length > 0) {
          let creditosProcesados = 0;

          creditos.forEach((credito) => {
            this.creditoService.obtenerCuotasPorCredito(credito.id).subscribe({
              next: (cuotas) => {
                cuotas.forEach((cuota) => {
                  cuota.credito_id = credito.id;
                  this.cuotas.push(cuota);
                });

                creditosProcesados++;
                if (creditosProcesados === creditos.length) {
                  finalizarCarga();
                }
              },
              error: (error) => {
                console.error('Error al cargar cuotas:', error);
                creditosProcesados++;
                if (creditosProcesados === creditos.length) {
                  finalizarCarga();
                }
              },
            });
          });
        } else {
          finalizarCarga();
        }
      },
      error: (error) => {
        console.error('Error al cargar créditos:', error);
        finalizarCarga();
      },
    });

    // Cargar pagos
    this.pagoService.obtenerPagosPorCliente(userId).subscribe({
      next: (pagos) => {
        this.pagos = pagos.sort(
          (a, b) =>
            new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime()
        );
        finalizarCarga();
      },
      error: (error) => {
        console.error('Error al cargar pagos:', error);
        finalizarCarga();
      },
    });
  }

  calcularEstadisticas() {
    // Estadísticas de ventas
    this.totalCompras = this.ventas.length;
    this.totalGastado = this.ventas.reduce(
      (total, venta) => total + parseFloat(venta.montoTotal.toString()),
      0
    );

    // Estadísticas de cuotas
    this.cuotasPendientes = this.cuotas.filter(
      (c) => c.estado === 'PENDIENTE'
    ).length;
    this.cuotasVencidas = this.cuotas.filter(
      (c) => c.estado === 'VENCIDO'
    ).length;
    this.cuotasPagadas = this.cuotas.filter(
      (c) => c.estado === 'PAGADO'
    ).length;

    // Calcular deuda total
    this.totalDeuda = this.cuotas
      .filter((c) => c.estado === 'PENDIENTE' || c.estado === 'VENCIDO')
      .reduce((total, cuota) => total + parseFloat(cuota.monto.toString()), 0);

    // Calcular total pagado
    this.totalPagado = this.pagos.reduce(
      (total, pago) => total + parseFloat(pago.monto.toString()),
      0
    );
  }

  prepararActividadReciente() {
    let actividades: any[] = [];

    // Agregar ventas como actividades
    this.ventas.slice(0, 5).forEach((venta) => {
      actividades.push({
        type: 'purchase',
        date: new Date(venta.fechaVenta),
        title: 'Compra realizada',
        description: venta.descripcion,
        amount: parseFloat(venta.montoTotal.toString()),
        status: venta.estado || 'COMPLETADO',
        id: venta.id,
      });
    });

    // Agregar pagos como actividades
    this.pagos.slice(0, 3).forEach((pago) => {
      actividades.push({
        type: 'payment',
        date: new Date(pago.fechaPago),
        title: 'Pago de cuota',
        description: `Pago de cuota #${pago.cuota?.numeroCuota || 'N/A'}`,
        amount: parseFloat(pago.monto.toString()),
        status: 'PROCESADO',
        id: pago.id,
      });
    });

    // Agregar créditos aprobados como actividades
    this.creditos.slice(0, 2).forEach((credito) => {
      actividades.push({
        type: 'credit',
        date: new Date(credito.fechaInicio),
        title: 'Crédito aprobado',
        description: `Crédito para ${credito.numeroCuotas} cuotas`,
        amount: parseFloat(credito.montoTotal.toString()),
        status: credito.estado || 'APROBADO',
        id: credito.id,
      });
    });

    // Ordenar por fecha (más reciente primero) y tomar los primeros 6
    this.recentActivity = actividades
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 6);
  }

  // Cambiar pestaña activa
  setActiveTab(tab: string) {
    this.activeTab = tab;
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
      address: this.userProfile.address || '',
      email: this.userProfile.email || '',
    });
  }

  // Guardar cambios en el perfil
  saveProfile() {
    if (this.editProfileForm.valid) {
      this.loading = true;

      const updatedUser = {
        ...this.userProfile,
        ...this.editProfileForm.value,
        email: this.userProfile.email, // Mantener email original
      };

      this.userService.updateUser(updatedUser).subscribe({
        next: (response) => {
          this.userProfile = response;
          this.saveSuccess = true;
          this.editMode = false;
          this.loading = false;

          Swal.fire({
            title: '¡Actualizado!',
            text: 'Tu perfil ha sido actualizado correctamente',
            icon: 'success',
            background: '#2c3e50',
            color: 'white',
            iconColor: '#2ecc71',
          });

          setTimeout(() => {
            this.setActiveTab('profile');
          }, 1500);
        },
        error: (error) => {
          this.loading = false;
          console.error('Error al actualizar perfil:', error);

          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar tu perfil. Intenta nuevamente.',
            icon: 'error',
            background: '#2c3e50',
            color: 'white',
            iconColor: '#e74c3c',
          });
        },
      });
    }
  }

  // Obtener la fecha formateada para un elemento de actividad
  getFormattedDate(date: Date): string {
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
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

  // Formatear moneda
  formatCurrency(value: number): string {
    return `S/. ${value.toFixed(2)}`;
  }

  // Formatear fecha
  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('es-ES');
    } catch (error) {
      return 'N/A';
    }
  }

  // Obtener clase de estado
  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETADO':
      case 'PROCESADO':
      case 'PAGADO':
        return 'badge-success';
      case 'PENDIENTE':
        return 'badge-warning';
      case 'VENCIDO':
        return 'badge-danger';
      case 'APROBADO':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  // Refrescar datos
  refreshData() {
    this.loadProfileData();
  }
}
