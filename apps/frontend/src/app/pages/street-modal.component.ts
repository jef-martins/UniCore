import { CommonModule, isPlatformBrowser } from '@angular/common'
import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
  AddressSearchResult,
  NeighborhoodItem,
  StreetItem,
  SubterritoryItem,
  TerritoryHierarchy,
  TerritoryItem,
  TerritoryService,
} from '../services/territory.service'

export interface StreetCreationResult {
  street: StreetItem
  neighborhood: NeighborhoodItem
  territoryId: string
  subterritoryId: string
  isNewNeighborhood: boolean
}

@Component({
  selector: 'app-street-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div class="modal-backdrop" (click)="onBackdropClick($event)">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="street-modal-title">
          <!-- Cabeçalho -->
          <header class="modal-header">
            <div>
              <div class="breadcrumb-context">
                Território &bull; Logradouros
              </div>
              <h2 id="street-modal-title" class="modal-title">
                Cadastrar Nova Rua
              </h2>
              <p class="modal-subtitle">
                Cadastre por CEP, localização GPS com ajuste no mapa ou preenchendo os dados manualmente.
              </p>
            </div>
            <button class="btn-close" type="button" (click)="closeModal()" aria-label="Fechar modal">✕</button>
          </header>

          <form (ngSubmit)="saveStreet()" class="modal-form">
            <div class="modal-body-scroll">
              @if (errorMessage) {
                <div class="alert-box alert-error">
                  <span>⚠ {{ errorMessage }}</span>
                </div>
              }

              <!-- Abas de Modo de Preenchimento -->
              <div class="mode-tabs" role="tablist">
                <button
                  type="button"
                  class="mode-tab"
                  [class.active]="activeMode === 'cep'"
                  (click)="setMode('cep')"
                >
                  <span class="tab-icon">🔍</span>
                  <span class="tab-label">Digitar CEP</span>
                </button>
                <button
                  type="button"
                  class="mode-tab"
                  [class.active]="activeMode === 'gps'"
                  (click)="setMode('gps')"
                >
                  <span class="tab-icon">📍</span>
                  <span class="tab-label">Localização GPS & Mapa</span>
                </button>
                <button
                  type="button"
                  class="mode-tab"
                  [class.active]="activeMode === 'manual'"
                  (click)="setMode('manual')"
                >
                  <span class="tab-icon">✏️</span>
                  <span class="tab-label">Manual</span>
                </button>
              </div>

              <!-- MODO: CEP -->
              @if (activeMode === 'cep') {
                <div class="helper-card">
                  <div class="helper-card-header">
                    <span class="helper-icon">📮</span>
                    <div>
                      <h4 class="helper-title">Busca Automática via CEP</h4>
                      <p class="helper-desc">
                        Digite os 8 dígitos do CEP. O nome da rua, o bairro e a cidade serão localizados automaticamente.
                      </p>
                    </div>
                  </div>

                  <div class="cep-search-row">
                    <div class="cep-input-group">
                      <input
                        type="text"
                        class="form-control"
                        placeholder="Ex: 17500-000"
                        [(ngModel)]="cepInput"
                        (input)="onCepInputChange()"
                        name="cepInput"
                        maxlength="9"
                      />
                      <button
                        type="button"
                        class="btn-search-cep"
                        (click)="searchCep()"
                        [disabled]="isSearchingCep || cleanCep(cepInput).length !== 8"
                      >
                        @if (isSearchingCep) {
                          <span class="spinner-inline"></span> Buscando...
                        } @else {
                          Buscar CEP
                        }
                      </button>
                    </div>
                  </div>

                  @if (cepSuccessMessage) {
                    <div class="status-msg success">
                      ✓ {{ cepSuccessMessage }}
                    </div>
                  }
                  @if (cepErrorMessage) {
                    <div class="status-msg error">
                      ⚠ {{ cepErrorMessage }}
                    </div>
                  }
                </div>
              }

              <!-- MODO: GPS / LOCALIZAÇÃO COM AJUSTE DE PRECISÃO NO MAPA -->
              @if (activeMode === 'gps') {
                <div class="helper-card">
                  <div class="helper-card-header">
                    <span class="helper-icon">🛰️</span>
                    <div>
                      <h4 class="helper-title">Localização do Dispositivo & Ajuste Fino</h4>
                      <p class="helper-desc">
                        Obtenha as coordenadas do dispositivo ou posicione sua rua diretamente no mapa interativo.
                      </p>
                    </div>
                  </div>

                  <div class="gps-action-box">
                    <button
                      type="button"
                      class="btn-gps-locate"
                      (click)="captureLocation()"
                      [disabled]="isLocatingGps"
                    >
                      @if (isLocatingGps) {
                        <span class="spinner-inline"></span>
                        <span>{{ locatingStatusText || 'Buscando melhor precisão GPS...' }}</span>
                      } @else {
                        <span>📍 Obter Minha Localização Atual</span>
                      }
                    </button>
                  </div>

                  <!-- Indicador de Qualidade da Precisão -->
                  @if (gpsAccuracy > 0) {
                    <div class="accuracy-badge-box">
                      @if (gpsAccuracy <= 50) {
                        <div class="accuracy-pill accuracy-high">
                          <span class="accuracy-dot"></span>
                          <span>Alta Precisão (GPS de Satélite): ±{{ Math.round(gpsAccuracy) }}m</span>
                        </div>
                      } @else if (gpsAccuracy <= 200) {
                        <div class="accuracy-pill accuracy-medium">
                          <span class="accuracy-dot"></span>
                          <span>Precisão Média: ±{{ Math.round(gpsAccuracy) }}m</span>
                        </div>
                      } @else {
                        <div class="accuracy-pill accuracy-low">
                          <span class="accuracy-dot"></span>
                          <span>Precisão Estimada por Rede/IP: ±{{ formatDistance(gpsAccuracy) }}</span>
                        </div>
                        <div class="accuracy-hint-card">
                          <span class="hint-icon">💡</span>
                          <div class="hint-body">
                            <strong>Computadores de mesa/notebooks sem chip GPS estimam a posição pelo provedor de internet.</strong>
                            <p>
                              Para colocar na sua rua exata (ex: <em>Carlos Artêncio</em>), você pode <strong>arrastar o pino no mapa abaixo</strong> ou pesquisar o nome da rua no campo de busca:
                            </p>
                          </div>
                        </div>
                      }
                    </div>
                  }

                  <!-- Barra de Pesquisa Rápida de Rua para posicionar no mapa -->
                  <div class="street-search-bar">
                    <label for="str-quick-search" class="street-search-label">
                      🔎 Localizar rua no mapa pelo nome (ex: Carlos Artencio):
                    </label>
                    <div class="street-search-input-group">
                      <input
                        id="str-quick-search"
                        type="text"
                        class="form-control"
                        placeholder="Digite o nome da rua..."
                        [(ngModel)]="searchStreetQuery"
                        (keydown.enter)="searchStreetAddress(); $event.preventDefault()"
                        name="quickSearchStreet"
                      />
                      <button
                        type="button"
                        class="btn-quick-search"
                        (click)="searchStreetAddress()"
                        [disabled]="isSearchingAddress || searchStreetQuery.trim().length < 2"
                      >
                        @if (isSearchingAddress) {
                          <span class="spinner-inline"></span>
                        } @else {
                          Localizar
                        }
                      </button>
                    </div>

                    @if (addressSearchResults.length > 0) {
                      <div class="address-suggestions-box">
                        <div class="suggestions-header">Ruas encontradas (clique para posicionar o mapa):</div>
                        @for (item of addressSearchResults; track $index) {
                          <button
                            type="button"
                            class="suggestion-row"
                            (click)="selectAddressSearchResult(item)"
                          >
                            <span class="sugg-pin">📍</span>
                            <div class="sugg-info">
                              <strong class="sugg-road">{{ item.road || item.displayName }}</strong>
                              <span class="sugg-sub">
                                {{ item.neighbourhood ? item.neighbourhood + ' • ' : '' }}{{ item.city }}{{ item.zipCode ? ' (CEP ' + item.zipCode + ')' : '' }}
                              </span>
                            </div>
                            <span class="sugg-action">Selecionar →</span>
                          </button>
                        }
                      </div>
                    }
                  </div>

                  <!-- MINI-MAPA INTERATIVO LEAFLET -->
                  <div class="interactive-map-wrapper">
                    <div class="map-instruction-bar">
                      <span>📌 <strong>Arraste o pino</strong> ou <strong>clique no mapa</strong> para definir o ponto exato da sua rua</span>
                    </div>
                    <div id="street-mini-map-canvas" class="street-mini-map-canvas"></div>
                  </div>

                  @if (gpsCoordsText) {
                    <div class="coords-display">
                      <span class="coords-label">Coordenadas ativas:</span>
                      <code>{{ gpsCoordsText }}</code>
                    </div>
                  }

                  @if (gpsSuccessMessage) {
                    <div class="status-msg success">
                      ✓ {{ gpsSuccessMessage }}
                    </div>
                  }
                  @if (gpsErrorMessage) {
                    <div class="status-msg error">
                      ⚠ {{ gpsErrorMessage }}
                    </div>
                  }
                </div>
              }

              <!-- AVISO DE "FORA DO BAIRRO" -->
              @if (isOutsideCurrentNeighborhood) {
                <div class="alert-box alert-outside-notice">
                  <div class="alert-icon">📍</div>
                  <div class="alert-content">
                    <strong class="alert-highlight">Localização fora do bairro selecionado!</strong>
                    <p class="alert-desc">
                      {{ outsideNoticeText }}
                    </p>
                    <span class="badge-auto-neighborhood">
                      ✨ Bairro novo será cadastrado automaticamente com a rua
                    </span>
                  </div>
                </div>
              }

              <!-- FORMULÁRIO DE LOCALIZAÇÃO TERRITORIAL -->
              <div class="section-divider">
                <span class="divider-text">Hierarquia Territorial</span>
              </div>

              <div class="form-grid">
                <!-- Território -->
                <div class="form-group">
                  <label for="str-territory">Território *</label>
                  <select
                    id="str-territory"
                    class="form-control"
                    [(ngModel)]="selectedTerritoryId"
                    (change)="onTerritoryChange()"
                    name="strTerritory"
                    required
                  >
                    <option value="" disabled selected>Selecione o Território...</option>
                    @for (t of territoryList; track t.id) {
                      <option [value]="t.id">{{ t.name }}</option>
                    }
                  </select>
                </div>

                <!-- Subterritório -->
                <div class="form-group">
                  <label for="str-subterritory">Subterritório *</label>
                  <select
                    id="str-subterritory"
                    class="form-control"
                    [(ngModel)]="selectedSubterritoryId"
                    (change)="onSubterritoryChange()"
                    name="strSubterritory"
                    [disabled]="!subterritoryList.length"
                    required
                  >
                    <option value="" disabled selected>Selecione o Subterritório...</option>
                    @for (sub of subterritoryList; track sub.id) {
                      <option [value]="sub.id">{{ sub.name }}</option>
                    }
                  </select>
                </div>

                <!-- Configuração do Bairro -->
                <div class="form-group full-width neighborhood-box">
                  <div class="neighborhood-header">
                    <label>Bairro do Logradouro *</label>
                    <label class="checkbox-inline">
                      <input
                        type="checkbox"
                        [(ngModel)]="isCreatingNewNeighborhood"
                        (change)="onToggleNewNeighborhood()"
                        name="chkNewNeigh"
                      />
                      <span>Cadastrar novo bairro</span>
                    </label>
                  </div>

                  @if (isCreatingNewNeighborhood) {
                    <div class="new-neighborhood-fields">
                      <div class="form-group">
                        <label for="str-new-neigh-name">
                          Nome do Novo Bairro *
                          @if (isOutsideCurrentNeighborhood) {
                            <span class="tag-detected">Detectado via CEP/GPS</span>
                          }
                        </label>
                        <input
                          id="str-new-neigh-name"
                          type="text"
                          class="form-control highlight-input"
                          placeholder="Ex: Jardim Eldorado, Parque São Jorge..."
                          [(ngModel)]="newNeighborhoodName"
                          name="newNeighName"
                          required
                        />
                      </div>
                      <div class="form-group">
                        <label for="str-new-neigh-city">Cidade / Município</label>
                        <input
                          id="str-new-neigh-city"
                          type="text"
                          class="form-control"
                          placeholder="Ex: Marília"
                          [(ngModel)]="newNeighborhoodCity"
                          name="newNeighCity"
                        />
                      </div>
                    </div>
                  } @else {
                    <select
                      id="str-neighborhood"
                      class="form-control"
                      [(ngModel)]="selectedNeighborhoodId"
                      name="strNeighborhood"
                      [disabled]="!neighborhoodList.length"
                      required
                    >
                      <option value="" disabled selected>Selecione o Bairro existente...</option>
                      @for (n of neighborhoodList; track n.id) {
                        <option [value]="n.id">{{ n.name }}</option>
                      }
                    </select>
                    @if (selectedSubterritoryId && neighborhoodList.length === 0) {
                      <p class="field-hint">
                        Nenhum bairro cadastrado neste subterritório. A opção "Cadastrar novo bairro" acima foi ativada.
                      </p>
                    }
                  }
                </div>
              </div>

              <!-- DADOS DA RUA -->
              <div class="section-divider">
                <span class="divider-text">Dados do Logradouro</span>
              </div>

              <div class="form-grid">
                <!-- Nome da Rua -->
                <div class="form-group full-width">
                  <label for="str-name">
                    Nome da Rua / Logradouro *
                    <span class="edit-pill">Você pode editar se necessário</span>
                  </label>
                  <input
                    id="str-name"
                    type="text"
                    class="form-control street-main-input"
                    placeholder="Ex: Avenida Carlos Artêncio, Rua São Luiz..."
                    [(ngModel)]="streetName"
                    name="streetName"
                    required
                  />
                </div>

                <!-- CEP da Rua -->
                <div class="form-group">
                  <label for="str-zip">CEP (Opcional)</label>
                  <input
                    id="str-zip"
                    type="text"
                    class="form-control"
                    placeholder="Ex: 17500-000"
                    [(ngModel)]="streetZipCode"
                    (input)="onStreetZipInput()"
                    name="streetZip"
                    maxlength="9"
                  />
                </div>

                <!-- Status de Ativação -->
                <div class="form-group">
                  <label>Situação Cadastral</label>
                  <div class="status-static-badge">
                    <span class="status-dot"></span> Rua Ativa para Captação
                  </div>
                </div>
              </div>
            </div>

            <!-- Rodapé com Ações -->
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
                  <span class="spinner-inline"></span>
                  <span>{{ isCreatingNewNeighborhood ? 'Cadastrando Bairro e Rua...' : 'Salvando Rua...' }}</span>
                } @else if (isCreatingNewNeighborhood) {
                  <span>＋ Cadastrar Bairro & Rua</span>
                } @else {
                  <span>＋ Cadastrar Rua</span>
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
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1250;
      padding: 1rem;
      box-sizing: border-box;
      overflow: hidden;
    }
    .modal-card {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 14px;
      width: 100%;
      max-width: 650px;
      max-height: calc(100vh - 2rem);
      max-height: calc(100dvh - 2rem);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
      animation: modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.97) translateY(-6px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-header {
      padding: 1.15rem 1.5rem 1rem;
      border-bottom: 1px solid var(--border-color, #27272a);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-shrink: 0;
      background: #18181b;
    }
    .breadcrumb-context {
      font-size: 0.75rem;
      color: #60a5fa;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.2rem;
    }
    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 0.2rem;
    }
    .modal-subtitle {
      font-size: 0.825rem;
      color: #a1a1aa;
      margin: 0;
    }
    .btn-close {
      background: transparent;
      border: none;
      color: #a1a1aa;
      font-size: 1.2rem;
      cursor: pointer;
      line-height: 1;
      padding: 6px;
      min-width: 34px;
      min-height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background 0.15s, color 0.15s;
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
      padding: 1.25rem 1.5rem 1.5rem;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    /* Mode Tabs */
    .mode-tabs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      background: rgba(0, 0, 0, 0.35);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid #27272a;
      margin-bottom: 1.25rem;
    }
    .mode-tab {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: #a1a1aa;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .mode-tab:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
    }
    .mode-tab.active {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);
    }
    .tab-icon {
      font-size: 0.95rem;
    }

    /* Helper Cards */
    .helper-card {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 1.25rem;
    }
    .helper-card-header {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin-bottom: 0.85rem;
    }
    .helper-icon {
      font-size: 1.35rem;
      line-height: 1;
    }
    .helper-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #e2e8f0;
      margin: 0 0 2px;
    }
    .helper-desc {
      font-size: 0.775rem;
      color: #94a3b8;
      margin: 0;
      line-height: 1.4;
    }
    .cep-search-row {
      display: flex;
      gap: 8px;
    }
    .cep-input-group {
      display: flex;
      gap: 8px;
      width: 100%;
    }
    .btn-search-cep {
      background: #3b82f6;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 0 16px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .btn-search-cep:hover:not(:disabled) {
      background: #2563eb;
    }
    .btn-search-cep:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    /* GPS Locate */
    .gps-action-box {
      margin-top: 0.25rem;
    }
    .btn-gps-locate {
      width: 100%;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: transform 0.1s, opacity 0.15s;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
    .btn-gps-locate:hover:not(:disabled) {
      opacity: 0.92;
      transform: translateY(-1px);
    }
    .btn-gps-locate:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Accuracy Badges */
    .accuracy-badge-box {
      margin-top: 0.75rem;
    }
    .accuracy-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.775rem;
      font-weight: 600;
    }
    .accuracy-high {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #4ade80;
    }
    .accuracy-medium {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
    }
    .accuracy-low {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #f87171;
    }
    .accuracy-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }
    .accuracy-hint-card {
      margin-top: 0.5rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1px dashed rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      display: flex;
      gap: 8px;
      align-items: flex-start;
      font-size: 0.775rem;
      color: #fca5a5;
      line-height: 1.4;
    }
    .accuracy-hint-card p {
      margin: 4px 0 0;
      color: #fecaca;
    }

    /* Street Search Bar */
    .street-search-bar {
      margin-top: 0.85rem;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid #3f3f46;
      border-radius: 8px;
      padding: 0.75rem;
    }
    .street-search-label {
      display: block;
      font-size: 0.775rem;
      font-weight: 600;
      color: #93c5fd;
      margin-bottom: 0.35rem;
    }
    .street-search-input-group {
      display: flex;
      gap: 6px;
    }
    .btn-quick-search {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 0 14px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .btn-quick-search:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-quick-search:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .address-suggestions-box {
      margin-top: 0.5rem;
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      overflow: hidden;
      max-height: 180px;
      overflow-y: auto;
    }
    .suggestions-header {
      padding: 4px 8px;
      font-size: 0.7rem;
      color: #a1a1aa;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid #27272a;
    }
    .suggestion-row {
      width: 100%;
      text-align: left;
      padding: 8px 10px;
      background: transparent;
      border: none;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .suggestion-row:last-child {
      border-bottom: none;
    }
    .suggestion-row:hover {
      background: rgba(37, 99, 235, 0.15);
    }
    .sugg-pin {
      font-size: 1rem;
    }
    .sugg-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .sugg-road {
      color: #f4f4f5;
      font-size: 0.825rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sugg-sub {
      color: #a1a1aa;
      font-size: 0.725rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sugg-action {
      color: #60a5fa;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }

    /* Interactive Mini Map */
    .interactive-map-wrapper {
      margin-top: 0.85rem;
      border: 1px solid #3f3f46;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .map-instruction-bar {
      background: #1e293b;
      padding: 6px 10px;
      font-size: 0.75rem;
      color: #cbd5e1;
      border-bottom: 1px solid #334155;
    }
    .street-mini-map-canvas {
      width: 100%;
      height: 220px;
      background: #0f172a;
    }

    .coords-display {
      margin-top: 0.65rem;
      font-size: 0.775rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .coords-display code {
      background: rgba(0, 0, 0, 0.4);
      padding: 2px 6px;
      border-radius: 4px;
      color: #34d399;
    }

    /* Status Messages */
    .status-msg {
      margin-top: 0.65rem;
      font-size: 0.8rem;
      border-radius: 6px;
      padding: 6px 10px;
    }
    .status-msg.success {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #6ee7b7;
    }
    .status-msg.error {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    /* Outside Notice Alert */
    .alert-outside-notice {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 10px;
      padding: 0.9rem 1.1rem;
      margin-bottom: 1.25rem;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .alert-outside-notice .alert-icon {
      font-size: 1.4rem;
      line-height: 1;
    }
    .alert-outside-notice .alert-highlight {
      display: block;
      color: #f59e0b;
      font-size: 0.9rem;
      margin-bottom: 3px;
    }
    .alert-outside-notice .alert-desc {
      margin: 0 0 6px;
      font-size: 0.825rem;
      color: #fde68a;
      line-height: 1.4;
    }
    .badge-auto-neighborhood {
      display: inline-block;
      font-size: 0.725rem;
      font-weight: 600;
      color: #fef3c7;
      background: rgba(245, 158, 11, 0.25);
      border: 1px solid rgba(245, 158, 11, 0.45);
      padding: 2px 8px;
      border-radius: 9999px;
    }

    /* Section Dividers */
    .section-divider {
      position: relative;
      text-align: center;
      margin: 1.25rem 0 1rem;
    }
    .section-divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #27272a;
    }
    .divider-text {
      position: relative;
      background: #18181b;
      padding: 0 10px;
      font-size: 0.725rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #71717a;
    }

    /* Forms */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .full-width { grid-column: span 2; }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .form-group label {
      font-size: 0.825rem;
      font-weight: 600;
      color: #e4e4e7;
    }
    .edit-pill {
      font-size: 0.7rem;
      color: #60a5fa;
      font-weight: 400;
      margin-left: 6px;
    }
    .street-main-input {
      font-size: 0.95rem;
      font-weight: 600;
      border-color: #3b82f6;
    }
    .form-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      padding: 0.6rem 0.8rem;
      color: #fff;
      font-size: 0.9rem;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .form-control:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      outline: none;
    }
    .form-control:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .highlight-input {
      border-color: #f59e0b;
      background: rgba(245, 158, 11, 0.05);
    }
    .highlight-input:focus {
      border-color: #f59e0b;
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
    }
    .tag-detected {
      font-size: 0.68rem;
      color: #fbbf24;
      background: rgba(245, 158, 11, 0.15);
      padding: 1px 6px;
      border-radius: 4px;
      margin-left: 6px;
    }

    /* Neighborhood Box */
    .neighborhood-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid #27272a;
      border-radius: 10px;
      padding: 0.85rem;
    }
    .neighborhood-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .checkbox-inline {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.775rem;
      color: #60a5fa;
      cursor: pointer;
    }
    .checkbox-inline input {
      cursor: pointer;
      accent-color: #2563eb;
    }
    .new-neighborhood-fields {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }
    .field-hint {
      font-size: 0.75rem;
      color: #f59e0b;
      margin: 4px 0 0;
    }

    /* Static Status Badge */
    .status-static-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.825rem;
      color: #4ade80;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.25);
      border-radius: 8px;
      padding: 0.6rem 0.8rem;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      background: #22c55e;
      border-radius: 50%;
    }

    /* Alerts */
    .alert-box {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.25rem;
      font-size: 0.85rem;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }

    /* Modal Footer */
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #27272a;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: #18181b;
      flex-shrink: 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
    }
    .btn-secondary {
      background: #27272a;
      color: #e4e4e7;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #3f3f46;
      color: #fff;
    }
    .btn-primary {
      background: #2563eb;
      color: #fff;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
    }
    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .spinner-inline {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
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
      .mode-tabs {
        gap: 4px;
        padding: 3px;
      }
      .mode-tab {
        padding: 6px 4px;
        font-size: 0.75rem;
        gap: 3px;
      }
      .tab-icon {
        font-size: 0.85rem;
      }
      .street-mini-map-canvas {
        height: 180px;
      }
      .form-grid { grid-template-columns: 1fr; }
      .full-width { grid-column: span 1; }
      .new-neighborhood-fields { grid-template-columns: 1fr; }
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
    }
  `],
})
export class StreetModalComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false
  @Input() territoryId = ''
  @Input() subterritoryId = ''
  @Input() neighborhoodId = ''

  @Output() close = new EventEmitter<void>()
  @Output() streetCreated = new EventEmitter<StreetCreationResult>()

  readonly Math = Math

  activeMode: 'cep' | 'gps' | 'manual' = 'cep'

  // Territorial hierarchy
  territoryList: TerritoryItem[] = []
  subterritoryList: SubterritoryItem[] = []
  neighborhoodList: NeighborhoodItem[] = []

  selectedTerritoryId = ''
  selectedSubterritoryId = ''
  selectedNeighborhoodId = ''

  // Street form fields
  streetName = ''
  streetZipCode = ''

  // New neighborhood fields
  isCreatingNewNeighborhood = false
  newNeighborhoodName = ''
  newNeighborhoodCity = ''

  // "Outside of neighborhood" detection
  isOutsideCurrentNeighborhood = false
  outsideNoticeText = ''

  // CEP mode state
  cepInput = ''
  isSearchingCep = false
  cepSuccessMessage = ''
  cepErrorMessage = ''

  // GPS mode state
  isLocatingGps = false
  locatingStatusText = ''
  gpsCoordsText = ''
  gpsSuccessMessage = ''
  gpsErrorMessage = ''
  gpsAccuracy = 0
  currentCoords: { lat: number; lng: number } | null = null

  // Address search query state
  searchStreetQuery = ''
  isSearchingAddress = false
  addressSearchResults: AddressSearchResult[] = []

  // Leaflet map instance
  private leaflet: any = null
  private map: any = null
  private marker: any = null
  private accuracyCircle: any = null
  private watchId: number | null = null

  // General state
  isSaving = false
  errorMessage = ''

  constructor(
    private readonly territoryService: TerritoryService,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetModal()
      this.selectedTerritoryId = this.territoryId || ''
      this.selectedSubterritoryId = this.subterritoryId || ''
      this.selectedNeighborhoodId = this.neighborhoodId || ''

      this.loadTerritories()
    }
  }

  ngOnDestroy(): void {
    this.cleanupMap()
    this.clearGpsWatch()
  }

  setMode(mode: 'cep' | 'gps' | 'manual'): void {
    this.activeMode = mode
    this.errorMessage = ''

    if (mode === 'gps') {
      setTimeout(() => {
        this.ensureMapInitialized()
      }, 100)
    }
  }

  loadTerritories(): void {
    this.territoryService.getTerritories().subscribe({
      next: (data) => {
        this.territoryList = data || []
        if (!this.selectedTerritoryId && this.territoryList.length === 1) {
          this.selectedTerritoryId = this.territoryList[0].id
        }
        if (this.selectedTerritoryId) {
          this.loadSubterritories()
        }
      },
    })
  }

  onTerritoryChange(): void {
    this.selectedSubterritoryId = ''
    this.selectedNeighborhoodId = ''
    this.subterritoryList = []
    this.neighborhoodList = []
    if (this.selectedTerritoryId) {
      this.loadSubterritories()
    }
  }

  loadSubterritories(): void {
    this.territoryService.getTerritoryHierarchy(this.selectedTerritoryId).subscribe({
      next: (hierarchy: TerritoryHierarchy) => {
        this.subterritoryList = hierarchy.subterritories || []
        if (!this.selectedSubterritoryId && this.subterritoryList.length === 1) {
          this.selectedSubterritoryId = this.subterritoryList[0].id
        }
        if (this.selectedSubterritoryId) {
          this.loadNeighborhoods()
        }
      },
    })
  }

  onSubterritoryChange(): void {
    this.selectedNeighborhoodId = ''
    this.neighborhoodList = []
    if (this.selectedSubterritoryId) {
      this.loadNeighborhoods()
    }
  }

  loadNeighborhoods(): void {
    const sub = this.subterritoryList.find((s) => s.id === this.selectedSubterritoryId)
    if (sub) {
      this.neighborhoodList = sub.neighborhoods || []
      if (!this.selectedNeighborhoodId && this.neighborhoodList.length === 1) {
        this.selectedNeighborhoodId = this.neighborhoodList[0].id
      }
      if (this.neighborhoodList.length === 0) {
        this.isCreatingNewNeighborhood = true
      }
    }
  }

  onToggleNewNeighborhood(): void {
    if (!this.isCreatingNewNeighborhood && this.neighborhoodList.length === 0) {
      this.isCreatingNewNeighborhood = true
    }
  }

  // --- CEP MODE ---
  onCepInputChange(): void {
    this.cepInput = this.formatCep(this.cepInput)
    this.cepErrorMessage = ''
    this.cepSuccessMessage = ''
    if (this.cleanCep(this.cepInput).length === 8) {
      this.searchCep()
    }
  }

  searchCep(): void {
    const clean = this.cleanCep(this.cepInput)
    if (clean.length !== 8) {
      this.cepErrorMessage = 'Informe um CEP válido com 8 dígitos.'
      return
    }

    this.isSearchingCep = true
    this.cepErrorMessage = ''
    this.cepSuccessMessage = ''

    this.territoryService.lookupCep(clean).subscribe({
      next: (data) => {
        this.isSearchingCep = false
        if (data.erro === true || data.erro === 'true') {
          this.cepErrorMessage = 'CEP não encontrado no ViaCEP.'
          return
        }

        if (data.logradouro) {
          this.streetName = data.logradouro
        }
        this.streetZipCode = this.formatCep(clean)

        const detectedBairro = (data.bairro || '').trim()
        const detectedCity = (data.localidade || '').trim()

        this.processDetectedLocation(detectedBairro, detectedCity)
        this.cepSuccessMessage = `Localizado: ${data.logradouro || 'Rua sem denominação'}, ${detectedBairro} — ${detectedCity}/${data.uf || ''}`
      },
      error: () => {
        this.isSearchingCep = false
        this.cepErrorMessage = 'Falha ao consultar o ViaCEP. Verifique sua conexão.'
      },
    })
  }

  // --- GPS / GEOLOCATION MODE COM WATCH & REFINAMENTO ---
  captureLocation(): void {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) {
      this.gpsErrorMessage = 'Geolocalização não é suportada pelo seu navegador.'
      return
    }

    this.clearGpsWatch()
    this.isLocatingGps = true
    this.locatingStatusText = 'Obtendo melhor precisão...'
    this.gpsErrorMessage = ''
    this.gpsSuccessMessage = ''
    this.gpsCoordsText = ''

    let bestPos: GeolocationPosition | null = null

    const finishWithBestPosition = () => {
      this.clearGpsWatch()
      if (bestPos) {
        this.applyGpsReading(bestPos)
      } else {
        this.isLocatingGps = false
        this.gpsErrorMessage = 'Não foi possível capturar a localização do dispositivo.'
      }
    }

    // Janela de até 4.5 segundos para o hardware de GPS travar o melhor sinal
    const timeoutTimer = setTimeout(() => {
      finishWithBestPosition()
    }, 4500)

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
            bestPos = pos
          }

          // Se já obteve precisão excelente (satélite fixo <= 30m), encerra imediatamente
          if (pos.coords.accuracy <= 30) {
            clearTimeout(timeoutTimer)
            finishWithBestPosition()
          }
        },
        (err) => {
          clearTimeout(timeoutTimer)
          this.clearGpsWatch()
          this.isLocatingGps = false

          switch (err.code) {
            case err.PERMISSION_DENIED:
              this.gpsErrorMessage =
                'Permissão de localização negada no navegador. Permita o acesso ao GPS.'
              break
            case err.POSITION_UNAVAILABLE:
              this.gpsErrorMessage = 'Informações de localização indisponíveis no momento.'
              break
            case err.TIMEOUT:
              this.gpsErrorMessage = 'Tempo limite esgotado ao buscar sinal de GPS.'
              break
            default:
              this.gpsErrorMessage = 'Erro ao obter localização do dispositivo.'
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      )
    } catch {
      clearTimeout(timeoutTimer)
      this.isLocatingGps = false
      this.gpsErrorMessage = 'Erro ao inicializar o serviço de GPS.'
    }
  }

  private applyGpsReading(pos: GeolocationPosition): void {
    const lat = pos.coords.latitude
    const lng = pos.coords.longitude
    const accuracy = pos.coords.accuracy || 0

    this.currentCoords = { lat, lng }
    this.gpsAccuracy = accuracy
    this.gpsCoordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)} (precisão ±${this.formatDistance(accuracy)})`

    this.locatingStatusText = 'Identificando logradouro e bairro...'

    // Atualiza mapa interativo
    this.updateMapPosition(lat, lng, accuracy)

    // Geocodificação reversa
    this.territoryService.reverseGeocode(lat, lng).subscribe({
      next: (res) => {
        this.isLocatingGps = false
        this.locatingStatusText = ''
        if (res.road) {
          this.streetName = res.road
        }
        if (res.zipCode) {
          this.streetZipCode = this.formatCep(res.zipCode)
        }

        const detectedBairro = (res.neighbourhood || '').trim()
        const detectedCity = (res.city || '').trim()

        this.processDetectedLocation(detectedBairro, detectedCity)
        this.gpsSuccessMessage = `Localizado via GPS: ${res.road || 'Logradouro detectado'}, ${detectedBairro} — ${detectedCity}`
      },
      error: (err) => {
        this.isLocatingGps = false
        this.locatingStatusText = ''
        this.gpsErrorMessage =
          err?.error?.message ||
          'Não foi possível converter as coordenadas em endereço. Arraste o pino no mapa ou preencha manualmente.'
      },
    })
  }

  // --- BUSCA RÁPIDA DE ENDEREÇO PARA AJUSTE NO MAPA ---
  searchStreetAddress(): void {
    const query = this.searchStreetQuery.trim()
    if (query.length < 2) return

    this.isSearchingAddress = true
    this.addressSearchResults = []

    this.territoryService.searchAddress(query).subscribe({
      next: (results) => {
        this.isSearchingAddress = false
        this.addressSearchResults = results || []
        if (this.addressSearchResults.length === 0) {
          this.gpsErrorMessage = `Nenhuma rua encontrada com "${query}". Tente ajustar no mapa.`
        } else {
          this.gpsErrorMessage = ''
        }
      },
      error: () => {
        this.isSearchingAddress = false
        this.gpsErrorMessage = 'Falha ao buscar rua. Verifique a conexão ou ajuste no mapa.'
      },
    })
  }

  selectAddressSearchResult(item: AddressSearchResult): void {
    this.streetName = item.road || item.displayName
    if (item.zipCode) {
      this.streetZipCode = this.formatCep(item.zipCode)
    }

    this.currentCoords = { lat: item.lat, lng: item.lng }
    this.gpsAccuracy = 15 // precisão fixada no ponto exato da rua
    this.gpsCoordsText = `${item.lat.toFixed(6)}, ${item.lng.toFixed(6)} (Localizado por busca)`

    this.updateMapPosition(item.lat, item.lng, 15)

    const detectedBairro = (item.neighbourhood || '').trim()
    const detectedCity = (item.city || '').trim()

    this.processDetectedLocation(detectedBairro, detectedCity)
    this.gpsSuccessMessage = `Rua posicionada no mapa: ${this.streetName}, ${detectedBairro} — ${detectedCity}`

    this.addressSearchResults = []
  }

  // --- MAPA LEAFLET INTERATIVO ---
  private async ensureMapInitialized(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return

    const container = document.getElementById('street-mini-map-canvas')
    if (!container) return

    if (!this.leaflet) {
      this.leaflet = await import('leaflet')
    }

    const L = this.leaflet

    // Ponto inicial: coordenadas ativas ou centro padrão de Marília
    const lat = this.currentCoords?.lat || -22.2208
    const lng = this.currentCoords?.lng || -49.9501

    if (this.map) {
      this.map.invalidateSize()
      return
    }

    this.map = L.map('street-mini-map-canvas', {
      center: [lat, lng],
      zoom: this.currentCoords ? 16 : 14,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map)

    const customPinIcon = L.divIcon({
      className: 'custom-street-pin',
      html: `
        <div style="background: #2563eb; color: #fff; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 2px solid #fff;">
          <span style="transform: rotate(45deg); font-size: 16px;">📍</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
    })

    this.marker = L.marker([lat, lng], {
      draggable: true,
      icon: customPinIcon,
    }).addTo(this.map)

    this.marker.bindPopup('<b>Sua Rua</b><br>Arraste para ajustar o ponto').openPopup()

    if (this.gpsAccuracy > 0) {
      this.accuracyCircle = L.circle([lat, lng], {
        radius: this.gpsAccuracy,
        color: this.gpsAccuracy > 200 ? '#ef4444' : '#3b82f6',
        fillColor: this.gpsAccuracy > 200 ? '#ef4444' : '#3b82f6',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(this.map)
    }

    // Evento de arrastar o marcador
    this.marker.on('dragend', () => {
      const pos = this.marker.getLatLng()
      this.onMapPointSelected(pos.lat, pos.lng)
    })

    // Evento de clicar no mapa
    this.map.on('click', (e: any) => {
      this.marker.setLatLng(e.latlng)
      this.onMapPointSelected(e.latlng.lat, e.latlng.lng)
    })

    setTimeout(() => {
      if (this.map) this.map.invalidateSize()
    }, 200)
  }

  private updateMapPosition(lat: number, lng: number, accuracy: number): void {
    if (!this.map || !this.leaflet) {
      setTimeout(() => this.ensureMapInitialized(), 100)
      return
    }

    const L = this.leaflet
    this.marker.setLatLng([lat, lng])
    this.map.setView([lat, lng], accuracy <= 100 ? 17 : 15)

    if (this.accuracyCircle) {
      this.accuracyCircle.setLatLng([lat, lng])
      this.accuracyCircle.setRadius(accuracy)
      this.accuracyCircle.setStyle({
        color: accuracy > 200 ? '#ef4444' : '#3b82f6',
        fillColor: accuracy > 200 ? '#ef4444' : '#3b82f6',
      })
    } else if (accuracy > 0) {
      this.accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: accuracy > 200 ? '#ef4444' : '#3b82f6',
        fillColor: accuracy > 200 ? '#ef4444' : '#3b82f6',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(this.map)
    }

    this.map.invalidateSize()
  }

  private onMapPointSelected(lat: number, lng: number): void {
    this.currentCoords = { lat, lng }
    this.gpsAccuracy = 10 // Ponto escolhido manualmente
    this.gpsCoordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)} (Ajustado no mapa)`

    if (this.accuracyCircle) {
      this.accuracyCircle.setLatLng([lat, lng])
      this.accuracyCircle.setRadius(10)
    }

    this.territoryService.reverseGeocode(lat, lng).subscribe({
      next: (res) => {
        if (res.road) {
          this.streetName = res.road
        }
        if (res.zipCode) {
          this.streetZipCode = this.formatCep(res.zipCode)
        }

        const detectedBairro = (res.neighbourhood || '').trim()
        const detectedCity = (res.city || '').trim()

        this.processDetectedLocation(detectedBairro, detectedCity)
        this.gpsSuccessMessage = `Ponto ajustado no mapa: ${res.road || 'Logradouro'}, ${detectedBairro} — ${detectedCity}`
      },
      error: () => {
        this.gpsErrorMessage = 'Falha ao identificar endereço do ponto ajustado.'
      },
    })
  }

  private cleanupMap(): void {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
    this.marker = null
    this.accuracyCircle = null
  }

  private clearGpsWatch(): void {
    if (this.watchId !== null && isPlatformBrowser(this.platformId) && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`
    }
    return `${Math.round(meters)} m`
  }

  /**
   * Avalia a regra de negócio fundamental:
   * "no caso do cep e da localização a pessoa esteja fora do bairro, então alem de cadastrar a rua será cadastrado o bairro tambem."
   */
  processDetectedLocation(detectedBairro: string, detectedCity: string): void {
    if (!detectedBairro) return

    const currentNeigh = this.neighborhoodList.find(
      (n) => n.id === this.selectedNeighborhoodId,
    )

    const normalizedDetected = detectedBairro.toLowerCase().trim()
    const matchesCurrent =
      currentNeigh &&
      currentNeigh.name.toLowerCase().trim() === normalizedDetected

    if (matchesCurrent) {
      this.isOutsideCurrentNeighborhood = false
      this.outsideNoticeText = ''
      this.isCreatingNewNeighborhood = false
      return
    }

    const existingInSubterritory = this.neighborhoodList.find(
      (n) => n.name.toLowerCase().trim() === normalizedDetected,
    )

    if (existingInSubterritory) {
      this.selectedNeighborhoodId = existingInSubterritory.id
      this.isCreatingNewNeighborhood = false
      this.isOutsideCurrentNeighborhood = true
      this.outsideNoticeText = `A localização pertence ao bairro "${existingInSubterritory.name}" (diferente do selecionado anteriormente). O bairro foi selecionado e a rua será associada a ele.`
    } else {
      this.isCreatingNewNeighborhood = true
      this.newNeighborhoodName = detectedBairro
      this.newNeighborhoodCity = detectedCity
      this.isOutsideCurrentNeighborhood = true
      this.outsideNoticeText = `A localização pertence ao bairro "${detectedBairro}" (fora do bairro selecionado). Além de cadastrar a rua, o bairro "${detectedBairro}" será cadastrado automaticamente neste subterritório.`
    }
  }

  onStreetZipInput(): void {
    this.streetZipCode = this.formatCep(this.streetZipCode)
  }

  formatCep(value: string): string {
    const raw = (value || '').replace(/\D/g, '').slice(0, 8)
    if (raw.length > 5) {
      return `${raw.slice(0, 5)}-${raw.slice(5)}`
    }
    return raw
  }

  cleanCep(value: string): string {
    return (value || '').replace(/\D/g, '')
  }

  get isValid(): boolean {
    if (!this.selectedTerritoryId || !this.selectedSubterritoryId) return false
    if (!this.streetName.trim() || this.streetName.trim().length < 2) return false

    if (this.isCreatingNewNeighborhood) {
      return this.newNeighborhoodName.trim().length >= 2
    }

    return Boolean(this.selectedNeighborhoodId)
  }

  saveStreet(): void {
    if (!this.isValid || this.isSaving) return

    this.isSaving = true
    this.errorMessage = ''

    const cleanZip = this.cleanCep(this.streetZipCode)
    const formattedZip = cleanZip ? this.formatCep(cleanZip) : undefined

    if (this.isCreatingNewNeighborhood) {
      this.territoryService
        .createNeighborhood({
          subterritoryId: this.selectedSubterritoryId,
          name: this.newNeighborhoodName.trim(),
          city: this.newNeighborhoodCity.trim() || undefined,
        })
        .subscribe({
          next: (newNeigh) => {
            this.executeCreateStreet(newNeigh.id, newNeigh, true, formattedZip)
          },
          error: (err) => {
            this.isSaving = false
            this.errorMessage =
              err?.error?.message || 'Erro ao cadastrar o novo bairro.'
          },
        })
    } else {
      const targetNeigh = this.neighborhoodList.find(
        (n) => n.id === this.selectedNeighborhoodId,
      )
      if (!targetNeigh) {
        this.errorMessage = 'Selecione um bairro válido.'
        this.isSaving = false
        return
      }

      this.executeCreateStreet(this.selectedNeighborhoodId, targetNeigh, false, formattedZip)
    }
  }

  private executeCreateStreet(
    neighborhoodId: string,
    neighborhoodObj: NeighborhoodItem,
    isNewNeigh: boolean,
    formattedZip?: string,
  ): void {
    this.territoryService
      .createStreet({
        neighborhoodId,
        name: this.streetName.trim(),
        zipCode: formattedZip,
      })
      .subscribe({
        next: (newStreet) => {
          this.isSaving = false
          this.streetCreated.emit({
            street: newStreet,
            neighborhood: neighborhoodObj,
            territoryId: this.selectedTerritoryId,
            subterritoryId: this.selectedSubterritoryId,
            isNewNeighborhood: isNewNeigh,
          })
          this.closeModal()
        },
        error: (err) => {
          this.isSaving = false
          this.errorMessage =
            err?.error?.message || 'Erro ao cadastrar o logradouro / rua.'
        },
      })
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal()
    }
  }

  closeModal(): void {
    this.cleanupMap()
    this.clearGpsWatch()
    this.close.emit()
  }

  private resetModal(): void {
    this.cleanupMap()
    this.clearGpsWatch()
    this.activeMode = 'cep'
    this.streetName = ''
    this.streetZipCode = ''
    this.isCreatingNewNeighborhood = false
    this.newNeighborhoodName = ''
    this.newNeighborhoodCity = ''
    this.isOutsideCurrentNeighborhood = false
    this.outsideNoticeText = ''
    this.cepInput = ''
    this.isSearchingCep = false
    this.cepSuccessMessage = ''
    this.cepErrorMessage = ''
    this.isLocatingGps = false
    this.locatingStatusText = ''
    this.gpsCoordsText = ''
    this.gpsSuccessMessage = ''
    this.gpsErrorMessage = ''
    this.gpsAccuracy = 0
    this.currentCoords = null
    this.searchStreetQuery = ''
    this.isSearchingAddress = false
    this.addressSearchResults = []
    this.errorMessage = ''
    this.isSaving = false
  }
}
