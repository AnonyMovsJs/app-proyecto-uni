import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PagoService } from '../../../../shared/services/pago.service';
import { CommonModule } from '@angular/common';
import { CuotaService } from '../../../../shared/services/cuota.service';
import { Cuota } from '../../../../shared/model/cuota';
import { Venta } from '../../../../shared/model/venta';
import { Credito } from '../../../../shared/model/credito';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-pagar-cuota',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './pagar-cuota.component.html',
  styleUrls: ['./pagar-cuota.component.css'],
})
export class PagarCuotaComponent implements OnInit {
  cuotaId!: number;
  cuota: Cuota;
  credito: Credito;
  venta: Venta;
  pagoForm!: FormGroup;
  loading = true;
  submitting = false;
  error = '';
  success = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private pagoService: PagoService,
    private cuotaService : CuotaService
  ) {
    this.venta = new Venta();
    this.cuota = new Cuota();
    this.credito = new Credito();
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.cuotaId = +params['id'];
      this.cargarCuota();
    });

    this.pagoForm = this.fb.group({
      monto: ['', [Validators.required, Validators.min(0.01)]],
    });
  }

  cargarCuota(): void {
    // Aquí se debería tener un endpoint para obtener la cuota específica con su crédito y venta
    // Por ahora, haremos una simulación

    // En un sistema real, tendrías algo como:

    this.cuotaService.obtenerCuotaPorId(this.cuotaId).subscribe({
      next : cuota => {
        this.cuota = cuota;
        this.pagoForm.patchValue({
          monto: cuota.monto
        });
        this.loading = false;
      },
      error : error => {
        this.error = 'Error al cargar la cuota';
        this.loading = false;
      }
    });


    // Simulación para el ejemplo
    /* setTimeout(() => {
      this.cuota = {
        id: this.cuotaId,
        numeroCuota: 2,
        monto: 150.0,
        fechaVencimiento: new Date('2025-06-15'),
        estado: 'PENDIENTE',
        credito: {
          id: 1,
          montoTotal: 450.0,
          interes: 5,
          numeroCuotas: 3,
          venta: {
            id: 1,
            descripcion: 'Compra a crédito de electrodomésticos',
            montoTotal: 428.57,
          },
        },
      };

      this.credito = this.cuota.credito;
      this.venta = this.credito.venta;

      this.pagoForm.patchValue({
        monto: this.cuota.monto,
      });

      this.loading = false;
    }, 1000); */
  }

  onSubmit(): void {
    if (this.pagoForm.invalid) {
      return;
    }

    this.submitting = true;
    const pago = {
      cuotaId: this.cuotaId,
      monto: this.pagoForm.value.monto,
    };

    this.pagoService.registrarPago(pago).subscribe({
      next : (response) => {
        this.submitting = false;
        /* this.success = 'Pago realizado con éxito'; */
        Swal.fire('Pagado', 'Cuota pagada exitosamente', 'success');
        this.router.navigate(['/cliente/dashboard']);

        // Redireccionar después de 2 segundos
        /* setTimeout(() => {
          this.router.navigate(['/cliente/mis-cuotas']);
        }, 2000); */
      },
      error : (error) => {
        this.submitting = false;
        this.error = 'Error al realizar el pago';
        console.error('Error al registrar pago', error);
      }
    });
  }
}
