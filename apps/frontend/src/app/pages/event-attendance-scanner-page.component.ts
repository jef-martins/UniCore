import { CommonModule } from '@angular/common'
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { finalize } from 'rxjs'
import {
  type CustomEventSummary,
  type EventAttendanceItem,
  type EventRoom,
  type ScanAttendanceResult,
  CertificatesService,
} from '../services/certificates.service'

@Component({
  selector: 'app-event-attendance-scanner-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="scanner-page">
      <!-- Cabeçalho Principal -->
      <header class="scanner-header">
        <div class="header-titles">
          <span class="badge-portaria">Controle de Portaria & Acesso</span>
          <h1>Leitor de Credenciais e Frequência</h1>
          <p>
            Valide entradas e saídas de alunos em tempo real via QR Code do ingresso, código alfanumérico ou RA.
          </p>
        </div>
        <div class="header-actions">
          <a class="button button-secondary" routerLink="/eventos">
            📅 Catálogo de Eventos
          </a>
        </div>
      </header>

      <!-- Painel de Seleção de Evento e Sala -->
      <section class="card config-card">
        <div class="config-grid">
          <div class="form-group">
            <label for="select-event">Selecione o Evento Acadêmico *</label>
            <select
              id="select-event"
              class="form-control"
              [(ngModel)]="selectedEventId"
              (change)="onEventChange()"
            >
              <option value="" disabled>-- Selecione um evento ativo --</option>
              @for (ev of events; track ev.id) {
                <option [value]="ev.id">
                  {{ ev.title }} ({{ ev.startDate | date: 'dd/MM/yyyy' }})
                </option>
              }
            </select>
          </div>

          <div class="form-group">
            <label for="select-room">Selecione a Sala / Auditório *</label>
            <div class="room-select-group">
              <select
                id="select-room"
                class="form-control"
                [(ngModel)]="selectedRoomId"
                (change)="focusScannerInput()"
              >
                <option value="" disabled>-- Selecione o local de leitura --</option>
                @for (room of rooms; track room.id) {
                  <option [value]="room.id">
                    🚪 {{ room.name }} (Capacidade: {{ room.capacity || 'Livre' }})
                  </option>
                }
              </select>
              <button
                class="button button-outline"
                type="button"
                (click)="isNewRoomModalOpen = true"
                title="Cadastrar Nova Sala"
              >
                ➕ Sala
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Área de Scanner Ativo -->
      <main class="scanner-main">
        <div class="scanner-interactive card">
          <div class="scanner-input-container">
            <div class="scanner-mode-switch">
              <label for="scanner-input" class="scanner-input-label">
                <span class="pulse-indicator"></span>
                Leitura de Credencial & Ingressos
              </label>
              <div class="camera-actions-bar">
                <button
                  type="button"
                  class="button camera-toggle-btn"
                  [class.btn-active-cam]="isCameraActive"
                  (click)="toggleCamera()"
                  [disabled]="!selectedEventId || !selectedRoomId"
                >
                  {{ isCameraActive ? '🛑 Desativar Câmera' : '📷 Abrir Câmera / Escanear QR' }}
                </button>
                @if (isCameraActive) {
                  <button
                    type="button"
                    class="button button-secondary camera-flip-btn"
                    (click)="toggleFacingMode()"
                    title="Alternar entre câmera frontal e traseira"
                  >
                    🔄 {{ facingMode === 'environment' ? 'Traseira' : 'Frontal' }}
                  </button>
                }
              </div>
            </div>

            <!-- VIEWPORT DA CÂMERA AO VIVO -->
            @if (isCameraActive) {
              <div class="camera-stream-container">
                <video #videoElement class="camera-video-feed" playsinline autoplay muted></video>
                <div class="camera-reticle-overlay">
                  <div class="camera-reticle-box">
                    <div class="reticle-corner top-left"></div>
                    <div class="reticle-corner top-right"></div>
                    <div class="reticle-corner bottom-left"></div>
                    <div class="reticle-corner bottom-right"></div>
                    <div class="laser-scanner-line"></div>
                  </div>
                  <span class="camera-reticle-instruction">
                    Aponte para o QR Code do Ingresso ou Credencial
                  </span>
                </div>
              </div>
            }

            @if (cameraError) {
              <div class="camera-error-banner" role="alert">
                ⚠️ {{ cameraError }}
              </div>
            }

            <div class="input-wrapper">
              <input
                #scannerInput
                id="scanner-input"
                type="text"
                class="scanner-barcode-input"
                placeholder="Escaneie o QR Code ou digite o código/RA e pressione Enter"
                [(ngModel)]="scanCode"
                (keyup.enter)="executeScan()"
                [disabled]="isScanning || !selectedEventId || !selectedRoomId"
                autocomplete="off"
                autofocus
              />
              <button
                class="button button-primary scan-submit-btn"
                type="button"
                (click)="executeScan()"
                [disabled]="isScanning || !scanCode.trim() || !selectedEventId || !selectedRoomId"
              >
                {{ isScanning ? 'Registrando...' : 'Registrar Leitura' }}
              </button>
            </div>
            <p class="scanner-hint">
              💡 Dica: Mantenha o cursor neste campo ou ative a câmera do dispositivo móvel/notebook para reconhecimento automático.
            </p>
          </div>

          <!-- Feedback Visual de Última Leitura -->
          @if (lastResult) {
            <div
              class="scan-feedback-banner"
              [class.banner-entry]="lastResult.status === 'entrada'"
              [class.banner-exit]="lastResult.status === 'saida'"
              [class.banner-error]="lastResult.status === 'erro'"
            >
              <div class="feedback-icon">
                @if (lastResult.status === 'entrada') {
                  ✅
                } @else if (lastResult.status === 'saida') {
                  🚪
                } @else {
                  ⚠️
                }
              </div>
              <div class="feedback-details">
                <span class="feedback-title">{{ lastResult.message }}</span>
                @if (lastResult.studentName) {
                  <span class="feedback-student">
                    <strong>{{ lastResult.studentName }}</strong> ({{ lastResult.studentProfile || 'Participante' }})
                  </span>
                }
                <span class="feedback-meta">
                  Local: {{ lastResult.roomName || 'Geral' }} • Horário: {{ lastResult.timestamp }} • Leituras hoje: {{ lastResult.totalScansToday || 1 }}
                </span>
              </div>
            </div>
          }
        </div>

        <!-- Estatísticas da Portaria -->
        <div class="scanner-stats">
          <div class="stat-card stat-entries">
            <span class="stat-label">Entradas no Dia</span>
            <span class="stat-val">{{ countEntriesToday() }}</span>
            <span class="stat-sub">Presentes no momento</span>
          </div>
          <div class="stat-card stat-exits">
            <span class="stat-label">Saídas Registradas</span>
            <span class="stat-val">{{ countExitsToday() }}</span>
            <span class="stat-sub">Fluxo de saída</span>
          </div>
          <div class="stat-card stat-total">
            <span class="stat-label">Total de Registros</span>
            <span class="stat-val">{{ attendances.length }}</span>
            <span class="stat-sub">Histórico recente</span>
          </div>
        </div>
      </main>

      <!-- Tabela de Histórico Recente de Acessos -->
      <section class="card history-card">
        <div class="history-header">
          <h3>Fluxo Recente de Acesso (Últimos Registros)</h3>
          <button
            class="button button-outline button-sm"
            type="button"
            (click)="loadAttendances()"
            [disabled]="isLoadingAttendances || !selectedEventId"
          >
            🔄 Atualizar
          </button>
        </div>

        @if (isLoadingAttendances) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Carregando histórico de presenças...</p>
          </div>
        } @else if (attendances.length === 0) {
          <div class="empty-state">
            <p>Nenhuma leitura registrada para este evento ainda hoje.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Participante</th>
                  <th>Perfil</th>
                  <th>Local / Sala</th>
                  <th>Operador</th>
                  <th>Horário</th>
                </tr>
              </thead>
              <tbody>
                @for (att of attendances; track att.id) {
                  <tr>
                    <td>
                      <span
                        class="status-pill"
                        [class.pill-entry]="att.checkinType === 'entrada'"
                        [class.pill-exit]="att.checkinType === 'saida'"
                      >
                        {{ att.checkinType === 'entrada' ? '⬇️ Entrada' : '⬆️ Saída' }}
                      </span>
                    </td>
                    <td>
                      <strong>{{ att.userName }}</strong>
                    </td>
                    <td>
                      <span class="role-badge">{{ att.userRole }}</span>
                    </td>
                    <td>🚪 {{ att.roomName }}</td>
                    <td>{{ att.operatorName }}</td>
                    <td>{{ att.checkinDate | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <!-- Modal de Nova Sala -->
      @if (isNewRoomModalOpen) {
        <div class="modal-backdrop" (click)="isNewRoomModalOpen = false">
          <div class="modal-dialog card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Cadastrar Novo Local / Sala</h2>
              <button class="btn-close" type="button" (click)="isNewRoomModalOpen = false">✕</button>
            </div>
            <form (ngSubmit)="saveRoom()">
              <div class="modal-body form-grid">
                <div class="form-group col-span-2">
                  <label for="room-name">Nome da Sala / Auditório *</label>
                  <input
                    id="room-name"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Auditório Principal, Sala 102..."
                    [(ngModel)]="newRoomName"
                    name="roomName"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="room-cap">Capacidade Máxima</label>
                  <input
                    id="room-cap"
                    type="number"
                    class="form-control"
                    placeholder="Ex: 120"
                    [(ngModel)]="newRoomCapacity"
                    name="roomCap"
                  />
                </div>
                <div class="form-group">
                  <label for="room-desc">Descrição / Bloco</label>
                  <input
                    id="room-desc"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Bloco Central - 2º Andar"
                    [(ngModel)]="newRoomDescription"
                    name="roomDesc"
                  />
                </div>
              </div>
              <div class="modal-footer">
                <button
                  class="button button-outline"
                  type="button"
                  (click)="isNewRoomModalOpen = false"
                >
                  Cancelar
                </button>
                <button
                  class="button button-primary"
                  type="submit"
                  [disabled]="isSavingRoom || !newRoomName.trim()"
                >
                  {{ isSavingRoom ? 'Salvando...' : 'Salvar Sala' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .scanner-page {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
      }

      .scanner-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .badge-portaria {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        background: rgba(37, 99, 235, 0.1);
        color: #2563eb;
        border: 1px solid rgba(37, 99, 235, 0.3);
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
      }

      .scanner-header h1 {
        font-size: 1.875rem;
        font-weight: 800;
        margin: 0;
        color: var(--text-color, #0f172a);
      }

      .scanner-header p {
        margin: 0.25rem 0 0;
        color: var(--text-secondary, #64748b);
        font-size: 0.95rem;
      }

      .config-card {
        padding: 1.25rem;
        border-radius: 1rem;
        background: var(--surface-color, #ffffff);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }

      .config-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.25rem;
      }

      @media (max-width: 768px) {
        .config-grid {
          grid-template-columns: 1fr;
        }
      }

      .room-select-group {
        display: flex;
        gap: 0.5rem;
      }

      .scanner-main {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
      }

      @media (max-width: 900px) {
        .scanner-main {
          grid-template-columns: 1fr;
        }
      }

      .scanner-interactive {
        padding: 2rem;
        border-radius: 1.25rem;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
        border: 2px dashed #94a3b8;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      }

      .scanner-input-container {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .scanner-input-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1rem;
        font-weight: 700;
        color: #1e293b;
      }

      .pulse-indicator {
        width: 12px;
        height: 12px;
        background: #22c55e;
        border-radius: 50%;
        display: inline-block;
        animation: pulse 1.5s infinite;
      }

      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
        }
      }

      .scanner-mode-switch {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .camera-actions-bar {
        display: flex;
        gap: 0.5rem;
      }

      .camera-toggle-btn {
        background: #0284c7;
        color: #ffffff;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .camera-toggle-btn:hover:not(:disabled) {
        background: #0369a1;
      }

      .camera-toggle-btn.btn-active-cam {
        background: #dc2626;
      }

      .camera-toggle-btn.btn-active-cam:hover {
        background: #b91c1c;
      }

      .camera-flip-btn {
        font-size: 0.85rem;
        padding: 0.5rem 0.85rem;
      }

      .camera-stream-container {
        position: relative;
        width: 100%;
        height: 320px;
        background: #09090b;
        border-radius: 1rem;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
      }

      .camera-video-feed {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .camera-reticle-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }

      .camera-reticle-box {
        position: relative;
        width: 220px;
        height: 220px;
        border: 2px solid rgba(56, 189, 248, 0.6);
        border-radius: 16px;
        box-shadow: 0 0 25px rgba(56, 189, 248, 0.3);
        overflow: hidden;
      }

      .reticle-corner {
        position: absolute;
        width: 20px;
        height: 20px;
      }
      .reticle-corner.top-left {
        top: 0;
        left: 0;
        border-top: 4px solid #38bdf8;
        border-left: 4px solid #38bdf8;
        border-top-left-radius: 14px;
      }
      .reticle-corner.top-right {
        top: 0;
        right: 0;
        border-top: 4px solid #38bdf8;
        border-right: 4px solid #38bdf8;
        border-top-right-radius: 14px;
      }
      .reticle-corner.bottom-left {
        bottom: 0;
        left: 0;
        border-bottom: 4px solid #38bdf8;
        border-left: 4px solid #38bdf8;
        border-bottom-left-radius: 14px;
      }
      .reticle-corner.bottom-right {
        bottom: 0;
        right: 0;
        border-bottom: 4px solid #38bdf8;
        border-right: 4px solid #38bdf8;
        border-bottom-right-radius: 14px;
      }

      .laser-scanner-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, #38bdf8, #60a5fa, transparent);
        box-shadow: 0 0 12px #38bdf8;
        animation: scanAnim 2.2s ease-in-out infinite alternate;
      }

      @keyframes scanAnim {
        0% {
          top: 5%;
        }
        100% {
          top: 95%;
        }
      }

      .camera-reticle-instruction {
        margin-top: 0.75rem;
        background: rgba(15, 23, 42, 0.85);
        color: #f8fafc;
        padding: 0.35rem 0.85rem;
        border-radius: 9999px;
        font-size: 0.8rem;
        font-weight: 600;
        border: 1px solid rgba(255, 255, 255, 0.15);
      }

      .camera-error-banner {
        padding: 0.75rem 1rem;
        background: #fee2e2;
        border: 1px solid #f87171;
        color: #991b1b;
        border-radius: 0.75rem;
        font-weight: 600;
        font-size: 0.9rem;
      }

      .input-wrapper {
        display: flex;
        gap: 0.75rem;
      }

      .scanner-barcode-input {
        flex: 1;
        padding: 1rem 1.25rem;
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        border: 2px solid #3b82f6;
        border-radius: 0.75rem;
        background: #ffffff;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;
      }

      .scanner-barcode-input:focus {
        outline: none;
        border-color: #1d4ed8;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
      }

      .scan-submit-btn {
        padding: 0 1.5rem;
        font-weight: 700;
        font-size: 1rem;
      }

      .scanner-hint {
        margin: 0;
        font-size: 0.85rem;
        color: #64748b;
      }

      .scan-feedback-banner {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        padding: 1.25rem 1.5rem;
        border-radius: 1rem;
        animation: slideDown 0.3s ease-out;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .banner-entry {
        background: #ecfdf5;
        border: 2px solid #10b981;
        color: #065f46;
      }

      .banner-exit {
        background: #eff6ff;
        border: 2px solid #3b82f6;
        color: #1e40af;
      }

      .banner-error {
        background: #fef2f2;
        border: 2px solid #ef4444;
        color: #991b1b;
      }

      .feedback-icon {
        font-size: 2.5rem;
      }

      .feedback-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .feedback-title {
        font-size: 1.25rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .feedback-student {
        font-size: 1.05rem;
      }

      .feedback-meta {
        font-size: 0.85rem;
        opacity: 0.85;
      }

      .scanner-stats {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .stat-card {
        padding: 1.25rem;
        border-radius: 1rem;
        background: #ffffff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .stat-label {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
      }

      .stat-val {
        font-size: 2rem;
        font-weight: 900;
      }

      .stat-sub {
        font-size: 0.75rem;
        color: #94a3b8;
      }

      .stat-entries .stat-val {
        color: #10b981;
      }

      .stat-exits .stat-val {
        color: #3b82f6;
      }

      .stat-total .stat-val {
        color: #6366f1;
      }

      .history-card {
        padding: 1.5rem;
        border-radius: 1rem;
        background: #ffffff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }

      .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .history-header h3 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 800;
      }

      .status-pill {
        display: inline-block;
        padding: 0.25rem 0.6rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .pill-entry {
        background: #d1fae5;
        color: #065f46;
      }

      .pill-exit {
        background: #dbeafe;
        color: #1e40af;
      }

      .role-badge {
        display: inline-block;
        padding: 0.15rem 0.5rem;
        background: #f1f5f9;
        border-radius: 0.375rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: #475569;
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }

      .modal-dialog {
        background: #ffffff;
        border-radius: 1rem;
        max-width: 500px;
        width: 100%;
        overflow: hidden;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
      }

      .modal-body {
        padding: 1.5rem;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding: 1rem 1.5rem;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
      }
    `,
  ],
})
export class EventAttendanceScannerPageComponent implements OnInit, OnDestroy {
  @ViewChild('scannerInput') scannerInputElement?: ElementRef<HTMLInputElement>
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>

  events: CustomEventSummary[] = []
  rooms: EventRoom[] = []
  attendances: EventAttendanceItem[] = []

  selectedEventId: string = ''
  selectedRoomId: string = ''
  scanCode: string = ''

  isScanning = false
  isLoadingAttendances = false
  lastResult: ScanAttendanceResult | null = null

  isNewRoomModalOpen = false
  isSavingRoom = false
  newRoomName = ''
  newRoomCapacity: number | null = null
  newRoomDescription = ''

  // Câmera & Leitura Óptica
  isCameraActive = false
  facingMode: 'environment' | 'user' = 'environment'
  cameraError = ''
  private mediaStream: MediaStream | null = null
  private scanIntervalId: any = null
  private barcodeDetector: any = null
  private lastScannedCode = ''
  private lastScannedTime = 0

  private audioCtx: AudioContext | null = null

  constructor(private readonly certificatesService: CertificatesService) {}

  ngOnInit(): void {
    this.loadEvents()
    this.loadRooms()
  }

  ngOnDestroy(): void {
    this.stopCamera()
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {})
    }
  }

  toggleCamera(): void {
    if (this.isCameraActive) {
      this.stopCamera()
    } else {
      this.startCamera()
    }
  }

  async startCamera(): Promise<void> {
    this.cameraError = ''
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.cameraError = 'Seu navegador não suporta captura de vídeo pela câmera.'
      return
    }

    try {
      this.isCameraActive = true
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      this.mediaStream = stream

      setTimeout(() => {
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = stream
          this.videoElement.nativeElement.play().catch(() => {})
          this.initBarcodeScannerLoop()
        }
      }, 100)
    } catch (err: any) {
      this.isCameraActive = false
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.cameraError = 'Permissão de acesso à câmera foi recusada pelo navegador.'
      } else {
        this.cameraError = 'Não foi possível inicializar a câmera do dispositivo.'
      }
    }
  }

  toggleFacingMode(): void {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment'
    if (this.isCameraActive) {
      this.stopCamera()
      this.startCamera()
    }
  }

  stopCamera(): void {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId)
      this.scanIntervalId = null
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null
    }
    this.isCameraActive = false
  }

  private initBarcodeScannerLoop(): void {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId)
    }

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        this.barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'upc_a'],
        })
      } catch {
        this.barcodeDetector = null
      }
    }

    this.scanIntervalId = setInterval(async () => {
      if (!this.isCameraActive || this.isScanning || !this.videoElement?.nativeElement) {
        return
      }

      const video = this.videoElement.nativeElement
      if (video.readyState < 2) return

      if (this.barcodeDetector) {
        try {
          const barcodes = await this.barcodeDetector.detect(video)
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue?.trim()
            if (raw) {
              this.onCodeDetected(raw)
            }
          }
        } catch {
          // ignora frames não lidos
        }
      }
    }, 250)
  }

  onCodeDetected(code: string): void {
    const now = Date.now()
    if (this.lastScannedCode === code && now - this.lastScannedTime < 3000) {
      return
    }
    this.lastScannedCode = code
    this.lastScannedTime = now
    this.scanCode = code
    this.executeScan()
  }

  loadEvents(): void {
    this.certificatesService.listCustomEvents().subscribe({
      next: (events) => {
        this.events = events
        if (events.length > 0 && !this.selectedEventId) {
          this.selectedEventId = events[0].id
          this.loadAttendances()
        }
      },
    })
  }

  loadRooms(): void {
    this.certificatesService.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms
        if (rooms.length > 0 && !this.selectedRoomId) {
          this.selectedRoomId = rooms[0].id
        }
      },
    })
  }

  onEventChange(): void {
    this.loadAttendances()
    this.focusScannerInput()
  }

  focusScannerInput(): void {
    setTimeout(() => {
      this.scannerInputElement?.nativeElement?.focus()
    }, 100)
  }

  loadAttendances(): void {
    if (!this.selectedEventId) return
    this.isLoadingAttendances = true
    this.certificatesService
      .getEventAttendances(this.selectedEventId)
      .pipe(finalize(() => (this.isLoadingAttendances = false)))
      .subscribe({
        next: (items) => {
          this.attendances = items
        },
      })
  }

  executeScan(): void {
    const code = this.scanCode.trim()
    if (!code || !this.selectedEventId || !this.selectedRoomId || this.isScanning) {
      return
    }

    this.isScanning = true
    this.certificatesService
      .scanAttendance({
        eventId: this.selectedEventId,
        roomId: this.selectedRoomId,
        code,
      })
      .pipe(finalize(() => (this.isScanning = false)))
      .subscribe({
        next: (res) => {
          this.lastResult = res
          this.scanCode = ''
          this.playBeep(res.status === 'entrada' ? 880 : 587)
          this.loadAttendances()
          this.focusScannerInput()
        },
        error: (err) => {
          this.lastResult = {
            status: 'erro',
            message: err.error?.message || 'Falha ao registrar leitura da credencial.',
            timestamp: new Date().toLocaleTimeString('pt-BR'),
          }
          this.playBeep(220, true)
          this.scanCode = ''
          this.focusScannerInput()
        },
      })
  }

  countEntriesToday(): number {
    return this.attendances.filter((a) => a.checkinType === 'entrada').length
  }

  countExitsToday(): number {
    return this.attendances.filter((a) => a.checkinType === 'saida').length
  }

  saveRoom(): void {
    if (!this.newRoomName.trim()) return
    this.isSavingRoom = true
    this.certificatesService
      .createRoom({
        name: this.newRoomName.trim(),
        capacity: this.newRoomCapacity || undefined,
        description: this.newRoomDescription.trim() || undefined,
      })
      .pipe(finalize(() => (this.isSavingRoom = false)))
      .subscribe({
        next: (room) => {
          this.rooms.push(room)
          this.selectedRoomId = room.id
          this.isNewRoomModalOpen = false
          this.newRoomName = ''
          this.newRoomCapacity = null
          this.newRoomDescription = ''
          this.focusScannerInput()
        },
      })
  }

  private playBeep(freq: number, isError = false): void {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass()
        }
      }
      if (!this.audioCtx) return

      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()
      osc.connect(gain)
      gain.connect(this.audioCtx.destination)

      osc.type = isError ? 'sawtooth' : 'sine'
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime)

      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + (isError ? 0.35 : 0.15))

      osc.start()
      osc.stop(this.audioCtx.currentTime + (isError ? 0.35 : 0.15))
    } catch {
      // ignore audio errors on headless environments
    }
  }
}
