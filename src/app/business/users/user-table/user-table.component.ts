import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { User } from '../../../shared/model/user';
import { UserService } from '../../../shared/services/user.service';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { CreditoService } from '../../../shared/services/credito.service';
import { VentaService } from '../../../shared/services/venta.service';
import { PagoService } from '../../../shared/services/pago.service';
import { Credito } from '../../../shared/model/credito';
import { Cuota } from '../../../shared/model/cuota';

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './user-table.component.html',
  styleUrls: ['./user-table.component.css'],
})
export class UserTableComponent implements OnInit {
  @ViewChild('userCanvas') userCanvas!: ElementRef;

  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  loading: boolean = true;

  // Variables para el offcanvas de detalles
  selectedUser: User | null = null;
  showOffcanvas: boolean = false;

  // Variables para almacenar información del usuario
  userCredits: any[] = [];
  userSales: any[] = [];
  userPayments: any[] = [];
  userCuotas: any[] = [];
  loadingUserDetails: boolean = false;

  // Estadísticas
  totalDebt: number = 0;
  totalPaid: number = 0;
  pendingPayments: number = 0;

  constructor(
    private userService: UserService,
    private creditoService: CreditoService,
    private ventaService: VentaService,
    private pagoService: PagoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.findAll().subscribe({
      next: (data) => {
        this.users = data;
        this.filteredUsers = [...this.users];
        this.loading = false;
      },
      error: (error) => {
        console.log(error.error);
        this.loading = false;
      },
    });
  }

  filterUsers() {
    if (!this.searchTerm) {
      this.filteredUsers = [...this.users];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(
      (user) =>
        user.name?.toLowerCase().includes(term) ||
        user.lastname?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.dni?.toLowerCase().includes(term)
    );
  }

  deleteUser(id: number, event: Event) {
    event.stopPropagation(); // Evitar que se abra el offcanvas

    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡Cambiarás el estado de este usuario!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      background: '#2c3e50',
      color: 'white',
      iconColor: '#f39c12',
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.deleteUser(id).subscribe({
          next: () => {
            this.loadUsers();
            const user = this.users.find((u) => u.id === id);
            const newStatus = user?.estado ? 'desactivado' : 'activado';

            Swal.fire({
              title: '¡Completado!',
              text: `Usuario ${newStatus} correctamente.`,
              icon: 'success',
              background: '#2c3e50',
              color: 'white',
              iconColor: '#2ecc71',
            });
          },
          error: (err) => {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo cambiar el estado del usuario.',
              icon: 'error',
              background: '#2c3e50',
              color: 'white',
              iconColor: '#e74c3c',
            });
          },
        });
      }
    });
  }

  showUserDetails(user: User) {
    this.selectedUser = user;
    this.showOffcanvas = true;
    this.loadUserDetails(user.id);

    // Si estamos en móvil, hacer scroll al offcanvas
    if (window.innerWidth < 768) {
      setTimeout(() => {
        if (this.userCanvas) {
          this.userCanvas.nativeElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }

  closeOffcanvas() {
    this.showOffcanvas = false;
    this.selectedUser = null;
    this.userCredits = [];
    this.userSales = [];
    this.userPayments = [];
    this.userCuotas = [];
  }

  loadUserDetails(userId: number) {
    this.loadingUserDetails = true;
    this.totalDebt = 0;
    this.totalPaid = 0;
    this.pendingPayments = 0;
    this.userCuotas = [];

    // Obtener créditos del usuario
    this.creditoService.obtenerCreditosPorCliente(userId).subscribe({
      next: (creditos) => {
        this.userCredits = creditos;
        console.log('Créditos obtenidos:', creditos);

        if (creditos && creditos.length > 0) {
          // Para cada crédito, obtener sus cuotas
          let creditosProcessed = 0;
          creditos.forEach((credito) => {
            // Acceder a las cuotas de cada crédito
            this.creditoService.obtenerCuotasPorCredito(credito.id).subscribe({
              next: (cuotas) => {
                console.log(`Cuotas del crédito ${credito.id}:`, cuotas);
                this.userCuotas = [...this.userCuotas, ...cuotas];

                // Contar cuotas pendientes y vencidas para este crédito
                const cuotasPendientes = cuotas.filter(
                  (c) => c.estado === 'PENDIENTE'
                ).length;
                const cuotasVencidas = cuotas.filter(
                  (c) => c.estado === 'VENCIDO'
                ).length;

                this.pendingPayments += cuotasPendientes + cuotasVencidas;

                // Calcular deuda para este crédito
                cuotas.forEach((cuota) => {
                  if (
                    cuota.estado === 'PENDIENTE' ||
                    cuota.estado === 'VENCIDO'
                  ) {
                    try {
                      const monto =
                        typeof cuota.monto === 'string'
                          ? parseFloat(cuota.monto)
                          : cuota.monto;

                      if (!isNaN(monto)) {
                        this.totalDebt += monto;
                      }
                    } catch (e) {
                      console.error(
                        'Error al parsear monto de cuota',
                        cuota.monto
                      );
                    }
                  }
                });

                creditosProcessed++;

                // Verificar si hemos procesado todos los créditos
                if (creditosProcessed === creditos.length) {
                  this.procesarVentasYPagos(userId);
                }
              },
              error: (err) => {
                console.error(
                  `Error al obtener cuotas del crédito ${credito.id}:`,
                  err
                );
                creditosProcessed++;

                // Verificar si hemos procesado todos los créditos
                if (creditosProcessed === creditos.length) {
                  this.procesarVentasYPagos(userId);
                }
              },
            });
          });
        } else {
          // No hay créditos, proseguir con ventas y pagos
          this.procesarVentasYPagos(userId);
        }
      },
      error: (err) => {
        console.error('Error al cargar créditos:', err);
        this.procesarVentasYPagos(userId);
      },
    });
  }

  // Método separado para procesar ventas y pagos
  procesarVentasYPagos(userId: number) {
    // Obtener ventas
    this.ventaService.obtenerVentasPorCliente(userId).subscribe({
      next: (ventas) => {
        this.userSales = ventas;
        console.log('Ventas obtenidas:', ventas);

        // Obtener pagos
        this.pagoService.obtenerPagosPorCliente(userId).subscribe({
          next: (pagos) => {
            this.userPayments = pagos;
            console.log('Pagos obtenidos:', pagos);

            // Calcular total pagado
            this.userPayments.forEach((pago) => {
              try {
                const monto =
                  typeof pago.monto === 'string'
                    ? parseFloat(pago.monto)
                    : pago.monto;

                if (!isNaN(monto)) {
                  this.totalPaid += monto;
                }
              } catch (e) {
                console.error('Error al parsear monto de pago', pago.monto);
              }
            });

            // Finalizar carga
            this.loadingUserDetails = false;
          },
          error: (err) => {
            console.error('Error al cargar pagos:', err);
            this.loadingUserDetails = false;
          },
        });
      },
      error: (err) => {
        console.error('Error al cargar ventas:', err);
        this.loadingUserDetails = false;
      },
    });
  }

  getStatusClass(status: boolean): string {
    return status ? 'bg-success' : 'bg-danger';
  }

  getStatusText(status: boolean): string {
    return status ? 'Activo' : 'Inactivo';
  }

  getCreditStatusClass(status: string): string {
    switch (status) {
      case 'PAGADO':
        return 'badge-success';
      case 'PENDIENTE':
        return 'badge-warning';
      case 'VENCIDO':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  formatCurrency(value: any): string {
    if (!value) return 'S/. 0.00';

    try {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return 'S/. ' + num.toFixed(2);
    } catch (e) {
      console.error('Error al formatear moneda', value);
      return 'S/. 0.00';
    }
  }

  formatDate(date: string): string {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('es-PE');
    } catch (e) {
      console.error('Error al formatear fecha', date);
      return '';
    }
  }
}
