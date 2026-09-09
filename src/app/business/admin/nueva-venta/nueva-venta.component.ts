import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { VentaService } from '../../../shared/services/venta.service';
import { UserService } from '../../../shared/services/user.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nueva-venta',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './nueva-venta.component.html',
  styleUrls: ['./nueva-venta.component.css'],
})
export class NuevaVentaComponent implements OnInit {
  ventaForm!: FormGroup;
  clientes: any[] = [];
  tiposVenta = [
    { id: 'CONTADO', nombre: 'Contado' },
    { id: 'CREDITO', nombre: 'Crédito' },
    { id: 'FIADO', nombre: 'Fiado' },
  ];
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private ventaService: VentaService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.crearFormulario();
    this.cargarClientes();
  }

  crearFormulario(): void {
    this.ventaForm = this.fb.group({
      clienteId: ['', Validators.required],
      descripcion: ['', Validators.required],
      tipoVenta: ['CONTADO', Validators.required],
      detalles: this.fb.array([this.crearDetalleFormGroup()]),
      credito: this.fb.group({
        interes: [0],
        numeroCuotas: [1, [Validators.required, Validators.min(1)]],
      }),
      fiado: this.fb.group({
        plazoDias: [30, [Validators.required, Validators.min(1)]],
      }),
    });
  }

  crearDetalleFormGroup(): FormGroup {
    return this.fb.group({
      nombreProducto: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      precioUnitario: [0, [Validators.required, Validators.min(0.01)]],
    });
  }

  get detalles(): FormArray {
    return this.ventaForm.get('detalles') as FormArray;
  }

  get esCredito(): boolean {
    return this.ventaForm.get('tipoVenta')?.value === 'CREDITO';
  }

  get esFiado(): boolean {
    return this.ventaForm.get('tipoVenta')?.value === 'FIADO';
  }

  agregarDetalle(): void {
    this.detalles.push(this.crearDetalleFormGroup());
  }

  eliminarDetalle(index: number): void {
    if (this.detalles.length > 1) {
      this.detalles.removeAt(index);
    }
  }

  calcularSubtotal(detalle: AbstractControl): number {
    const cantidad = detalle.get('cantidad')?.value || 0;
    const precioUnitario = detalle.get('precioUnitario')?.value || 0;
    return cantidad * precioUnitario;
  }

  calcularTotal(): number {
    let total = 0;
    for (let i = 0; i < this.detalles.length; i++) {
      total += this.calcularSubtotal(this.detalles.at(i) as FormGroup);
    }
    return total;
  }

  /* cargarClientes(): void {
    this.userService.obtenerClientesPorRol('CLIENTE').subscribe(
      (data) => (this.clientes = data),
      (error) => console.error('Error al cargar clientes', error)
    );
  } */

  cargarClientes(): void {
    this.userService.findAll().subscribe({
        next: (data) => (this.clientes = data),
        error: (error) => console.error('Error al cargar clientes', error)
      }
    );
  }

  onSubmit(): void {
    if (this.ventaForm.invalid) {
      this.marcarControlesComoTocados(this.ventaForm);
      return;
    }

    this.loading = true;
    const venta = this.prepararDatosVenta();

    this.ventaService.crearVenta(venta).subscribe({
      next : (response) => {
        this.loading = false;
        this.router.navigate(['/admin/ventas']);
        Swal.fire('Registrado!','Venta registrado con éxito','success')
      },
      error : (error) => {
        this.loading = false;
        this.error = 'Error al registrar la venta';
        console.error('Error al registrar venta', error);
      }}
    );
  }

  prepararDatosVenta(): any {
    const formValue = this.ventaForm.value;
    const venta: any = {
      clienteId: formValue.clienteId,
      descripcion: formValue.descripcion,
      tipoVenta: formValue.tipoVenta,
      montoTotal: this.calcularTotal(),
      detalles: formValue.detalles,
    };

    if (formValue.tipoVenta === 'CREDITO') {
      venta['creditoDTO'] = formValue.credito;
    } else if (formValue.tipoVenta === 'FIADO') {
      venta['creditoDTO'] = {
        interes: 0,
        numeroCuotas: 1,
        plazoDias: formValue.fiado?.plazoDias || 30,
      };
    }

    return venta;
  }

  marcarControlesComoTocados(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.marcarControlesComoTocados(control);
      } else {
        control?.markAsTouched();
      }
    });
  }
}
