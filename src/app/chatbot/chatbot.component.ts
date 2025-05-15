// chatbot.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  ActionData,
  ChatbotService,
  ChatMessage,
} from '../shared/services/chatbot.service';
import { AuthService } from '../shared/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chatbot',
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatMessages') private messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  isOpen = false;
  loading = false;
  actionData: ActionData | null = null;
  private readonly speechRecognition =
    'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  // Propiedades para el reconocimiento de voz
  isRecording = false;
  recognition: any;

  // Sugerencias por rol
  adminSuggestions = [
    'Clientes con deudas',
    'Registrar usuario',
    'Registrar venta',
    'Cuotas pagadas por Anthony',
    'Próxima cuota de Anthony',
  ];

  userSuggestions = [
    'Mis cuotas pendientes',
    'Mi próxima cuota',
    'Cuánto debo en total',
    'Mis cuotas pagadas',
  ];

  private messagesSubscription!: Subscription;
  private actionSubscription!: Subscription;
  private loadingSubscription!: Subscription;

  constructor(
    private chatbotService: ChatbotService,
    public authService: AuthService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    // Inicializar reconocimiento de voz si está disponible
    if (this.speechRecognition) {
      this.initSpeechRecognition();
    }
  }

  ngOnInit() {
    // Suscribirse a mensajes
    this.messagesSubscription = this.chatbotService.messages$.subscribe(
      (messages) => {
        this.messages = messages;
        this.changeDetectorRef.detectChanges();
      }
    );

    // Suscribirse al estado de carga
    this.loadingSubscription = this.chatbotService.loading$.subscribe(
      (isLoading) => {
        this.loading = isLoading;
        this.changeDetectorRef.detectChanges();
      }
    );

    // Suscribirse a acciones
    this.actionSubscription = this.chatbotService.actions$.subscribe(
      (action) => {
        this.actionData = action;
        if (action) {
          setTimeout(() => this.scrollToBottom(), 100);
        }
      }
    );

    this.chatbotService.initializeWebSocketConnection();
  }

  ngOnDestroy() {
    // Detener grabación si está activa
    if (this.isRecording && this.recognition) {
      this.recognition.stop();
    }

    // Cancelar suscripciones
    if (this.messagesSubscription) this.messagesSubscription.unsubscribe();
    if (this.actionSubscription) this.actionSubscription.unsubscribe();
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();

    // Limpiar
    this.chatbotService.disconnect();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  formatTableData(data: any[]): any[] {
    // Si hay más de 5 filas, limitar para mejor visualización
    if (data && data.length > 5) {
      // Opcionalmente, agregar indicador de "más resultados"
      const limitedData = data.slice(0, 5);
      return limitedData;
    }
    return data;
  }

  toggleChat() {
    this.isOpen = !this.isOpen;

    if (!this.isOpen && this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    }

    if (!this.isOpen) {
      this.clearAction();
    } else {
      // Si se está abriendo el chat, inicializar
      this.chatbotService.initializeWebSocketConnection();
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  }

  // Método para inicializar el reconocimiento de voz
  private initSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'es-ES';

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('Texto reconocido:', transcript);

      this.newMessage = transcript;
      this.changeDetectorRef.detectChanges();
    };

    this.recognition.onend = () => {
      this.isRecording = false;

      // Si hay texto reconocido, enviarlo automáticamente
      if (this.newMessage && this.newMessage.trim() !== '') {
        console.log('Enviando mensaje automáticamente');
        this.sendMessage();
      }

      this.changeDetectorRef.detectChanges();
    };

    this.recognition.onerror = (event: any) => {
      console.error('Error en reconocimiento:', event.error);
      this.isRecording = false;
      this.changeDetectorRef.detectChanges();
    };
  }

  // Método para alternar el reconocimiento de voz
  toggleVoiceRecognition() {
    if (!this.recognition) {
      alert('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
    } else {
      // Limpiar mensaje previo antes de empezar
      this.newMessage = '';
      this.recognition.start();
      this.isRecording = true;
    }
  }

  // Método para enviar mensajes
  sendMessage() {
    if (!this.newMessage.trim() || this.loading) return;

    console.log('Enviando mensaje:', this.newMessage);
    this.chatbotService.sendMessage(this.newMessage);
    this.newMessage = '';

    // Limpiar acción previa
    this.actionData = null;
    this.chatbotService.clearAction();
  }

  useSuggestion(suggestion: string) {
    this.newMessage = suggestion;
    this.sendMessage();
  }

  clearAction() {
    this.chatbotService.clearAction();
    this.actionData = null;
  }

  get suggestions(): string[] {
    return this.authService.isAdmin()
      ? this.adminSuggestions
      : this.userSuggestions;
  }

  // Formateo de datos para visualización
  formatData(data: any): string {
    if (!data) return 'No hay datos disponibles';

    try {
      if (typeof data === 'string') return data;
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return 'Error al formatear datos';
    }
  }

  // Determinar columnas para tablas dinámicas
  getTableColumns(data: any[]): string[] {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    return Object.keys(data[0]);
  }

  // Formatear valor según su tipo
  formatCellValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      // Formatear números con comas para miles y dos decimales
      return value.toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return String(value);
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer && this.messagesContainer.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error al desplazar chat:', err);
    }
  }

  resetChat() {
    this.chatbotService.clearMessages();
    this.chatbotService.clearAction();
    this.actionData = null;
    this.chatbotService.initializeWebSocketConnection();
  }
}
