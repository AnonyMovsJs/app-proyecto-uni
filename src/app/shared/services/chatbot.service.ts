// chatbot.service.ts con mejoras
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

export interface ChatMessage {
  content: string;
  sender: string;
  timestamp: Date;
  isBot?: boolean;
}

export interface ActionData {
  type: string;
  data: any;
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  private readonly API_URL = 'http://localhost:8080'; // Ajusta al puerto de tu servidor Spring Boot
  private messageSubject = new BehaviorSubject<ChatMessage[]>([]);
  private actionSubject = new BehaviorSubject<ActionData | null>(null);
  private isLoading = false;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  messages$ = this.messageSubject.asObservable();
  actions$ = this.actionSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  initializeWebSocketConnection() {
    // Mensaje de bienvenida
    const welcomeMessage: ChatMessage = {
      content: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
      sender: 'AI Asistente',
      timestamp: new Date(),
      isBot: true,
    };
    this.messageSubject.next([welcomeMessage]);
  }

  disconnect() {
    // No hay conexión que cerrar
  }

  sendMessage(content: string) {
    if (!content.trim() || this.isLoading) return;

    // Actualizar estado de carga
    this.loadingSubject.next(true);
    this.isLoading = true;

    const user = this.authService.getCurrentUser();

    // Determinar el rol - utilizando isAdmin como fuente de verdad
    const userRole = this.authService.isAdmin() ? 'ADMIN' : 'USER';

    // Obtener ID de usuario - preferir ID numérico, usar email como fallback
    let userId = '0';
    if (user) {
      if (user.id) {
        userId = user.id.toString();
      } else if (user.email) {
        userId = user.email;
      }
    }

    console.log('Enviando mensaje con rol:', userRole, 'y userId:', userId);

    // Mensaje del usuario
    const userMessage: ChatMessage = {
      content,
      sender: user ? user.username || 'Usuario' : 'Usuario',
      timestamp: new Date(),
      isBot: false,
    };
    const currentMessages = this.messageSubject.getValue();
    this.messageSubject.next([...currentMessages, userMessage]);

    // Mostrar estado de carga
    /* this.isLoading = true;
    const loadingMessage: ChatMessage = {
      content: '...',
      sender: 'AI Asistente',
      timestamp: new Date(),
      isBot: true,
    };
    const messagesWithLoading = this.messageSubject.getValue();
    this.messageSubject.next([...messagesWithLoading, loadingMessage]); */

    console.log('Enviando mensaje con rol:', userRole, 'y userId:', userId); // Para depuración

    // Enviar solicitud HTTP con URL completa y rol garantizado
    this.http
      .post<any>(`${this.API_URL}/api/chatbot/message`, {
        message: content,
        userId: userId,
        userRole: userRole,
      })
      .subscribe({
        next: (response) => {
          // Actualizar estado de carga
          this.loadingSubject.next(false);
          this.isLoading = false;

          // Añadir respuesta del asistente - MODIFICAR AQUÍ
          let messageContent = response.message || 'Solicitado...';

          // Verificar si el mensaje contiene JSON sin procesar
          if (
            messageContent.includes('{"action":') ||
            messageContent.includes('{"type":')
          ) {
            // Reemplazar el JSON con un mensaje amigable
            messageContent =
              'Lo siento, no he podido entender completamente tu consulta. ¿Podrías reformularla?';
          }

          // Añadir respuesta del asistenteF
          const botMessage: ChatMessage = {
            content: messageContent,
            sender: 'AI Asistente',
            timestamp: new Date(),
            isBot: true,
          };
          // MODIFICAR ESTA PARTE (ya no necesitamos filtrar loadingMessage)
          // Sólo tomamos los mensajes actuales sin filtrar
          const currentMessages = this.messageSubject.getValue();
          this.messageSubject.next([...currentMessages, botMessage]);

          // Procesar acción si es necesario
          if (response && response.requiresAction) {
            console.log(
              'Acción recibida:',
              response.actionType,
              response.actionData
            );
            this.processAction(response.actionType, response.actionData);
          }
        },
        error: (error) => {
          // Actualizar estado de carga
          this.loadingSubject.next(false);
          this.isLoading = false;

          // MODIFICAR ESTA PARTE (ya no necesitamos filtrar loadingMessage)
          // Sólo tomamos los mensajes actuales sin filtrar
          const currentMessages = this.messageSubject.getValue();

          // Mensaje de error
          const errorMessage: ChatMessage = {
            content:
              'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, intenta nuevamente.',
            sender: 'AI Asistente',
            timestamp: new Date(),
            isBot: true,
          };
          this.messageSubject.next([...currentMessages, errorMessage]);
          console.error('Error en la solicitud HTTP:', error);
        },
      });
  }

  // Nuevo método para procesar acciones específicas
  private processAction(actionType: string, actionData: any) {
    // Guardar para que el componente lo utilice
    this.actionSubject.next({
      type: actionType,
      data: actionData,
    });

    // Agregar mensaje adicional según el tipo de acción
    let actionMessage = '';

    switch (actionType) {
      case 'REGISTER_SALE':
        if (actionData && !actionData.error) {
          actionMessage = `✅ Venta registrada exitosamente con ID: ${
            actionData.id || 'N/A'
          }`;
        } else if (actionData && actionData.error) {
          actionMessage = `❌ Error al registrar venta: ${
            actionData.mensaje || 'Error desconocido'
          }`;
        }
        break;

      case 'CREATE_USER':
        if (actionData && !actionData.error) {
          actionMessage = `✅ Usuario creado exitosamente: ${
            actionData.nombre || ''
          } ${actionData.apellido || ''}`;
        } else if (actionData && actionData.error) {
          actionMessage = `❌ Error al crear usuario: ${
            actionData.mensaje || 'Error desconocido'
          }`;
        }
        break;

      case 'QUERY':
        if (actionData && actionData.length === 0) {
          actionMessage = '📊 No se encontraron resultados para tu consulta.';
        } else if (actionData && actionData.error) {
          actionMessage = `❌ Error en la consulta: ${
            actionData.mensaje || 'Error desconocido'
          }`;
        } else if (actionData && actionData.length > 0) {
          const count = actionData.length;
          actionMessage = `📊 Encontré ${count} resultado${
            count > 1 ? 's' : ''
          } para tu consulta.`;
        }
        break;
    }

    // Si hay mensaje adicional, agregarlo
    if (actionMessage) {
      const currentMessages = this.messageSubject.getValue();
      const additionalMessage: ChatMessage = {
        content: actionMessage,
        sender: 'AI Asistente',
        timestamp: new Date(),
        isBot: true,
      };
      this.messageSubject.next([...currentMessages, additionalMessage]);
    }
  }

  clearMessages() {
    this.messageSubject.next([]);
  }

  clearAction() {
    this.actionSubject.next(null);
  }
}
