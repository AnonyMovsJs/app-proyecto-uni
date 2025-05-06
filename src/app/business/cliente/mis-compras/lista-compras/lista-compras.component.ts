import { Component } from '@angular/core';
import { UserService } from '../../../../shared/services/user.service';
import { VentaService } from '../../../../shared/services/venta.service';
import { Venta } from '../../../../shared/model/venta';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lista-compras',
  imports: [RouterLink, CommonModule],
  templateUrl: './lista-compras.component.html',
  styleUrl: './lista-compras.component.css',
})
export class ListaComprasComponent {
  ventas: Venta[] = [];
  loading = false;
  error = '';

  constructor(
    private userService: UserService,
    private ventaService: VentaService
  ) {}

  ngOnInit(): void {
    this.cargarMisCompras();
  }

  cargarMisCompras(): void {
    this.loading = true;
    this.userService.userProfile().subscribe({
      next: (profile) => {
        const clienteId = profile.id;
        this.ventaService.obtenerVentasPorCliente(clienteId).subscribe({
          next: (ventas) => {
            this.ventas = ventas;
            this.loading = false;
          },
          error: (err) => {
            console.error('Error al cargar ventas:', err);
            this.error = 'Error al cargar tus compras';
            this.loading = false;
          },
        });
      },
      error: (err) => {
        console.error('Error al obtener perfil:', err);
        this.error = 'Error al obtener perfil de usuario';
        this.loading = false;
      },
    });
  }
}
