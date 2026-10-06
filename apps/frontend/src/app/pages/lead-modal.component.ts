import { CommonModule } from '@angular/common'
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
  LeadItem,
  LeadStatus,
  NeighborhoodItem,
  ResidenceNumberItem,
  StreetItem,
  SubterritoryItem,
  TerritoryHierarchy,
  TerritoryItem,
  TerritoryService,
} from '../services/territory.service'

export interface ResidenceContextInfo {
  residenceId: string
  residenceNumber: string
  streetName: string
  neighborhoodName: string
  subterritoryName: string
  territoryName: string
}

@Component({
  selector: 'app-lead-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div class="modal-backdrop" (click)="onBackdropClick($event)">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <header class="modal-header">
            <div>
              @if (residenceContext) {
                <div class="breadcrumb-context">
                  {{ residenceContext.territoryName }} ❯ 
                  {{ residenceContext.subterritoryName }} ❯ 
                  {{ residenceContext.neighborhoodName }}
                </div>
                <h2 id="modal-title" class="modal-title">
                  {{ leadToEdit ? 'Editar Lead' : 'Cadastrar Lead / Visita' }} — Nº {{ residenceContext.residenceNumber }}
                </h2>
                <p class="residence-sub">
                  Logradouro: <strong>{{ residenceContext.streetName }}, nº {{ residenceContext.residenceNumber }}</strong>
                </p>
              } @else {
                <div class="breadcrumb-context">
                  Captação Territorial & Leads
                </div>
                <h2 id="modal-title" class="modal-title">
                  {{ leadToEdit ? 'Editar Lead' : 'Cadastrar Novo Lead' }}
                </h2>
                <p class="residence-sub">
                  Preencha as informações do lead e selecione o endereço de localização.
                </p>
              }
            </div>
            <button class="btn-close" type="button" (click)="closeModal()" aria-label="Fechar">✕</button>
          </header>

          <form (ngSubmit)="saveLead()" class="modal-form">
            <div class="modal-body-scroll">
              @if (errorMessage) {
              <div class="alert-box alert-error">
                <span>⚠ {{ errorMessage }}</span>
              </div>
            }

            @if (!residenceContext && !leadToEdit) {
              <div class="location-picker-card">
                <div class="location-picker-title">
                  <span>📍</span> Localização Residencial da Abordagem
                </div>
                
                <div class="form-grid location-grid">
                  <!-- Território -->
                  <div class="form-group">
                    <label for="lead-sel-territory">Território *</label>
                    <select
                      id="lead-sel-territory"
                      class="form-control"
                      [(ngModel)]="selectedTerritoryId"
                      (change)="onTerritoryChange()"
                      name="selTerritory"
                      required
                    >
                      <option value="" disabled selected>Selecione um Território...</option>
                      @for (t of territoryList; track t.id) {
                        <option [value]="t.id">{{ t.name }}</option>
                      }
                    </select>
                  </div>

                  <!-- Subterritório -->
                  <div class="form-group">
                    <label for="lead-sel-sub">Subterritório *</label>
                    <select
                      id="lead-sel-sub"
                      class="form-control"
                      [(ngModel)]="selectedSubterritoryId"
                      (change)="onSubterritoryChange()"
                      name="selSub"
                      [disabled]="!subterritoryList.length"
                      required
                    >
                      <option value="" disabled selected>Selecione um Subterritório...</option>
                      @for (sub of subterritoryList; track sub.id) {
                        <option [value]="sub.id">{{ sub.name }}</option>
                      }
                    </select>
                  </div>

                  <!-- Bairro -->
                  <div class="form-group">
                    <label for="lead-sel-neigh">Bairro *</label>
                    <select
                      id="lead-sel-neigh"
                      class="form-control"
                      [(ngModel)]="selectedNeighborhoodId"
                      (change)="onNeighborhoodChange()"
                      name="selNeigh"
                      [disabled]="!neighborhoodList.length"
                      required
                    >
                      <option value="" disabled selected>Selecione um Bairro...</option>
                      @for (n of neighborhoodList; track n.id) {
                        <option [value]="n.id">{{ n.name }}</option>
                      }
                    </select>
                  </div>

                  <!-- Rua -->
                  <div class="form-group">
                    <label for="lead-sel-street">Rua / Logradouro *</label>
                    <select
                      id="lead-sel-street"
                      class="form-control"
                      [(ngModel)]="selectedStreetId"
                      (change)="onStreetChange()"
                      name="selStreet"
                      [disabled]="!streetList.length"
                      required
                    >
                      <option value="" disabled selected>Selecione uma Rua...</option>
                      @for (s of streetList; track s.id) {
                        <option [value]="s.id">{{ s.name }}</option>
                      }
                    </select>
                  </div>

                  <!-- Residência / Número -->
                  <div class="form-group full-width">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <label for="lead-sel-residence">Número da Residência *</label>
                      <button
                        type="button"
                        (click)="toggleCustomNumber()"
                        style="background: none; border: none; color: #60a5fa; font-size: 0.8rem; cursor: pointer; text-decoration: underline;"
                      >
                        {{ isCustomNumber ? '⬅ Escolher número já mapeado' : '＋ Digitar outro número predial' }}
                      </button>
                    </div>

                    @if (!isCustomNumber) {
                      <select
                        id="lead-sel-residence"
                        class="form-control"
                        [(ngModel)]="selectedResidenceId"
                        name="selResidence"
                        [disabled]="!residenceList.length"
                        required
                      >
                        <option value="" disabled selected>Selecione o Número da Casa...</option>
                        @for (r of residenceList; track r.id) {
                          <option [value]="r.id">Nº {{ r.number }} {{ r.complement ? '(' + r.complement + ')' : '' }}</option>
                        }
                      </select>
                      @if (selectedStreetId && residenceList.length === 0) {
                        <p style="font-size: 0.8rem; color: #f59e0b; margin: 4px 0 0 0;">
                          Nenhum número cadastrado nesta rua. Clique em "Digitar outro número predial" acima.
                        </p>
                      }
                    } @else {
                      <input
                        id="lead-custom-number"
                        type="text"
                        class="form-control"
                        placeholder="Ex: 120, 45-B, S/N"
                        [(ngModel)]="customResidenceNumber"
                        name="customNumber"
                        required
                      />
                    }
                  </div>
                </div>
              </div>
            }

            <div class="form-grid">
              <!-- Nome Completo -->
              <div class="form-group full-width">
                <label for="lead-name">Nome Completo *</label>
                <input
                  id="lead-name"
                  type="text"
                  class="form-control"
                  placeholder="Ex: Maria dos Santos"
                  [(ngModel)]="formData.name"
                  name="name"
                  required
                />
              </div>

              <!-- WhatsApp com link direto -->
              <div class="form-group">
                <label for="lead-whatsapp">WhatsApp / Celular *</label>
                <div class="input-with-action">
                  <input
                    id="lead-whatsapp"
                    type="tel"
                    class="form-control"
                    placeholder="Ex: (14) 99999-8888"
                    [(ngModel)]="formData.whatsapp"
                    name="whatsapp"
                    required
                  />
                  @if (canOpenWhatsapp) {
                    <a
                      [href]="whatsappUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn-whatsapp-action"
                      title="Abrir no WhatsApp Web"
                    >
                      💬
                    </a>
                  }
                </div>
              </div>

              <!-- Data da Visita -->
              <div class="form-group">
                <label for="lead-date">Data da Visita / Contato *</label>
                <input
                  id="lead-date"
                  type="date"
                  class="form-control"
                  [(ngModel)]="formData.date"
                  name="date"
                  required
                />
              </div>

              <!-- Curso ou Área de Interesse -->
              <div class="form-group full-width">
                <label for="lead-course">Curso ou Área de Interesse *</label>
                <input
                  id="lead-course"
                  type="text"
                  class="form-control"
                  placeholder="Ex: Enfermagem, Administração, Direito, TI..."
                  [(ngModel)]="formData.courseOrArea"
                  name="courseOrArea"
                  required
                />
              </div>

              <!-- Origem -->
              <div class="form-group">
                <label for="lead-origin">Origem da Abordagem</label>
                <select
                  id="lead-origin"
                  class="form-control"
                  [(ngModel)]="formData.origin"
                  name="origin"
                >
                  <option value="VISITA_DOMICILIAR">Visita Domiciliar (Padrão)</option>
                  <option value="INDICACAO">Indicação de Vizinho/Amigo</option>
                  <option value="EVENTO">Evento / Ação Externa</option>
                  <option value="REDES_SOCIAIS">Redes Sociais / WhatsApp</option>
                  <option value="BALCAO">Balcão / Presencial</option>
                  <option value="OUTRO">Outra Origem</option>
                </select>
              </div>

              <!-- Status do Lead -->
              <div class="form-group">
                <label>Status do Lead *</label>
                <div class="status-selector">
                  <button
                    type="button"
                    class="status-pill pill-falhou"
                    [class.active]="formData.status === 'FALHOU'"
                    (click)="formData.status = 'FALHOU'"
                  >
                    Falhou
                  </button>
                  <button
                    type="button"
                    class="status-pill pill-lead"
                    [class.active]="formData.status === 'LEAD'"
                    (click)="formData.status = 'LEAD'"
                  >
                    Lead
                  </button>
                  <button
                    type="button"
                    class="status-pill pill-inscricao"
                    [class.active]="formData.status === 'INSCRICAO'"
                    (click)="formData.status = 'INSCRICAO'"
                  >
                    Inscrição
                  </button>
                  <button
                    type="button"
                    class="status-pill pill-matricula"
                    [class.active]="formData.status === 'MATRICULA'"
                    (click)="formData.status = 'MATRICULA'"
                  >
                    Matrícula
                  </button>
                </div>
              </div>

              <!-- Classificação em 5 Estrelas (Probabilidade de Matrícula) -->
              <div class="form-group full-width rating-picker-card">
                <div class="rating-card-header">
                  <div class="rating-title-block">
                    <label class="rating-title">
                      ⭐ Classificação do Lead — Probabilidade de Matrícula *
                    </label>
                    <span class="rating-subtitle">
                      1 estrela = Pouco provável &bull; 5 estrelas = Muito provável de realizar a matrícula
                    </span>
                  </div>
                  <div class="rating-badge" [ngClass]="getRatingBadgeClass(hoverRating || formData.rating)">
                    {{ getRatingBadgeText(hoverRating || formData.rating) }}
                  </div>
                </div>

                <div class="rating-interactive-row">
                  <div class="stars-strip" role="radiogroup" aria-label="Classificação de 1 a 5 estrelas">
                    @for (star of [1, 2, 3, 4, 5]; track star) {
                      <button
                        type="button"
                        class="star-btn"
                        [class.active]="star <= (hoverRating || formData.rating)"
                        [class.hover-preview]="hoverRating > 0 && star <= hoverRating"
                        (mouseenter)="hoverRating = star"
                        (mouseleave)="hoverRating = 0"
                        (click)="formData.rating = star"
                        [attr.aria-checked]="formData.rating === star"
                        role="radio"
                        [title]="getRatingFullDescription(star)"
                      >
                        ★
                      </button>
                    }
                  </div>
                  <span class="rating-numeric-display">
                    {{ hoverRating || formData.rating }} / 5
                  </span>
                </div>

                <!-- Barra de botões/rótulos clicáveis da escala -->
                <div class="rating-levels-bar">
                  @for (level of ratingLevels; track level.value) {
                    <button
                      type="button"
                      class="level-chip"
                      [class.active]="formData.rating === level.value"
                      (click)="formData.rating = level.value"
                      (mouseenter)="hoverRating = level.value"
                      (mouseleave)="hoverRating = 0"
                    >
                      <span class="chip-star">{{ level.value }}★</span>
                      <span class="chip-text">{{ level.shortLabel }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Contato Efetivo -->
              <div class="form-group full-width consent-box">
                <label class="checkbox-container">
                  <input
                    type="checkbox"
                    [(ngModel)]="formData.effectiveContact"
                    name="effectiveContact"
                  />
                  <span class="checkbox-custom"></span>
                  <span class="consent-text">
                    <strong>Contato Efetivo Realizado:</strong> Houve diálogo direto com o morador da residência (desmarque se a casa estava vazia ou ninguém atendeu).
                  </span>
                </label>
              </div>

              <!-- Autoriza Receber Informações (LGPD) -->
              <div class="form-group full-width consent-box">
                <label class="checkbox-container">
                  <input
                    type="checkbox"
                    [(ngModel)]="formData.authorizedInfo"
                    name="authorizedInfo"
                  />
                  <span class="checkbox-custom"></span>
                  <span class="consent-text">
                    <strong>Autoriza receber informações:</strong> O contato autorizou o envio de comunicações, novidades de cursos, bolsas e processos seletivos via WhatsApp ou e-mail.
                  </span>
                </label>
              </div>

              <!-- Observações -->
              <div class="form-group full-width">
                <label for="lead-notes">Observações do Captador / Agente</label>
                <textarea
                  id="lead-notes"
                  rows="3"
                  class="form-control"
                  placeholder="Ex: Demonstrou muito interesse no vestibular de inverno, mora com os pais, melhor horário para retorno é à noite."
                  [(ngModel)]="formData.observations"
                  name="observations"
                ></textarea>
              </div>
            </div>
          </div>

          <footer class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              (click)="closeModal()"
              [disabled]="isSaving"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="isSaving || !isValid"
            >
              @if (isSaving) {
                <span>Salvando...</span>
              } @else if (leadToEdit) {
                <span>Atualizar Lead</span>
              } @else {
                <span class="desktop-btn-label">Salvar Lead e Atualizar Conclusão</span>
                <span class="mobile-btn-label">Salvar Lead</span>
              }
            </button>
          </footer>
        </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      width: 100%;
      height: 100vh;
      height: 100dvh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      padding: 1rem;
      box-sizing: border-box;
      overflow: hidden;
    }
    .modal-card {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      width: 100%;
      max-width: 650px;
      max-height: calc(100vh - 2rem);
      max-height: calc(100dvh - 2rem);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      animation: modalEnter 0.2s ease-out;
    }
    @keyframes modalEnter {
      from { opacity: 0; transform: scale(0.96) translateY(-8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-header {
      padding: 1.25rem 1.75rem 1rem;
      border-bottom: 1px solid var(--border-color, #3f3f46);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-shrink: 0;
      background: var(--color-surface, #18181b);
    }
    .breadcrumb-context {
      font-size: 0.8rem;
      color: var(--primary-color, #60a5fa);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.25rem;
    }
    .modal-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 0.25rem;
    }
    .residence-sub {
      font-size: 0.875rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin: 0;
    }
    .residence-sub strong { color: #f4f4f5; }
    .btn-close {
      background: transparent;
      border: none;
      color: var(--text-color-secondary, #a1a1aa);
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 6px;
      min-width: 36px;
      min-height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
    }
    .btn-close:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
    .modal-form {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .modal-body-scroll {
      padding: 1.5rem 1.75rem 2rem;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }
    .alert-box {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.25rem;
      font-size: 0.875rem;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }
    .full-width { grid-column: span 2; }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #e4e4e7;
    }
    .form-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: #fff;
      font-size: 0.95rem;
      transition: all 0.15s;
    }
    .form-control:focus {
      outline: none;
      border-color: var(--primary-color, #3b82f6);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }
    .input-with-action {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .input-with-action .form-control { flex: 1; }
    .btn-whatsapp-action {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #4ade80;
      text-decoration: none;
      padding: 0.6rem 0.85rem;
      border-radius: 8px;
      font-size: 1.1rem;
      transition: all 0.15s;
    }
    .btn-whatsapp-action:hover {
      background: rgba(34, 197, 94, 0.3);
      transform: scale(1.05);
    }
    .status-selector {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.4rem;
    }
    .status-pill {
      padding: 0.6rem 0.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s;
      background: rgba(255, 255, 255, 0.05);
      color: #a1a1aa;
      text-align: center;
    }
    .status-pill.pill-falhou.active {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #fca5a5;
    }
    .status-pill.pill-lead.active {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3b82f6;
      color: #93c5fd;
    }
    .status-pill.pill-inscricao.active {
      background: rgba(245, 158, 11, 0.2);
      border-color: #f59e0b;
      color: #fcd34d;
    }
    .status-pill.pill-matricula.active {
      background: rgba(34, 197, 94, 0.2);
      border-color: #22c55e;
      color: #86efac;
    }
    .consent-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 0.85rem 1rem;
    }
    .checkbox-container {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
      margin: 0;
    }
    .checkbox-container input {
      width: 18px;
      height: 18px;
      accent-color: var(--primary-color, #3b82f6);
      cursor: pointer;
      margin-top: 2px;
    }
    .consent-text {
      font-size: 0.825rem;
      line-height: 1.4;
      color: #d4d4d8;
    }
    .consent-text strong { color: #fff; }
    .modal-footer {
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.75rem;
      padding-bottom: max(1rem, env(safe-area-inset-bottom, 1rem));
      border-top: 1px solid var(--border-color, #3f3f46);
      background: var(--color-surface, #18181b);
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.35);
      z-index: 10;
    }
    .desktop-btn-label {
      display: inline;
    }
    .mobile-btn-label {
      display: none;
    }
    .btn {
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border-color, #3f3f46);
      color: var(--text-color, #d4d4d8);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
    .btn-primary {
      background: var(--primary-color, #3b82f6);
      border: 1px solid var(--primary-color, #3b82f6);
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .location-picker-card {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .location-picker-title {
      font-size: 0.9rem;
      font-weight: 700;
      color: #93c5fd;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .location-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    .rating-picker-card {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.03) 100%);
      border: 1px solid rgba(245, 158, 11, 0.28);
      border-radius: 10px;
      padding: 1rem 1.25rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .rating-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.85rem;
      flex-wrap: wrap;
    }
    .rating-title-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .rating-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #fbbf24;
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
    }
    .rating-subtitle {
      font-size: 0.78rem;
      color: #d1d5db;
    }
    .rating-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.3rem 0.75rem;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .rating-badge.rating-pill-1 {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid #ef4444;
      color: #fca5a5;
    }
    .rating-badge.rating-pill-2 {
      background: rgba(249, 115, 22, 0.2);
      border: 1px solid #f97316;
      color: #fdba74;
    }
    .rating-badge.rating-pill-3 {
      background: rgba(234, 179, 8, 0.2);
      border: 1px solid #eab308;
      color: #fde047;
    }
    .rating-badge.rating-pill-4 {
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid #3b82f6;
      color: #93c5fd;
    }
    .rating-badge.rating-pill-5 {
      background: rgba(34, 197, 94, 0.25);
      border: 1px solid #22c55e;
      color: #86efac;
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
    }
    .rating-interactive-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.85rem;
    }
    .stars-strip {
      display: flex;
      gap: 0.35rem;
    }
    .star-btn {
      background: none;
      border: none;
      font-size: 2.25rem;
      line-height: 1;
      color: #4b5563;
      cursor: pointer;
      padding: 0.15rem 0.25rem;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      outline: none;
    }
    .star-btn:hover,
    .star-btn:focus-visible {
      transform: scale(1.22);
    }
    .star-btn.active {
      color: #fbbf24;
      filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.7));
    }
    .star-btn.hover-preview {
      color: #f59e0b;
      filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.85));
    }
    .rating-numeric-display {
      font-size: 1.15rem;
      font-weight: 800;
      color: #f3f4f6;
      background: rgba(0, 0, 0, 0.35);
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .rating-levels-bar {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.4rem;
    }
    .level-chip {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 0.4rem 0.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      cursor: pointer;
      transition: all 0.15s ease;
      color: #9ca3af;
      font-size: 0.72rem;
      text-align: center;
    }
    .level-chip:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(251, 191, 36, 0.4);
      color: #f3f4f6;
    }
    .level-chip.active {
      background: rgba(245, 158, 11, 0.2);
      border-color: #f59e0b;
      color: #fbbf24;
      font-weight: 700;
    }
    .level-chip .chip-star {
      font-weight: 800;
      font-size: 0.8rem;
    }
    .level-chip.active .chip-star {
      color: #fbbf24;
    }
    .level-chip .chip-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    @media (max-width: 640px) {
      .modal-backdrop {
        padding: 0;
        align-items: flex-end;
      }
      .modal-card {
        border-radius: 16px 16px 0 0;
        max-width: 100%;
        width: 100%;
        height: 100vh;
        height: 100dvh;
        max-height: 100vh;
        max-height: 100dvh;
        border-left: none;
        border-right: none;
        border-bottom: none;
      }
      .modal-header {
        padding: 1rem 1.25rem 0.75rem;
      }
      .modal-title {
        font-size: 1.15rem;
      }
      .modal-body-scroll {
        padding: 1rem 1.25rem 1.5rem;
      }
      .modal-footer {
        padding: 0.75rem 1rem max(0.85rem, env(safe-area-inset-bottom, 0.85rem));
        display: flex;
        flex-direction: row;
        gap: 0.5rem;
        background: #18181b;
      }
      .modal-footer .btn {
        min-height: 48px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.925rem;
      }
      .modal-footer .btn-secondary {
        flex: 0 0 auto;
        min-width: 90px;
        padding: 0.65rem 0.85rem;
      }
      .modal-footer .btn-primary {
        flex: 1;
        padding: 0.65rem 0.85rem;
        text-align: center;
      }
      .desktop-btn-label {
        display: none;
      }
      .mobile-btn-label {
        display: inline;
      }
      .form-grid { grid-template-columns: 1fr; }
      .location-grid { grid-template-columns: 1fr; }
      .full-width { grid-column: span 1; }
      .status-selector { grid-template-columns: repeat(2, 1fr); }
      .rating-levels-bar { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class LeadModalComponent implements OnChanges {
  @Input() isOpen = false
  @Input() residenceContext?: ResidenceContextInfo
  @Input() leadToEdit?: LeadItem | null

  @Output() close = new EventEmitter<void>()
  @Output() saved = new EventEmitter<LeadItem>()

  readonly ratingLevels = [
    { value: 1, shortLabel: 'Pouco provável', description: 'Pouco provável de realizar a matrícula' },
    { value: 2, shortLabel: 'Baixa prob.', description: 'Baixa probabilidade de realizar a matrícula' },
    { value: 3, shortLabel: 'Média prob.', description: 'Média probabilidade de realizar a matrícula' },
    { value: 4, shortLabel: 'Provável / Alta', description: 'Alta probabilidade de realizar a matrícula' },
    { value: 5, shortLabel: 'Muito provável', description: 'Muito provável de realizar a matrícula' },
  ]
  hoverRating = 0

  formData: {
    name: string
    whatsapp: string
    courseOrArea: string
    date: string
    origin: string
    authorizedInfo: boolean
    effectiveContact: boolean
    status: LeadStatus
    rating: number
    observations: string
  } = {
    name: '',
    whatsapp: '',
    courseOrArea: '',
    date: new Date().toISOString().split('T')[0],
    origin: 'VISITA_DOMICILIAR',
    authorizedInfo: false,
    effectiveContact: true,
    status: 'LEAD',
    rating: 3,
    observations: '',
  }

  isSaving = false
  errorMessage = ''

  territoryList: TerritoryItem[] = []
  subterritoryList: SubterritoryItem[] = []
  neighborhoodList: NeighborhoodItem[] = []
  streetList: StreetItem[] = []
  residenceList: ResidenceNumberItem[] = []

  selectedTerritoryId = ''
  selectedSubterritoryId = ''
  selectedNeighborhoodId = ''
  selectedStreetId = ''
  selectedResidenceId = ''
  isCustomNumber = false
  customResidenceNumber = ''

  constructor(private readonly territoryService: TerritoryService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.errorMessage = ''
      if (this.leadToEdit) {
        this.formData = {
          name: this.leadToEdit.name,
          whatsapp: this.leadToEdit.whatsapp,
          courseOrArea: this.leadToEdit.courseOrArea,
          date: this.leadToEdit.date.split('T')[0],
          origin: this.leadToEdit.origin || 'VISITA_DOMICILIAR',
          authorizedInfo: this.leadToEdit.authorizedInfo,
          effectiveContact: this.leadToEdit.effectiveContact ?? (this.leadToEdit.status !== 'FALHOU'),
          status: this.leadToEdit.status,
          rating: this.leadToEdit.rating ?? 3,
          observations: this.leadToEdit.observations || '',
        }
      } else {
        this.resetForm()
        if (!this.residenceContext) {
          this.loadTerritoryOptions()
        }
      }
    }
  }

  loadTerritoryOptions(): void {
    this.territoryService.getTerritories().subscribe({
      next: (data) => {
        this.territoryList = data || []
        if (this.territoryList.length === 1) {
          this.selectedTerritoryId = this.territoryList[0].id
          this.onTerritoryChange()
        }
      },
    })
  }

  onTerritoryChange(): void {
    this.selectedSubterritoryId = ''
    this.selectedNeighborhoodId = ''
    this.selectedStreetId = ''
    this.selectedResidenceId = ''
    this.subterritoryList = []
    this.neighborhoodList = []
    this.streetList = []
    this.residenceList = []

    if (!this.selectedTerritoryId) return

    this.territoryService.getTerritoryHierarchy(this.selectedTerritoryId).subscribe({
      next: (hierarchy: TerritoryHierarchy) => {
        this.subterritoryList = hierarchy.subterritories || []
        if (this.subterritoryList.length === 1) {
          this.selectedSubterritoryId = this.subterritoryList[0].id
          this.onSubterritoryChange()
        }
      },
    })
  }

  onSubterritoryChange(): void {
    this.selectedNeighborhoodId = ''
    this.selectedStreetId = ''
    this.selectedResidenceId = ''
    this.neighborhoodList = []
    this.streetList = []
    this.residenceList = []

    const sub = this.subterritoryList.find((s) => s.id === this.selectedSubterritoryId)
    if (sub) {
      this.neighborhoodList = sub.neighborhoods || []
      if (this.neighborhoodList.length === 1) {
        this.selectedNeighborhoodId = this.neighborhoodList[0].id
        this.onNeighborhoodChange()
      }
    }
  }

  onNeighborhoodChange(): void {
    this.selectedStreetId = ''
    this.selectedResidenceId = ''
    this.streetList = []
    this.residenceList = []

    const neigh = this.neighborhoodList.find((n) => n.id === this.selectedNeighborhoodId)
    if (neigh) {
      this.streetList = neigh.streets || []
      if (this.streetList.length === 1) {
        this.selectedStreetId = this.streetList[0].id
        this.onStreetChange()
      }
    }
  }

  onStreetChange(): void {
    this.selectedResidenceId = ''
    this.residenceList = []

    const street = this.streetList.find((s) => s.id === this.selectedStreetId)
    if (street && street.residences && street.residences.length > 0) {
      this.residenceList = street.residences
      this.isCustomNumber = false
    } else {
      this.isCustomNumber = true
    }
  }

  toggleCustomNumber(): void {
    this.isCustomNumber = !this.isCustomNumber
    if (this.isCustomNumber) {
      this.selectedResidenceId = ''
    }
  }

  get isValid(): boolean {
    const basicValid =
      this.formData.name.trim().length >= 2 &&
      this.formData.whatsapp.trim().length >= 8 &&
      this.formData.courseOrArea.trim().length >= 2 &&
      Boolean(this.formData.date)

    if (!basicValid) return false

    // Se estiver editando ou tiver residenceContext prévio, localização já está garantida
    if (this.leadToEdit || this.residenceContext?.residenceId) {
      return true
    }

    // Caso contrário, precisa ter rua e residência selecionada ou número customizado informado
    const hasStreet = Boolean(this.selectedStreetId)
    const hasResidence = this.isCustomNumber
      ? Boolean(this.customResidenceNumber.trim())
      : Boolean(this.selectedResidenceId)

    return hasStreet && hasResidence
  }

  get canOpenWhatsapp(): boolean {
    const raw = this.formData.whatsapp.replace(/\D/g, '')
    return raw.length >= 10
  }

  get whatsappUrl(): string {
    const raw = this.formData.whatsapp.replace(/\D/g, '')
    const phone = raw.startsWith('55') ? raw : `55${raw}`
    return `https://wa.me/${phone}`
  }

  getRatingBadgeText(rating: number): string {
    switch (rating) {
      case 1:
        return '1★ • Pouco provável'
      case 2:
        return '2★ • Baixa probabilidade'
      case 3:
        return '3★ • Média probabilidade'
      case 4:
        return '4★ • Alta probabilidade'
      case 5:
        return '5★ • Muito provável de matricular'
      default:
        return `${rating}★`
    }
  }

  getRatingFullDescription(rating: number): string {
    const item = this.ratingLevels.find((l) => l.value === rating)
    return item ? item.description : `${rating} estrelas`
  }

  getRatingBadgeClass(rating: number): string {
    switch (rating) {
      case 1:
        return 'rating-pill-1'
      case 2:
        return 'rating-pill-2'
      case 3:
        return 'rating-pill-3'
      case 4:
        return 'rating-pill-4'
      case 5:
        return 'rating-pill-5'
      default:
        return 'rating-pill-3'
    }
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal()
    }
  }

  closeModal(): void {
    this.close.emit()
  }

  saveLead(): void {
    if (!this.isValid || this.isSaving) return
    this.isSaving = true
    this.errorMessage = ''

    if (this.leadToEdit) {
      this.territoryService
        .updateLead(this.leadToEdit.id, {
          name: this.formData.name.trim(),
          whatsapp: this.formData.whatsapp.trim(),
          courseOrArea: this.formData.courseOrArea.trim(),
          date: this.formData.date,
          origin: this.formData.origin,
          authorizedInfo: this.formData.authorizedInfo,
          effectiveContact: this.formData.effectiveContact,
          status: this.formData.status,
          rating: this.formData.rating,
          observations: this.formData.observations.trim() || undefined,
        })
        .subscribe({
          next: (updated) => {
            this.isSaving = false
            this.saved.emit(updated)
            this.closeModal()
          },
          error: (err) => {
            this.isSaving = false
            this.errorMessage =
              err?.error?.message || 'Erro ao atualizar o lead.'
          },
        })
    } else if (this.residenceContext?.residenceId) {
      this.executeCreateLead(this.residenceContext.residenceId)
    } else {
      // Cadastro direto pela tela de leads
      if (this.isCustomNumber && this.customResidenceNumber.trim()) {
        if (!this.selectedStreetId) {
          this.errorMessage = 'Selecione a rua antes de informar o número.'
          this.isSaving = false
          return
        }

        this.territoryService
          .createResidenceNumber({
            streetId: this.selectedStreetId,
            number: this.customResidenceNumber.trim(),
          })
          .subscribe({
            next: (newResidence) => {
              this.executeCreateLead(newResidence.id)
            },
            error: (err) => {
              this.isSaving = false
              this.errorMessage =
                err?.error?.message || 'Erro ao criar número de residência.'
            },
          })
      } else if (this.selectedResidenceId) {
        this.executeCreateLead(this.selectedResidenceId)
      } else {
        this.errorMessage = 'Selecione uma residência ou informe um número predial.'
        this.isSaving = false
      }
    }
  }

  private executeCreateLead(residenceId: string): void {
    this.territoryService
      .createLead({
        residenceNumberId: residenceId,
        name: this.formData.name.trim(),
        whatsapp: this.formData.whatsapp.trim(),
        courseOrArea: this.formData.courseOrArea.trim(),
        date: this.formData.date,
        origin: this.formData.origin,
        authorizedInfo: this.formData.authorizedInfo,
        effectiveContact: this.formData.effectiveContact,
        status: this.formData.status,
        rating: this.formData.rating,
        observations: this.formData.observations.trim() || undefined,
      })
      .subscribe({
        next: (created) => {
          this.isSaving = false
          this.saved.emit(created)
          this.closeModal()
        },
        error: (err) => {
          this.isSaving = false
          this.errorMessage =
            err?.error?.message || 'Erro ao cadastrar o lead.'
        },
      })
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      whatsapp: '',
      courseOrArea: '',
      date: new Date().toISOString().split('T')[0],
      origin: 'VISITA_DOMICILIAR',
      authorizedInfo: false,
      effectiveContact: true,
      status: 'LEAD',
      rating: 3,
      observations: '',
    }
    this.hoverRating = 0
  }
}
