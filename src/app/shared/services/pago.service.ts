import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pago } from '../model/pago';

@Injectable({
  providedIn: 'root',
})
export class PagoService {
  private readonly API_URL = 'http://localhost:8080/api/pagos';

  constructor(private http: HttpClient) {}

  registrarPago(pago: any): Observable<Pago> {
    return this.http.post<Pago>(this.API_URL, pago);
  }

  registrarPagoYape(cuotaId: number, archivo: File): Observable<Pago> {
    const formData = new FormData();
    formData.append('cuotaId', cuotaId.toString());
    formData.append('comprobante', archivo);
    return this.http.post<Pago>(`${this.API_URL}/yape`, formData);
  }

  registrarAbonoFiado(clienteId: number, monto: number, archivo: File, tipoAbono: string = 'FIADO'): Observable<Pago> {
    const formData = new FormData();
    formData.append('clienteId', clienteId.toString());
    formData.append('monto', monto.toString());
    formData.append('comprobante', archivo);
    formData.append('tipoAbono', tipoAbono);
    return this.http.post<Pago>(`${this.API_URL}/yape/fiado`, formData);
  }

  validarPago(pagoId: number, estado: 'APROBADO' | 'RECHAZADO', motivoRechazo?: string): Observable<Pago> {
    return this.http.patch<Pago>(`${this.API_URL}/${pagoId}/validar`, { estado, motivoRechazo });
  }

  listarPagosPendientes(): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.API_URL}/pendientes`);
  }

  listarTodosLosPagos(): Observable<Pago[]> {
    return this.http.get<Pago[]>(this.API_URL);
  }

  obtenerPagosPorCuota(cuotaId: number): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.API_URL}/cuota/${cuotaId}`);
  }

  obtenerPagosPorCliente(clienteId: number): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.API_URL}/cliente/${clienteId}`);
  }

  getTelegramConfig(): Observable<{ enabled: boolean; configured: boolean }> {
    return this.http.get<{ enabled: boolean; configured: boolean }>(`${this.API_URL}/config/telegram`);
  }

  updateTelegramConfig(enabled: boolean): Observable<{ enabled: boolean; message: string }> {
    return this.http.put<{ enabled: boolean; message: string }>(`${this.API_URL}/config/telegram`, { enabled });
  }
}
