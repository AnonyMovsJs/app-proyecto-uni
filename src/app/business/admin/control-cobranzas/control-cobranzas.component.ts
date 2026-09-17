import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

import { UserService } from '../../../shared/services/user.service';
import { CreditoService } from '../../../shared/services/credito.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';

export interface DeudorRow {
  cliente: {
    id: number;
    name: string;
    lastname: string;
    email: string;
    phone: string;
    dni: string;
  };
  montoDeudaTotal: number;
  montoVencido: number;
  fechaVencimiento: Date;
  diasRetraso: number;
  cuotasVencidasCount: number;
  cuotasPendientesCount: number;
  estadoCobranza: 'CRITICA' | 'MORA' | 'POR_VENCER' | 'AL_DIA';
  estadoTexto: string;
  creditosCount: number;
  notificadoHoy?: boolean;
}

@Component({
  selector: 'app-control-cobranzas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './control-cobranzas.component.html',
  styleUrls: ['./control-cobranzas.component.css'],
})
export class ControlCobranzasComponent implements OnInit {
  deudores: DeudorRow[] = [];
  deudoresFiltrados: DeudorRow[] = [];

  loading = true;
  error = '';
  autoNotificarCliente: string | null = null;

  // KPIs
  totalCarteraVencida = 0;
  promedioDiasRetraso = 0;
  cuentasPorVencer = 0;
  deudasCriticas = 0;

  // Filtros
  searchTerm = '';
  filtroEstado: 'TODAS' | 'CRITICAS' | 'MORA' | 'POR_VENCER' | 'AL_DIA' = 'TODAS';

  // Paginación
  itemsPerPage = 10;
  currentPage = 1;
  totalPages = 1;

  constructor(
    private userService: UserService,
    private creditoService: CreditoService,
    private notificacionService: NotificacionService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((queryParams) => {
      if (queryParams['cliente']) {
        this.searchTerm = queryParams['cliente'];
      }
      if (queryParams['notificar'] === 'true' && queryParams['cliente']) {
        this.autoNotificarCliente = queryParams['cliente'];
      }
    });
    this.cargarDatosCobranzas();
  }

  cargarDatosCobranzas(): void {
    this.loading = true;
    this.error = '';

    this.userService.findAll().subscribe({
      next: (users) => {
        // Excluimos usuarios administradores de la lista de deudores de crédito
        const clientes = users.filter((u) => !u.admin);

        if (clientes.length === 0) {
          this.loading = false;
          this.deudores = [];
          this.calcularResumen();
          this.aplicarFiltros();
          return;
        }

        const listaDeudores: DeudorRow[] = [];
        let clientesProcesados = 0;

        clientes.forEach((cliente) => {
          this.creditoService.obtenerCreditosPorCliente(cliente.id).subscribe({
            next: (creditos) => {
              if (!creditos || creditos.length === 0) {
                clientesProcesados++;
                this.verificarFinCarga(clientesProcesados, clientes.length, listaDeudores);
                return;
              }

              let cuotasPendientesAll: any[] = [];
              let creditosProcesados = 0;

              creditos.forEach((credito) => {
                this.creditoService.obtenerCuotasPorCredito(credito.id).subscribe({
                  next: (cuotas) => {
                    const pendientes = cuotas.filter(
                      (c) => c.estado === 'PENDIENTE' || c.estado === 'VENCIDO'
                    );
                    cuotasPendientesAll = [...cuotasPendientesAll, ...pendientes];
                    creditosProcesados++;

                    if (creditosProcesados === creditos.length) {
                      if (cuotasPendientesAll.length > 0) {
                        const deudor = this.procesarCuotasCliente(cliente, creditos, cuotasPendientesAll);
                        listaDeudores.push(deudor);
                      }
                      clientesProcesados++;
                      this.verificarFinCarga(clientesProcesados, clientes.length, listaDeudores);
                    }
                  },
                  error: (err) => {
                    console.error('Error al cargar cuotas de crédito', credito.id, err);
                    creditosProcesados++;
                    if (creditosProcesados === creditos.length) {
                      clientesProcesados++;
                      this.verificarFinCarga(clientesProcesados, clientes.length, listaDeudores);
                    }
                  },
                });
              });
            },
            error: (err) => {
              console.error('Error al cargar créditos del cliente', cliente.id, err);
              clientesProcesados++;
              this.verificarFinCarga(clientesProcesados, clientes.length, listaDeudores);
            },
          });
        });
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.error = 'No se pudo cargar la cartera de clientes. Intente nuevamente.';
        this.loading = false;
      },
    });
  }

  private verificarFinCarga(
    procesados: number,
    total: number,
    listaDeudores: DeudorRow[]
  ): void {
    if (procesados === total) {
      // Ordenar por días de retraso descendente (los más críticos primero)
      this.deudores = listaDeudores.sort((a, b) => b.diasRetraso - a.diasRetraso);
      this.calcularResumen();
      this.aplicarFiltros();
      this.loading = false;

      if (this.autoNotificarCliente) {
        const term = this.autoNotificarCliente.toLowerCase();
        const deudor = this.deudores.find(
          (d) =>
            d.cliente.name?.toLowerCase().includes(term) ||
            d.cliente.lastname?.toLowerCase().includes(term) ||
            d.cliente.dni?.includes(term)
        );
        if (deudor) {
          setTimeout(() => {
            this.enviarNotificacionCliente(deudor);
          }, 400);
        }
        this.autoNotificarCliente = null;
      }
    }
  }

  private procesarCuotasCliente(
    cliente: any,
    creditos: any[],
    cuotas: any[]
  ): DeudorRow {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let montoDeudaTotal = 0;
    let montoVencido = 0;
    let maxDiasRetraso = 0;
    let cuotasVencidas = 0;
    let cuotasPorVencer7Dias = 0;

    let fechaMasAntiguaVencida: Date | null = null;
    let fechaProximaPendiente: Date | null = null;

    cuotas.forEach((c) => {
      const monto = typeof c.monto === 'number' ? c.monto : parseFloat(c.monto) || 0;
      montoDeudaTotal += monto;

      const fVenc = new Date(c.fechaVencimiento);
      fVenc.setHours(0, 0, 0, 0);

      const diffMs = hoy.getTime() - fVenc.getTime();
      const diasAtraso = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diasAtraso > 0 || c.estado === 'VENCIDO') {
        cuotasVencidas++;
        montoVencido += monto;
        if (diasAtraso > maxDiasRetraso) {
          maxDiasRetraso = diasAtraso;
        }
        if (!fechaMasAntiguaVencida || fVenc < fechaMasAntiguaVencida) {
          fechaMasAntiguaVencida = fVenc;
        }
      } else {
        // Próximas cuotas a vencer
        const diasParaVencer = Math.abs(diasAtraso);
        if (diasParaVencer <= 7) {
          cuotasPorVencer7Dias++;
        }
        if (!fechaProximaPendiente || fVenc < fechaProximaPendiente) {
          fechaProximaPendiente = fVenc;
        }
      }
    });

    let estadoCobranza: 'CRITICA' | 'MORA' | 'POR_VENCER' | 'AL_DIA' = 'AL_DIA';
    let estadoTexto = 'Al día';

    if (maxDiasRetraso > 30) {
      estadoCobranza = 'CRITICA';
      estadoTexto = 'Mora Crítica';
    } else if (maxDiasRetraso > 0) {
      estadoCobranza = 'MORA';
      estadoTexto = 'En Mora';
    } else if (cuotasPorVencer7Dias > 0) {
      estadoCobranza = 'POR_VENCER';
      estadoTexto = 'Por vencer';
    }

    const fechaRef = fechaMasAntiguaVencida || fechaProximaPendiente || new Date();

    return {
      cliente: {
        id: cliente.id,
        name: cliente.name,
        lastname: cliente.lastname,
        email: cliente.email,
        phone: cliente.phone || '',
        dni: cliente.dni || '',
      },
      montoDeudaTotal,
      montoVencido: montoVencido > 0 ? montoVencido : montoDeudaTotal,
      fechaVencimiento: fechaRef,
      diasRetraso: maxDiasRetraso,
      cuotasVencidasCount: cuotasVencidas,
      cuotasPendientesCount: cuotas.length,
      estadoCobranza,
      estadoTexto,
      creditosCount: creditos.length,
    };
  }

  calcularResumen(): void {
    // 1. Cartera Vencida (suma de montos en mora)
    this.totalCarteraVencida = this.deudores.reduce(
      (sum, d) => (d.diasRetraso > 0 ? sum + d.montoVencido : sum),
      0
    );

    // 2. Promedio Días de Retraso (deudores en mora)
    const enMora = this.deudores.filter((d) => d.diasRetraso > 0);
    if (enMora.length > 0) {
      const sumaDias = enMora.reduce((sum, d) => sum + d.diasRetraso, 0);
      this.promedioDiasRetraso = Math.round(sumaDias / enMora.length);
    } else {
      this.promedioDiasRetraso = 0;
    }

    // 3. Cuentas por vencer (7 días)
    this.cuentasPorVencer = this.deudores.filter(
      (d) => d.estadoCobranza === 'POR_VENCER' || (d.diasRetraso === 0 && d.montoDeudaTotal > 0)
    ).length;

    // 4. Deudas Críticas (+30 días)
    this.deudasCriticas = this.deudores.filter((d) => d.diasRetraso > 30).length;
  }

  aplicarFiltros(): void {
    let resultado = [...this.deudores];

    // Filtro por texto
    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      resultado = resultado.filter(
        (d) =>
          d.cliente.name?.toLowerCase().includes(term) ||
          d.cliente.lastname?.toLowerCase().includes(term) ||
          d.cliente.email?.toLowerCase().includes(term) ||
          d.cliente.phone?.toLowerCase().includes(term) ||
          d.cliente.dni?.toLowerCase().includes(term)
      );
    }

    // Filtro por estado
    if (this.filtroEstado === 'CRITICAS') {
      resultado = resultado.filter((d) => d.diasRetraso > 30);
    } else if (this.filtroEstado === 'MORA') {
      resultado = resultado.filter((d) => d.diasRetraso > 0 && d.diasRetraso <= 30);
    } else if (this.filtroEstado === 'POR_VENCER') {
      resultado = resultado.filter((d) => d.estadoCobranza === 'POR_VENCER');
    } else if (this.filtroEstado === 'AL_DIA') {
      resultado = resultado.filter((d) => d.diasRetraso === 0);
    }

    this.deudoresFiltrados = resultado;
    this.calcularPaginacion();
  }

  filtrarPorEstado(estado: 'TODAS' | 'CRITICAS' | 'MORA' | 'POR_VENCER' | 'AL_DIA'): void {
    this.filtroEstado = estado;
    this.aplicarFiltros();
  }

  calcularPaginacion(): void {
    this.totalPages = Math.max(1, Math.ceil(this.deudoresFiltrados.length / this.itemsPerPage));
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  paginaActual(): DeudorRow[] {
    const inicio = (this.currentPage - 1) * this.itemsPerPage;
    return this.deudoresFiltrados.slice(inicio, inicio + this.itemsPerPage);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPages) {
      this.currentPage = pagina;
    }
  }

  /**
   * Envía la notificación in-app directamente al cliente
   */
  enviarNotificacionCliente(deudor: DeudorRow): void {
    const nombreCompleto = `${deudor.cliente.name} ${deudor.cliente.lastname}`;

    Swal.fire({
      title: '¿Enviar Notificación de Cobro?',
      html: `
        <div class="text-left" style="font-size: 0.95rem;">
          <p><strong>Cliente:</strong> ${nombreCompleto}</p>
          <p><strong>Monto pendiente:</strong> S/. ${deudor.montoVencido.toFixed(2)}</p>
          <p><strong>Días de retraso:</strong> <span class="badge ${deudor.diasRetraso > 30 ? 'bg-danger' : 'bg-warning'} text-dark">${deudor.diasRetraso} días</span></p>
          <p class="small mt-2" style="color: #ffffff !important; opacity: 0.95;">Esta alerta se registrará de inmediato en la cuenta del cliente para que la visualice en su panel y en el encabezado del sistema.</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#2575fc',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fas fa-paper-plane mr-1"></i> Sí, Notificar',
      cancelButtonText: 'Cancelar',
      background: '#1e293b',
      color: '#fff',
    }).then((result) => {
      if (result.isConfirmed) {
        this.notificacionService.enviarNotificacion({
          clienteId: deudor.cliente.id,
          clienteNombre: nombreCompleto,
          clienteEmail: deudor.cliente.email,
          clienteTelefono: deudor.cliente.phone,
          clienteDni: deudor.cliente.dni,
          montoDeuda: deudor.montoVencido,
          diasRetraso: deudor.diasRetraso,
          fechaVencimiento: deudor.fechaVencimiento,
        }).subscribe({
          next: () => {
            deudor.notificadoHoy = true;
            Swal.fire({
              icon: 'success',
              title: '¡Notificación enviada!',
              text: `Se ha notificado y registrado con éxito en la base de datos para ${nombreCompleto}.`,
              background: '#1e293b',
              color: '#fff',
              confirmButtonColor: '#2575fc',
              timer: 2800,
            });
          },
          error: (err) => {
            console.error('Error al guardar notificación en backend:', err);
            deudor.notificadoHoy = true;
            Swal.fire({
              icon: 'success',
              title: '¡Notificación enviada!',
              text: `Se emitió el aviso a ${nombreCompleto}.`,
              background: '#1e293b',
              color: '#fff',
              confirmButtonColor: '#2575fc',
              timer: 2800,
            });
          }
        });
      }
    });
  }

  /**
   * Abre enlace directo de WhatsApp con mensaje prearmado
   */
  enviarWhatsApp(deudor: DeudorRow): void {
    const telefono = (deudor.cliente.phone || '').replace(/\D/g, '');
    const numFinal = telefono.startsWith('51') ? telefono : `51${telefono}`;

    const nombre = `${deudor.cliente.name} ${deudor.cliente.lastname}`;
    const diasTxt = deudor.diasRetraso > 0 ? `un retraso de ${deudor.diasRetraso} días` : 'vencimiento próximo';
    const mensaje = `Hola ${nombre}, le saludamos de Comercial Reyes. Le recordamos cordialmente que tiene una cuota pendiente de S/. ${deudor.montoVencido.toFixed(2)} con ${diasTxt}. Le solicitamos regularizar su pago para mantener su crédito activo. ¡Muchas gracias!`;

    const url = `https://api.whatsapp.com/send?phone=${numFinal}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  getIniciales(nombre: string, apellido: string): string {
    const n = (nombre || '').trim().charAt(0).toUpperCase();
    const a = (apellido || '').trim().charAt(0).toUpperCase();
    return `${n}${a}` || 'CR';
  }
}
