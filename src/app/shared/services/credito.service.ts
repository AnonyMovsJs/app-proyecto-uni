import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Credito } from '../model/credito';
import { Cuota } from '../model/cuota';


@Injectable({
  providedIn: 'root',
})
export class CreditoService {
  private readonly API_URL = 'http://localhost:8080/api/creditos';

  constructor(private http: HttpClient) {}

  obtenerCreditosPorAdmin(): Observable<Credito[]> {
    return this.http.get<Credito[]>(`${this.API_URL}/admin`);
  }

  obtenerCreditosPorCliente(clienteId: number): Observable<Credito[]> {
    return this.http.get<Credito[]>(`${this.API_URL}/cliente/${clienteId}`);
  }

  obtenerCreditoPorVenta(ventaId: number): Observable<Credito> {
    return this.http.get<Credito>(`${this.API_URL}/venta/${ventaId}`);
  }

  obtenerCuotasPorCredito(creditoId: number): Observable<Cuota[]> {
    return this.http.get<Cuota[]>(`${this.API_URL}/${creditoId}/cuotas`);
  }

  actualizarFechaVencimientoCuota(cuotaId: number, fechaVencimiento: string): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/cuota/${cuotaId}/fecha-vencimiento`, { fechaVencimiento });
  }
}
