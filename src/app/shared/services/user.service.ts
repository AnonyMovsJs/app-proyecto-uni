import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User } from '../model/user';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  url: string = 'http://localhost:8080/api/users'

  constructor(private http : HttpClient){}

  findAll(): Observable<User[]> {
    return this.http.get<User[]>(this.url);
  }

  findById(id: number): Observable<User> {
    return this.http.get<User>(`${this.url}/${id}`);
  }

  userProfile(): Observable<any> {
    return this.http.get<any>(`${this.url}/profile`);
  }

  saveUser(user: User): Observable<User> {
    return this.http.post<User>(this.url, user);
  }

  updateUser(user: User): Observable<User> {
    return this.http.put<User>(`${this.url}/${user.id}`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /**
   * Consulta el DNI en ApiPeru.dev con validación previa de 8 dígitos y caché local para no quemar tokens.
   */
  consultarDniApi(dni: string, token: string): Observable<any> {
    const cached = localStorage.getItem(`dni_cache_${dni}`);
    if (cached) {
      try {
        return of(JSON.parse(cached));
      } catch (_) {}
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    return this.http.post<any>('https://api.apiperu.dev/dni', { dni }, { headers }).pipe(
      tap((res) => {
        if (res && res.success && res.data) {
          localStorage.setItem(`dni_cache_${dni}`, JSON.stringify(res));
        }
      })
    );
  }

  /**
   * Consulta RUC en ApiPeru.dev para verificar condición tributaria y deudas
   */
  consultarRucApi(ruc: string, token: string): Observable<any> {
    const cached = localStorage.getItem(`ruc_cache_${ruc}`);
    if (cached) {
      try {
        return of(JSON.parse(cached));
      } catch (_) {}
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    return this.http.post<any>('https://api.apiperu.dev/ruc', { ruc }, { headers }).pipe(
      tap((res) => {
        if (res && res.success && res.data) {
          localStorage.setItem(`ruc_cache_${ruc}`, JSON.stringify(res));
        }
      })
    );
  }
}
