import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Venta } from '../model/venta';
import { DetalleVenta } from '../model/detalle-venta';

@Injectable({
  providedIn: 'root',
})
export class VentaService {
  private readonly API_URL = 'http://localhost:8080/api/ventas';

  constructor(private http: HttpClient) {}

  crearVenta(venta: any): Observable<Venta> {
    return this.http.post<Venta>(this.API_URL, venta);
  }

  obtenerVentasPorCliente(clienteId: number): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.API_URL}/cliente/${clienteId}`);
  }

  obtenerVenta(ventaId: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.API_URL}/${ventaId}`);
  }

  obtenerDetallesVenta(ventaId: number): Observable<DetalleVenta[]> {
    return this.http.get<DetalleVenta[]>(`${this.API_URL}/${ventaId}/detalles`);
  }
}
