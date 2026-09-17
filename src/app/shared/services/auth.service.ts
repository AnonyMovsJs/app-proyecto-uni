import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private url: string = 'http://localhost:8080/login';

  /* PASO 7 */
  private _tempToken: string | undefined;
  private _pendingAuth: any = null;

  private _token: string | undefined;
  private _user: any = {
    isAuth: false,
    isAdmin: false,
    user: undefined,
  };

  constructor(private http: HttpClient) {}


  set user(user: any) {
    this._user = user;
    localStorage.setItem('login', JSON.stringify(user));
    sessionStorage.setItem('login', JSON.stringify(user));
  }

  get user() {
    if (this._user.isAuth) {
      return this._user;
    } else if (localStorage.getItem('login')) {
      this._user = JSON.parse(localStorage.getItem('login') || '{}');
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
    localStorage.setItem('token', token);
    sessionStorage.setItem('token', token);
  }

  get token() {
    if (this._token != null) {
      return this._token;
    } else if (localStorage.getItem('token')) {
      this._token = localStorage.getItem('token') || '{}';
      return this._token;
    } else if (sessionStorage.getItem('token')) {
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


  checkAdmin(isAdmin: boolean) {
    this._user.isAdmin = isAdmin;
    sessionStorage.setItem('login', JSON.stringify(this._user));
  }

  // Nuevo método para enviar WhatsApp
  sendWhatsApp(whatsappData: { email: string }): Observable<any> {
    return this.http.post<any>(
      'http://localhost:8080/api/auth/send-whatsapp',
      whatsappData
    );
  }

  // Método modificado loginUser (reemplaza el existente)
  loginUser({ email, password }: any): Observable<any> {
    return this.http.post<any>(this.url, { email, password });
  }

  // Nuevo método para verificar SMS
  verifySms(verificationData: {
    email: string;
    code: string;
    tempToken: string;
    admin: boolean;
  }): Observable<any> {
    return this.http.post<any>(
      'http://localhost:8080/api/auth/verify-sms',
      verificationData
    );
  }

  // Getters y setters para token temporal
  set tempToken(token: string) {
    this._tempToken = token;
    sessionStorage.setItem('tempToken', token);
  }

  get tempToken() {
    if (this._tempToken != null) {
      return this._tempToken;
    } else if (sessionStorage.getItem('tempToken')) {
      this._tempToken = sessionStorage.getItem('tempToken') || '';
      return this._tempToken;
    }
    return '';
  }

  // Almacenar datos pendientes de autenticación
  set pendingAuth(data: any) {
    this._pendingAuth = data;
    sessionStorage.setItem('pendingAuth', JSON.stringify(data));
  }

  get pendingAuth() {
    if (this._pendingAuth) {
      return this._pendingAuth;
    } else if (sessionStorage.getItem('pendingAuth')) {
      this._pendingAuth = JSON.parse(
        sessionStorage.getItem('pendingAuth') || '{}'
      );
      return this._pendingAuth;
    }
    return null;
  }

  // Limpiar datos temporales
  clearTempData() {
    this._tempToken = undefined;
    this._pendingAuth = null;
    sessionStorage.removeItem('tempToken');
    sessionStorage.removeItem('pendingAuth');
  }

  // Modificar método logout existente (agregar limpieza de datos temporales)
  logout() {
    this._token = undefined;
    this._user = {
      isAuth: false,
      isAdmin: false,
      user: undefined,
    };

    // Limpiar datos temporales también
    this.clearTempData();

    sessionStorage.removeItem('login');
    sessionStorage.removeItem('token');
    localStorage.removeItem('login');
    localStorage.removeItem('token');
  }
}
