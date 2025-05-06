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

  obtenerPagosPorCuota(cuotaId: number): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.API_URL}/cuota/${cuotaId}`);
  }

  obtenerPagosPorCliente(clienteId: number): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.API_URL}/cliente/${clienteId}`);
  }
}
