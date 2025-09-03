import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class PdfReportService {
  private readonly API_URL = 'http://localhost:8080/api/reportes';

  constructor(private http: HttpClient, private authService: AuthService) {}

  // === REPORTES PARA ADMIN ===
  generarReporteVentasAdmin(filtros: any): Observable<Blob> {
    return this.http.post(`${this.API_URL}/admin/ventas/pdf`, filtros, {
      responseType: 'blob',
    });
  }

  generarReporteUsuariosAdmin(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/admin/usuarios/pdf`, {
      responseType: 'blob',
    });
  }

  generarReporteCreditosAdmin(filtros: any): Observable<Blob> {
    return this.http.post(`${this.API_URL}/admin/creditos/pdf`, filtros, {
      responseType: 'blob',
    });
  }

  generarReportePagosAdmin(filtros: any): Observable<Blob> {
    return this.http.post(`${this.API_URL}/admin/pagos/pdf`, filtros, {
      responseType: 'blob',
    });
  }

  generarReporteFinancieroAdmin(periodo: string): Observable<Blob> {
    return this.http.get(
      `${this.API_URL}/admin/financiero/pdf?periodo=${periodo}`,
      {
        responseType: 'blob',
      }
    );
  }

  // === REPORTES PARA CLIENTE ===
  generarReporteComprasCliente(): Observable<Blob> {
    const userId = this.authService.getCurrentUser()?.id;
    return this.http.get(`${this.API_URL}/cliente/${userId}/compras/pdf`, {
      responseType: 'blob',
    });
  }

  generarReporteCuotasCliente(): Observable<Blob> {
    const userId = this.authService.getCurrentUser()?.id;
    return this.http.get(`${this.API_URL}/cliente/${userId}/cuotas/pdf`, {
      responseType: 'blob',
    });
  }

  generarReporteEstadoCuentaCliente(): Observable<Blob> {
    const userId = this.authService.getCurrentUser()?.id;
    return this.http.get(
      `${this.API_URL}/cliente/${userId}/estado-cuenta/pdf`,
      {
        responseType: 'blob',
      }
    );
  }

  generarComprobanteVenta(ventaId: number): Observable<Blob> {
    return this.http.get(`${this.API_URL}/comprobante/venta/${ventaId}/pdf`, {
      responseType: 'blob',
    });
  }

  generarComprobantePago(pagoId: number): Observable<Blob> {
    return this.http.get(`${this.API_URL}/comprobante/pago/${pagoId}/pdf`, {
      responseType: 'blob',
    });
  }

  // === MÉTODO GENÉRICO PARA DESCARGAR ===
  descargarPDF(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreArchivo}-${
      new Date().toISOString().split('T')[0]
    }.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // === MÉTODO CON LOADING Y NOTIFICACIONES ===
  generarYDescargarReporte(
    tipoReporte: string,
    observableFunction: () => Observable<Blob>,
    nombreArchivo: string
  ): void {
    Swal.fire({
      title: 'Generando reporte...',
      text: 'Por favor espera mientras se genera el PDF',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    observableFunction().subscribe({
      next: (blob) => {
        Swal.close();
        this.descargarPDF(blob, nombreArchivo);

        Swal.fire({
          title: '¡Reporte generado!',
          text: 'El archivo PDF se ha descargado correctamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      },
      error: (error) => {
        Swal.close();
        console.error('Error al generar reporte:', error);

        Swal.fire({
          title: 'Error',
          text: 'No se pudo generar el reporte. Intenta nuevamente.',
          icon: 'error',
          confirmButtonColor: '#e74c3c',
        });
      },
    });
  }
}
