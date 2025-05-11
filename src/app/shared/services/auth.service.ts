import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private url: string = 'http://localhost:8080/login';

  private _token: string | undefined;
  private _user: any = {
    isAuth: false,
    isAdmin: false,
    user: undefined,
  };

  constructor(private http: HttpClient) {}

  loginUser({ email, password }: any): Observable<any> {
    return this.http.post<any>(this.url, { email, password });
  }

  set user(user: any) {
    this._user = user;
    sessionStorage.setItem('login', JSON.stringify(user));
  }

  get user() {
    if (this._user.isAuth) {
      return this._user;
    } else if (sessionStorage.getItem('login')) {
      this._user = JSON.parse(sessionStorage.getItem('login') || '{}');
      return this._user;
    }

    return this._user;
  }

  getCurrentUser(): any {
    const user = this.user.user;
    if (!user) return null;

    // Asegurarse de que el objeto tenga una propiedad 'roles'
    if (!user.roles) {
      // Determinar el rol basado en isAdmin
      user.roles = this.user.isAdmin ? ['ADMIN'] : ['USER'];
    }

    return user;
  }

  set token(token: string) {
    this._token = token;
    sessionStorage.setItem('token', token);
  }

  get token() {
    if (this._token != null) {
      return this._token;
    } else if (sessionStorage.getItem('token') || '{}') {
      this._token = sessionStorage.getItem('token') || '{}';
      return this._token;
    }

    return this._token!;
  }

  getPayload(token: string) {
    if (token != null) {
      return JSON.parse(atob(token.split('.')[1]));
    }

    return null;
  }

  isAdmin() {
    return this.user.isAdmin;
  }

  isAuth() {
    return this.user.isAuth;
  }

  logout() {
    this._token = undefined;
    this._user = {
      isAuth: false,
      isAdmin: false,
      user: undefined,
    };

    sessionStorage.removeItem('login');
    sessionStorage.removeItem('token');
  }

  checkAdmin(isAdmin: boolean) {
    this._user.idAdmin = isAdmin;
    sessionStorage.setItem('login', JSON.stringify(this._user));
  }
}
