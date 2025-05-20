import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PagoService } from '../../../../shared/services/pago.service';
import { CommonModule } from '@angular/common';
import { CuotaService } from '../../../../shared/services/cuota.service';
import { CreditoService } from '../../../../shared/services/credito.service';
import { VentaService } from '../../../../shared/services/venta.service';
import { Cuota } from '../../../../shared/model/cuota';
import { Venta } from '../../../../shared/model/venta';
import { Credito } from '../../../../shared/model/credito';
import { Estado } from '../../../../shared/model/estado';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pagar-cuota',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './pagar-cuota.component.html',
  styleUrls: ['./pagar-cuota.component.css'],
})
export class PagarCuotaComponent implements OnInit {
  cuotaId!: number;
  cuota: Cuota = new Cuota();
  credito: Credito = new Credito();
  venta: Venta = new Venta();
  pagoForm!: FormGroup;
  loading = true;
  submitting = false;
  error = '';
  success = '';

  // Métodos de pago disponibles (simulación)
  metodosPago = [
    { id: 'yape', nombre: 'Yape', icon: 'fa-qrcode' },
    { id: 'plin', nombre: 'Plin', icon: 'fa-mobile-alt' },
    {
      id: 'tarjeta',
      nombre: 'Tarjeta de Crédito/Débito',
      icon: 'fa-credit-card',
    },
    {
      id: 'transferencia',
      nombre: 'Transferencia Bancaria',
      icon: 'fa-university',
    },
  ];

  // Variable para almacenar la fecha actual
  fechaActual = new Date();

  // Para mostrar información adicional
  diasVencimiento: number = 0;
  hayMora: boolean = false;
  montoMora: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private pagoService: PagoService,
    private cuotaService: CuotaService,
    private creditoService: CreditoService,
    private ventaService: VentaService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.cuotaId = +params['id'];
      this.cargarCuota();
    });

    this.pagoForm = this.fb.group({
      monto: ['', [Validators.required, Validators.min(0.01)]],
      metodoPago: ['yape', [Validators.required]],
      aceptaTerminos: [false, [Validators.requiredTrue]],
    });
  }

  cargarCuota(): void {
    this.cuotaService.obtenerCuotaPorId(this.cuotaId).subscribe({
      next: (cuota: Cuota) => {
        this.cuota = cuota;

        // Calcular días de vencimiento y mora si aplica
        this.calcularEstadoCuota();

        // Cargar la información relacionada
        this.cargarInfoRelacionada();

        // Establecer valor del formulario
        this.pagoForm.patchValue({
          monto: this.cuota.monto + this.montoMora,
        });
      },
      error: (error: Error) => {
        this.error =
          'No se pudo cargar la información de la cuota. Por favor, intente nuevamente más tarde.';
        this.loading = false;
        console.error('Error al cargar cuota', error);
      },
    });
  }

  calcularEstadoCuota(): void {
    const fechaVencimiento = new Date(this.cuota.fechaVencimiento);

    // Si la cuota está vencida, calcular días de vencimiento y mora
    if (
      this.cuota.estado === Estado.VENCIDO ||
      (fechaVencimiento < this.fechaActual &&
        this.cuota.estado === Estado.PENDIENTE)
    ) {
      // Calcular días de diferencia
      const diffTime = Math.abs(
        this.fechaActual.getTime() - fechaVencimiento.getTime()
      );
      this.diasVencimiento = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Calcular mora (simulación: 0.05% diario sobre el monto de la cuota)
      this.hayMora = true;
      this.montoMora = Number(this.cuota.monto) * 0.0005 * this.diasVencimiento;

      // Redondear a 2 decimales
      this.montoMora = Math.round(this.montoMora * 100) / 100;
    }
  }

  cargarInfoRelacionada(): void {
    // Cargar información del crédito
    if (this.cuota.credito_id) {
      // Usamos obtenerCreditoPorVenta porque no existe obtenerCreditoPorId
      // Primero necesitamos encontrar la venta relacionada con el crédito
      this.creditoService
        .obtenerCuotasPorCredito(this.cuota.credito_id)
        .subscribe({
          next: (cuotas: Cuota[]) => {
            // Al menos tenemos cuotas, intentamos cargar el crédito desde otra vía
            this.creditoService
              .obtenerCreditosPorCliente(0) // Usamos 0 como un valor temporal, luego filtraremos
              .subscribe({
                next: (creditos: Credito[]) => {
                  // Buscamos el crédito correspondiente a nuestra cuota
                  const creditoEncontrado = creditos.find(
                    (c) => c.id === this.cuota.credito_id
                  );
                  if (creditoEncontrado) {
                    this.credito = creditoEncontrado;

                    // Ahora que tenemos el crédito, cargamos la venta
                    if (this.credito.venta) {
                      this.ventaService
                        .obtenerVenta(this.credito.venta)
                        .subscribe({
                          next: (venta: Venta) => {
                            this.venta = venta;
                            this.loading = false;
                          },
                          error: (error: Error) => {
                            console.error('Error al cargar venta', error);
                            this.loading = false;
                          },
                        });
                    } else {
                      this.loading = false;
                    }
                  } else {
                    this.loading = false;
                  }
                },
                error: (error: Error) => {
                  console.error('Error al cargar credito', error);
                  this.loading = false;
                },
              });
          },
          error: (error: Error) => {
            console.error('Error al cargar cuotas', error);
            this.loading = false;
          },
        });
    } else {
      this.loading = false;
    }
  }

  onSubmit(): void {
    if (this.pagoForm.invalid) {
      return;
    }

    this.submitting = true;

    // IMPORTANTE: Corregido el formato del objeto pago para coincidir con lo que espera el backend
    const pago = {
      cuotaId: this.cuotaId, // Cambiado de cuota_id a cuotaId
      monto: this.pagoForm.value.monto,
      // Eliminado el campo metodoPago que no está en tu servicio original
    };

    // Simulación de demora en el pago para mejor experiencia de usuario
    setTimeout(() => {
      this.pagoService.registrarPago(pago).subscribe({
        next: (response) => {
          this.submitting = false;
          Swal.fire({
            title: '¡Pago Exitoso!',
            text: 'Tu cuota ha sido pagada correctamente.',
            icon: 'success',
            confirmButtonColor: '#3498db',
            confirmButtonText: 'Volver al Dashboard',
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/cliente/dashboard']);
            }
          });
        },
        error: (error: Error) => {
          this.submitting = false;
          this.error =
            'Error al procesar el pago. Por favor, intente nuevamente.';
          console.error('Error al registrar pago', error);

          Swal.fire({
            title: 'Error',
            text: 'No se pudo procesar el pago. Por favor, intenta nuevamente.',
            icon: 'error',
            confirmButtonColor: '#e74c3c',
          });
        },
      });
    }, 1500);
  }

  // Método para obtener clase de ícono según método de pago
  getMetodoPagoIcon(metodoId: string): string {
    const metodo = this.metodosPago.find((m) => m.id === metodoId);
    return metodo ? metodo.icon : 'fa-money-bill';
  }

  // Método para calcular fecha de pago formateada
  getFechaPagoFormateada(): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return this.fechaActual.toLocaleDateString('es-ES', options);
  }

  // Método para obtener clase de color según estado
  getEstadoClass(): string {
    if (this.cuota.estado === Estado.VENCIDO || this.hayMora) {
      return 'text-danger';
    } else if (this.cuota.estado === Estado.PENDIENTE) {
      return 'text-warning';
    }
    return '';
  }

  get montoTotal(): number {
    return Number(this.cuota.monto) + this.montoMora;
  }

  get montoTotalCuota(): number {
    return Number(this.cuota.monto) + this.montoMora;
  }
}
