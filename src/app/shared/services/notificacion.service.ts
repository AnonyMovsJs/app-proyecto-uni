import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Notificacion } from '../model/notificacion';

@Injectable({
  providedIn: 'root',
})
export class NotificacionService {
  private readonly API_URL = 'http://localhost:8080/api/notificaciones';
  private readonly STORAGE_KEY = 'reyes_notificaciones_cobranza';

  private notificacionesSubject = new BehaviorSubject<Notificacion[]>([]);
  public notificaciones$ = this.notificacionesSubject.asObservable();

  // Emisor de alertas en tiempo real (en vivo)
  private alertaEnVivoSubject = new Subject<Notificacion>();
  public alertaEnVivo$ = this.alertaEnVivoSubject.asObservable();

  private pollingInterval: any = null;
  private idNotificacionesProcesadas = new Set<string>();

  constructor(private http: HttpClient) {
    this.cargarDesdeStorage();
  }

  private cargarDesdeStorage(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        const parsed: Notificacion[] = JSON.parse(raw);
        this.notificacionesSubject.next(parsed);
      } catch (e) {
        this.notificacionesSubject.next([]);
      }
    }
  }

  private guardarEnStorage(notificaciones: Notificacion[]): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notificaciones));
    }
    this.notificacionesSubject.next(notificaciones);
  }

  /**
   * Envía una notificación de cobro al Backend (MySQL) y actualiza el estado local
   */
  enviarNotificacion(datos: {
    clienteId: number;
    clienteNombre: string;
    clienteEmail?: string;
    clienteTelefono?: string;
    clienteDni?: string;
    montoDeuda: number;
    diasRetraso: number;
    fechaVencimiento: string | Date;
    numeroCuota?: number;
  }): Observable<any> {
    let tipo = 'RECORDATORIO';
    if (datos.diasRetraso > 30) {
      tipo = 'MORA_CRITICA';
    } else if (datos.diasRetraso > 0) {
      tipo = 'MORA_LEVE';
    } else {
      tipo = 'POR_VENCER';
    }

    const payload = {
      clienteId: Number(datos.clienteId),
      titulo: datos.diasRetraso > 0
        ? `Aviso de Cobranza: ${datos.diasRetraso} días de retraso`
        : 'Recordatorio de Pago de Cuota',
      mensaje: `Estimado(a) ${datos.clienteNombre}, le recordamos que presenta una cuota pendiente por S/. ${datos.montoDeuda.toFixed(2)}${datos.diasRetraso > 0 ? ` con un atraso de ${datos.diasRetraso} día(s)` : ' próxima a vencer'}. Por favor, acérquese a Comercial Reyes o regularice su pago a la brevedad para mantener su crédito activo.`,
      montoDeuda: datos.montoDeuda,
      diasRetraso: datos.diasRetraso,
      fechaVencimiento: new Date(datos.fechaVencimiento).toISOString(),
      tipo: tipo,
    };

    return this.http.post<any>(this.API_URL, payload).pipe(
      tap((res) => {
        // Alerta local para coherencia
        const notif: Notificacion = this.mapearDesdeBackend(res, datos.clienteNombre, datos.clienteEmail);
        const actual = [notif, ...this.notificacionesSubject.value.filter((n) => n.id !== notif.id)];
        this.guardarEnStorage(actual);
      })
    );
  }

  /**
   * Carga las notificaciones del cliente desde la base de datos MySQL (por ID o token)
   */
  cargarNotificacionesCliente(clienteId?: number): Observable<Notificacion[]> {
    const url = clienteId
      ? `${this.API_URL}/cliente/${clienteId}`
      : `${this.API_URL}/mis-notificaciones`;

    return this.http.get<any[]>(url).pipe(
      tap((listaBackend) => {
        const mapeadas = (listaBackend || []).map((b) => this.mapearDesdeBackend(b));
        this.guardarEnStorage(mapeadas);

        // Detectar si hay nuevas no leídas para disparar el modal en vivo
        mapeadas.forEach((n) => {
          if (!n.leida && !this.idNotificacionesProcesadas.has(String(n.id))) {
            this.idNotificacionesProcesadas.add(String(n.id));
            this.alertaEnVivoSubject.next(n);
          }
        });
      }),
      catchError((err) => {
        console.warn('Error al cargar notificaciones desde backend, usando storage', err);
        return of(this.notificacionesSubject.value);
      })
    );
  }

  /**
   * Inicia sondeo periódico (cada 4 seg) para recibir avisos entre diferentes navegadores
   */
  iniciarSondeo(clienteId?: number): void {
    if (this.pollingInterval) return;
    this.cargarNotificacionesCliente(clienteId).subscribe();
    this.pollingInterval = setInterval(() => {
      this.cargarNotificacionesCliente(clienteId).subscribe();
    }, 4000);
  }

  detenerSondeo(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  public cargarNotificaciones(): void {
    this.cargarDesdeStorage();
  }

  /**
   * Helper para saber si una notificación pertenece al cliente dado (por ID, EMAIL o sesión)
   */
  public matchCliente(notif: Notificacion, clienteIdentificador: any): boolean {
    if (!notif || !clienteIdentificador) return false;

    let emailActual = '';
    let idActual: number | null = null;
    let dniActual = '';
    let nombreActual = '';

    if (typeof clienteIdentificador === 'object') {
      if (clienteIdentificador.id != null) {
        idActual = Number(clienteIdentificador.id);
      }
      emailActual = (clienteIdentificador.email || clienteIdentificador.username || '').toLowerCase().trim();
      dniActual = (clienteIdentificador.dni || '').trim();
      nombreActual = `${clienteIdentificador.name || ''} ${clienteIdentificador.lastname || ''}`.toLowerCase().trim();
    } else if (typeof clienteIdentificador === 'string') {
      const str = clienteIdentificador.toLowerCase().trim();
      if (str.includes('@')) {
        emailActual = str;
      } else if (!isNaN(Number(str))) {
        idActual = Number(str);
      } else {
        nombreActual = str;
      }
    } else if (typeof clienteIdentificador === 'number') {
      idActual = clienteIdentificador;
    }

    // Fallback de seguridad: verificar sesión en sessionStorage si faltara dato
    if (!emailActual && typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('login');
        if (raw) {
          const parsed = JSON.parse(raw);
          emailActual = (parsed?.user?.email || parsed?.user?.username || '').toLowerCase().trim();
        }
      } catch (_) {}
    }

    const notifEmail = (notif.clienteEmail || '').toLowerCase().trim();
    const notifId = Number(notif.clienteId);
    const notifDni = (notif.clienteDni || '').trim();
    const notifNombre = (notif.clienteNombre || '').toLowerCase().trim();

    // 1. Coincidencia por ID numérico exacto
    if (idActual != null && notifId === idActual) {
      return true;
    }

    // 2. Coincidencia por correo electrónico
    if (emailActual && notifEmail && emailActual === notifEmail) {
      return true;
    }

    // 3. Coincidencia por DNI
    if (dniActual && notifDni && dniActual === notifDni) {
      return true;
    }

    // 4. Coincidencia por Nombre / Apellido
    if (nombreActual && notifNombre && (notifNombre.includes(nombreActual) || nombreActual.includes(notifNombre))) {
      return true;
    }

    return false;
  }

  /**
   * Obtiene notificaciones de un cliente específico
   */
  obtenerPorCliente(clienteIdOrEmailOrUser: any): Observable<Notificacion[]> {
    return this.notificaciones$.pipe(
      map((lista) => lista.filter((n) => this.matchCliente(n, clienteIdOrEmailOrUser)))
    );
  }

  /**
   * Cuenta las notificaciones no leídas para un cliente
   */
  contarNoLeidas(clienteIdOrEmailOrUser: any): Observable<number> {
    return this.notificaciones$.pipe(
      map((lista) => lista.filter((n) => this.matchCliente(n, clienteIdOrEmailOrUser) && !n.leida).length)
    );
  }

  /**
   * Cuenta total de no leídas para admin / sistema
   */
  contarTotalNoLeidas(): Observable<number> {
    return this.notificaciones$.pipe(
      map((lista) => lista.filter((n) => !n.leida).length)
    );
  }

  /**
   * Transforma el objeto devuelto por Spring Boot a la interfaz Notificacion de Angular
   */
  private mapearDesdeBackend(b: any, fallbackNombre?: string, fallbackEmail?: string): Notificacion {
    const cliente = b.cliente || {};
    return {
      id: String(b.id),
      clienteId: cliente.id ? Number(cliente.id) : (b.clienteId ? Number(b.clienteId) : 0),
      clienteNombre: cliente.name ? `${cliente.name} ${cliente.lastname || ''}`.trim() : (fallbackNombre || 'Cliente'),
      clienteEmail: (cliente.email || fallbackEmail || '').toLowerCase().trim(),
      clienteTelefono: cliente.phone || '',
      clienteDni: cliente.dni || '',
      titulo: b.titulo,
      mensaje: b.mensaje,
      montoDeuda: typeof b.montoDeuda === 'number' ? b.montoDeuda : parseFloat(b.montoDeuda) || 0,
      diasRetraso: Number(b.diasRetraso) || 0,
      fechaVencimiento: b.fechaVencimiento,
      fechaEnvio: b.fechaEnvio ? new Date(b.fechaEnvio) : new Date(),
      leida: !!b.leida,
      tipo: b.tipo || 'RECORDATORIO',
    };
  }

  /**
   * Marca una notificación como leída tanto en la BD como en memoria
   */
  marcarComoLeida(id: string): void {
    const actual = this.notificacionesSubject.value.map((n) =>
      n.id === id ? { ...n, leida: true } : n
    );
    this.guardarEnStorage(actual);

    // Si es un ID numérico proveniente de MySQL, persistir en backend
    if (!isNaN(Number(id))) {
      this.http.put(`${this.API_URL}/${id}/leer`, {}).subscribe({
        error: (err) => console.warn('Error al marcar leída en backend', err),
      });
    }
  }

  /**
   * Marca todas las notificaciones de un cliente como leídas en BD y memoria
   */
  marcarTodasComoLeidas(clienteIdOrEmailOrUser: any): void {
    const actual = this.notificacionesSubject.value.map((n) =>
      this.matchCliente(n, clienteIdOrEmailOrUser) ? { ...n, leida: true } : n
    );
    this.guardarEnStorage(actual);

    let idNum: number | null = null;
    if (typeof clienteIdOrEmailOrUser === 'number') {
      idNum = clienteIdOrEmailOrUser;
    } else if (clienteIdOrEmailOrUser && typeof clienteIdOrEmailOrUser === 'object' && clienteIdOrEmailOrUser.id) {
      idNum = Number(clienteIdOrEmailOrUser.id);
    }

    if (idNum) {
      this.http.put(`${this.API_URL}/cliente/${idNum}/leer-todas`, {}).subscribe({
        error: (err) => console.warn('Error al marcar todas leídas en backend', err),
      });
    }
  }

  /**
   * Elimina una notificación
   */
  eliminar(id: string): void {
    const actual = this.notificacionesSubject.value.filter((n) => n.id !== id);
    this.guardarEnStorage(actual);
  }
}

