import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
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
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatMessages') private messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  isOpen = false;
  isExpanded = false;
  modalActionData: ActionData | null = null;
  loading = false;
  actionData: ActionData | null = null;
  public readonly speechRecognition =
    'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  // Reconocimiento y síntesis de voz
  isRecording = false;
  recognition: any;
  speechEnabled = false;

  // Pasos de pensamiento dinámicos estilo Vercel AI
  thinkingSteps = [
    '🧠 Analizando intención con motor MCP...',
    '⚡ Consultando base de datos transaccional...',
    '📊 Verificando estados de mora y cronograma...',
    '✨ Sintetizando respuesta ejecutiva...'
  ];
  currentThinkingStep = this.thinkingSteps[0];
  private thinkingInterval: any;

  // Sugerencias dinámicas por rol
  adminSuggestions = [
    '¿Quién no paga?',
    'Clientes con deudas',
    '¿Cuánto me deberá Anthony en 5 meses?',
    'Llévame al perfil de Anthony',
    'Llévame a cobranzas',
    'Llévame a nueva venta'
  ];

  userSuggestions = [
    '¿Cuánto debo en total?',
    '¿Cuándo vence mi próxima cuota?',
    'Mis cuotas pendientes',
    'Llévame a mis compras'
  ];

  private messagesSubscription!: Subscription;
  private actionSubscription!: Subscription;
  private loadingSubscription!: Subscription;

  constructor(
    private chatbotService: ChatbotService,
    public authService: AuthService,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router
  ) {
    if (this.speechRecognition) {
      this.initSpeechRecognition();
    }
  }

  ngOnInit() {
    this.messagesSubscription = this.chatbotService.messages$.subscribe(
      (messages) => {
        this.messages = messages;
        if (messages.length > 0 && this.speechEnabled) {
          const lastMsg = messages[messages.length - 1];
          if (lastMsg.isBot && lastMsg.content) {
            this.speak(this.stripHtml(lastMsg.content));
          }
        }
        this.changeDetectorRef.detectChanges();
      }
    );

    this.loadingSubscription = this.chatbotService.loading$.subscribe(
      (isLoading) => {
        this.loading = isLoading;
        if (isLoading) {
          this.startThinkingCycle();
        } else {
          this.stopThinkingCycle();
        }
        this.changeDetectorRef.detectChanges();
      }
    );

    this.actionSubscription = this.chatbotService.actions$.subscribe(
      (action) => {
        this.actionData = action;
        if (action) {
          if (action.type === 'NAVIGATE' && action.data && action.data.route) {
            console.log('Agente ejecutando navegación automática a:', action.data.route);
            this.router.navigateByUrl(action.data.route);
          }
          setTimeout(() => this.scrollToBottom(), 100);
        }
      }
    );

    this.chatbotService.initializeWebSocketConnection();
  }

  ngOnDestroy() {
    if (this.isRecording && this.recognition) {
      this.recognition.stop();
    }
    this.stopThinkingCycle();

    if (this.messagesSubscription) this.messagesSubscription.unsubscribe();
    if (this.actionSubscription) this.actionSubscription.unsubscribe();
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();

    this.chatbotService.disconnect();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
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
      setTimeout(() => {
        this.scrollToBottom();
      }, 120);
    }
  }

  private startThinkingCycle() {
    let index = 0;
    this.currentThinkingStep = this.thinkingSteps[0];
    this.thinkingInterval = setInterval(() => {
      index = (index + 1) % this.thinkingSteps.length;
      this.currentThinkingStep = this.thinkingSteps[index];
      this.changeDetectorRef.detectChanges();
    }, 900);
  }

  private stopThinkingCycle() {
    if (this.thinkingInterval) {
      clearInterval(this.thinkingInterval);
      this.thinkingInterval = null;
    }
  }

  private initSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'es-PE';

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.newMessage = transcript;
      this.changeDetectorRef.detectChanges();
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      if (this.newMessage && this.newMessage.trim() !== '') {
        this.sendMessage();
      }
      this.changeDetectorRef.detectChanges();
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Reconocimiento de voz:', event.error);
      this.isRecording = false;
      this.changeDetectorRef.detectChanges();
    };
  }

  toggleVoiceRecognition() {
    if (!this.speechRecognition) {
      alert('El reconocimiento de voz no está soportado en este navegador. Te recomendamos usar Google Chrome o Microsoft Edge.');
      return;
    }

    if (!this.recognition) {
      this.initSpeechRecognition();
    }

    if (this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    } else {
      this.newMessage = '';
      try {
        this.recognition.start();
        this.isRecording = true;
      } catch (e) {
        console.warn('Error al iniciar reconocimiento de voz:', e);
        this.isRecording = false;
      }
    }
  }

  toggleSpeech() {
    this.speechEnabled = !this.speechEnabled;
    if (!this.speechEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PE';
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  }

  private stripHtml(html: string): string {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  formatMarkdown(text: string): string {
    if (!text) return '';
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    return formatted;
  }

  sendMessage() {
    if (!this.newMessage.trim() || this.loading) return;
    const msg = this.newMessage.trim();
    this.newMessage = '';
    this.chatbotService.clearAction();
    this.actionData = null;
    this.chatbotService.sendMessage(msg);
  }

  useSuggestion(suggestion: string) {
    this.newMessage = suggestion;
    this.sendMessage();
  }

  toggleExpandWindow() {
    this.isExpanded = !this.isExpanded;
  }

  openModalWithData(action: ActionData) {
    this.modalActionData = action;
  }

  closeModal() {
    this.modalActionData = null;
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

  getTableColumns(data: any[]): string[] {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    return Object.keys(data[0]);
  }

  formatTableColumnName(col: string): string {
    const map: { [key: string]: string } = {
      cliente: 'Cliente',
      dni: 'DNI',
      telefono: 'Teléfono',
      cuotasPendientes: 'Cuotas Pend.',
      cuotasVencidas: 'Cuotas Venc.',
      totalDeuda: 'Total Deuda',
      desdeCuando: 'Desde Cuándo',
      diasAtraso: 'Días Atraso',
      estado: 'Estado',
      cuota: 'Cuota',
      monto: 'Monto',
      vencimiento: 'Vencimiento'
    };
    return map[col] || col;
  }

  formatCellValue(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value);
  }

  getStatusClass(status: string): string {
    const s = String(status).toUpperCase();
    if (s.includes('CRIT') || s.includes('VENCID')) return 'critico';
    if (s.includes('MORA')) return 'en-mora';
    if (s.includes('PAGAD') || s.includes('DIA')) return 'al-dia';
    return 'por-vencer';
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer && this.messagesContainer.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      // Ignorar
    }
  }

  navigateToRoute(route: string): void {
    if (route) {
      this.router.navigateByUrl(route);
    }
  }

  resetChat() {
    this.chatbotService.clearMessages();
    this.chatbotService.clearAction();
    this.actionData = null;
    this.chatbotService.initializeWebSocketConnection();
  }
}
