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

          <form (ngSubmit)="saveLead()" class="modal-body">
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
                {{ isSaving ? 'Salvando...' : (leadToEdit ? 'Atualizar Lead' : 'Salvar Lead e Atualizar Conclusão') }}
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
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      padding: 1rem;
    }
    .modal-card {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      width: 100%;
      max-width: 650px;
      max-height: 92vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      animation: modalEnter 0.2s ease-out;
    }
    @keyframes modalEnter {
      from { opacity: 0; transform: scale(0.96) translateY(-8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-header {
      padding: 1.5rem 1.75rem 1rem;
      border-bottom: 1px solid var(--border-color, #3f3f46);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
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
      padding: 4px;
      border-radius: 4px;
    }
    .btn-close:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
    .modal-body { padding: 1.5rem 1.75rem; }
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
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-color, #3f3f46);
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
    @media (max-width: 600px) {
      .form-grid { grid-template-columns: 1fr; }
      .location-grid { grid-template-columns: 1fr; }
      .full-width { grid-column: span 1; }
      .status-selector { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class LeadModalComponent implements OnChanges {
  @Input() isOpen = false
  @Input() residenceContext?: ResidenceContextInfo
  @Input() leadToEdit?: LeadItem | null

  @Output() close = new EventEmitter<void>()
  @Output() saved = new EventEmitter<LeadItem>()

  formData: {
    name: string
    whatsapp: string
    courseOrArea: string
    date: string
    origin: string
    authorizedInfo: boolean
    effectiveContact: boolean
    status: LeadStatus
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
      observations: '',
    }
  }
}
