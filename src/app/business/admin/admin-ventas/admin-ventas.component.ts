import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VentaService } from '../../../shared/services/venta.service';
import { UserService } from '../../../shared/services/user.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-ventas',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-ventas.component.html',
  styleUrls: ['./admin-ventas.component.css'],
})
export class AdminVentasComponent implements OnInit {
  ventas: any[] = [];
  ventasFiltradas: any[] = [];
  loading = true;
  error = '';
  searchTerm = '';
  estadoFiltro = 'TODOS';
  tipoFiltro = 'TODOS';

  // Para paginación
  itemsPerPage = 10;
  currentPage = 1;
  totalPages = 1;

  constructor(
    private ventaService: VentaService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.cargarVentas();
  }

  cargarVentas(): void {
    this.loading = true;

    // En un caso real, podrías tener un endpoint para obtener todas las ventas directamente
    // Aquí simulamos obteniendo todos los usuarios y luego sus ventas
    this.userService.findAll().subscribe({
      next: (users) => {
        const allVentas: any[] = [];
        let processedUsers = 0;

        if (users.length === 0) {
          this.loading = false;
          return;
        }

        users.forEach((user) => {
          this.ventaService.obtenerVentasPorCliente(user.id).subscribe({
            next: (ventas) => {
              // Añadir información del cliente a cada venta
              ventas.forEach((venta) => {
                allVentas.push({
                  ...venta,
                  cliente: {
                    id: user.id,
                    name: user.name,
                    lastname: user.lastname,
                    email: user.email,
                    dni: user.dni,
                  },
                });
              });

              processedUsers++;
              if (processedUsers === users.length) {
                // Ordenar por fecha (más reciente primero)
                this.ventas = allVentas.sort((a, b) => {
                  return (
                    new Date(b.fechaVenta).getTime() -
                    new Date(a.fechaVenta).getTime()
                  );
                });
                this.aplicarFiltros();
                this.loading = false;
              }
            },
            error: (err) => {
              console.error('Error obteniendo ventas de usuario', user.id, err);
              processedUsers++;
              if (processedUsers === users.length) {
                this.loading = false;
                if (allVentas.length === 0) {
                  this.error = 'No se pudo cargar ninguna venta.';
                }
              }
            },
          });
        });
      },
      error: (err) => {
        console.error('Error obteniendo usuarios', err);
        this.error =
          'Error al cargar los usuarios. Intente nuevamente más tarde.';
        this.loading = false;
      },
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.ventas];

    // Aplicar filtro de búsqueda
    if (this.searchTerm.trim() !== '') {
      const termino = this.searchTerm.toLowerCase();
      resultado = resultado.filter(
        (venta) =>
          venta.descripcion?.toLowerCase().includes(termino) ||
          venta.cliente?.name?.toLowerCase().includes(termino) ||
          venta.cliente?.lastname?.toLowerCase().includes(termino) ||
          venta.cliente?.email?.toLowerCase().includes(termino) ||
          venta.cliente?.dni?.toLowerCase().includes(termino)
      );
    }

    // Aplicar filtro de estado
    if (this.estadoFiltro !== 'TODOS') {
      resultado = resultado.filter(
        (venta) => venta.estado === this.estadoFiltro
      );
    }

    // Aplicar filtro de tipo
    if (this.tipoFiltro !== 'TODOS') {
      resultado = resultado.filter(
        (venta) => venta.tipoVenta === this.tipoFiltro
      );
    }

    this.ventasFiltradas = resultado;
    this.calcularPaginacion();
  }

  // Métodos para paginación
  calcularPaginacion(): void {
    this.totalPages = Math.ceil(
      this.ventasFiltradas.length / this.itemsPerPage
    );
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  paginaActual(): any[] {
    const inicio = (this.currentPage - 1) * this.itemsPerPage;
    const fin = Math.min(
      inicio + this.itemsPerPage,
      this.ventasFiltradas.length
    );
    return this.ventasFiltradas.slice(inicio, fin);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPages) {
      this.currentPage = pagina;
    }
  }

  obtenerRangoPaginas(): number[] {
    const total = Math.min(5, this.totalPages); // Mostrar máximo 5 números de página
    const inicio = Math.max(1, this.currentPage - Math.floor(total / 2));
    const fin = Math.min(this.totalPages, inicio + total - 1);
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  }

  // Helpers para formatear fechas y montos
  formatMoneda(valor: number): string {
    return `S/. ${valor.toFixed(2)}`;
  }

  getTipoVentaClass(tipo: string): string {
    return tipo === 'CONTADO' ? 'badge-success' : 'badge-primary';
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
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
}
