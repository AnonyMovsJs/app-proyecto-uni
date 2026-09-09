import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClienteFeatures {
  id?: number;
  nombre: string;
  ingreso_mensual: number;
  monto_deuda_actual: number;
  dias_retraso_promedio: number;
  cuotas_vencidas: number;
  antiguedad_meses: number;
  total_compras_historico: number;
}

export interface EvaluacionIAResponse {
  id?: number;
  nombre: string;
  probabilidad_impago: number;
  score_crediticio: number;
  nivel_riesgo: 'Bajo' | 'Medio' | 'Alto';
  limite_sugerido: number;
  recomendacion: string;
  motivo_analisis: string;
}

export interface MetricasModeloIA {
  algoritmo: string;
  total_muestras: number;
  muestras_train: number;
  muestras_test: number;
  matriz_confusion: {
    verdaderos_positivos_VP: number;
    verdaderos_negativos_VN: number;
    falsos_positivos_FP: number;
    falsos_negativos_FN: number;
  };
  metricas_rendimiento: {
    tasa_clasificacion_correcta_accuracy: number;
    precision: number;
    sensibilidad_recall: number;
    f1_score: number;
    area_bajo_curva_roc_auc: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class EvaluacionIaService {
  private readonly ML_API_URL = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  getMetricasModelo(): Observable<MetricasModeloIA> {
    return this.http.get<MetricasModeloIA>(`${this.ML_API_URL}/metrics`);
  }

  evaluarCliente(cliente: ClienteFeatures): Observable<EvaluacionIAResponse> {
    return this.http.post<EvaluacionIAResponse>(`${this.ML_API_URL}/predict`, cliente);
  }

  evaluarLote(clientes: ClienteFeatures[]): Observable<EvaluacionIAResponse[]> {
    return this.http.post<EvaluacionIAResponse[]>(`${this.ML_API_URL}/evaluate-batch`, clientes);
  }
}
