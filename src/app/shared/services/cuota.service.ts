import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Cuota } from '../model/cuota';

@Injectable({
  providedIn: 'root',
})
export class CuotaService {
  private readonly API_URL = 'http://localhost:8080/api/cuotas';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene una cuota por su ID
   */
  obtenerCuotaPorId(cuotaId: number): Observable<Cuota> {
    return this.http.get<Cuota>(`${this.API_URL}/${cuotaId}`);
  }

  /**
   * Obtiene todas las cuotas para un crédito
   */
  obtenerCuotasPorCredito(creditoId: number): Observable<Cuota[]> {
    return this.http.get<Cuota[]>(`${this.API_URL}/credito/${creditoId}`);
  }
}
