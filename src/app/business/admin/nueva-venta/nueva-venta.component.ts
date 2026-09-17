import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl, FormsModule } from '@angular/forms';
import { VentaService } from '../../../shared/services/venta.service';
import { UserService } from '../../../shared/services/user.service';
import { CreditoService } from '../../../shared/services/credito.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nueva-venta',
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
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

  // Buscador interactivo de clientes
  filtroCliente: string = '';
  mostrarDropdownClientes: boolean = false;
  clienteSeleccionado: any = null;

  // Cuentas / Créditos activos del cliente
  cargandoCuentas = false;
  cuentasActivas: any[] = [];
  modoCuenta: 'NUEVA' | 'EXISTENTE' = 'NUEVA';
  cuentaSeleccionada: any = null;
  nuevaFechaVencimiento: string = '';

  get clientesFiltrados(): any[] {
    if (!this.filtroCliente || this.filtroCliente.trim() === '') {
      return this.clientes;
    }
    const q = this.normalizarTexto(this.filtroCliente.trim());
    return this.clientes.filter((c) => {
      const nombreCompleto = this.normalizarTexto(`${c.name || ''} ${c.lastname || ''}`);
      const dni = (c.dni || '').toString();
      const phone = (c.phone || '').toString();
      return nombreCompleto.includes(q) || dni.includes(q) || phone.includes(q);
    });
  }

  private normalizarTexto(texto: string): string {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  onFocusCliente(): void {
    this.mostrarDropdownClientes = true;
  }

  onInputCliente(event: any): void {
    this.filtroCliente = event.target.value;
    this.mostrarDropdownClientes = true;
    if (this.clienteSeleccionado) {
      const nombreCompleto = `${this.clienteSeleccionado.name} ${this.clienteSeleccionado.lastname}`;
      if (this.filtroCliente !== nombreCompleto) {
        this.clienteSeleccionado = null;
        this.cuentasActivas = [];
        this.modoCuenta = 'NUEVA';
        this.cuentaSeleccionada = null;
        this.ventaForm.get('clienteId')?.setValue('');
        this.ventaForm.get('clienteId')?.markAsTouched();
      }
    }
  }

  seleccionarCliente(cliente: any): void {
    this.clienteSeleccionado = cliente;
    this.filtroCliente = `${cliente.name} ${cliente.lastname}`;
    this.ventaForm.get('clienteId')?.setValue(cliente.id);
    this.ventaForm.get('clienteId')?.markAsTouched();
    this.mostrarDropdownClientes = false;
    this.cargarCuentasActivasCliente(cliente.id);
  }

  cargarCuentasActivasCliente(clienteId: number): void {
    this.cargandoCuentas = true;
    this.cuentasActivas = [];
    this.modoCuenta = 'NUEVA';
    this.cuentaSeleccionada = null;

    this.creditoService.obtenerCreditosPorCliente(clienteId).subscribe({
      next: (creditos) => {
        // Filtrar solo cuentas activas (no totalmente pagadas)
        this.cuentasActivas = (creditos || []).filter((cr: any) => cr.estado !== 'PAGADO');
        this.cargandoCuentas = false;
      },
      error: (err) => {
        console.warn('Error al consultar cuentas activas:', err);
        this.cargandoCuentas = false;
      }
    });
  }

  setModoCuenta(modo: 'NUEVA' | 'EXISTENTE'): void {
    this.modoCuenta = modo;
    if (modo === 'NUEVA') {
      this.cuentaSeleccionada = null;
      this.nuevaFechaVencimiento = '';
    } else if (this.cuentasActivas.length > 0 && !this.cuentaSeleccionada) {
      this.seleccionarCuentaExistente(this.cuentasActivas[0]);
    }
  }

  seleccionarCuentaExistente(cuenta: any): void {
    this.cuentaSeleccionada = cuenta;
    if (cuenta.fechaFin) {
      this.nuevaFechaVencimiento = cuenta.fechaFin;
    }
    // Sincronizar el tipo de venta según la cuenta existente elegida
    if (cuenta.tipoVenta) {
      this.ventaForm.get('tipoVenta')?.setValue(cuenta.tipoVenta);
    }
  }

  limpiarCliente(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.clienteSeleccionado = null;
    this.cuentasActivas = [];
    this.modoCuenta = 'NUEVA';
    this.cuentaSeleccionada = null;
    this.nuevaFechaVencimiento = '';
    this.filtroCliente = '';
    this.ventaForm.get('clienteId')?.setValue('');
    this.ventaForm.get('clienteId')?.markAsTouched();
    this.mostrarDropdownClientes = true;
  }

  cerrarDropdown(): void {
    setTimeout(() => {
      this.mostrarDropdownClientes = false;
      if (this.clienteSeleccionado) {
        this.filtroCliente = `${this.clienteSeleccionado.name} ${this.clienteSeleccionado.lastname}`;
      } else {
        this.filtroCliente = '';
        this.ventaForm.get('clienteId')?.setValue('');
      }
    }, 220);
  }

  constructor(
    private fb: FormBuilder,
    private ventaService: VentaService,
    private userService: UserService,
    private creditoService: CreditoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.crearFormulario();
    this.cargarClientes();
  }

  crearFormulario(): void {
    this.ventaForm = this.fb.group({
      clienteId: ['', Validators.required],
      descripcion: [''],
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

    if (this.modoCuenta === 'EXISTENTE' && this.cuentaSeleccionada) {
      venta.ventaExistenteId = this.cuentaSeleccionada.ventaId || this.cuentaSeleccionada.venta?.id || this.cuentaSeleccionada.id;
      if (this.nuevaFechaVencimiento) {
        venta.nuevaFechaVencimiento = this.nuevaFechaVencimiento;
      }
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
