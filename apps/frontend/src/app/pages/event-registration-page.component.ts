import { CommonModule } from '@angular/common'
import { Component, OnDestroy, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { finalize } from 'rxjs'
import {
  type CertificateDocument,
  type CertificateTemplateStyle,
  type CreateCustomEvent,
  type CreateCustomParticipant,
  type CustomEventDetails,
  type CustomEventSummary,
  type CustomParticipantItem,
  type UpdateCustomEvent,
  type EventTicket,
  type EventWorkshop,
  type EventArticle,
  type EventExpense,
  type EventSponsor,
  type FinancialSummary,
  type EventFeedback,
  type ReviewEventArticle,
  type CreateEventWorkshop,
  type UpdateEventWorkshop,
  CertificatesService,
  getDefaultTemplateStyle,
} from '../services/certificates.service'
import {
  executeCertificatePrint,
  formatDisplayDate,
  formatStudentCpf,
  getCertificateFontFamily,
  getStudentInitials,
  isCursiveFont,
  mountCertificateForPrint,
} from './certificates-utils'

@Component({
  selector: 'app-event-registration-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="event-reg-page" aria-labelledby="event-reg-title">
      <header class="event-reg-heading no-print">
        <div>
          <p class="hero-eyebrow">Cadastros & Eventos</p>
          <h1 id="event-reg-title">Cadastro de Eventos e Certificados</h1>
          <p>
            Cadastre eventos acadêmicos, vincule participantes, gerencie a quitação da taxa e emita certificados oficiais.
          </p>
        </div>
        <div class="event-reg-actions">
          <a class="button button-secondary" routerLink="/administracao/certificados">
            🎓 Painel Unimestre
          </a>
          <button class="button button-primary" type="button" (click)="openNewEventModal()">
            ➕ Novo Evento
          </button>
        </div>
      </header>

      @if (errorMessage) {
        <p class="error-message no-print" role="alert">{{ errorMessage }}</p>
      }
      @if (successMessage) {
        <p class="success-message no-print" role="status">{{ successMessage }}</p>
      }

      <!-- Barra de Busca de Eventos -->
      <section class="card card-outlined search-panel no-print">
        <div class="search-bar">
          <div class="search-input-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Pesquisar por título do evento, ministrante ou curso…"
              [(ngModel)]="searchQuery"
              (keyup.enter)="loadEvents()"
            />
          </div>
          <button class="button button-primary" type="button" (click)="loadEvents()" [disabled]="isLoadingEvents">
            {{ isLoadingEvents ? 'Buscando…' : 'Filtrar' }}
          </button>
        </div>
      </section>

      <!-- Lista de Eventos Cadastrados -->
      <section class="events-grid no-print">
        @if (isLoadingEvents && events.length === 0) {
          <div class="loading-state col-span-full">
            <div class="spinner"></div>
            <p>Carregando eventos cadastrados…</p>
          </div>
        } @else if (events.length === 0) {
          <div class="empty-state col-span-full card card-outlined">
            <span class="empty-icon">📅</span>
            <h3>Nenhum evento cadastrado</h3>
            <p>Clique em <strong>"Novo Evento"</strong> para cadastrar seu primeiro curso ou workshop acadêmico.</p>
            <button class="button button-primary mt-2" type="button" (click)="openNewEventModal()">
              ➕ Cadastrar Primeiro Evento
            </button>
          </div>
        } @else {
          @for (ev of events; track ev.id) {
            <article class="card card-elevated event-card">
              @if (ev.bannerUrl) {
                <div class="event-card-banner">
                  <img [src]="ev.bannerUrl" alt="Banner do Evento" class="card-banner-img" />
                </div>
              } @else if (ev.logoUrl) {
                <div class="event-card-banner-logo">
                  <img [src]="ev.logoUrl" alt="Logo do Evento" class="card-banner-logo-img" />
                </div>
              }
              <div class="event-card-top">
                <div class="event-workload-badge">
                  <span>{{ ev.workloadHours }}h</span>
                </div>
                <div class="event-header-titles">
                  @if (ev.courseName) {
                    <span class="event-course-tag">{{ ev.courseName }}</span>
                  }
                  <h3 class="event-card-title">{{ ev.title }}</h3>
                </div>
              </div>

              @if (ev.description) {
                <p class="event-card-desc">{{ ev.description }}</p>
              }

              <!-- Badges de Ingressos e Artigos -->
              <div class="event-chips-row">
                @if (ev.ticketType === 'pago') {
                  <span class="chip chip-paid">💰 R$ {{ (ev.standardPrice || 0).toFixed(2) }}</span>
                } @else if (ev.ticketType === 'solidario') {
                  <span class="chip chip-solidary">🤝 Solidário</span>
                } @else {
                  <span class="chip chip-free">🆓 Gratuito</span>
                }
                @if (ev.acceptsArticles) {
                  <span class="chip chip-article">📄 Artigos</span>
                }
              </div>

              <div class="event-meta-list">
                @if (ev.speaker) {
                  <div class="meta-item">
                    <span class="meta-icon">🎤</span>
                    <span>{{ ev.speaker }}</span>
                  </div>
                }
                <div class="meta-item">
                  <span class="meta-icon">🗓️</span>
                  <span>{{ formatDate(ev.startDate) }}{{ ev.endDate ? ' a ' + formatDate(ev.endDate) : '' }}</span>
                </div>
                @if (ev.location) {
                  <div class="meta-item">
                    <span class="meta-icon">📍</span>
                    <span>{{ ev.location }}</span>
                  </div>
                }
              </div>

              <!-- Indicadores de Participantes -->
              <div class="event-counters">
                <div class="counter-box">
                  <span class="counter-val">{{ ev.totalParticipants }}</span>
                  <span class="counter-lbl">Alunos</span>
                </div>
                <div class="counter-box counter-paid">
                  <span class="counter-val">{{ ev.paidParticipants }}</span>
                  <span class="counter-lbl">Pagos</span>
                </div>
                <div class="counter-box counter-eligible">
                  <span class="counter-val">{{ ev.eligibleParticipants }}</span>
                  <span class="counter-lbl">Aptos</span>
                </div>
              </div>

              <div class="event-card-actions">
                <button
                  class="button button-primary button-sm manage-btn"
                  type="button"
                  (click)="openParticipantsDrawer(ev.id)"
                >
                  ⚙️ Gestão do Evento ({{ ev.totalParticipants }})
                </button>
                <div class="event-btn-group">
                  <a
                    class="btn-icon"
                    [routerLink]="['/eventos/portaria']"
                    [queryParams]="{ eventId: ev.id }"
                    title="Portaria & Scanner QR Code"
                  >
                    📱
                  </a>
                  <button class="btn-icon" type="button" (click)="openEditEventModal(ev)" title="Editar Evento">
                    ✏️
                  </button>
                  <button class="btn-icon text-danger" type="button" (click)="deleteEvent(ev)" title="Excluir Evento">
                    🗑️
                  </button>
                </div>
              </div>
            </article>
          }
        }
      </section>

      <!-- ==========================================
           MODAL DE CADASTRO / EDIÇÃO DE EVENTO
           ========================================== -->
      @if (isEventModalOpen) {
        <div class="modal-backdrop" (click)="closeEventModal()">
          <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ isEditingEvent ? 'Editar Evento' : 'Novo Evento Acadêmico' }}</h2>
              <button class="btn-close" type="button" (click)="closeEventModal()" aria-label="Fechar">✕</button>
            </div>

            <form (ngSubmit)="saveEvent()">
              <div class="modal-body form-grid">
                <div class="form-group col-span-2">
                  <label for="event-title">Título do Evento *</label>
                  <input
                    id="event-title"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Workshop de Inteligência Artificial Aplicada"
                    [(ngModel)]="eventForm.title"
                    name="title"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="event-workload">Carga Horária (Horas) *</label>
                  <input
                    id="event-workload"
                    type="number"
                    min="1"
                    class="form-control"
                    [(ngModel)]="eventForm.workloadHours"
                    name="workloadHours"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="event-course">Curso Vinculado</label>
                  <input
                    id="event-course"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Ciência da Computação, Geral..."
                    [(ngModel)]="eventForm.courseName"
                    name="courseName"
                  />
                </div>

                <div class="form-group">
                  <label for="event-speaker">Ministrante / Palestrante</label>
                  <input
                    id="event-speaker"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Prof. Dr. Carlos Silva"
                    [(ngModel)]="eventForm.speaker"
                    name="speaker"
                  />
                </div>

                <div class="form-group">
                  <label for="event-location">Local / Sala / Modalidade</label>
                  <input
                    id="event-location"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Auditório Central / Online"
                    [(ngModel)]="eventForm.location"
                    name="location"
                  />
                </div>

                <div class="form-group">
                  <label for="event-start">Data de Início *</label>
                  <input
                    id="event-start"
                    type="date"
                    class="form-control"
                    [(ngModel)]="eventForm.startDate"
                    name="startDate"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="event-end">Data de Término</label>
                  <input
                    id="event-end"
                    type="date"
                    class="form-control"
                    [(ngModel)]="eventForm.endDate"
                    name="endDate"
                  />
                </div>

                <div class="form-group col-span-2">
                  <label for="event-desc">Descrição / Detalhes</label>
                  <textarea
                    id="event-desc"
                    rows="3"
                    class="form-control text-area"
                    placeholder="Resumo do programa do curso, objetivos ou público-alvo…"
                    [(ngModel)]="eventForm.description"
                    name="description"
                  ></textarea>
                </div>

                <!-- Upload do Logotipo do Evento -->
                <div class="form-group col-span-2 upload-section">
                  <label>Logotipo do Evento (Opcional)</label>
                  <p class="upload-hint">Suba uma imagem para representar o evento nos cards e no cabeçalho do certificado institucional.</p>
                  @if (eventForm.logoUrl) {
                    <div class="media-preview-card">
                      <img [src]="eventForm.logoUrl" alt="Preview Logo" class="preview-logo-img" />
                      <div class="preview-actions">
                        <span class="preview-filename">Logotipo carregado com sucesso</span>
                        <button type="button" class="button button-danger button-sm" (click)="removeLogo()">✕ Remover Logo</button>
                      </div>
                    </div>
                  } @else {
                    <div class="upload-dropzone">
                      <span class="upload-icon">🖼️</span>
                      <label class="button button-secondary button-sm btn-file-picker">
                        Selecionar Imagem do Logotipo
                        <input type="file" accept="image/*" (change)="onLogoFileSelected($event)" class="file-hidden-input" />
                      </label>
                      <span class="dropzone-sub">PNG, JPG, SVG ou WebP</span>
                    </div>
                  }
                </div>

                <!-- Upload do Modelo de Certificado (Background / Layout Personalizado) -->
                <div class="form-group col-span-2 upload-section">
                  <label>Modelo Gráfico do Certificado (Opcional - Fundo Personalizado)</label>
                  <p class="upload-hint">
                    Suba a arte gráfica do certificado (em formato A4 Paisagem). O nome do aluno será posicionado e impresso diretamente sobre este fundo!
                  </p>
                  @if (eventForm.certificateTemplateUrl) {
                    <div class="media-preview-card template-preview-card">
                      <div class="template-thumb-wrap">
                        <img [src]="eventForm.certificateTemplateUrl" alt="Preview Modelo" class="preview-template-img" />
                      </div>
                      <div class="preview-actions">
                        <span class="preview-filename">Modelo gráfico de fundo ativo</span>
                        <div class="action-buttons-group">
                          <button
                            type="button"
                            class="button button-accent button-sm"
                            (click)="copyUploadedToOfficial('form')"
                            title="Ajusta as cores, fontes, títulos e fundo transparente para combinar com a arte subida"
                          >
                            ✨ Copiar layout do modelo que eu subi
                          </button>
                          <button type="button" class="button button-danger button-sm" (click)="removeTemplate()">✕ Remover Modelo</button>
                        </div>
                      </div>
                    </div>
                  } @else {
                    <div class="upload-dropzone">
                      <span class="upload-icon">📜</span>
                      <label class="button button-secondary button-sm btn-file-picker">
                        Selecionar Imagem do Modelo (A4 Paisagem)
                        <input type="file" accept="image/*" (change)="onTemplateFileSelected($event)" class="file-hidden-input" />
                      </label>
                      <span class="dropzone-sub">Formato A4 Paisagem (ex: 1920x1080px ou superior em alta resolução)</span>
                    </div>
                  }

                  <!-- SEÇÃO DE PERSONALIZAÇÃO VISUAL DO MODELO (MOLDURA, CORES, FONTES E TEXTOS) -->
                  <div class="template-customizer-accordion">
                    <button
                      type="button"
                      class="accordion-toggle-btn"
                      (click)="showFormAdvancedStyle = !showFormAdvancedStyle"
                    >
                      <span>🎨 Personalizar Moldura, Cores, Fontes e Textos do Modelo</span>
                      <span>{{ showFormAdvancedStyle ? '▲ Recolher' : '▼ Expandir' }}</span>
                    </button>

                    @if (showFormAdvancedStyle) {
                      <div class="accordion-content-panel">
                        <!-- Presets rápidos -->
                        <div class="customizer-subgroup">
                          <label class="customizer-label">Estilos e Paletas Rápidas</label>
                          <div class="preset-chips">
                            <button type="button" class="preset-chip" (click)="applyColorPreset('form', 'classic')">🏛️ Clássico FAIP</button>
                            <button type="button" class="preset-chip" (click)="applyColorPreset('form', 'gold')">🏆 Dourado Real</button>
                            <button type="button" class="preset-chip" (click)="applyColorPreset('form', 'blue')">💎 Azul Executivo</button>
                            <button type="button" class="preset-chip" (click)="applyColorPreset('form', 'emerald')">🌿 Esmeralda</button>
                            <button type="button" class="preset-chip" (click)="applyColorPreset('form', 'black-gold')">🖤 Preto & Ouro</button>
                            <button type="button" class="preset-chip" (click)="applyColorPreset('form', 'minimal')">📄 Sem Moldura</button>
                          </div>
                        </div>

                        <!-- Moldura e Bordas -->
                        <div class="customizer-subgroup mt-2">
                          <label class="customizer-label">Moldura & Bordas</label>
                          <div class="form-row">
                            <div class="form-group flex-1">
                              <label>Estilo da Moldura</label>
                              <select class="form-control" [(ngModel)]="eventForm.templateStyle.frameStyle" name="formFrameStyle">
                                <option value="classic-double">Dupla Clássica Institucional</option>
                                <option value="modern-single">Linha Simples Moderna</option>
                                <option value="ornate-gold">Borda Imperial Dourada</option>
                                <option value="minimal">Mínima Fina</option>
                                <option value="none">Sem Moldura (Transparente / Para Arte Subida)</option>
                              </select>
                            </div>
                            @if (eventForm.templateStyle.frameStyle !== 'none') {
                              <div class="form-group w-80">
                                <label>Espessura</label>
                                <select class="form-control" [(ngModel)]="eventForm.templateStyle.frameBorderWidth" name="formBorderWidth">
                                  <option [ngValue]="1">1 px</option>
                                  <option [ngValue]="2">2 px</option>
                                  <option [ngValue]="3">3 px</option>
                                  <option [ngValue]="4">4 px</option>
                                  <option [ngValue]="6">6 px</option>
                                  <option [ngValue]="8">8 px</option>
                                </select>
                              </div>
                            }
                          </div>
                          @if (eventForm.templateStyle.frameStyle !== 'none') {
                            <div class="form-row mt-1">
                              <div class="form-group flex-1">
                                <label>Cor da Moldura Externa</label>
                                <div class="color-picker-row">
                                  <input type="color" class="color-input" [(ngModel)]="eventForm.templateStyle.frameBorderColor" name="formBorderColor" />
                                  <span class="color-code">{{ eventForm.templateStyle.frameBorderColor }}</span>
                                </div>
                              </div>
                              <div class="form-group flex-1">
                                <label>Cor da Borda Interna</label>
                                <div class="color-picker-row">
                                  <input type="color" class="color-input" [(ngModel)]="eventForm.templateStyle.frameInnerBorderColor" name="formInnerBorderColor" />
                                  <span class="color-code">{{ eventForm.templateStyle.frameInnerBorderColor }}</span>
                                </div>
                              </div>
                            </div>
                            <div class="checkbox-group mt-1">
                              <label class="checkbox-label">
                                <input type="checkbox" [(ngModel)]="eventForm.templateStyle.showInnerBorder" name="formShowInnerBorder" />
                                <span>Exibir borda interna dourada decorativa</span>
                              </label>
                            </div>
                          }
                        </div>

                        <!-- Tipografia e Cores -->
                        <div class="customizer-subgroup mt-2">
                          <label class="customizer-label">Tipografia & Fontes</label>
                          <div class="form-group">
                            <label>Família Tipográfica Principal</label>
                            <select class="form-control" [(ngModel)]="eventForm.templateStyle.fontFamily" name="formFontFamily">
                              <optgroup label="Fontes Cursivas & Caligráficas ✨">
                                <option value="great-vibes">Great Vibes (Caligrafia Diplomática)</option>
                                <option value="alex-brush">Alex Brush (Cursiva Fluida Elegante)</option>
                                <option value="pinyon">Pinyon Script (Cursiva Real Aristocrática)</option>
                                <option value="dancing">Dancing Script (Manuscrita Cursiva Moderna)</option>
                              </optgroup>
                              <optgroup label="Fontes Clássicas & Formais">
                                <option value="playfair">Playfair Display (Elegante & Serifada)</option>
                                <option value="cinzel">Cinzel (Romana Imperial Clássica)</option>
                                <option value="montserrat">Montserrat (Moderna & Sem Serifa)</option>
                                <option value="times">Times New Roman (Formal Tradicional)</option>
                                <option value="serif">Georgia / Acadêmica Clássica</option>
                              </optgroup>
                            </select>
                          </div>
                          <div class="form-group mt-2">
                            <label>Fonte do Nome do Aluno (Destaque Caligráfico)</label>
                            <select class="form-control" [(ngModel)]="eventForm.templateStyle.studentNameFontFamily" name="formStudentNameFontFamily">
                              <option value="same">Mesma do Certificado (Padrão)</option>
                              <optgroup label="Fontes Cursivas & Caligráficas ✨">
                                <option value="great-vibes">✨ Great Vibes (Caligrafia Diplomática)</option>
                                <option value="alex-brush">✨ Alex Brush (Cursiva Fluida Elegante)</option>
                                <option value="pinyon">✨ Pinyon Script (Cursiva Real Aristocrática)</option>
                                <option value="dancing">✨ Dancing Script (Manuscrita Moderna)</option>
                              </optgroup>
                              <optgroup label="Outras Fontes">
                                <option value="playfair">Playfair Display (Serifada)</option>
                                <option value="cinzel">Cinzel (Romana Imperial)</option>
                                <option value="montserrat">Montserrat (Sem Serifa)</option>
                                <option value="times">Times New Roman</option>
                                <option value="serif">Georgia</option>
                              </optgroup>
                            </select>
                          </div>
                          <div class="color-grid mt-2">
                            <div class="color-control-item">
                              <label>Cor do Título ("CERTIFICADO")</label>
                              <div class="color-picker-row">
                                <input type="color" class="color-input" [(ngModel)]="eventForm.templateStyle.titleColor" name="formTitleColor" />
                                <span class="color-code">{{ eventForm.templateStyle.titleColor }}</span>
                              </div>
                            </div>
                            <div class="color-control-item">
                              <label>Cor do Aluno</label>
                              <div class="color-picker-row">
                                <input type="color" class="color-input" [(ngModel)]="eventForm.templateStyle.studentNameColor" name="formStudentNameColor" />
                                <span class="color-code">{{ eventForm.templateStyle.studentNameColor }}</span>
                              </div>
                            </div>
                            <div class="color-control-item">
                              <label>Cor do Evento</label>
                              <div class="color-picker-row">
                                <input type="color" class="color-input" [(ngModel)]="eventForm.templateStyle.eventHighlightColor" name="formEventHighlightColor" />
                                <span class="color-code">{{ eventForm.templateStyle.eventHighlightColor }}</span>
                              </div>
                            </div>
                            <div class="color-control-item">
                              <label>Cor do Texto Geral</label>
                              <div class="color-picker-row">
                                <input type="color" class="color-input" [(ngModel)]="eventForm.templateStyle.textColor" name="formTextColor" />
                                <span class="color-code">{{ eventForm.templateStyle.textColor }}</span>
                              </div>
                            </div>
                            <div class="color-control-item">
                              <label>Cor da Instituição</label>
                              <div class="color-picker-row">
                                <input type="color" class="color-input" [(ngModel)]="eventForm.templateStyle.institutionColor" name="formInstitutionColor" />
                                <span class="color-code">{{ eventForm.templateStyle.institutionColor }}</span>
                              </div>
                            </div>
                            <div class="color-control-item">
                              <label>Cor de Fundo do Papel</label>
                              <div class="color-picker-row">
                                <input type="color" class="color-input" [(ngModel)]="eventForm.templateStyle.backgroundColor" name="formBackgroundColor" />
                                <span class="color-code">{{ eventForm.templateStyle.backgroundColor }}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Textos Institucionais Editáveis -->
                        <div class="customizer-subgroup mt-2">
                          <label class="customizer-label">Textos do Cabeçalho & Instituição</label>
                          <div class="checkbox-group mb-1">
                            <label class="checkbox-label">
                              <input type="checkbox" [(ngModel)]="eventForm.templateStyle.showInstitutionHeader" name="formShowHeader" />
                              <span>Exibir Cabeçalho Superior Institucional</span>
                            </label>
                            <label class="checkbox-label">
                              <input type="checkbox" [(ngModel)]="eventForm.templateStyle.showLogo" name="formShowLogo" />
                              <span>Exibir Logotipo no Certificado</span>
                            </label>
                          </div>
                          @if (eventForm.templateStyle.showInstitutionHeader) {
                            <div class="form-group">
                              <label>Nome da Instituição (Cabeçalho)</label>
                              <input
                                type="text"
                                class="form-control"
                                [(ngModel)]="eventForm.templateStyle.institutionName"
                                name="formInstitutionName"
                                placeholder="Ex: FAIP - FACULDADE DE ENSINO SUPERIOR DO INTERIOR PAULISTA"
                              />
                            </div>
                            <div class="form-group mt-1">
                              <label>Subtítulo / Secretaria</label>
                              <input
                                type="text"
                                class="form-control"
                                [(ngModel)]="eventForm.templateStyle.institutionSub"
                                name="formInstitutionSub"
                                placeholder="Ex: Secretaria Geral de Cursos de Extensão e Capacitação"
                              />
                            </div>
                          }
                          <div class="form-group mt-1">
                            <label>Título do Certificado</label>
                            <input
                              type="text"
                              class="form-control"
                              [(ngModel)]="eventForm.templateStyle.certificateTitle"
                              name="formCertTitle"
                              placeholder="Ex: CERTIFICADO"
                            />
                          </div>
                          <div class="form-group mt-1">
                            <label>Cidade / Local da Emissão</label>
                            <input
                              type="text"
                              class="form-control"
                              [(ngModel)]="eventForm.templateStyle.city"
                              name="formCity"
                              placeholder="Ex: Marília - SP"
                            />
                          </div>
                        </div>

                        <!-- Assinaturas -->
                        <div class="customizer-subgroup mt-2">
                          <div class="checkbox-group mb-1">
                            <label class="checkbox-label">
                              <input type="checkbox" [(ngModel)]="eventForm.templateStyle.showSignatures" name="formShowSignatures" />
                              <span>Exibir Assinaturas no Rodapé</span>
                            </label>
                          </div>
                          @if (eventForm.templateStyle.showSignatures) {
                            <div class="signatures-edit-grid">
                              <div class="signer-edit-box">
                                <h6>✍️ Assinatura 1 (Esquerda)</h6>
                                <div class="form-group">
                                  <label>Cargo / Função</label>
                                  <input type="text" class="form-control" [(ngModel)]="eventForm.templateStyle.signer1Role" name="formSigner1Role" />
                                </div>
                                <div class="form-group mt-1">
                                  <label>Nome do Responsável (Opcional)</label>
                                  <input type="text" class="form-control" [(ngModel)]="eventForm.templateStyle.signer1Name" name="formSigner1Name" />
                                </div>
                                <div class="form-group mt-1">
                                  <label>Departamento / Instituição</label>
                                  <input type="text" class="form-control" [(ngModel)]="eventForm.templateStyle.signer1Dept" name="formSigner1Dept" />
                                </div>
                              </div>
                              <div class="signer-edit-box mt-1">
                                <h6>✍️ Assinatura 2 (Direita)</h6>
                                <div class="form-group">
                                  <label>Cargo / Função</label>
                                  <input type="text" class="form-control" [(ngModel)]="eventForm.templateStyle.signer2Role" name="formSigner2Role" />
                                </div>
                                <div class="form-group mt-1">
                                  <label>Nome do Responsável (Opcional)</label>
                                  <input type="text" class="form-control" [(ngModel)]="eventForm.templateStyle.signer2Name" name="formSigner2Name" />
                                </div>
                                <div class="form-group mt-1">
                                  <label>Departamento / Diretoria</label>
                                  <input type="text" class="form-control" [(ngModel)]="eventForm.templateStyle.signer2Dept" name="formSigner2Dept" />
                                </div>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Seção Ingressos e Valores -->
                <div class="form-group col-span-2 form-card-section">
                  <h4 class="form-section-title">🎟️ Modalidade de Ingressos e Bilheteria</h4>
                  <div class="form-grid">
                    <div class="form-group">
                      <label for="event-ticket-type">Tipo de Ingresso</label>
                      <select id="event-ticket-type" class="form-control" [(ngModel)]="eventForm.ticketType" name="ticketType">
                        <option value="gratuito">Gratuito (Aberto / Sem Cobrança)</option>
                        <option value="pago">Pago (Com Chave Pix e Lotes)</option>
                        <option value="solidario">Solidário (Doação de Alimentos)</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label for="event-ticket-limit">Limite de Ingressos / Vagas</label>
                      <input
                        id="event-ticket-limit"
                        type="number"
                        min="1"
                        class="form-control"
                        placeholder="Ex: 100 (vazio = ilimitado)"
                        [(ngModel)]="eventForm.ticketLimit"
                        name="ticketLimit"
                      />
                    </div>

                    @if (eventForm.ticketType === 'pago') {
                      <div class="form-group">
                        <label for="event-standard-price">Preço Padrão Aluno / Geral (R$)</label>
                        <input
                          id="event-standard-price"
                          type="number"
                          step="0.01"
                          min="0"
                          class="form-control"
                          placeholder="Ex: 50.00"
                          [(ngModel)]="eventForm.standardPrice"
                          name="standardPrice"
                        />
                      </div>

                      <div class="form-group">
                        <label for="event-promo-price">Preço Promocional 1º Lote (R$)</label>
                        <input
                          id="event-promo-price"
                          type="number"
                          step="0.01"
                          min="0"
                          class="form-control"
                          placeholder="Ex: 35.00"
                          [(ngModel)]="eventForm.promoPrice"
                          name="promoPrice"
                        />
                      </div>

                      <div class="form-group">
                        <label for="event-promo-deadline">Data Limite do Lote Promocional</label>
                        <input
                          id="event-promo-deadline"
                          type="date"
                          class="form-control"
                          [(ngModel)]="eventForm.promoDeadline"
                          name="promoDeadline"
                        />
                      </div>

                      <div class="form-group">
                        <label for="event-teacher-price">Preço para Professores (R$)</label>
                        <input
                          id="event-teacher-price"
                          type="number"
                          step="0.01"
                          min="0"
                          class="form-control"
                          placeholder="Ex: 80.00"
                          [(ngModel)]="eventForm.teacherPrice"
                          name="teacherPrice"
                        />
                      </div>

                      <div class="form-group">
                        <label for="event-teacher-promo-price">Preço Promo Professores (R$)</label>
                        <input
                          id="event-teacher-promo-price"
                          type="number"
                          step="0.01"
                          min="0"
                          class="form-control"
                          placeholder="Ex: 60.00"
                          [(ngModel)]="eventForm.teacherPromoPrice"
                          name="teacherPromoPrice"
                        />
                      </div>

                      <div class="form-group">
                        <label for="event-teacher-promo-deadline">Data Limite Promo Professores</label>
                        <input
                          id="event-teacher-promo-deadline"
                          type="date"
                          class="form-control"
                          [(ngModel)]="eventForm.teacherPromoDeadline"
                          name="teacherPromoDeadline"
                        />
                      </div>

                      <div class="form-group col-span-2">
                        <label for="event-pix-key">Chave Pix para Pagamento</label>
                        <input
                          id="event-pix-key"
                          type="text"
                          class="form-control"
                          placeholder="Ex: financeiro@faip.edu.br ou CNPJ"
                          [(ngModel)]="eventForm.pixKey"
                          name="pixKey"
                        />
                      </div>

                      <div class="form-group col-span-2 upload-section">
                        <label>QR Code Pix (Imagem Opcional)</label>
                        @if (eventForm.pixQrCodeUrl) {
                          <div class="media-preview-card">
                            <img [src]="eventForm.pixQrCodeUrl" alt="Preview QR Pix" class="preview-logo-img" />
                            <div class="preview-actions">
                              <span class="preview-filename">QR Code Pix carregado</span>
                              <button type="button" class="button button-danger button-sm" (click)="removePixQr()">✕ Remover QR Code</button>
                            </div>
                          </div>
                        } @else {
                          <div class="upload-dropzone">
                            <span class="upload-icon">📱</span>
                            <label class="button button-secondary button-sm btn-file-picker">
                              Selecionar Imagem QR Code Pix
                              <input type="file" accept="image/*" (change)="onPixQrFileSelected($event)" class="file-hidden-input" />
                            </label>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- Seção Artigos Científicos -->
                <div class="form-group col-span-2 form-card-section">
                  <h4 class="form-section-title">📄 Submissão de Trabalhos & Artigos Científicos</h4>
                  <div class="checkbox-group mb-2">
                    <label class="checkbox-label">
                      <input type="checkbox" [(ngModel)]="eventForm.acceptsArticles" name="acceptsArticles" />
                      <span><strong>Habilitar submissão de artigos científicos</strong> para este evento</span>
                    </label>
                  </div>

                  @if (eventForm.acceptsArticles) {
                    <div class="form-grid">
                      <div class="form-group">
                        <label for="event-articles-deadline">Data Limite de Submissão de Artigos</label>
                        <input
                          id="event-articles-deadline"
                          type="date"
                          class="form-control"
                          [(ngModel)]="eventForm.articlesDeadline"
                          name="articlesDeadline"
                        />
                      </div>

                      <div class="form-group">
                        <label for="event-issn">Código ISSN dos Anais do Evento</label>
                        <input
                          id="event-issn"
                          type="text"
                          class="form-control"
                          placeholder="Ex: 2965-1234"
                          [(ngModel)]="eventForm.issnCode"
                          name="issnCode"
                        />
                      </div>

                      <div class="form-group col-span-2 upload-section">
                        <label>Modelo Oficial de Artigo (.DOC ou .DOCX para download dos autores)</label>
                        @if (eventForm.articleTemplateUrl) {
                          <div class="media-preview-card">
                            <span class="preview-filename">📄 Modelo de Artigo Carregado</span>
                            <div class="preview-actions">
                              <a [href]="eventForm.articleTemplateUrl" target="_blank" class="button button-secondary button-sm">📥 Baixar</a>
                              <button type="button" class="button button-danger button-sm" (click)="removeArticleTemplate()">✕ Remover</button>
                            </div>
                          </div>
                        } @else {
                          <div class="upload-dropzone">
                            <span class="upload-icon">📝</span>
                            <label class="button button-secondary button-sm btn-file-picker">
                              Selecionar Arquivo DOC/DOCX do Modelo
                              <input type="file" accept=".doc,.docx" (change)="onArticleFileSelected($event)" class="file-hidden-input" />
                            </label>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>

                <!-- Seção Banner Promocional & Certificação de Monitores -->
                <div class="form-group col-span-2 form-card-section">
                  <h4 class="form-section-title">🎨 Banner Promocional & Certificados Especiais</h4>
                  <div class="form-grid">
                    <div class="form-group col-span-2 upload-section">
                      <label>Banner Promocional do Evento (Exibido no Catálogo Público)</label>
                      @if (eventForm.bannerUrl) {
                        <div class="media-preview-card">
                          <img [src]="eventForm.bannerUrl" alt="Preview Banner" class="preview-banner-img" />
                          <div class="preview-actions">
                            <span class="preview-filename">Banner carregado com sucesso</span>
                            <button type="button" class="button button-danger button-sm" (click)="removeBanner()">✕ Remover Banner</button>
                          </div>
                        </div>
                      } @else {
                        <div class="upload-dropzone">
                          <span class="upload-icon">🖼️</span>
                          <label class="button button-secondary button-sm btn-file-picker">
                            Selecionar Imagem do Banner (Paisagem)
                            <input type="file" accept="image/*" (change)="onBannerFileSelected($event)" class="file-hidden-input" />
                          </label>
                          <span class="dropzone-sub">Formato Recomendado: 1200x400px ou proporção 3:1</span>
                        </div>
                      }
                    </div>

                    <div class="form-group col-span-2 upload-section">
                      <label>Modelo Gráfico para Certificado de Monitores (A4 Paisagem)</label>
                      @if (eventForm.monitorTemplateUrl) {
                        <div class="media-preview-card">
                          <img [src]="eventForm.monitorTemplateUrl" alt="Preview Monitor" class="preview-template-img" />
                          <div class="preview-actions">
                            <span class="preview-filename">Modelo de Monitor ativo</span>
                            <button type="button" class="button button-danger button-sm" (click)="removeMonitorTemplate()">✕ Remover</button>
                          </div>
                        </div>
                      } @else {
                        <div class="upload-dropzone">
                          <span class="upload-icon">🎓</span>
                          <label class="button button-secondary button-sm btn-file-picker">
                            Selecionar Modelo para Monitor (A4 Paisagem)
                            <input type="file" accept="image/*" (change)="onMonitorFileSelected($event)" class="file-hidden-input" />
                          </label>
                        </div>
                      }
                    </div>

                    <div class="form-group col-span-2">
                      <label for="event-cert-release">Data de Liberação Geral do Certificado</label>
                      <input
                        id="event-cert-release"
                        type="date"
                        class="form-control"
                        [(ngModel)]="eventForm.certificateReleaseDate"
                        name="certificateReleaseDate"
                      />
                      <small class="form-hint">Se configurado, os participantes só poderão emitir/baixar o certificado após essa data.</small>
                    </div>
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <button class="button button-secondary" type="button" (click)="closeEventModal()">
                  Cancelar
                </button>
                <button class="button button-primary" type="submit" [disabled]="isSubmittingEvent">
                  {{ isSubmittingEvent ? 'Salvando…' : isEditingEvent ? 'Salvar Alterações' : 'Criar Evento' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ==========================================
           DRAWER / MODAL DE GERENCIAMENTO DE PARTICIPANTES
           ========================================== -->
      @if (isParticipantsDrawerOpen && activeEventDetails) {
        <div class="modal-backdrop" (click)="closeParticipantsDrawer()">
          <div class="modal-dialog modal-dialog-xl card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>Painel de Gestão do Evento</h2>
                <span class="modal-subtitle">
                  <strong>{{ activeEventDetails.title }}</strong> &bull;
                  Carga Horária: {{ activeEventDetails.workloadHours }}h
                </span>
              </div>
              <div class="drawer-header-actions">
                <div class="export-dropdown-wrapper">
                  <select
                    class="export-select"
                    (change)="onExportReportSelect($event)"
                    [disabled]="isExportingReport"
                    title="Exportar Relatório Gerencial (.xlsx)"
                  >
                    <option value="">{{ isExportingReport ? '⏳ Gerando Planilha...' : '📊 Exportar Relatório Excel...' }}</option>
                    <option value="vendas">💰 Vendas & Financeiro (.xlsx)</option>
                    <option value="salas">🚪 Fluxo & Ocupação de Salas (.xlsx)</option>
                    <option value="artigos">📑 Submissões de Artigos (.xlsx)</option>
                    <option value="demografico">👥 Perfil Demográfico (.xlsx)</option>
                    <option value="cursos">🎓 Participação por Curso (.xlsx)</option>
                    <option value="workshops">🛠️ Workshops & Minicursos (.xlsx)</option>
                  </select>
                </div>
                <button class="btn-close" type="button" (click)="closeParticipantsDrawer()" aria-label="Fechar">✕</button>
              </div>
            </div>

            <nav class="drawer-tabs-nav">
              <button
                type="button"
                class="drawer-tab-btn"
                [class.active]="activeDrawerTab === 'participantes'"
                (click)="selectDrawerTab('participantes')"
              >
                👥 Participantes ({{ activeEventDetails.participants.length }})
              </button>
              <button
                type="button"
                class="drawer-tab-btn"
                [class.active]="activeDrawerTab === 'ingressos'"
                (click)="selectDrawerTab('ingressos')"
              >
                🎟️ Ingressos & Bilheteria ({{ tickets.length }})
              </button>
              <button
                type="button"
                class="drawer-tab-btn"
                [class.active]="activeDrawerTab === 'workshops'"
                (click)="selectDrawerTab('workshops')"
              >
                🛠️ Workshops & Vagas ({{ workshops.length }})
              </button>
              <button
                type="button"
                class="drawer-tab-btn"
                [class.active]="activeDrawerTab === 'artigos'"
                (click)="selectDrawerTab('artigos')"
              >
                📄 Artigos Científicos ({{ articles.length }})
              </button>
              <button
                type="button"
                class="drawer-tab-btn"
                [class.active]="activeDrawerTab === 'financas'"
                (click)="selectDrawerTab('financas')"
              >
                💰 Finanças & Patrocínios
              </button>
              <button
                type="button"
                class="drawer-tab-btn"
                [class.active]="activeDrawerTab === 'feedbacks'"
                (click)="selectDrawerTab('feedbacks')"
              >
                ⭐ Feedbacks ({{ feedbacks.length }})
              </button>
            </nav>

            <div class="modal-body p-0">
              @if (activeDrawerTab === 'participantes') {
                <!-- Barra de Resumo e Ação de Adicionar -->
                <div class="participants-topbar">
                <div class="participants-stats">
                  <span class="stat-pill">👥 Total: <strong>{{ activeEventDetails.participants.length }}</strong></span>
                  <span class="stat-pill stat-paid">💳 Pagos: <strong>{{ countPaidParticipants() }}</strong></span>
                  <span class="stat-pill stat-eligible">📜 Aptos: <strong>{{ countEligibleParticipants() }}</strong></span>
                </div>
                <button
                  class="button button-primary button-sm"
                  type="button"
                  (click)="toggleAddParticipantForm()"
                >
                  {{ showAddParticipantForm ? '✕ Fechar Formulário' : '➕ Adicionar Aluno ao Evento' }}
                </button>
              </div>

              <!-- Formulário Rápido de Adição de Participante -->
              @if (showAddParticipantForm) {
                <div class="add-participant-panel">
                  <h4>Vincular Novo Aluno ao Evento</h4>
                  <form (ngSubmit)="saveParticipant()" class="participant-form-grid">
                    <div class="form-group">
                      <label for="part-ra">RA do Aluno *</label>
                      <input
                        id="part-ra"
                        type="text"
                        class="form-control"
                        placeholder="Ex: 245080"
                        [(ngModel)]="participantForm.studentRa"
                        name="studentRa"
                        required
                      />
                    </div>

                    <div class="form-group col-span-2">
                      <label for="part-name">Nome Completo do Aluno *</label>
                      <input
                        id="part-name"
                        type="text"
                        class="form-control"
                        placeholder="Ex: Lucas Henrique Santos"
                        [(ngModel)]="participantForm.studentName"
                        name="studentName"
                        required
                      />
                    </div>

                    <div class="form-group">
                      <label for="part-cpf">CPF (Opcional)</label>
                      <input
                        id="part-cpf"
                        type="text"
                        class="form-control"
                        placeholder="000.000.000-00"
                        [(ngModel)]="participantForm.studentCpf"
                        name="studentCpf"
                      />
                    </div>

                    <div class="form-group col-span-2">
                      <label for="part-email">E-mail (Opcional)</label>
                      <input
                        id="part-email"
                        type="email"
                        class="form-control"
                        placeholder="aluno@aluno.faip.edu.br"
                        [(ngModel)]="participantForm.studentEmail"
                        name="studentEmail"
                      />
                    </div>

                    <div class="form-group col-span-2 checkbox-row">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [(ngModel)]="participantForm.isPaid"
                          name="isPaid"
                        />
                        <span>Taxa de Inscrição já quitada (Pago)</span>
                      </label>
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [(ngModel)]="participantForm.hasAttendance"
                          name="hasAttendance"
                        />
                        <span>Presença confirmada nas atividades</span>
                      </label>
                    </div>

                    <div class="form-actions col-span-full">
                      <button class="button button-secondary button-sm" type="button" (click)="toggleAddParticipantForm()">
                        Cancelar
                      </button>
                      <button class="button button-primary button-sm" type="submit" [disabled]="isSubmittingParticipant">
                        {{ isSubmittingParticipant ? 'Adicionando…' : 'Salvar Aluno' }}
                      </button>
                    </div>
                  </form>
                </div>
              }

              <!-- Tabela de Participantes Vinculados -->
              @if (activeEventDetails.participants.length === 0) {
                <div class="empty-state p-6">
                  <p>Nenhum aluno vinculado a este evento até o momento.</p>
                  <button class="button button-secondary button-sm mt-2" type="button" (click)="toggleAddParticipantForm()">
                    ➕ Adicionar Primeiro Aluno
                  </button>
                </div>
              } @else {
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th class="text-center">Status Pagamento (Clique p/ Alternar)</th>
                        <th class="text-center">Presença (Clique p/ Alternar)</th>
                        <th class="text-center">Situação Final</th>
                        <th class="text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of activeEventDetails.participants; track p.id) {
                        <tr>
                          <td>
                            <div class="student-cell">
                              <div class="student-avatar">{{ getInitials(p.studentName) }}</div>
                              <div class="student-info">
                                <strong class="student-name">{{ p.studentName }}</strong>
                                <span class="student-ra">RA: {{ p.studentRa }}{{ p.studentCpf ? ' • CPF: ' + formatCpf(p.studentCpf) : '' }}</span>
                              </div>
                            </div>
                          </td>

                          <!-- Toggle de Pagamento Interativo com 1 Clique -->
                          <td class="text-center">
                            @if (p.isPaid) {
                              <button
                                class="badge badge-paid clickable-badge"
                                type="button"
                                (click)="togglePaymentStatus(p)"
                                title="Clique para alterar para Pendente"
                              >
                                ✓ Taxa Paga
                              </button>
                            } @else {
                              <button
                                class="badge badge-pending clickable-badge"
                                type="button"
                                (click)="togglePaymentStatus(p)"
                                title="Clique para confirmar pagamento da taxa"
                              >
                                ⏳ Pendente
                              </button>
                            }
                          </td>

                          <!-- Toggle de Presença Interativo com 1 Clique -->
                          <td class="text-center">
                            @if (p.hasAttendance) {
                              <button
                                class="badge badge-attendance-ok clickable-badge"
                                type="button"
                                (click)="toggleAttendanceStatus(p)"
                                title="Clique para marcar como ausente"
                              >
                                ✓ Presente
                              </button>
                            } @else {
                              <button
                                class="badge badge-attendance-missing clickable-badge"
                                type="button"
                                (click)="toggleAttendanceStatus(p)"
                                title="Clique para confirmar presença"
                              >
                                ✕ Ausente
                              </button>
                            }
                          </td>

                          <!-- Situação Final -->
                          <td class="text-center">
                            @if (p.isEligible) {
                              <span class="badge badge-success">✓ Apto</span>
                            } @else {
                              <span class="badge badge-danger" [title]="p.blockedReason || 'Requisitos pendentes'">
                                🔒 Bloqueado
                              </span>
                            }
                          </td>

                          <!-- Emissão ou Exclusão -->
                          <td class="text-right">
                            <div class="participant-row-actions">
                              @if (p.isEligible) {
                                <button
                                  class="button button-sm button-primary emit-btn"
                                  type="button"
                                  (click)="openCertificateForParticipant(p)"
                                >
                                  📜 Emitir Certificado
                                </button>
                              } @else {
                                <span class="locked-text" [title]="p.blockedReason">
                                  Inapto
                                </span>
                              }
                              <button
                                class="btn-icon text-danger"
                                type="button"
                                (click)="removeParticipant(p)"
                                title="Desvincular Aluno"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            }

            <!-- TAB 2: INGRESSOS & BILHETERIA -->
            @if (activeDrawerTab === 'ingressos') {
              <div class="drawer-tab-content p-4">
                <div class="tickets-topbar mb-3">
                  <div class="filter-pills">
                    <button type="button" class="filter-pill" [class.active]="ticketStatusFilter === ''" (click)="filterTicketsByStatus('')">Todos ({{ tickets.length }})</button>
                    <button type="button" class="filter-pill" [class.active]="ticketStatusFilter === 'pago'" (click)="filterTicketsByStatus('pago')">✓ Pagos</button>
                    <button type="button" class="filter-pill" [class.active]="ticketStatusFilter === 'em_analise'" (click)="filterTicketsByStatus('em_analise')">⏳ Em Análise</button>
                    <button type="button" class="filter-pill" [class.active]="ticketStatusFilter === 'aguardando_pagamento'" (click)="filterTicketsByStatus('aguardando_pagamento')">🕒 Aguardando</button>
                    <button type="button" class="filter-pill" [class.active]="ticketStatusFilter === 'utilizado'" (click)="filterTicketsByStatus('utilizado')">🎫 Utilizados</button>
                    <button type="button" class="filter-pill" [class.active]="ticketStatusFilter === 'rejeitado'" (click)="filterTicketsByStatus('rejeitado')">✕ Rejeitados</button>
                  </div>

                  <button type="button" class="button button-secondary button-sm" (click)="cronExpireTickets()" [disabled]="isExpiringTickets">
                    ⏰ {{ isExpiringTickets ? 'Cancelando Vencidos…' : 'Cancelar Ingressos Vencidos (Cron)' }}
                  </button>
                </div>

                @if (isLoadingTickets) {
                  <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Carregando ingressos do evento…</p>
                  </div>
                } @else if (tickets.length === 0) {
                  <div class="empty-state p-6">
                    <p>Nenhum ingresso emitido nesta categoria até o momento.</p>
                  </div>
                } @else {
                  <div class="table-responsive">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Titular</th>
                          <th>Valor / Vencimento</th>
                          <th>Workshop Vinculado</th>
                          <th>Status</th>
                          <th>Comprovante</th>
                          <th class="text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (t of tickets; track t.id) {
                          <tr>
                            <td>
                              <code class="ticket-code">#{{ t.uniqueCode }}</code>
                              @if (t.isMonitor) {
                                <span class="badge badge-warning ml-1">🌟 Monitor</span>
                              }
                            </td>
                            <td>
                              <div class="student-info">
                                <strong>{{ t.userName || 'Visitante / Sem cadastro' }}</strong>
                                <span class="student-ra">{{ t.userEmail || '—' }} &bull; {{ t.userRole || 'aluno' }}</span>
                              </div>
                            </td>
                            <td>
                              <div>
                                <strong>R$ {{ t.amountPaid.toFixed(2) }}</strong>
                                @if (t.dueDate) {
                                  <div class="text-muted text-xs">Venc: {{ formatDate(t.dueDate) }}</div>
                                }
                              </div>
                            </td>
                            <td>
                              @if (t.workshops && t.workshops.length > 0) {
                                @for (w of t.workshops; track w.id) {
                                  <span class="badge badge-info">{{ w.title }}</span>
                                }
                              } @else {
                                <span class="text-muted text-xs">Nenhum</span>
                              }
                            </td>
                            <td>
                              @if (t.status === 'pago') {
                                <span class="badge badge-paid">✓ Pago</span>
                              } @else if (t.status === 'em_analise') {
                                <span class="badge badge-pending">⏳ Em Análise</span>
                              } @else if (t.status === 'aguardando_pagamento') {
                                <span class="badge badge-pending">🕒 Aguardando</span>
                              } @else if (t.status === 'utilizado') {
                                <span class="badge badge-attendance-ok">🎫 Utilizado</span>
                              } @else {
                                <span class="badge badge-danger">✕ {{ t.status }}</span>
                              }
                            </td>
                            <td>
                              @if (t.receiptUrl) {
                                <button type="button" class="button button-secondary button-xs" (click)="viewReceipt(t.receiptUrl)">
                                  👁️ Ver Recibo
                                </button>
                              } @else {
                                <span class="text-muted text-xs">—</span>
                              }
                            </td>
                            <td class="text-right">
                              <div class="action-buttons-group justify-end">
                                @if (t.status === 'em_analise' || t.status === 'aguardando_pagamento') {
                                  <button type="button" class="button button-success button-xs" (click)="validateTicket(t.id, 'pago')">
                                    ✓ Aprovar
                                  </button>
                                  <button type="button" class="button button-accent button-xs" (click)="validateTicket(t.id, 'pago', true)" title="Aprovar e conceder papel de Monitor">
                                    🌟 Monitor
                                  </button>
                                  <button type="button" class="button button-danger button-xs" (click)="validateTicket(t.id, 'rejeitado')">
                                    ✕ Rejeitar
                                  </button>
                                }
                                <button type="button" class="button button-secondary button-xs" (click)="openSwitchWorkshop(t)" title="Mudar o aluno para outro mini-curso">
                                  🔄 Workshop
                                </button>
                              </div>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            }

            <!-- TAB 3: WORKSHOPS & VAGAS -->
            @if (activeDrawerTab === 'workshops') {
              <div class="drawer-tab-content p-4">
                <div class="participants-topbar mb-3">
                  <div>
                    <h4>Workshops & Mini-cursos Práticos</h4>
                    <p class="text-muted text-xs">Oficinas temáticas com controle de concorrência e limite de vagas em tempo real.</p>
                  </div>
                  <button type="button" class="button button-primary button-sm" (click)="openNewWorkshopModal()">
                    ➕ Novo Workshop
                  </button>
                </div>

                @if (isLoadingWorkshops) {
                  <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Carregando workshops…</p>
                  </div>
                } @else if (workshops.length === 0) {
                  <div class="empty-state p-6">
                    <span class="empty-icon">🛠️</span>
                    <p>Nenhum workshop cadastrado para este evento.</p>
                    <button type="button" class="button button-primary button-sm" (click)="openNewWorkshopModal()">
                      Cadastrar Primeiro Workshop
                    </button>
                  </div>
                } @else {
                  <div class="workshops-list">
                    @for (w of workshops; track w.id) {
                      <div class="card card-elevated workshop-manage-card mb-3 p-3">
                        <div class="workshop-card-header">
                          <div>
                            @if (w.courseName) {
                              <span class="event-course-tag">{{ w.courseName }}</span>
                            }
                            <h4 class="workshop-title">{{ w.title }}</h4>
                            @if (w.description) {
                              <p class="workshop-desc">{{ w.description }}</p>
                            }
                          </div>
                          <div class="workshop-actions-row">
                            <button type="button" class="btn-icon" (click)="openEditWorkshopModal(w)" title="Editar Workshop">✏️</button>
                            <button type="button" class="btn-icon text-danger" (click)="deleteWorkshop(w)" title="Excluir Workshop">🗑️</button>
                          </div>
                        </div>

                        <!-- Barra de Ocupação de Vagas -->
                        <div class="vacancy-stats-box mt-2">
                          <div class="vacancy-labels">
                            <span>Ocupação de Vagas</span>
                            <span><strong>{{ w.occupiedVacancies }}</strong> / {{ w.vacancies }} preenchidas ({{ w.remainingVacancies }} restantes)</span>
                          </div>
                          <div class="vacancy-bar-bg">
                            <div
                              class="vacancy-bar-fill"
                              [style.width.%]="w.vacancies > 0 ? (w.occupiedVacancies / w.vacancies) * 100 : 0"
                              [class.full]="w.remainingVacancies <= 0"
                            ></div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- TAB 4: ARTIGOS CIENTÍFICOS -->
            @if (activeDrawerTab === 'artigos') {
              <div class="drawer-tab-content p-4">
                <div class="tickets-topbar mb-3">
                  <div class="filter-pills">
                    <button type="button" class="filter-pill" [class.active]="articleStatusFilter === ''" (click)="filterArticlesByStatus('')">Todos ({{ articles.length }})</button>
                    <button type="button" class="filter-pill" [class.active]="articleStatusFilter === 'submetido'" (click)="filterArticlesByStatus('submetido')">Submetidos</button>
                    <button type="button" class="filter-pill" [class.active]="articleStatusFilter === 'em_analise'" (click)="filterArticlesByStatus('em_analise')">Em Análise</button>
                    <button type="button" class="filter-pill" [class.active]="articleStatusFilter === 'aprovado'" (click)="filterArticlesByStatus('aprovado')">✓ Aprovados</button>
                    <button type="button" class="filter-pill" [class.active]="articleStatusFilter === 'correcao'" (click)="filterArticlesByStatus('correcao')">⚠️ Correções</button>
                    <button type="button" class="filter-pill" [class.active]="articleStatusFilter === 'reprovado'" (click)="filterArticlesByStatus('reprovado')">✕ Reprovados</button>
                  </div>

                  @if (activeEventDetails.issnCode) {
                    <span class="stat-pill">📚 ISSN: <strong>{{ activeEventDetails.issnCode }}</strong></span>
                  }
                </div>

                @if (isLoadingArticles) {
                  <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Carregando artigos científicos…</p>
                  </div>
                } @else if (articles.length === 0) {
                  <div class="empty-state p-6">
                    <span class="empty-icon">📄</span>
                    <p>Nenhum artigo científico submetido para este evento.</p>
                  </div>
                } @else {
                  <div class="table-responsive">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Título do Trabalho</th>
                          <th>Autor(es) / Orientador</th>
                          <th>Arquivos</th>
                          <th>Trava / Avaliador</th>
                          <th>Status</th>
                          <th class="text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (a of articles; track a.id) {
                          <tr>
                            <td>
                              <strong>{{ a.title }}</strong>
                              <div class="text-xs text-muted">Submetido em {{ formatDate(a.createdAt) }}</div>
                            </td>
                            <td>
                              <div class="student-info">
                                <span><strong>Autor:</strong> {{ a.authorName }}</span>
                                @if (a.coauthors) {
                                  <span class="text-xs text-muted"><strong>Coautores:</strong> {{ a.coauthors }}</span>
                                }
                                @if (a.advisorName) {
                                  <span class="text-xs text-muted"><strong>Orientador:</strong> {{ a.advisorName }}</span>
                                }
                              </div>
                            </td>
                            <td>
                              <div class="action-buttons-group">
                                <a [href]="a.docFileUrl" target="_blank" class="button button-secondary button-xs">📥 DOC</a>
                                @if (a.pdfFileUrl) {
                                  <a [href]="a.pdfFileUrl" target="_blank" class="button button-secondary button-xs">📄 PDF</a>
                                }
                              </div>
                            </td>
                            <td>
                              <div class="lock-indicator">
                                @if (a.currentLockId) {
                                  <span class="badge badge-warning">🔒 Travado</span>
                                } @else {
                                  <span class="badge badge-success">🔓 Livre</span>
                                }
                                <button type="button" class="button button-xs button-secondary mt-1" (click)="toggleArticleLock(a)">
                                  {{ a.currentLockId ? 'Destravar' : 'Travar' }}
                                </button>
                                @if (a.evaluatorName) {
                                  <span class="text-xs text-muted d-block mt-1">Por: {{ a.evaluatorName }}</span>
                                }
                              </div>
                            </td>
                            <td>
                              @if (a.status === 'aprovado') {
                                <span class="badge badge-success">✓ Aprovado</span>
                              } @else if (a.status === 'correcao') {
                                <span class="badge badge-pending">⚠️ Correção</span>
                              } @else if (a.status === 'reprovado') {
                                <span class="badge badge-danger">✕ Reprovado</span>
                              } @else {
                                <span class="badge badge-info">{{ a.status }}</span>
                              }
                            </td>
                            <td class="text-right">
                              <button type="button" class="button button-primary button-xs" (click)="openReviewModal(a)">
                                📝 Avaliar
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            }

            <!-- TAB 5: FINANÇAS & PATROCÍNIOS -->
            @if (activeDrawerTab === 'financas') {
              <div class="drawer-tab-content p-4">
                @if (isLoadingFinances) {
                  <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Carregando dados financeiros…</p>
                  </div>
                } @else {
                  <!-- KPI Cards Grid -->
                  <div class="financial-cards-grid">
                    <div class="card card-elevated fin-kpi-card p-3">
                      <span class="kpi-icon">🎟️</span>
                      <div class="kpi-info">
                        <span class="kpi-label">Receita de Ingressos</span>
                        <strong class="kpi-val text-success">R$ {{ (financialSummary?.ticketsRevenue || 0).toFixed(2) }}</strong>
                        <span class="kpi-sub">{{ financialSummary?.paidTicketsCount || 0 }} pagos de {{ financialSummary?.ticketsCount || 0 }}</span>
                      </div>
                    </div>

                    <div class="card card-elevated fin-kpi-card p-3">
                      <span class="kpi-icon">🤝</span>
                      <div class="kpi-info">
                        <span class="kpi-label">Arrecadação de Patrocínios</span>
                        <strong class="kpi-val text-info">R$ {{ (financialSummary?.sponsorsTotal || 0).toFixed(2) }}</strong>
                        <span class="kpi-sub">{{ sponsors.length }} parceiros</span>
                      </div>
                    </div>

                    <div class="card card-elevated fin-kpi-card p-3">
                      <span class="kpi-icon">📉</span>
                      <div class="kpi-info">
                        <span class="kpi-label">Despesas Totais</span>
                        <strong class="kpi-val text-danger">R$ {{ (financialSummary?.expensesTotal || 0).toFixed(2) }}</strong>
                        <span class="kpi-sub">{{ expenses.length }} comprovantes</span>
                      </div>
                    </div>

                    <div class="card card-elevated fin-kpi-card p-3">
                      <span class="kpi-icon">⚖️</span>
                      <div class="kpi-info">
                        <span class="kpi-label">Saldo Líquido</span>
                        <strong class="kpi-val" [ngClass]="(financialSummary?.netBalance || 0) >= 0 ? 'text-success' : 'text-danger'">
                          R$ {{ (financialSummary?.netBalance || 0).toFixed(2) }}
                        </strong>
                        <span class="kpi-sub">{{ (financialSummary?.netBalance || 0) >= 0 ? 'Superávit do Evento' : 'Déficit' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Seção de Despesas -->
                  <div class="mt-4">
                    <div class="participants-topbar mb-2">
                      <h4>📉 Despesas do Evento</h4>
                      <button type="button" class="button button-primary button-sm" (click)="openNewExpenseModal()">
                        ➕ Lançar Despesa
                      </button>
                    </div>

                    @if (expenses.length === 0) {
                      <p class="text-muted p-4">Nenhuma despesa lançada para este evento.</p>
                    } @else {
                      <div class="table-responsive">
                        <table class="data-table">
                          <thead>
                            <tr>
                              <th>Descrição</th>
                              <th>Categoria</th>
                              <th>Data</th>
                              <th>Valor (R$)</th>
                              <th>Comprovante</th>
                              <th class="text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (e of expenses; track e.id) {
                              <tr>
                                <td><strong>{{ e.description }}</strong></td>
                                <td><span class="badge badge-info">{{ e.category }}</span></td>
                                <td>{{ formatDate(e.expenseDate) }}</td>
                                <td class="text-danger font-semibold">R$ {{ e.amount.toFixed(2) }}</td>
                                <td>
                                  @if (e.receiptUrl) {
                                    <a [href]="e.receiptUrl" target="_blank" class="button button-secondary button-xs">📄 Recibo</a>
                                  } @else {
                                    <span class="text-muted text-xs">—</span>
                                  }
                                </td>
                                <td class="text-right">
                                  <button type="button" class="btn-icon text-danger" (click)="deleteExpense(e)" title="Excluir Despesa">🗑️</button>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  </div>

                  <!-- Seção de Patrocinadores -->
                  <div class="mt-4">
                    <div class="participants-topbar mb-2">
                      <h4>🤝 Patrocinadores & Parceiros</h4>
                      <button type="button" class="button button-primary button-sm" (click)="openNewSponsorModal()">
                        ➕ Novo Patrocinador
                      </button>
                    </div>

                    @if (sponsors.length === 0) {
                      <p class="text-muted p-4">Nenhum patrocinador cadastrado para este evento.</p>
                    } @else {
                      <div class="sponsors-grid">
                        @for (sp of sponsors; track sp.id) {
                          <div class="card card-elevated sponsor-card p-3 mb-2">
                            <div class="sponsor-card-top">
                              <div>
                                <h5>{{ sp.name }}</h5>
                                <span class="text-xs text-muted">{{ sp.contact || 'Sem contato informado' }}</span>
                              </div>
                              <strong class="text-success">R$ {{ sp.totalAmount.toFixed(2) }}</strong>
                            </div>
                            <div class="sponsor-card-actions mt-2">
                              <span class="text-xs text-muted">{{ sp.movementsCount }} movimentações</span>
                              <button type="button" class="button button-secondary button-xs" (click)="openSponsorMovementModal(sp)">
                                + Lançar Movimento
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- TAB 6: FEEDBACKS -->
            @if (activeDrawerTab === 'feedbacks') {
              <div class="drawer-tab-content p-4">
                @if (isLoadingFeedbacks) {
                  <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Carregando avaliações…</p>
                  </div>
                } @else if (feedbacks.length === 0) {
                  <div class="empty-state p-6">
                    <span class="empty-icon">⭐</span>
                    <p>Nenhuma avaliação recebida para este evento até o momento.</p>
                  </div>
                } @else {
                  <div class="feedbacks-overview card card-elevated mb-3 p-3">
                    <div class="avg-score-box">
                      <span class="avg-score-number">{{ getAverageRating().toFixed(1) }}</span>
                      <div class="avg-stars">
                        @for (s of [1,2,3,4,5]; track s) {
                          <span [class.filled]="s <= getAverageRating()">★</span>
                        }
                      </div>
                      <span class="avg-total">Média baseada em {{ feedbacks.length }} avaliações</span>
                    </div>
                  </div>

                  <div class="feedbacks-list">
                    @for (fb of feedbacks; track fb.id) {
                      <div class="card card-elevated feedback-card mb-2 p-3">
                        <div class="feedback-card-header">
                          <div class="student-info">
                            <strong>{{ fb.userName }}</strong>
                            <span class="text-xs text-muted">{{ formatDate(fb.createdAt) }}</span>
                          </div>
                          <div class="feedback-stars">
                            @for (s of [1,2,3,4,5]; track s) {
                              <span [class.filled]="s <= fb.rating">★</span>
                            }
                          </div>
                        </div>
                        @if (fb.comment) {
                          <p class="feedback-comment mt-2">"{{ fb.comment }}"</p>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <div class="modal-footer">
            <span class="footer-hint">
              💡 Painel Geral de Administração do Evento &bull; UniCore Extensão
            </span>
            <button class="button button-secondary" type="button" (click)="closeParticipantsDrawer()">
              Fechar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- SUBMODAL 1: Mudar Workshop do Aluno -->
    @if (selectedTicketForWorkshop) {
      <div class="modal-backdrop submodal-backdrop" (click)="closeSwitchWorkshop()">
        <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>🔄 Mudar Workshop do Aluno</h3>
            <button class="btn-close" type="button" (click)="closeSwitchWorkshop()">✕</button>
          </div>
          <div class="modal-body">
            <p>Selecione o novo workshop para <strong>{{ selectedTicketForWorkshop.userName }}</strong>:</p>
            <div class="form-group mt-2">
              <label for="new-workshop-select">Workshop Destino</label>
              <select id="new-workshop-select" class="form-control" [(ngModel)]="selectedNewWorkshopId">
                <option value="">Selecione um workshop…</option>
                @for (w of workshops; track w.id) {
                  <option [value]="w.id" [disabled]="w.remainingVacancies <= 0">
                    {{ w.title }} ({{ w.remainingVacancies }} vagas restantes)
                  </option>
                }
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="button button-secondary button-sm" (click)="closeSwitchWorkshop()">Cancelar</button>
            <button type="button" class="button button-primary button-sm" [disabled]="!selectedNewWorkshopId" (click)="confirmSwitchWorkshop()">
              Confirmar Troca
            </button>
          </div>
        </div>
      </div>
    }

    <!-- SUBMODAL 2: Criar / Editar Workshop -->
    @if (isWorkshopModalOpen) {
      <div class="modal-backdrop submodal-backdrop" (click)="closeWorkshopModal()">
        <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ isEditingWorkshop ? 'Editar Workshop' : 'Novo Workshop / Mini-Curso' }}</h3>
            <button class="btn-close" type="button" (click)="closeWorkshopModal()">✕</button>
          </div>
          <form (ngSubmit)="saveWorkshop()">
            <div class="modal-body form-grid">
              <div class="form-group col-span-2">
                <label for="w-title">Título do Workshop *</label>
                <input id="w-title" type="text" class="form-control" [(ngModel)]="workshopForm.title" name="wTitle" required />
              </div>
              <div class="form-group">
                <label for="w-course">Curso Vinculado</label>
                <input id="w-course" type="text" class="form-control" [(ngModel)]="workshopForm.courseName" name="wCourse" />
              </div>
              <div class="form-group">
                <label for="w-vacancies">Limite de Vagas *</label>
                <input id="w-vacancies" type="number" min="1" class="form-control" [(ngModel)]="workshopForm.vacancies" name="wVacancies" required />
              </div>
              <div class="form-group col-span-2">
                <label for="w-desc">Descrição / Ementa</label>
                <textarea id="w-desc" rows="3" class="form-control" [(ngModel)]="workshopForm.description" name="wDesc"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="button button-secondary button-sm" (click)="closeWorkshopModal()">Cancelar</button>
              <button type="submit" class="button button-primary button-sm">Salvar Workshop</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- SUBMODAL 3: Avaliar Artigo Científico -->
    @if (selectedArticleForReview) {
      <div class="modal-backdrop submodal-backdrop" (click)="closeReviewModal()">
        <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>📝 Avaliação de Artigo Científico</h3>
              <span class="modal-subtitle"><strong>{{ selectedArticleForReview.title }}</strong></span>
            </div>
            <button class="btn-close" type="button" (click)="closeReviewModal()">✕</button>
          </div>
          <form (ngSubmit)="submitArticleReview()">
            <div class="modal-body form-grid">
              <div class="form-group">
                <label for="rev-status">Parecer Final *</label>
                <select id="rev-status" class="form-control" [(ngModel)]="reviewForm.status" name="revStatus">
                  <option value="aprovado">✓ Aprovado para Publicação</option>
                  <option value="correcao">⚠️ Necessita Correções</option>
                  <option value="reprovado">✕ Reprovado</option>
                </select>
              </div>
              <div class="form-group">
                <label for="rev-score">Nota (0 a 10)</label>
                <input id="rev-score" type="number" min="0" max="10" step="0.1" class="form-control" [(ngModel)]="reviewForm.score" name="revScore" />
              </div>
              <div class="form-group col-span-2">
                <label for="rev-notes">Parecer / Observações do Parecerista</label>
                <textarea id="rev-notes" rows="3" class="form-control" [(ngModel)]="reviewForm.feedbackNotes" name="revNotes" placeholder="Comentários sobre a escrita, metodologia, referências…"></textarea>
              </div>
              <div class="form-group col-span-2">
                <label>Relatório Anti-Plágio (PDF opcional)</label>
                <input type="file" accept=".pdf" (change)="onPlagioFileSelected($event)" class="form-control" />
              </div>
              <div class="form-group col-span-2">
                <label>Arquivo com Correções e Apontamentos (DOCX ou PDF opcional)</label>
                <input type="file" accept=".doc,.docx,.pdf" (change)="onCorrecaoFileSelected($event)" class="form-control" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="button button-secondary button-sm" (click)="closeReviewModal()">Cancelar</button>
              <button type="submit" class="button button-primary button-sm" [disabled]="isSubmittingReview">
                {{ isSubmittingReview ? 'Enviando Parecer…' : 'Salvar Avaliação' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- SUBMODAL 4: Lançar Despesa -->
    @if (isExpenseModalOpen) {
      <div class="modal-backdrop submodal-backdrop" (click)="closeExpenseModal()">
        <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>➕ Lançar Nova Despesa</h3>
            <button class="btn-close" type="button" (click)="closeExpenseModal()">✕</button>
          </div>
          <form (ngSubmit)="saveExpense()">
            <div class="modal-body form-grid">
              <div class="form-group col-span-2">
                <label for="exp-desc">Descrição do Gasto *</label>
                <input id="exp-desc" type="text" class="form-control" [(ngModel)]="expenseForm.description" name="expDesc" placeholder="Ex: Coffee Break 1º Dia, Impressão de Crachás" required />
              </div>
              <div class="form-group">
                <label for="exp-cat">Categoria *</label>
                <select id="exp-cat" class="form-control" [(ngModel)]="expenseForm.category" name="expCat">
                  <option value="Geral">Geral</option>
                  <option value="Alimentação">Alimentação / Coffee Break</option>
                  <option value="Gráfica">Gráfica / Crachás / Banner</option>
                  <option value="Palestrante">Cachê / Palestrante</option>
                  <option value="Transporte">Transporte / Passagens</option>
                  <option value="Equipamentos">Equipamentos / TI</option>
                </select>
              </div>
              <div class="form-group">
                <label for="exp-amount">Valor (R$) *</label>
                <input id="exp-amount" type="number" step="0.01" min="0" class="form-control" [(ngModel)]="expenseForm.amount" name="expAmount" required />
              </div>
              <div class="form-group">
                <label for="exp-date">Data da Despesa *</label>
                <input id="exp-date" type="date" class="form-control" [(ngModel)]="expenseForm.expenseDate" name="expDate" required />
              </div>
              <div class="form-group col-span-2">
                <label>Comprovante / Nota Fiscal (PDF ou Imagem opcional)</label>
                <input type="file" accept="image/*,.pdf" (change)="onExpenseFileSelected($event)" class="form-control" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="button button-secondary button-sm" (click)="closeExpenseModal()">Cancelar</button>
              <button type="submit" class="button button-primary button-sm" [disabled]="isSubmittingExpense">
                {{ isSubmittingExpense ? 'Salvando…' : 'Salvar Despesa' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- SUBMODAL 5: Novo Patrocinador -->
    @if (isSponsorModalOpen) {
      <div class="modal-backdrop submodal-backdrop" (click)="closeSponsorModal()">
        <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>🤝 Novo Patrocinador / Parceiro</h3>
            <button class="btn-close" type="button" (click)="closeSponsorModal()">✕</button>
          </div>
          <form (ngSubmit)="saveSponsor()">
            <div class="modal-body form-grid">
              <div class="form-group col-span-2">
                <label for="sp-name">Nome da Empresa / Instituição *</label>
                <input id="sp-name" type="text" class="form-control" [(ngModel)]="sponsorForm.name" name="spName" placeholder="Ex: Tech Solutions Brasil" required />
              </div>
              <div class="form-group col-span-2">
                <label for="sp-contact">Contato (Telefone / Email)</label>
                <input id="sp-contact" type="text" class="form-control" [(ngModel)]="sponsorForm.contact" name="spContact" placeholder="Ex: contato@empresa.com.br" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="button button-secondary button-sm" (click)="closeSponsorModal()">Cancelar</button>
              <button type="submit" class="button button-primary button-sm">Salvar Patrocinador</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- SUBMODAL 6: Movimento de Patrocinador -->
    @if (selectedSponsorForMovement) {
      <div class="modal-backdrop submodal-backdrop" (click)="closeSponsorMovementModal()">
        <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>+ Lançar Movimento de Patrocínio</h3>
              <span class="modal-subtitle"><strong>{{ selectedSponsorForMovement.name }}</strong></span>
            </div>
            <button class="btn-close" type="button" (click)="closeSponsorMovementModal()">✕</button>
          </div>
          <form (ngSubmit)="saveSponsorMovement()">
            <div class="modal-body form-grid">
              <div class="form-group">
                <label for="mv-type">Tipo</label>
                <select id="mv-type" class="form-control" [(ngModel)]="sponsorMovementForm.type" name="mvType">
                  <option value="entrada">Entrada (Aporte recebido)</option>
                  <option value="saida">Saída (Contrapartida)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="mv-nature">Natureza</label>
                <select id="mv-nature" class="form-control" [(ngModel)]="sponsorMovementForm.nature" name="mvNature">
                  <option value="Financeiro">Financeiro (Dinheiro / Pix)</option>
                  <option value="Material">Material / Insumos</option>
                  <option value="Brindes">Brindes / Kits</option>
                  <option value="Serviços">Serviços / Apoio Técnico</option>
                </select>
              </div>
              <div class="form-group col-span-2">
                <label for="mv-desc">Descrição do Movimento *</label>
                <input id="mv-desc" type="text" class="form-control" [(ngModel)]="sponsorMovementForm.description" name="mvDesc" placeholder="Ex: Cota Ouro Patrocínio 2026" required />
              </div>
              <div class="form-group">
                <label for="mv-amount">Valor Financeiro (R$)</label>
                <input id="mv-amount" type="number" step="0.01" min="0" class="form-control" [(ngModel)]="sponsorMovementForm.amount" name="mvAmount" />
              </div>
              <div class="form-group">
                <label for="mv-qty">Quantidade</label>
                <input id="mv-qty" type="number" min="1" class="form-control" [(ngModel)]="sponsorMovementForm.quantity" name="mvQty" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="button button-secondary button-sm" (click)="closeSponsorMovementModal()">Cancelar</button>
              <button type="submit" class="button button-primary button-sm">Salvar Movimento</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- SUBMODAL 7: Ver Comprovante -->
    @if (viewingReceiptUrl) {
      <div class="modal-backdrop submodal-backdrop" (click)="closeReceiptModal()">
        <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>📄 Comprovante de Pagamento</h3>
            <button class="btn-close" type="button" (click)="closeReceiptModal()">✕</button>
          </div>
          <div class="modal-body text-center">
            <img [src]="viewingReceiptUrl" alt="Comprovante" class="receipt-full-preview" />
          </div>
          <div class="modal-footer">
            <a [href]="viewingReceiptUrl" target="_blank" class="button button-primary button-sm">Abrir em Nova Aba</a>
            <button type="button" class="button button-secondary button-sm" (click)="closeReceiptModal()">Fechar</button>
          </div>
        </div>
      </div>
    }

      <!-- ==========================================
           MODAL DE VISUALIZAÇÃO E IMPRESSÃO DO CERTIFICADO
           ========================================== -->
      @if (isCertModalOpen && currentDoc) {
        <div class="modal-backdrop" (click)="closeCertModal()">
          <div class="modal-dialog modal-cert-dialog" [class.with-designer]="isCustomizingTemplate" (click)="$event.stopPropagation()">
            <div class="modal-header no-print">
              <div class="cert-modal-header-titles">
                <h2>Certificado de Extensão Universitária</h2>
                <div class="student-name-edit-bar">
                  <label for="edit-student-name">Nome do Aluno no Certificado:</label>
                  <input
                    id="edit-student-name"
                    type="text"
                    class="form-control student-name-input"
                    [(ngModel)]="currentDoc.studentName"
                    title="Altere ou confirme o nome do aluno antes de emitir/imprimir"
                  />
                </div>
              </div>
              <div class="modal-header-actions">
                <button
                  class="button button-sm"
                  [ngClass]="isCustomizingTemplate ? 'button-primary' : 'button-secondary'"
                  type="button"
                  (click)="isCustomizingTemplate = !isCustomizingTemplate"
                  title="Personalizar moldura, cores, fontes, textos e assinaturas do modelo"
                >
                  🎨 {{ isCustomizingTemplate ? 'Ocultar Designer' : 'Personalizar Modelo' }}
                </button>
                @if (currentDoc.certificateTemplateUrl) {
                  <button
                    class="button button-secondary button-sm"
                    type="button"
                    (click)="useOfficialLayoutOnly = !useOfficialLayoutOnly"
                  >
                    {{ useOfficialLayoutOnly ? '🖼️ Ver Imagem Pura' : '🏛️ Ver Modelo Formatado' }}
                  </button>
                }
                <button class="button button-primary print-action-btn" type="button" (click)="printCertificate()">
                  🖨️ Imprimir / Salvar em PDF
                </button>
                <button class="btn-close" type="button" (click)="closeCertModal()" aria-label="Fechar modal">✕</button>
              </div>
            </div>

            @if (templateSuccessMessage) {
              <div class="designer-alert-banner success-banner no-print">
                {{ templateSuccessMessage }}
              </div>
            }

            <div class="modal-body cert-modal-body" [class.has-designer-open]="isCustomizingTemplate">
              <!-- PAINEL LATERAL DE DESIGNER & CUSTOMIZAÇÃO AO VIVO -->
              @if (isCustomizingTemplate && currentDoc.templateStyle) {
                <aside class="cert-designer-panel no-print">
                  <div class="designer-panel-header">
                    <div>
                      <h3>🎨 Designer do Certificado</h3>
                      <p>Ajuste moldura, cor, fonte, textos e assinaturas em tempo real.</p>
                    </div>
                    <button class="button button-sm button-secondary" type="button" (click)="resetTemplateSettings('doc')">
                      🔄 Padrão
                    </button>
                  </div>

                  <!-- Se o evento possuir arte gráfica de fundo subida -->
                  @if (currentDoc.certificateTemplateUrl) {
                    <div class="designer-highlight-card">
                      <div class="card-icon">✨</div>
                      <div class="card-content">
                        <strong>Arte gráfica do evento detectada</strong>
                        <p>Copie o layout do modelo que você subiu para o certificado oficial (aplica o fundo da arte, remove molduras conflitantes e ajusta cores e fontes):</p>
                        <button
                          type="button"
                          class="button button-sm button-accent mt-1"
                          (click)="copyUploadedToOfficial('doc')"
                        >
                          ✨ Copiar layout do modelo que eu subi
                        </button>
                      </div>
                    </div>
                  }

                  <!-- PRESETS RÁPIDOS -->
                  <div class="designer-section">
                    <label class="section-label">Estilos e Paletas Rápidas</label>
                    <div class="preset-chips">
                      <button type="button" class="preset-chip" (click)="applyColorPreset('doc', 'classic')">🏛️ Clássico FAIP</button>
                      <button type="button" class="preset-chip" (click)="applyColorPreset('doc', 'gold')">🏆 Dourado Real</button>
                      <button type="button" class="preset-chip" (click)="applyColorPreset('doc', 'blue')">💎 Azul Executivo</button>
                      <button type="button" class="preset-chip" (click)="applyColorPreset('doc', 'emerald')">🌿 Esmeralda</button>
                      <button type="button" class="preset-chip" (click)="applyColorPreset('doc', 'black-gold')">🖤 Preto & Ouro</button>
                      <button type="button" class="preset-chip" (click)="applyColorPreset('doc', 'minimal')">📄 Sem Moldura</button>
                    </div>
                  </div>

                  <!-- MOLDURA E BORDAS -->
                  <div class="designer-section">
                    <label class="section-label">Moldura & Bordas</label>
                    <div class="form-row">
                      <div class="form-group flex-1">
                        <label>Estilo da Moldura</label>
                        <select class="form-control" [(ngModel)]="currentDoc.templateStyle.frameStyle">
                          <option value="classic-double">Dupla Clássica Institucional</option>
                          <option value="modern-single">Linha Simples Moderna</option>
                          <option value="ornate-gold">Borda Imperial Dourada</option>
                          <option value="minimal">Mínima Fina</option>
                          <option value="none">Sem Moldura (Transparente / Para Arte Subida)</option>
                        </select>
                      </div>
                      @if (currentDoc.templateStyle.frameStyle !== 'none') {
                        <div class="form-group w-80">
                          <label>Espessura</label>
                          <select class="form-control" [(ngModel)]="currentDoc.templateStyle.frameBorderWidth">
                            <option [ngValue]="1">1 px</option>
                            <option [ngValue]="2">2 px</option>
                            <option [ngValue]="3">3 px</option>
                            <option [ngValue]="4">4 px</option>
                            <option [ngValue]="6">6 px</option>
                            <option [ngValue]="8">8 px</option>
                          </select>
                        </div>
                      }
                    </div>

                    @if (currentDoc.templateStyle.frameStyle !== 'none') {
                      <div class="form-row mt-1">
                        <div class="form-group flex-1">
                          <label>Cor da Moldura Externa</label>
                          <div class="color-picker-row">
                            <input type="color" class="color-input" [(ngModel)]="currentDoc.templateStyle.frameBorderColor" />
                            <span class="color-code">{{ currentDoc.templateStyle.frameBorderColor }}</span>
                          </div>
                        </div>
                        <div class="form-group flex-1">
                          <label>Cor da Borda Interna</label>
                          <div class="color-picker-row">
                            <input type="color" class="color-input" [(ngModel)]="currentDoc.templateStyle.frameInnerBorderColor" />
                            <span class="color-code">{{ currentDoc.templateStyle.frameInnerBorderColor }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="checkbox-group mt-1">
                        <label class="checkbox-label">
                          <input type="checkbox" [(ngModel)]="currentDoc.templateStyle.showInnerBorder" />
                          <span>Exibir borda interna decorativa</span>
                        </label>
                      </div>
                    }
                  </div>

                  <!-- TIPOGRAFIA E CORES -->
                  <div class="designer-section">
                    <label class="section-label">Tipografia & Fontes</label>
                    <div class="form-group">
                      <label>Família Tipográfica Principal</label>
                      <select class="form-control" [(ngModel)]="currentDoc.templateStyle.fontFamily">
                        <optgroup label="Fontes Cursivas & Caligráficas ✨">
                          <option value="great-vibes">Great Vibes (Caligrafia Diplomática)</option>
                          <option value="alex-brush">Alex Brush (Cursiva Fluida Elegante)</option>
                          <option value="pinyon">Pinyon Script (Cursiva Real Aristocrática)</option>
                          <option value="dancing">Dancing Script (Manuscrita Cursiva Moderna)</option>
                        </optgroup>
                        <optgroup label="Fontes Clássicas & Formais">
                          <option value="playfair">Playfair Display (Elegante & Serifada)</option>
                          <option value="cinzel">Cinzel (Romana Imperial Clássica)</option>
                          <option value="montserrat">Montserrat (Moderna & Sem Serifa)</option>
                          <option value="times">Times New Roman (Formal Tradicional)</option>
                          <option value="serif">Georgia / Acadêmica Clássica</option>
                        </optgroup>
                      </select>
                    </div>

                    <div class="form-group mt-2">
                      <label>Fonte do Nome do Aluno (Destaque Caligráfico)</label>
                      <select class="form-control" [(ngModel)]="currentDoc.templateStyle.studentNameFontFamily">
                        <option value="same">Mesma do Certificado (Padrão)</option>
                        <optgroup label="Fontes Cursivas & Caligráficas ✨">
                          <option value="great-vibes">✨ Great Vibes (Caligrafia Diplomática)</option>
                          <option value="alex-brush">✨ Alex Brush (Cursiva Fluida Elegante)</option>
                          <option value="pinyon">✨ Pinyon Script (Cursiva Real Aristocrática)</option>
                          <option value="dancing">✨ Dancing Script (Manuscrita Moderna)</option>
                        </optgroup>
                        <optgroup label="Outras Fontes">
                          <option value="playfair">Playfair Display (Serifada)</option>
                          <option value="cinzel">Cinzel (Romana Imperial)</option>
                          <option value="montserrat">Montserrat (Sem Serifa)</option>
                          <option value="times">Times New Roman</option>
                          <option value="serif">Georgia</option>
                        </optgroup>
                      </select>
                    </div>

                    <label class="section-label mt-2">Cores dos Textos e Fundo</label>
                    <div class="color-grid">
                      <div class="color-control-item">
                        <label>Cor do Título ("CERTIFICADO")</label>
                        <div class="color-picker-row">
                          <input type="color" class="color-input" [(ngModel)]="currentDoc.templateStyle.titleColor" />
                          <span class="color-code">{{ currentDoc.templateStyle.titleColor }}</span>
                        </div>
                      </div>
                      <div class="color-control-item">
                        <label>Cor do Aluno</label>
                        <div class="color-picker-row">
                          <input type="color" class="color-input" [(ngModel)]="currentDoc.templateStyle.studentNameColor" />
                          <span class="color-code">{{ currentDoc.templateStyle.studentNameColor }}</span>
                        </div>
                      </div>
                      <div class="color-control-item">
                        <label>Cor do Evento</label>
                        <div class="color-picker-row">
                          <input type="color" class="color-input" [(ngModel)]="currentDoc.templateStyle.eventHighlightColor" />
                          <span class="color-code">{{ currentDoc.templateStyle.eventHighlightColor }}</span>
                        </div>
                      </div>
                      <div class="color-control-item">
                        <label>Cor do Texto Geral</label>
                        <div class="color-picker-row">
                          <input type="color" class="color-input" [(ngModel)]="currentDoc.templateStyle.textColor" />
                          <span class="color-code">{{ currentDoc.templateStyle.textColor }}</span>
                        </div>
                      </div>
                      <div class="color-control-item">
                        <label>Cor da Instituição</label>
                        <div class="color-picker-row">
                          <input type="color" class="color-input" [(ngModel)]="currentDoc.templateStyle.institutionColor" />
                          <span class="color-code">{{ currentDoc.templateStyle.institutionColor }}</span>
                        </div>
                      </div>
                      <div class="color-control-item">
                        <label>Cor de Fundo do Papel</label>
                        <div class="color-picker-row">
                          <input type="color" class="color-input" [(ngModel)]="currentDoc.templateStyle.backgroundColor" />
                          <span class="color-code">{{ currentDoc.templateStyle.backgroundColor }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- TEXTOS INSTITUCIONAIS EDITÁVEIS -->
                  <div class="designer-section">
                    <label class="section-label">Textos do Cabeçalho & Instituição</label>
                    <div class="checkbox-group mb-1">
                      <label class="checkbox-label">
                        <input type="checkbox" [(ngModel)]="currentDoc.templateStyle.showInstitutionHeader" />
                        <span>Exibir Cabeçalho Superior Institucional</span>
                      </label>
                      <label class="checkbox-label">
                        <input type="checkbox" [(ngModel)]="currentDoc.templateStyle.showLogo" />
                        <span>Exibir Logotipo / Emblema no Certificado</span>
                      </label>
                    </div>
                    @if (currentDoc.templateStyle.showInstitutionHeader) {
                      <div class="form-group">
                        <label>Nome da Instituição (Cabeçalho)</label>
                        <input
                          type="text"
                          class="form-control"
                          [(ngModel)]="currentDoc.templateStyle.institutionName"
                          placeholder="Ex: FAIP - Faculdade de Ensino Superior..."
                        />
                      </div>
                      <div class="form-group mt-1">
                        <label>Subtítulo / Secretaria</label>
                        <input
                          type="text"
                          class="form-control"
                          [(ngModel)]="currentDoc.templateStyle.institutionSub"
                          placeholder="Ex: Secretaria Geral de Cursos de Extensão..."
                        />
                      </div>
                    }
                    <div class="form-group mt-1">
                      <label>Título do Certificado</label>
                      <input
                        type="text"
                        class="form-control"
                        [(ngModel)]="currentDoc.templateStyle.certificateTitle"
                        placeholder="Ex: CERTIFICADO"
                      />
                    </div>
                    <div class="form-group mt-1">
                      <label>Cidade / Local da Emissão</label>
                      <input
                        type="text"
                        class="form-control"
                        [(ngModel)]="currentDoc.templateStyle.city"
                        placeholder="Ex: Marília - SP"
                      />
                    </div>
                  </div>

                  <!-- ASSINATURAS DO CERTIFICADO -->
                  <div class="designer-section">
                    <div class="checkbox-group mb-1">
                      <label class="checkbox-label">
                        <input type="checkbox" [(ngModel)]="currentDoc.templateStyle.showSignatures" />
                        <span>Exibir Assinaturas no Rodapé</span>
                      </label>
                    </div>
                    @if (currentDoc.templateStyle.showSignatures) {
                      <div class="signatures-edit-grid">
                        <div class="signer-edit-box">
                          <h6>✍️ Assinatura 1 (Esquerda)</h6>
                          <div class="form-group">
                            <label>Cargo / Função</label>
                            <input
                              type="text"
                              class="form-control"
                              [(ngModel)]="currentDoc.templateStyle.signer1Role"
                              placeholder="Ex: Coordenação de Extensão"
                            />
                          </div>
                          <div class="form-group mt-1">
                            <label>Nome do Responsável (Opcional)</label>
                            <input
                              type="text"
                              class="form-control"
                              [(ngModel)]="currentDoc.templateStyle.signer1Name"
                              placeholder="Ex: Prof. Dr. Silva"
                            />
                          </div>
                          <div class="form-group mt-1">
                            <label>Departamento / Instituição</label>
                            <input
                              type="text"
                              class="form-control"
                              [(ngModel)]="currentDoc.templateStyle.signer1Dept"
                              placeholder="Ex: UniCore / FAIP"
                            />
                          </div>
                        </div>

                        <div class="signer-edit-box mt-1">
                          <h6>✍️ Assinatura 2 (Direita)</h6>
                          <div class="form-group">
                            <label>Cargo / Função</label>
                            <input
                              type="text"
                              class="form-control"
                              [(ngModel)]="currentDoc.templateStyle.signer2Role"
                              placeholder="Ex: Secretaria Acadêmica Geral"
                            />
                          </div>
                          <div class="form-group mt-1">
                            <label>Nome do Responsável (Opcional)</label>
                            <input
                              type="text"
                              class="form-control"
                              [(ngModel)]="currentDoc.templateStyle.signer2Name"
                              placeholder="Ex: Profa. Maria Oliveira"
                            />
                          </div>
                          <div class="form-group mt-1">
                            <label>Departamento / Diretoria</label>
                            <input
                              type="text"
                              class="form-control"
                              [(ngModel)]="currentDoc.templateStyle.signer2Dept"
                              placeholder="Ex: Diretoria de Registros"
                            />
                          </div>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- BOTÃO DE SALVAMENTO NO BANCO DE DADOS -->
                  <div class="designer-footer-sticky">
                    <button
                      type="button"
                      class="button button-primary w-full"
                      [disabled]="isSavingTemplateSettings"
                      (click)="saveCertificateTemplateSettings()"
                    >
                      {{ isSavingTemplateSettings ? 'Salvando…' : '💾 Salvar como Padrão do Evento' }}
                    </button>
                  </div>
                </aside>
              }

              <!-- FOLHA DE IMPRESSÃO A4 PAISAGEM -->
              <div class="cert-preview-container">
                <div
                  class="certificate-sheet"
                  id="printable-certificate"
                  [class.with-uploaded-bg]="currentDoc.templateStyle?.useUploadedBackground && currentDoc.certificateTemplateUrl"
                  [style.background-color]="currentDoc.templateStyle?.backgroundColor || '#ffffff'"
                  [style.background-image]="currentDoc.templateStyle?.useUploadedBackground && currentDoc.certificateTemplateUrl ? 'url(' + currentDoc.certificateTemplateUrl + ')' : null"
                  [style.background-size]="'100% 100%'"
                  [style.background-repeat]="'no-repeat'"
                  [style.font-family]="getFontFamily(currentDoc.templateStyle?.fontFamily)"
                >
                  <!-- CASO 1: MODELO COM IMAGEM PURA (SE NÃO ESTIVER NO MODO OFICIAL OU MESCLADO) -->
                  @if (currentDoc.certificateTemplateUrl && !useOfficialLayoutOnly && !currentDoc.templateStyle?.useUploadedBackground) {
                    <div
                      class="custom-cert-wrapper"
                      [style.background-image]="'url(' + currentDoc.certificateTemplateUrl + ')'"
                    >
                      <div
                        class="custom-cert-name"
                        [class.is-cursive]="isCursiveFont(getEffectiveStudentFont(currentDoc.templateStyle))"
                        [style.top]="(currentDoc.templateStyle?.studentNameTop || 48) + '%'"
                        [style.color]="currentDoc.templateStyle?.studentNameColor || '#0f172a'"
                        [style.font-size]="(currentDoc.templateStyle?.studentNameFontSize || 34) + 'px'"
                        [style.font-family]="getStudentNameFontFamily(currentDoc.templateStyle)"
                      >
                        {{ currentDoc.studentName }}
                      </div>
                      <div class="custom-cert-auth">
                        <span>Autenticidade: <strong>{{ currentDoc.verificationCode }}</strong></span>
                        <span>{{ currentDoc.templateStyle?.city || 'Marília - SP' }}, {{ formatCurrentDate(currentDoc.issuedAt) }}</span>
                      </div>
                    </div>
                  } @else {
                    <!-- CASO 2: MODELO OFICIAL FORMATADO COM PERSONALIZAÇÃO COMPLETA -->
                    <div
                      class="cert-outer-border"
                      [class.border-none]="currentDoc.templateStyle?.frameStyle === 'none'"
                      [style.border-color]="currentDoc.templateStyle?.frameBorderColor || '#0f172a'"
                      [style.border-width.px]="currentDoc.templateStyle?.frameStyle === 'none' ? 0 : (currentDoc.templateStyle?.frameBorderWidth || 4)"
                      [style.border-style]="currentDoc.templateStyle?.frameStyle === 'none' ? 'none' : currentDoc.templateStyle?.frameStyle === 'modern-single' || currentDoc.templateStyle?.frameStyle === 'minimal' ? 'solid' : currentDoc.templateStyle?.frameStyle === 'ornate-gold' ? 'ridge' : 'double'"
                      [style.background]="(currentDoc.templateStyle?.useUploadedBackground && currentDoc.certificateTemplateUrl) || currentDoc.templateStyle?.frameStyle === 'none' ? 'transparent' : (currentDoc.templateStyle?.backgroundColor || '#ffffff')"
                    >
                      <div
                        class="cert-inner-border"
                        [class.border-none]="!currentDoc.templateStyle?.showInnerBorder || currentDoc.templateStyle?.frameStyle === 'none'"
                        [style.border-color]="currentDoc.templateStyle?.frameInnerBorderColor || '#d97706'"
                        [style.background]="(currentDoc.templateStyle?.useUploadedBackground && currentDoc.certificateTemplateUrl) || currentDoc.templateStyle?.frameStyle === 'none' ? 'transparent' : 'radial-gradient(circle at center, rgba(255,255,255,0.92) 50%, rgba(255,251,235,0.7) 100%)'"
                      >
                        @if (currentDoc.templateStyle?.showInstitutionHeader !== false) {
                          <div class="cert-header">
                            @if (currentDoc.templateStyle?.showLogo !== false) {
                              @if (currentDoc.logoUrl) {
                                <img [src]="currentDoc.logoUrl" alt="Logo do Evento" class="cert-custom-logo" />
                              } @else {
                                <div class="cert-emblem">🎓</div>
                              }
                            }
                            <h1
                              class="cert-institution-name"
                              [style.color]="currentDoc.templateStyle?.institutionColor || '#0f172a'"
                              [style.font-family]="getFontFamily(currentDoc.templateStyle?.fontFamily)"
                            >
                              {{ currentDoc.templateStyle?.institutionName || currentDoc.institutionName }}
                            </h1>
                            <p
                              class="cert-subheading"
                              [style.color]="currentDoc.templateStyle?.subheadingColor || '#d97706'"
                            >
                              {{ currentDoc.templateStyle?.institutionSub || 'Secretaria Geral de Cursos de Extensão e Capacitação' }}
                            </p>
                            <div class="cert-divider">
                              <span class="cert-divider-line"></span>
                              <span class="cert-divider-diamond" [style.color]="currentDoc.templateStyle?.frameInnerBorderColor || '#d97706'">◆</span>
                              <span class="cert-divider-line"></span>
                            </div>
                          </div>
                        }

                        <div class="cert-title-area">
                          <h2
                            class="cert-title"
                            [class.is-cursive]="isCursiveFont(currentDoc.templateStyle?.fontFamily)"
                            [style.color]="currentDoc.templateStyle?.titleColor || '#0f172a'"
                            [style.font-family]="getFontFamily(currentDoc.templateStyle?.fontFamily)"
                          >
                            {{ currentDoc.templateStyle?.certificateTitle || 'CERTIFICADO' }}
                          </h2>
                        </div>

                        <div
                          class="cert-body-text"
                          [style.color]="currentDoc.templateStyle?.textColor || '#334155'"
                          [style.font-family]="getFontFamily(currentDoc.templateStyle?.fontFamily)"
                        >
                          <p>
                            Certificamos para os devidos fins que o(a) acadêmico(a)
                            <strong
                              class="highlight-name"
                              [class.is-cursive]="isCursiveFont(getEffectiveStudentFont(currentDoc.templateStyle))"
                              [style.color]="currentDoc.templateStyle?.studentNameColor || '#0f172a'"
                              [style.font-family]="getStudentNameFontFamily(currentDoc.templateStyle)"
                            >{{ currentDoc.studentName }}</strong>,
                            portador(a) do Registro Acadêmico (RA) <strong>{{ currentDoc.studentRa }}</strong>
                            @if (currentDoc.studentCpf) {
                              e do CPF <strong>{{ formatCpf(currentDoc.studentCpf) }}</strong>
                            },
                            concluiu com aproveitamento e frequência regular as atividades do evento
                          </p>
                          <p class="highlight-event" [style.color]="currentDoc.templateStyle?.eventHighlightColor || '#1e3a8a'">
                            "{{ currentDoc.eventTitle }}"
                          </p>
                          @if (currentDoc.courseName) {
                            <p class="cert-course-mention">
                              vinculado ao curso de <strong>{{ currentDoc.courseName }}</strong>,
                            </p>
                          }
                          <p class="cert-workload-text">
                            com carga horária total comprovada de <strong>{{ currentDoc.workloadHours }} horas</strong>
                            @if (currentDoc.startDate && currentDoc.endDate) {
                              , realizado no período de <strong>{{ formatDate(currentDoc.startDate) }}</strong> a
                              <strong>{{ formatDate(currentDoc.endDate) }}</strong>
                            }.
                          </p>
                          @if (currentDoc.issnCode) {
                            <p class="cert-issn-mention">
                              Trabalhos e anais catalogados sob o registro oficial <strong>ISSN {{ currentDoc.issnCode }}</strong>.
                            </p>
                          }
                        </div>

                        <div class="cert-footer">
                          @if (currentDoc.templateStyle?.showSignatures !== false) {
                            <div class="cert-signatures">
                              <div class="signature-block">
                                <div class="signature-line" [style.background]="currentDoc.templateStyle?.textColor || '#64748b'"></div>
                                @if (currentDoc.templateStyle?.signer1Name) {
                                  <span class="signature-name" [style.color]="currentDoc.templateStyle?.titleColor || '#0f172a'">{{ currentDoc.templateStyle?.signer1Name }}</span>
                                }
                                <span class="signature-role" [style.color]="currentDoc.templateStyle?.titleColor || '#0f172a'">
                                  {{ currentDoc.templateStyle?.signer1Role || 'Coordenação de Extensão' }}
                                </span>
                                <span class="signature-dept">{{ currentDoc.templateStyle?.signer1Dept || 'UniCore / FAIP' }}</span>
                              </div>
                              <div class="signature-block">
                                <div class="signature-line" [style.background]="currentDoc.templateStyle?.textColor || '#64748b'"></div>
                                @if (currentDoc.templateStyle?.signer2Name) {
                                  <span class="signature-name" [style.color]="currentDoc.templateStyle?.titleColor || '#0f172a'">{{ currentDoc.templateStyle?.signer2Name }}</span>
                                }
                                <span class="signature-role" [style.color]="currentDoc.templateStyle?.titleColor || '#0f172a'">
                                  {{ currentDoc.templateStyle?.signer2Role || 'Secretaria Acadêmica Geral' }}
                                </span>
                                <span class="signature-dept">{{ currentDoc.templateStyle?.signer2Dept || 'Diretoria de Registros' }}</span>
                              </div>
                            </div>
                          }

                          <div class="cert-verification-bar">
                            <div class="cert-date-location">
                              {{ currentDoc.templateStyle?.city || 'Marília - SP' }}, {{ formatCurrentDate(currentDoc.issuedAt) }}
                            </div>
                            <div class="cert-auth-code">
                              <span>Código de Autenticidade Digital:</span>
                              <strong>{{ currentDoc.verificationCode }}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="modal-footer no-print">
              <span class="cert-modal-hint">
                💡 Dica: Para melhor resultado na impressão, selecione a orientação <strong>Paisagem (Landscape)</strong> nas configurações da impressora.
              </span>
              <div class="modal-footer-buttons">
                <button class="button button-secondary" type="button" (click)="closeCertModal()">
                  Fechar
                </button>
                <button class="button button-primary" type="button" (click)="printCertificate()">
                  🖨️ Imprimir Certificado
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .event-reg-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .event-reg-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .event-reg-heading h1 {
      margin: 0.25rem 0 0.5rem 0;
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--color-text, #ffffff);
      letter-spacing: -0.02em;
    }

    .event-reg-heading p {
      margin: 0;
      font-size: 0.95rem;
      color: var(--color-text-secondary, #a1a1aa);
      max-width: 680px;
    }

    .hero-eyebrow {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-primary, #38bdf8);
      margin-bottom: 0.25rem;
    }

    .event-reg-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .error-message {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      margin: 0;
    }

    .success-message {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      margin: 0;
    }

    /* Painel de Busca */
    .search-panel {
      padding: 1rem 1.25rem;
      background: var(--color-surface, #1e1e24);
      border-radius: 12px;
    }

    .search-bar {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .search-input-box {
      display: flex;
      align-items: center;
      flex: 1;
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      font-size: 0.9rem;
      opacity: 0.5;
    }

    .search-input {
      padding-left: 2.25rem !important;
      width: 100%;
    }

    /* Grid de Eventos */
    .events-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.25rem;
    }

    .event-card {
      padding: 1.5rem;
      background: var(--color-surface, #1e1e24);
      border-radius: 14px;
      border: 1px solid var(--border-color, #3f3f46);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }

    .event-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
      border-color: rgba(56, 189, 248, 0.4);
    }

    .event-card-top {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
    }

    .event-workload-badge {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #fff;
      font-weight: 800;
      font-size: 0.8rem;
      padding: 0.4rem 0.6rem;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .event-header-titles {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .event-course-tag {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #38bdf8;
    }

    .event-card-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.3;
    }

    .event-card-desc {
      margin: 0;
      font-size: 0.85rem;
      color: #a1a1aa;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .event-meta-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .meta-icon {
      font-size: 0.9rem;
    }

    /* Contadores Rápidos */
    .event-counters {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.25);
      padding: 0.6rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      text-align: center;
    }

    .counter-box {
      display: flex;
      flex-direction: column;
    }

    .counter-val {
      font-size: 1.15rem;
      font-weight: 800;
      color: #fff;
    }

    .counter-lbl {
      font-size: 0.65rem;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #a1a1aa;
    }

    .counter-paid .counter-val { color: #34d399; }
    .counter-eligible .counter-val { color: #38bdf8; }

    .event-card-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-top: auto;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .manage-btn {
      flex: 1;
      font-weight: 700;
    }

    .event-btn-group {
      display: flex;
      gap: 0.25rem;
    }

    .btn-icon {
      background: transparent;
      border: 1px solid transparent;
      color: #a1a1aa;
      font-size: 1rem;
      cursor: pointer;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      transition: background 0.2s, color 0.2s;
    }

    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .btn-icon.text-danger:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }

    /* Drawer / Modal de Participantes */
    .participants-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid var(--border-color, #3f3f46);
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .participants-stats {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .stat-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color, #3f3f46);
      padding: 0.3rem 0.65rem;
      border-radius: 99px;
      font-size: 0.8rem;
      color: #e2e8f0;
    }

    .stat-paid {
      border-color: rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .stat-eligible {
      border-color: rgba(56, 189, 248, 0.3);
      color: #38bdf8;
    }

    .add-participant-panel {
      padding: 1.25rem 1.5rem;
      background: rgba(56, 189, 248, 0.04);
      border-bottom: 1px solid rgba(56, 189, 248, 0.2);
    }

    .add-participant-panel h4 {
      margin: 0 0 1rem 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #38bdf8;
    }

    .participant-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.85rem;
    }

    .checkbox-row {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #e2e8f0;
      cursor: pointer;
    }

    .checkbox-label input {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    /* Badges Clicáveis */
    .clickable-badge {
      cursor: pointer;
      border: 1px solid transparent;
      transition: transform 0.15s, opacity 0.15s, filter 0.15s;
    }

    .clickable-badge:hover {
      transform: scale(1.05);
      filter: brightness(1.2);
    }

    .clickable-badge:active {
      transform: scale(0.95);
    }

    .participant-row-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
    }

    .footer-hint {
      font-size: 0.8rem;
      color: #fbbf24;
    }

    /* Formulários e Modais Comuns */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .col-span-2 { grid-column: span 2; }
    .col-span-full { grid-column: 1 / -1; }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-group label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary, #a1a1aa);
    }

    .form-control {
      height: 42px;
      padding: 0 0.75rem;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      color: var(--color-text, #ffffff);
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-control:focus {
      border-color: var(--color-primary, #38bdf8);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }

    .text-area {
      height: auto;
      padding: 0.75rem;
      resize: vertical;
    }

    .modal-dialog-xl {
      max-width: 1050px;
      width: 95vw;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      overflow-y: auto;
    }

    .modal-dialog {
      background: var(--color-surface, #1e1e24);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 16px;
      width: 100%;
      max-width: 640px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #3f3f46);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
    }

    .modal-subtitle {
      font-size: 0.8rem;
      color: #a1a1aa;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #a1a1aa;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .btn-close:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
    }

    .modal-body {
      padding: 1.5rem;
      max-height: calc(85vh - 140px);
      overflow-y: auto;
    }

    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color, #3f3f46);
      background: rgba(0, 0, 0, 0.2);
    }

    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      text-align: left;
    }

    .data-table th {
      padding: 0.85rem 1.25rem;
      background: rgba(0, 0, 0, 0.2);
      color: var(--color-text-secondary, #a1a1aa);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-color, #3f3f46);
    }

    .data-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }

    .data-table tr:hover {
      background: rgba(255, 255, 255, 0.025);
    }

    .student-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .student-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1e293b, #334155);
      border: 1px solid #475569;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .student-info {
      display: flex;
      flex-direction: column;
    }

    .student-name {
      color: var(--color-text, #ffffff);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .student-ra {
      color: var(--color-text-secondary, #a1a1aa);
      font-size: 0.75rem;
      font-family: monospace;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .badge-paid {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-pending {
      background: rgba(245, 158, 11, 0.12);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }

    .badge-attendance-ok {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .badge-attendance-missing {
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .badge-success {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid #10b981;
    }

    .badge-danger {
      background: rgba(100, 116, 139, 0.15);
      color: #94a3b8;
      border: 1px solid #475569;
    }

    .emit-btn {
      box-shadow: 0 2px 8px rgba(56, 189, 248, 0.3);
      font-weight: 700;
    }

    .locked-text {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
      cursor: not-allowed;
      padding: 0.4rem 0.6rem;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      gap: 0.75rem;
      color: var(--color-text-secondary, #a1a1aa);
    }

    .empty-icon { font-size: 2.5rem; }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--color-primary, #38bdf8);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Logo Banner nos Cards */
    .event-card-banner-logo {
      width: 100%;
      height: 90px;
      background: linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(88, 28, 135, 0.4));
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .card-banner-logo-img {
      max-height: 70px;
      max-width: 80%;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }

    /* Upload e Mídia */
    .upload-section {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .upload-hint {
      margin: 0;
      font-size: 0.8rem;
      color: var(--color-text-secondary, #a1a1aa);
    }

    .upload-dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1.25rem;
      border: 1.5px dashed rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .upload-icon { font-size: 1.75rem; }
    .btn-file-picker {
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    .file-hidden-input {
      position: absolute;
      left: 0;
      top: 0;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    .dropzone-sub {
      font-size: 0.75rem;
      color: #71717a;
    }

    .media-preview-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(73, 209, 125, 0.3);
      border-radius: 8px;
      padding: 0.75rem 1rem;
    }

    .preview-logo-img {
      max-height: 60px;
      max-width: 100px;
      object-fit: contain;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      padding: 4px;
    }

    .template-thumb-wrap {
      width: 120px;
      height: 75px;
      border-radius: 4px;
      overflow: hidden;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-template-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .preview-actions {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
    }

    .preview-filename {
      font-size: 0.85rem;
      color: #49d17d;
      font-weight: 600;
    }

    /* Configuração de Estilo do Modelo Personalizado */
    .template-style-config-box {
      margin-top: 0.75rem;
      padding: 0.85rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .template-style-config-box h5 {
      margin: 0;
      font-size: 0.85rem;
      color: #38bdf8;
      font-weight: 700;
    }

    .style-config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    .range-slider {
      width: 100%;
      cursor: pointer;
    }

    .color-picker-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .color-input {
      border: none;
      width: 36px;
      height: 32px;
      border-radius: 4px;
      cursor: pointer;
      background: transparent;
    }

    .color-code {
      font-size: 0.85rem;
      font-family: monospace;
      color: #d4d4d8;
    }

    /* Barra de Edição do Nome no Certificado */
    .cert-modal-header-titles {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .student-name-edit-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .student-name-edit-bar label {
      font-size: 0.8rem;
      color: #a1a1aa;
      font-weight: 600;
    }

    .student-name-input {
      padding: 0.3rem 0.6rem;
      font-size: 0.9rem;
      font-weight: 700;
      color: #38bdf8;
      border-color: rgba(56, 189, 248, 0.4);
      background: rgba(0, 0, 0, 0.4);
      max-width: 320px;
    }

    /* Certificado Personalizado */
    .custom-cert-wrapper {
      width: 100%;
      height: 100%;
      background-size: 100% 100%;
      background-repeat: no-repeat;
      position: relative;
    }

    .custom-cert-name {
      position: absolute;
      left: 6%;
      right: 6%;
      text-align: center;
      font-family: 'Times New Roman', Georgia, serif;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      transform: translateY(-50%);
    }

    .custom-cert-auth {
      position: absolute;
      bottom: 18px;
      right: 25px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      font-size: 0.72rem;
      color: #475569;
      font-family: monospace;
      background: rgba(255, 255, 255, 0.88);
      padding: 4px 10px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .cert-custom-logo {
      max-height: 55px;
      margin-bottom: 0.25rem;
      object-fit: contain;
    }

    /* ========================================================
       DIAGRAMAÇÃO DO CERTIFICADO OFICIAL E DESIGNER AO VIVO
       ======================================================== */
    .action-buttons-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    /* Acordeão de Personalização no Formulário do Evento */
    .template-customizer-accordion {
      margin-top: 1rem;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      overflow: hidden;
      background: #18181b;
    }

    .accordion-toggle-btn {
      width: 100%;
      padding: 0.75rem 1rem;
      background: #27272a;
      border: none;
      color: #f4f4f5;
      font-size: 0.88rem;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .accordion-toggle-btn:hover {
      background: #3f3f46;
      color: #38bdf8;
    }

    .accordion-content-panel {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background: #18181b;
    }

    .customizer-subgroup {
      border-bottom: 1px solid #27272a;
      padding-bottom: 0.85rem;
    }

    .customizer-subgroup:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .customizer-label {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #fbbf24;
      margin-bottom: 0.5rem;
      display: block;
    }

    .preset-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .preset-chip {
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #27272a;
      color: #e4e4e7;
      border: 1px solid #3f3f46;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .preset-chip:hover {
      background: #3f3f46;
      border-color: #38bdf8;
      color: #ffffff;
    }

    /* Modal do Certificado e Painel Designer */
    .modal-cert-dialog {
      max-width: 1100px;
      width: 95vw;
      background: #18181b;
      transition: max-width 0.3s ease;
    }

    .modal-cert-dialog.with-designer {
      max-width: 1520px;
    }

    .designer-alert-banner {
      background: #064e3b;
      color: #a7f3d0;
      border: 1px solid #059669;
      padding: 0.6rem 1.25rem;
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .cert-modal-body {
      display: flex;
      justify-content: center;
      padding: 1.5rem 1rem;
      background: #09090b;
      max-height: calc(88vh - 75px);
      overflow-y: auto;
    }

    .cert-modal-body.has-designer-open {
      display: flex;
      justify-content: flex-start;
      align-items: stretch;
      gap: 1.5rem;
      overflow: hidden;
    }

    /* Painel do Designer Lateral */
    .cert-designer-panel {
      width: 410px;
      min-width: 370px;
      max-width: 430px;
      max-height: calc(88vh - 95px);
      overflow-y: auto;
      background: #141416;
      border: 1px solid #27272a;
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      color: #f4f4f5;
      font-size: 0.85rem;
    }

    .designer-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .designer-panel-header h3 {
      font-size: 1.05rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.25rem 0;
    }

    .designer-panel-header p {
      font-size: 0.78rem;
      color: #a1a1aa;
      margin: 0;
    }

    .designer-highlight-card {
      background: linear-gradient(135deg, rgba(217, 119, 6, 0.15), rgba(15, 23, 42, 0.8));
      border: 1px solid rgba(217, 119, 6, 0.4);
      border-radius: 8px;
      padding: 0.85rem;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .designer-highlight-card .card-icon {
      font-size: 1.4rem;
      line-height: 1;
    }

    .designer-highlight-card .card-content {
      font-size: 0.8rem;
      color: #fde68a;
    }

    .designer-highlight-card .card-content strong {
      display: block;
      color: #ffffff;
      margin-bottom: 0.2rem;
    }

    .designer-highlight-card .card-content p {
      margin: 0.2rem 0 0.5rem 0;
      color: #cbd5e1;
      font-size: 0.76rem;
    }

    .designer-section {
      border-top: 1px solid #27272a;
      padding-top: 1rem;
    }

    .section-label {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #fbbf24;
      margin-bottom: 0.5rem;
      display: block;
    }

    .color-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .color-control-item label {
      font-size: 0.75rem;
      color: #a1a1aa;
      display: block;
      margin-bottom: 0.25rem;
    }

    .signatures-edit-grid {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .signer-edit-box {
      background: #1f1f23;
      border: 1px solid #2e2e33;
      border-radius: 6px;
      padding: 0.75rem;
    }

    .signer-edit-box h6 {
      font-size: 0.8rem;
      font-weight: 700;
      color: #e4e4e7;
      margin: 0 0 0.5rem 0;
    }

    .designer-footer-sticky {
      position: sticky;
      bottom: -1.25rem;
      margin: 0.5rem -1.25rem -1.25rem -1.25rem;
      padding: 0.85rem 1.25rem;
      background: #141416;
      border-top: 1px solid #27272a;
      z-index: 10;
    }

    /* Container de Preview */
    .cert-preview-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      overflow-y: auto;
      overflow-x: auto;
      padding: 0.5rem;
      max-height: calc(88vh - 95px);
    }

    .border-none {
      border: none !important;
      box-shadow: none !important;
    }

    .certificate-sheet {
      width: 100%;
      max-width: 980px;
      aspect-ratio: 1.414 / 1;
      background: #ffffff;
      color: #1e293b;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      box-sizing: border-box;
      position: relative;
    }

    .certificate-sheet.with-uploaded-bg {
      padding: 0 !important;
      background-color: transparent !important;
    }

    .certificate-sheet.with-uploaded-bg .cert-outer-border {
      background: transparent !important;
      border: none !important;
      padding: 2.2rem 3.5rem;
    }

    .certificate-sheet.with-uploaded-bg .cert-inner-border {
      background: transparent !important;
      padding: 0 !important;
      border: none !important;
    }

    .cert-outer-border {
      width: 100%;
      height: 100%;
      border: 4px double #0f172a;
      padding: 14px;
      box-sizing: border-box;
      position: relative;
      background: #fff;
    }

    .cert-inner-border {
      width: 100%;
      height: 100%;
      border: 1.5px solid #d97706;
      padding: 30px 45px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      position: relative;
      background: radial-gradient(circle at center, #ffffff 60%, #fffbeb 100%);
    }

    .cert-header {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .cert-emblem {
      font-size: 2.2rem;
      margin-bottom: 0.25rem;
      line-height: 1;
    }

    .cert-institution-name {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #0f172a;
      font-family: 'Times New Roman', serif, Georgia;
    }

    .cert-subheading {
      margin: 0.2rem 0 0.5rem 0;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #d97706;
    }

    .cert-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      width: 100%;
      max-width: 400px;
      margin: 0.25rem 0;
    }

    .cert-divider-line {
      flex: 1;
      height: 1px;
      background: #cbd5e1;
    }

    .cert-divider-diamond {
      color: #d97706;
      font-size: 0.7rem;
    }

    .cert-title-area { margin: 0.5rem 0; }

    .cert-title {
      margin: 0;
      font-size: 2.6rem;
      font-weight: 900;
      letter-spacing: 0.25em;
      color: #0f172a;
      font-family: 'Times New Roman', serif, Georgia;
      text-shadow: 1px 1px 0px rgba(217, 119, 6, 0.2);
    }

    .cert-title.is-cursive {
      font-size: 3.4rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      text-transform: capitalize;
    }

    .cert-body-text {
      font-size: 1.05rem;
      line-height: 1.7;
      color: #334155;
      max-width: 820px;
      margin: 0 auto;
      font-family: Georgia, 'Times New Roman', serif;
    }

    .cert-body-text p { margin: 0.35rem 0; }

    .highlight-name {
      font-size: 1.3rem;
      color: #0f172a;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .highlight-name.is-cursive {
      font-size: 2.1rem;
      font-weight: 600;
      text-transform: none;
      letter-spacing: normal;
      line-height: 1.1;
      display: inline-block;
      padding: 0 0.35rem;
    }

    .custom-cert-name.is-cursive {
      letter-spacing: normal;
      text-transform: none;
      font-weight: 500;
    }

    .highlight-event {
      font-size: 1.35rem;
      color: #1e3a8a;
      font-weight: 800;
      font-style: italic;
      margin: 0.4rem 0 !important;
    }

    .cert-course-mention { font-size: 0.95rem; color: #475569; }
    .cert-workload-text { font-size: 1rem; color: #334155; }

    .cert-footer {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin-top: 1rem;
    }

    .cert-signatures {
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      padding: 0 2rem;
    }

    .signature-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 220px;
    }

    .signature-line {
      width: 100%;
      height: 1.5px;
      background: #64748b;
      margin-bottom: 0.4rem;
    }

    .signature-role {
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.05em;
    }

    .signature-dept { font-size: 0.7rem; color: #64748b; }

    .cert-verification-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 0.6rem;
      font-size: 0.75rem;
      color: #64748b;
    }

    .cert-date-location { font-weight: 600; font-style: italic; }

    .cert-auth-code {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .cert-auth-code strong {
      color: #0f172a;
      font-family: monospace;
      letter-spacing: 0.05em;
    }

    .cert-modal-hint { font-size: 0.8rem; color: #fbbf24; }

    /* Chips e Badges nos Cards */
    .event-card-banner {
      width: 100%;
      height: 120px;
      overflow: hidden;
      border-radius: 8px 8px 0 0;
      background: #1e293b;
    }
    .card-banner-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .event-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin: 0.4rem 0 0.6rem 0;
    }
    .chip {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      letter-spacing: 0.02em;
    }
    .chip-paid { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .chip-solidary { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .chip-free { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .chip-article { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }

    /* Seções do Formulário de Evento */
    .form-card-section {
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 1.25rem;
      margin-top: 0.75rem;
    }
    .form-section-title {
      font-size: 1rem;
      font-weight: 700;
      color: #38bdf8;
      margin-bottom: 0.85rem;
    }
    .preview-banner-img {
      max-width: 100%;
      max-height: 140px;
      object-fit: cover;
      border-radius: 6px;
    }

    .drawer-header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .export-dropdown-wrapper {
      position: relative;
    }
    .export-select {
      padding: 0.45rem 0.85rem;
      border-radius: 0.5rem;
      border: 1px solid #059669;
      background: #064e3b;
      color: #6ee7b7;
      font-weight: 700;
      font-size: 0.82rem;
      cursor: pointer;
      outline: none;
      transition: all 0.2s ease;
    }
    .export-select:hover:not(:disabled) {
      background: #047857;
      color: #ffffff;
      border-color: #10b981;
    }
    .export-select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Tabs de Navegação do Drawer */
    .drawer-tabs-nav {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 1.5rem 0;
      background: #18181b;
      border-bottom: 1px solid #27272a;
      overflow-x: auto;
    }
    .drawer-tab-btn {
      padding: 0.65rem 1rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #a1a1aa;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .drawer-tab-btn:hover {
      color: #f4f4f5;
    }
    .drawer-tab-btn.active {
      color: #38bdf8;
      border-bottom-color: #38bdf8;
    }

    /* Ingressos & Filtros */
    .tickets-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .filter-pills {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    .filter-pill {
      background: #27272a;
      border: 1px solid #3f3f46;
      color: #a1a1aa;
      padding: 0.3rem 0.65rem;
      border-radius: 16px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-pill:hover, .filter-pill.active {
      background: #0284c7;
      border-color: #38bdf8;
      color: #ffffff;
    }
    .ticket-code {
      background: rgba(255, 255, 255, 0.05);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: monospace;
      font-weight: 700;
      color: #38bdf8;
    }

    /* Workshops & Vagas */
    .workshops-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .workshop-manage-card {
      border: 1px solid #3f3f46;
      border-radius: 8px;
    }
    .workshop-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .workshop-title {
      font-size: 1.05rem;
      font-weight: 700;
      margin: 0.25rem 0;
      color: #ffffff;
    }
    .workshop-desc {
      font-size: 0.85rem;
      color: #a1a1aa;
      margin: 0;
    }
    .workshop-actions-row {
      display: flex;
      gap: 0.5rem;
    }
    .vacancy-stats-box {
      margin-top: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      padding: 0.75rem;
      border-radius: 6px;
    }
    .vacancy-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #cbd5e1;
      margin-bottom: 0.4rem;
    }
    .vacancy-bar-bg {
      width: 100%;
      height: 8px;
      background: #334155;
      border-radius: 4px;
      overflow: hidden;
    }
    .vacancy-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #06b6d4);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .vacancy-bar-fill.full {
      background: #ef4444;
    }

    /* Finanças & KPIs */
    .financial-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .fin-kpi-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      border: 1px solid #3f3f46;
      border-radius: 8px;
    }
    .kpi-icon {
      font-size: 2rem;
    }
    .kpi-info {
      display: flex;
      flex-direction: column;
    }
    .kpi-label {
      font-size: 0.78rem;
      color: #a1a1aa;
      text-transform: uppercase;
      font-weight: 700;
    }
    .kpi-val {
      font-size: 1.35rem;
      font-weight: 800;
    }
    .kpi-sub {
      font-size: 0.75rem;
      color: #71717a;
    }
    .sponsors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .sponsor-card {
      border: 1px solid #3f3f46;
      border-radius: 8px;
    }
    .sponsor-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .sponsor-card-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Feedbacks */
    .avg-score-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1rem;
    }
    .avg-score-number {
      font-size: 2.5rem;
      font-weight: 800;
      color: #facc15;
    }
    .avg-stars span, .feedback-stars span {
      font-size: 1.25rem;
      color: #4b5563;
    }
    .avg-stars span.filled, .feedback-stars span.filled {
      color: #facc15;
    }
    .avg-total {
      font-size: 0.8rem;
      color: #a1a1aa;
      margin-top: 0.25rem;
    }
    .feedback-card {
      border: 1px solid #3f3f46;
      border-radius: 8px;
    }
    .feedback-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .feedback-comment {
      font-style: italic;
      color: #e4e4e7;
      font-size: 0.9rem;
      margin: 0;
    }

    /* Sub-Modais */
    .submodal-backdrop {
      z-index: 1050;
      background: rgba(0, 0, 0, 0.75);
    }
    .receipt-full-preview {
      max-width: 100%;
      max-height: 500px;
      object-fit: contain;
      border-radius: 6px;
    }

    /* Utilitários */
    .text-success { color: #34d399; }
    .text-danger { color: #f87171; }
    .text-info { color: #38bdf8; }
    .text-xs { font-size: 0.75rem; }
    .button-xs { padding: 0.2rem 0.5rem; font-size: 0.75rem; }
    .justify-end { justify-content: flex-end; }
    .p-0 { padding: 0 !important; }
    .p-3 { padding: 0.75rem !important; }
    .p-4 { padding: 1rem !important; }
    .p-6 { padding: 1.5rem !important; }
    .mb-2 { margin-bottom: 0.5rem !important; }
    .mb-3 { margin-bottom: 0.75rem !important; }
    .mt-1 { margin-top: 0.25rem !important; }
    .mt-2 { margin-top: 0.5rem !important; }
    .mt-4 { margin-top: 1rem !important; }
    .ml-1 { margin-left: 0.25rem !important; }
    .d-block { display: block; }

    /* Impressão delegada globalmente com portal isolado para A4 Paisagem */
    @media print {
      .no-print {
        display: none !important;
      }
    }
  `],
})
export class EventRegistrationPageComponent implements OnInit, OnDestroy {
  events: CustomEventSummary[] = []
  searchQuery = ''
  isLoadingEvents = false

  errorMessage = ''
  successMessage = ''

  // Modal de Criação / Edição de Evento
  isEventModalOpen = false
  isEditingEvent = false
  editingEventId: string | null = null
  isSubmittingEvent = false
  eventForm: {
    title: string
    description: string
    workloadHours: number
    speaker: string
    courseName: string
    startDate: string
    endDate: string
    location: string
    logoUrl?: string | null
    bannerUrl?: string | null
    certificateTemplateUrl?: string | null
    monitorTemplateUrl?: string | null
    articleTemplateUrl?: string | null
    pixQrCodeUrl?: string | null
    pixKey: string
    ticketType: 'gratuito' | 'pago' | 'solidario'
    ticketLimit?: number | null
    standardPrice?: number | null
    teacherPrice?: number | null
    promoPrice?: number | null
    promoDeadline?: string
    teacherPromoPrice?: number | null
    teacherPromoDeadline?: string
    acceptsArticles: boolean
    articlesDeadline?: string
    issnCode?: string
    certificateReleaseDate?: string
    templateStyle: CertificateTemplateStyle
  } = this.getEmptyEventForm()

  // Drawer de Gestão do Evento
  isParticipantsDrawerOpen = false
  activeEventDetails: CustomEventDetails | null = null
  activeDrawerTab: 'participantes' | 'ingressos' | 'workshops' | 'artigos' | 'financas' | 'feedbacks' = 'participantes'
  showAddParticipantForm = false
  isSubmittingParticipant = false
  participantForm: {
    studentRa: string
    studentName: string
    studentCpf: string
    studentEmail: string
    isPaid: boolean
    hasAttendance: boolean
  } = this.getEmptyParticipantForm()

  // Bilheteria & Ingressos
  tickets: EventTicket[] = []
  isLoadingTickets = false
  ticketStatusFilter = ''
  isExpiringTickets = false
  selectedTicketForWorkshop: EventTicket | null = null
  selectedNewWorkshopId = ''
  viewingReceiptUrl: string | null = null

  // Workshops & Vagas
  workshops: EventWorkshop[] = []
  isLoadingWorkshops = false
  isWorkshopModalOpen = false
  isEditingWorkshop = false
  editingWorkshopId: string | null = null
  workshopForm = {
    title: '',
    courseName: '',
    description: '',
    vacancies: 30,
  }

  // Artigos Científicos
  articles: EventArticle[] = []
  isLoadingArticles = false
  articleStatusFilter = ''
  selectedArticleForReview: EventArticle | null = null
  reviewForm: ReviewEventArticle = {
    status: 'aprovado',
    score: 10,
    feedbackNotes: '',
  }
  selectedPlagioFile: File | null = null
  selectedCorrecaoFile: File | null = null
  isSubmittingReview = false

  // Finanças
  financialSummary: FinancialSummary | null = null
  isLoadingFinances = false
  expenses: EventExpense[] = []
  isExpenseModalOpen = false
  expenseForm = {
    description: '',
    category: 'Geral',
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
  }
  selectedExpenseFile: File | null = null
  isSubmittingExpense = false

  // Patrocinadores
  sponsors: EventSponsor[] = []
  isSponsorModalOpen = false
  sponsorForm = {
    name: '',
    contact: '',
  }
  selectedSponsorForMovement: EventSponsor | null = null
  sponsorMovementForm = {
    type: 'entrada' as 'entrada' | 'saida',
    nature: 'Financeiro',
    description: '',
    amount: 0,
    quantity: 1,
  }

  // Feedbacks
  feedbacks: EventFeedback[] = []
  isLoadingFeedbacks = false

  // Modal de Certificado
  isCertModalOpen = false
  currentDoc: CertificateDocument | null = null
  useOfficialLayoutOnly = false

  // Customização de Modelo / Designer
  isCustomizingTemplate = false
  isSavingTemplateSettings = false
  templateSuccessMessage = ''
  showFormAdvancedStyle = false

  // Arquivos selecionados para upload
  selectedLogoFile: File | null = null
  selectedTemplateFile: File | null = null
  selectedBannerFile: File | null = null
  selectedPixQrFile: File | null = null
  selectedMonitorFile: File | null = null
  selectedArticleFile: File | null = null

  private printCleanupFn: (() => void) | null = null

  private handleBeforePrint = () => {
    if (!this.isCertModalOpen) return
    if (!this.printCleanupFn) {
      this.printCleanupFn = mountCertificateForPrint('printable-certificate')
    }
  }

  private handleAfterPrint = () => {
    if (this.printCleanupFn) {
      this.printCleanupFn()
      this.printCleanupFn = null
    }
  }

  constructor(private readonly certificatesService: CertificatesService) {}

  ngOnInit(): void {
    this.loadEvents()
    window.addEventListener('beforeprint', this.handleBeforePrint)
    window.addEventListener('afterprint', this.handleAfterPrint)
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeprint', this.handleBeforePrint)
    window.removeEventListener('afterprint', this.handleAfterPrint)
    this.handleAfterPrint()
  }

  getEmptyEventForm() {
    const today = new Date().toISOString().split('T')[0]
    return {
      title: '',
      description: '',
      workloadHours: 20,
      speaker: '',
      courseName: '',
      startDate: today,
      endDate: today,
      location: '',
      logoUrl: null as string | null,
      bannerUrl: null as string | null,
      certificateTemplateUrl: null as string | null,
      monitorTemplateUrl: null as string | null,
      articleTemplateUrl: null as string | null,
      pixQrCodeUrl: null as string | null,
      pixKey: '',
      ticketType: 'gratuito' as 'gratuito' | 'pago' | 'solidario',
      ticketLimit: null as number | null,
      standardPrice: null as number | null,
      teacherPrice: null as number | null,
      promoPrice: null as number | null,
      promoDeadline: '',
      teacherPromoPrice: null as number | null,
      teacherPromoDeadline: '',
      acceptsArticles: false,
      articlesDeadline: '',
      issnCode: '',
      certificateReleaseDate: '',
      templateStyle: getDefaultTemplateStyle(),
    }
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const file = input.files[0]
      this.selectedLogoFile = file
      const reader = new FileReader()
      reader.onload = (e) => {
        this.eventForm.logoUrl = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  removeLogo(): void {
    this.selectedLogoFile = null
    this.eventForm.logoUrl = null
  }

  onTemplateFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const file = input.files[0]
      this.selectedTemplateFile = file
      const reader = new FileReader()
      reader.onload = (e) => {
        this.eventForm.certificateTemplateUrl = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  removeTemplate(): void {
    this.selectedTemplateFile = null
    this.eventForm.certificateTemplateUrl = null
  }

  onBannerFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const file = input.files[0]
      this.selectedBannerFile = file
      const reader = new FileReader()
      reader.onload = (e) => {
        this.eventForm.bannerUrl = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  removeBanner(): void {
    this.selectedBannerFile = null
    this.eventForm.bannerUrl = null
  }

  onPixQrFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const file = input.files[0]
      this.selectedPixQrFile = file
      const reader = new FileReader()
      reader.onload = (e) => {
        this.eventForm.pixQrCodeUrl = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  removePixQr(): void {
    this.selectedPixQrFile = null
    this.eventForm.pixQrCodeUrl = null
  }

  onMonitorFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const file = input.files[0]
      this.selectedMonitorFile = file
      const reader = new FileReader()
      reader.onload = (e) => {
        this.eventForm.monitorTemplateUrl = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  removeMonitorTemplate(): void {
    this.selectedMonitorFile = null
    this.eventForm.monitorTemplateUrl = null
  }

  onArticleFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const file = input.files[0]
      this.selectedArticleFile = file
      this.eventForm.articleTemplateUrl = file.name
    }
  }

  removeArticleTemplate(): void {
    this.selectedArticleFile = null
    this.eventForm.articleTemplateUrl = null
  }

  getEmptyParticipantForm() {
    return {
      studentRa: '',
      studentName: '',
      studentCpf: '',
      studentEmail: '',
      isPaid: false,
      hasAttendance: true,
    }
  }

  loadEvents(): void {
    this.isLoadingEvents = true
    this.errorMessage = ''

    this.certificatesService
      .listCustomEvents(this.searchQuery)
      .pipe(finalize(() => (this.isLoadingEvents = false)))
      .subscribe({
        next: (events) => {
          this.events = events
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao carregar eventos acadêmicos.'
        },
      })
  }

  openNewEventModal(): void {
    this.isEditingEvent = false
    this.editingEventId = null
    this.selectedLogoFile = null
    this.selectedTemplateFile = null
    this.selectedBannerFile = null
    this.selectedPixQrFile = null
    this.selectedMonitorFile = null
    this.selectedArticleFile = null
    this.eventForm = this.getEmptyEventForm()
    this.isEventModalOpen = true
  }

  openEditEventModal(event: CustomEventSummary): void {
    this.isEditingEvent = true
    this.editingEventId = event.id
    this.selectedLogoFile = null
    this.selectedTemplateFile = null
    this.selectedBannerFile = null
    this.selectedPixQrFile = null
    this.selectedMonitorFile = null
    this.selectedArticleFile = null
    this.eventForm = {
      title: event.title,
      description: event.description || '',
      workloadHours: event.workloadHours,
      speaker: event.speaker || '',
      courseName: event.courseName || '',
      startDate: event.startDate ? event.startDate.split('T')[0] : '',
      endDate: event.endDate ? event.endDate.split('T')[0] : '',
      location: event.location || '',
      logoUrl: event.logoUrl || null,
      bannerUrl: event.bannerUrl || null,
      certificateTemplateUrl: event.certificateTemplateUrl || null,
      monitorTemplateUrl: event.monitorTemplateUrl || null,
      articleTemplateUrl: event.articleTemplateUrl || null,
      pixQrCodeUrl: event.pixQrCodeUrl || null,
      pixKey: event.pixKey || '',
      ticketType: (event.ticketType as any) || 'gratuito',
      ticketLimit: event.ticketLimit ?? null,
      standardPrice: event.standardPrice ?? null,
      teacherPrice: event.teacherPrice ?? null,
      promoPrice: event.promoPrice ?? null,
      promoDeadline: event.promoDeadline ? event.promoDeadline.split('T')[0] : '',
      teacherPromoPrice: event.teacherPromoPrice ?? null,
      teacherPromoDeadline: event.teacherPromoDeadline ? event.teacherPromoDeadline.split('T')[0] : '',
      acceptsArticles: !!event.acceptsArticles,
      articlesDeadline: event.articlesDeadline ? event.articlesDeadline.split('T')[0] : '',
      issnCode: event.issnCode || '',
      certificateReleaseDate: event.certificateReleaseDate ? event.certificateReleaseDate.split('T')[0] : '',
      templateStyle: {
        ...getDefaultTemplateStyle(),
        ...(event.templateStyle || {}),
      },
    }
    this.isEventModalOpen = true
  }

  closeEventModal(): void {
    this.isEventModalOpen = false
    this.isEditingEvent = false
    this.editingEventId = null
    this.selectedLogoFile = null
    this.selectedTemplateFile = null
    this.selectedBannerFile = null
    this.selectedPixQrFile = null
    this.selectedMonitorFile = null
    this.selectedArticleFile = null
  }

  saveEvent(): void {
    if (!this.eventForm.title.trim()) {
      this.errorMessage = 'Informe o título do evento.'
      return
    }
    if (!this.eventForm.startDate) {
      this.errorMessage = 'Informe a data de início do evento.'
      return
    }

    this.isSubmittingEvent = true
    this.errorMessage = ''

    const startDate = this.eventForm.startDate.includes('T')
      ? new Date(this.eventForm.startDate).toISOString()
      : new Date(this.eventForm.startDate + 'T10:00:00Z').toISOString()
    const endDate = this.eventForm.endDate
      ? (this.eventForm.endDate.includes('T') ? new Date(this.eventForm.endDate).toISOString() : new Date(this.eventForm.endDate + 'T18:00:00Z').toISOString())
      : undefined

    const payload: CreateCustomEvent = {
      title: this.eventForm.title.trim(),
      description: this.eventForm.description.trim() || undefined,
      workloadHours: Number(this.eventForm.workloadHours) || 20,
      speaker: this.eventForm.speaker.trim() || undefined,
      courseName: this.eventForm.courseName.trim() || undefined,
      startDate,
      endDate,
      location: this.eventForm.location.trim() || undefined,
      logoUrl: this.eventForm.logoUrl || null,
      bannerUrl: this.eventForm.bannerUrl || null,
      certificateTemplateUrl: this.eventForm.certificateTemplateUrl || null,
      monitorTemplateUrl: this.eventForm.monitorTemplateUrl || null,
      articleTemplateUrl: this.eventForm.articleTemplateUrl || null,
      pixQrCodeUrl: this.eventForm.pixQrCodeUrl || null,
      pixKey: this.eventForm.pixKey.trim() || null,
      ticketType: this.eventForm.ticketType,
      ticketLimit: this.eventForm.ticketLimit ? Number(this.eventForm.ticketLimit) : null,
      standardPrice: this.eventForm.standardPrice !== null && this.eventForm.standardPrice !== undefined && this.eventForm.standardPrice !== ('' as any) ? Number(this.eventForm.standardPrice) : null,
      teacherPrice: this.eventForm.teacherPrice !== null && this.eventForm.teacherPrice !== undefined && this.eventForm.teacherPrice !== ('' as any) ? Number(this.eventForm.teacherPrice) : null,
      promoPrice: this.eventForm.promoPrice !== null && this.eventForm.promoPrice !== undefined && this.eventForm.promoPrice !== ('' as any) ? Number(this.eventForm.promoPrice) : null,
      promoDeadline: this.eventForm.promoDeadline ? new Date(this.eventForm.promoDeadline).toISOString() : null,
      teacherPromoPrice: this.eventForm.teacherPromoPrice !== null && this.eventForm.teacherPromoPrice !== undefined && this.eventForm.teacherPromoPrice !== ('' as any) ? Number(this.eventForm.teacherPromoPrice) : null,
      teacherPromoDeadline: this.eventForm.teacherPromoDeadline ? new Date(this.eventForm.teacherPromoDeadline).toISOString() : null,
      acceptsArticles: this.eventForm.acceptsArticles,
      articlesDeadline: this.eventForm.articlesDeadline ? new Date(this.eventForm.articlesDeadline).toISOString() : null,
      issnCode: this.eventForm.issnCode ? this.eventForm.issnCode.trim() : null,
      certificateReleaseDate: this.eventForm.certificateReleaseDate ? new Date(this.eventForm.certificateReleaseDate).toISOString() : null,
      templateStyle: this.eventForm.templateStyle,
    }

    const request$ = this.isEditingEvent && this.editingEventId
      ? this.certificatesService.updateCustomEvent(this.editingEventId, payload)
      : this.certificatesService.createCustomEvent(payload)

    request$
      .pipe(finalize(() => (this.isSubmittingEvent = false)))
      .subscribe({
        next: (savedEvent) => {
          const targetId = this.isEditingEvent && this.editingEventId ? this.editingEventId : (savedEvent as any)?.id

          if (targetId) {
            if (this.selectedLogoFile) {
              this.certificatesService.uploadEventAsset(targetId, 'logo', this.selectedLogoFile).subscribe()
            }
            if (this.selectedTemplateFile) {
              this.certificatesService.uploadEventAsset(targetId, 'template', this.selectedTemplateFile).subscribe()
            }
            if (this.selectedBannerFile) {
              this.certificatesService.uploadEventAsset(targetId, 'banner', this.selectedBannerFile).subscribe()
            }
            if (this.selectedPixQrFile) {
              this.certificatesService.uploadEventAsset(targetId, 'pixQrCode', this.selectedPixQrFile).subscribe()
            }
            if (this.selectedMonitorFile) {
              this.certificatesService.uploadEventAsset(targetId, 'monitorTemplate', this.selectedMonitorFile).subscribe()
            }
            if (this.selectedArticleFile) {
              this.certificatesService.uploadEventAsset(targetId, 'articleTemplate', this.selectedArticleFile).subscribe()
            }
          }

          this.successMessage = this.isEditingEvent ? 'Evento atualizado com sucesso!' : 'Evento criado com sucesso!'
          this.closeEventModal()
          this.loadEvents()
          setTimeout(() => (this.successMessage = ''), 4000)
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao salvar evento acadêmico.'
        },
      })
  }

  deleteEvent(event: CustomEventSummary): void {
    if (!confirm(`Deseja realmente remover o evento "${event.title}"? Todos os vínculos de participantes serão removidos.`)) {
      return
    }

    this.certificatesService.deleteCustomEvent(event.id).subscribe({
      next: () => {
        this.successMessage = 'Evento excluído com sucesso.'
        this.loadEvents()
        setTimeout(() => (this.successMessage = ''), 3000)
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao excluir evento.'
      },
    })
  }

  // Painel Geral de Gestão do Evento
  openParticipantsDrawer(eventId: string, initialTab: 'participantes' | 'ingressos' | 'workshops' | 'artigos' | 'financas' | 'feedbacks' = 'participantes'): void {
    this.errorMessage = ''
    this.activeDrawerTab = initialTab
    this.certificatesService.getCustomEventById(eventId).subscribe({
      next: (details) => {
        this.activeEventDetails = details
        this.showAddParticipantForm = false
        this.participantForm = this.getEmptyParticipantForm()
        this.isParticipantsDrawerOpen = true
        this.selectDrawerTab(this.activeDrawerTab)
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao carregar detalhes do evento.'
      },
    })
  }

  closeParticipantsDrawer(): void {
    this.isParticipantsDrawerOpen = false
    this.activeEventDetails = null
    this.showAddParticipantForm = false
    this.selectedTicketForWorkshop = null
    this.isWorkshopModalOpen = false
    this.selectedArticleForReview = null
    this.isExpenseModalOpen = false
    this.isSponsorModalOpen = false
    this.selectedSponsorForMovement = null
    this.viewingReceiptUrl = null
    this.loadEvents()
  }

  isExportingReport = false

  onExportReportSelect(event: Event): void {
    const select = event.target as HTMLSelectElement
    const reportType = select.value
    if (!reportType || !this.activeEventDetails) return

    this.isExportingReport = true
    const eventId = this.activeEventDetails.id
    const eventTitle = this.activeEventDetails.title || 'evento'

    this.certificatesService.exportEventReport(eventId, reportType).subscribe({
      next: (blob) => {
        this.isExportingReport = false
        select.value = ''
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const cleanTitle = eventTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)
        a.download = `relatorio_${reportType}_${cleanTitle}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        this.successMessage = `Relatório de ${reportType} exportado com sucesso!`
        setTimeout(() => (this.successMessage = ''), 3500)
      },
      error: (err) => {
        this.isExportingReport = false
        select.value = ''
        this.errorMessage = err.error?.message || 'Falha ao exportar relatório em Excel.'
      },
    })
  }

  selectDrawerTab(tab: 'participantes' | 'ingressos' | 'workshops' | 'artigos' | 'financas' | 'feedbacks'): void {
    this.activeDrawerTab = tab
    if (!this.activeEventDetails) return

    if (tab === 'ingressos') {
      this.loadEventTickets()
    } else if (tab === 'workshops') {
      this.loadEventWorkshops()
    } else if (tab === 'artigos') {
      this.loadEventArticles()
    } else if (tab === 'financas') {
      this.loadFinancialSummary()
    } else if (tab === 'feedbacks') {
      this.loadEventFeedbacks()
    }
  }

  // Bilheteria & Ingressos
  loadEventTickets(): void {
    if (!this.activeEventDetails) return
    this.isLoadingTickets = true
    this.certificatesService
      .getEventTickets(this.activeEventDetails.id, this.ticketStatusFilter)
      .pipe(finalize(() => (this.isLoadingTickets = false)))
      .subscribe({
        next: (tickets) => (this.tickets = tickets),
        error: (err) => (this.errorMessage = err.error?.message || 'Erro ao carregar ingressos.'),
      })
  }

  filterTicketsByStatus(status: string): void {
    this.ticketStatusFilter = status
    this.loadEventTickets()
  }

  validateTicket(ticketId: string, status: 'pago' | 'rejeitado', isMonitor = false): void {
    this.certificatesService.validateTicket(ticketId, { status, isMonitor }).subscribe({
      next: () => {
        this.successMessage = `Ingresso ${status === 'pago' ? 'aprovado' : 'rejeitado'} com sucesso!`
        this.loadEventTickets()
        if (this.activeEventDetails) {
          this.certificatesService.getCustomEventById(this.activeEventDetails.id).subscribe((d) => (this.activeEventDetails = d))
        }
        setTimeout(() => (this.successMessage = ''), 3000)
      },
      error: (err) => (this.errorMessage = err.error?.message || 'Erro ao validar ingresso.'),
    })
  }

  cronExpireTickets(): void {
    this.isExpiringTickets = true
    this.certificatesService
      .cronExpireTickets()
      .pipe(finalize(() => (this.isExpiringTickets = false)))
      .subscribe({
        next: (res) => {
          this.successMessage = `Verificação concluída: ${res.canceledCount} ingresso(s) vencido(s) cancelados e vagas liberadas.`
          this.loadEventTickets()
          this.loadEventWorkshops()
          setTimeout(() => (this.successMessage = ''), 4000)
        },
        error: (err) => (this.errorMessage = err.error?.message || 'Erro ao expirar ingressos vencidos.'),
      })
  }

  openSwitchWorkshop(ticket: EventTicket): void {
    this.selectedTicketForWorkshop = ticket
    this.selectedNewWorkshopId = ''
    this.loadEventWorkshops()
  }

  closeSwitchWorkshop(): void {
    this.selectedTicketForWorkshop = null
    this.selectedNewWorkshopId = ''
  }

  confirmSwitchWorkshop(): void {
    if (!this.selectedTicketForWorkshop || !this.selectedNewWorkshopId) return
    this.certificatesService
      .switchWorkshop(this.selectedTicketForWorkshop.id, this.selectedNewWorkshopId)
      .subscribe({
        next: () => {
          this.successMessage = 'Workshop alterado com sucesso!'
          this.closeSwitchWorkshop()
          this.loadEventTickets()
          this.loadEventWorkshops()
          setTimeout(() => (this.successMessage = ''), 3000)
        },
        error: (err) => (this.errorMessage = err.error?.message || 'Erro ao transferir workshop.'),
      })
  }

  viewReceipt(url: string): void {
    this.viewingReceiptUrl = url
  }

  closeReceiptModal(): void {
    this.viewingReceiptUrl = null
  }

  // Workshops & Vagas
  loadEventWorkshops(): void {
    if (!this.activeEventDetails) return
    this.isLoadingWorkshops = true
    this.certificatesService
      .getEventWorkshops(this.activeEventDetails.id)
      .pipe(finalize(() => (this.isLoadingWorkshops = false)))
      .subscribe({
        next: (ws) => (this.workshops = ws),
        error: (err) => (this.errorMessage = err.error?.message || 'Erro ao carregar workshops.'),
      })
  }

  openNewWorkshopModal(): void {
    this.isEditingWorkshop = false
    this.editingWorkshopId = null
    this.workshopForm = {
      title: '',
      courseName: this.activeEventDetails?.courseName || '',
      description: '',
      vacancies: 30,
    }
    this.isWorkshopModalOpen = true
  }

  openEditWorkshopModal(w: EventWorkshop): void {
    this.isEditingWorkshop = true
    this.editingWorkshopId = w.id
    this.workshopForm = {
      title: w.title,
      courseName: w.courseName || '',
      description: w.description || '',
      vacancies: w.vacancies,
    }
    this.isWorkshopModalOpen = true
  }

  closeWorkshopModal(): void {
    this.isWorkshopModalOpen = false
    this.isEditingWorkshop = false
    this.editingWorkshopId = null
  }

  saveWorkshop(): void {
    if (!this.activeEventDetails || !this.workshopForm.title.trim()) return

    const payload: CreateEventWorkshop = {
      title: this.workshopForm.title.trim(),
      courseName: this.workshopForm.courseName.trim() || undefined,
      description: this.workshopForm.description.trim() || undefined,
      vacancies: Number(this.workshopForm.vacancies) || 30,
    }

    const req$ = this.isEditingWorkshop && this.editingWorkshopId
      ? this.certificatesService.updateWorkshop(this.editingWorkshopId, payload)
      : this.certificatesService.createWorkshop(this.activeEventDetails.id, payload)

    req$.subscribe({
      next: () => {
        this.successMessage = this.isEditingWorkshop ? 'Workshop atualizado!' : 'Workshop criado!'
        this.closeWorkshopModal()
        this.loadEventWorkshops()
        setTimeout(() => (this.successMessage = ''), 3000)
      },
      error: (err) => (this.errorMessage = err.error?.message || 'Erro ao salvar workshop.'),
    })
  }

  deleteWorkshop(w: EventWorkshop): void {
    if (!confirm(`Deseja excluir o workshop "${w.title}"?`)) return
    this.certificatesService.deleteWorkshop(w.id).subscribe({
      next: () => {
        this.successMessage = 'Workshop excluído com sucesso.'
        this.loadEventWorkshops()
        setTimeout(() => (this.successMessage = ''), 3000)
      },
      error: (err) => (this.errorMessage = err.error?.message || 'Erro ao excluir workshop.'),
    })
  }

  // Artigos Científicos
  loadEventArticles(): void {
    if (!this.activeEventDetails) return
    this.isLoadingArticles = true
    this.certificatesService
      .listEventArticles(this.activeEventDetails.id, this.articleStatusFilter)
      .pipe(finalize(() => (this.isLoadingArticles = false)))
      .subscribe({
        next: (articles) => (this.articles = articles),
        error: (err) => (this.errorMessage = err.error?.message || 'Erro ao carregar artigos.'),
      })
  }

  filterArticlesByStatus(status: string): void {
    this.articleStatusFilter = status
    this.loadEventArticles()
  }

  toggleArticleLock(a: EventArticle): void {
    const lock = !a.currentLockId
    this.certificatesService.lockArticle(a.id, lock).subscribe({
      next: (res) => {
        a.currentLockId = res.locked ? 'lock-active' : null
        this.loadEventArticles()
      },
      error: (err) => (this.errorMessage = err.error?.message || 'Erro ao alterar trava do artigo.'),
    })
  }

  openReviewModal(a: EventArticle): void {
    this.selectedArticleForReview = a
    this.reviewForm = {
      status: (a.status as any) || 'aprovado',
      score: 10,
      feedbackNotes: '',
    }
    this.selectedPlagioFile = null
    this.selectedCorrecaoFile = null
  }

  closeReviewModal(): void {
    this.selectedArticleForReview = null
    this.selectedPlagioFile = null
    this.selectedCorrecaoFile = null
  }

  onPlagioFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement
    if (input.files?.length) {
      this.selectedPlagioFile = input.files[0]
    }
  }

  onCorrecaoFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement
    if (input.files?.length) {
      this.selectedCorrecaoFile = input.files[0]
    }
  }

  submitArticleReview(): void {
    if (!this.selectedArticleForReview) return
    this.isSubmittingReview = true
    this.certificatesService
      .reviewArticle(
        this.selectedArticleForReview.id,
        this.reviewForm,
        this.selectedPlagioFile || undefined,
        this.selectedCorrecaoFile || undefined,
      )
      .pipe(finalize(() => (this.isSubmittingReview = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Avaliação do artigo salva com sucesso!'
          this.closeReviewModal()
          this.loadEventArticles()
          setTimeout(() => (this.successMessage = ''), 3000)
        },
        error: (err) => (this.errorMessage = err.error?.message || 'Erro ao avaliar artigo.'),
      })
  }

  // Finanças, Despesas e Patrocinadores
  loadFinancialSummary(): void {
    if (!this.activeEventDetails) return
    this.isLoadingFinances = true
    this.certificatesService
      .getFinancialSummary(this.activeEventDetails.id)
      .pipe(finalize(() => (this.isLoadingFinances = false)))
      .subscribe({
        next: (summary) => {
          this.financialSummary = summary
          this.expenses = summary.expenses || []
          this.sponsors = summary.sponsors || []
        },
        error: (err) => (this.errorMessage = err.error?.message || 'Erro ao carregar dados financeiros.'),
      })
  }

  openNewExpenseModal(): void {
    this.expenseForm = {
      description: '',
      category: 'Geral',
      amount: 0,
      expenseDate: new Date().toISOString().split('T')[0],
    }
    this.selectedExpenseFile = null
    this.isExpenseModalOpen = true
  }

  closeExpenseModal(): void {
    this.isExpenseModalOpen = false
    this.selectedExpenseFile = null
  }

  onExpenseFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement
    if (input.files?.length) {
      this.selectedExpenseFile = input.files[0]
    }
  }

  saveExpense(): void {
    if (!this.activeEventDetails || !this.expenseForm.description.trim()) return
    this.isSubmittingExpense = true
    this.certificatesService
      .addExpense(this.activeEventDetails.id, this.expenseForm, this.selectedExpenseFile || undefined)
      .pipe(finalize(() => (this.isSubmittingExpense = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Despesa lançada com sucesso!'
          this.closeExpenseModal()
          this.loadFinancialSummary()
          setTimeout(() => (this.successMessage = ''), 3000)
        },
        error: (err) => (this.errorMessage = err.error?.message || 'Erro ao lançar despesa.'),
      })
  }

  deleteExpense(e: EventExpense): void {
    if (!confirm(`Deseja remover a despesa "${e.description}"?`)) return
    this.certificatesService.deleteExpense(e.id).subscribe({
      next: () => {
        this.successMessage = 'Despesa removida com sucesso.'
        this.loadFinancialSummary()
        setTimeout(() => (this.successMessage = ''), 3000)
      },
      error: (err) => (this.errorMessage = err.error?.message || 'Erro ao remover despesa.'),
    })
  }

  openNewSponsorModal(): void {
    this.sponsorForm = { name: '', contact: '' }
    this.isSponsorModalOpen = true
  }

  closeSponsorModal(): void {
    this.isSponsorModalOpen = false
  }

  saveSponsor(): void {
    if (!this.activeEventDetails || !this.sponsorForm.name.trim()) return
    this.certificatesService.addSponsor(this.activeEventDetails.id, this.sponsorForm).subscribe({
      next: () => {
        this.successMessage = 'Patrocinador adicionado com sucesso!'
        this.closeSponsorModal()
        this.loadFinancialSummary()
        setTimeout(() => (this.successMessage = ''), 3000)
      },
      error: (err) => (this.errorMessage = err.error?.message || 'Erro ao cadastrar patrocinador.'),
    })
  }

  openSponsorMovementModal(sp: EventSponsor): void {
    this.selectedSponsorForMovement = sp
    this.sponsorMovementForm = {
      type: 'entrada',
      nature: 'Financeiro',
      description: '',
      amount: 0,
      quantity: 1,
    }
  }

  closeSponsorMovementModal(): void {
    this.selectedSponsorForMovement = null
  }

  saveSponsorMovement(): void {
    if (!this.selectedSponsorForMovement || !this.sponsorMovementForm.description.trim()) return
    this.certificatesService
      .addSponsorMovement(this.selectedSponsorForMovement.id, this.sponsorMovementForm)
      .subscribe({
        next: () => {
          this.successMessage = 'Movimentação de patrocínio registrada!'
          this.closeSponsorMovementModal()
          this.loadFinancialSummary()
          setTimeout(() => (this.successMessage = ''), 3000)
        },
        error: (err) => (this.errorMessage = err.error?.message || 'Erro ao registrar movimento.'),
      })
  }

  // Feedbacks
  loadEventFeedbacks(): void {
    if (!this.activeEventDetails) return
    this.isLoadingFeedbacks = true
    this.certificatesService
      .getEventFeedbacks(this.activeEventDetails.id)
      .pipe(finalize(() => (this.isLoadingFeedbacks = false)))
      .subscribe({
        next: (fbs) => (this.feedbacks = fbs),
        error: (err) => (this.errorMessage = err.error?.message || 'Erro ao carregar feedbacks.'),
      })
  }

  getAverageRating(): number {
    if (!this.feedbacks.length) return 5
    const sum = this.feedbacks.reduce((acc, f) => acc + f.rating, 0)
    return sum / this.feedbacks.length
  }

  toggleAddParticipantForm(): void {
    this.showAddParticipantForm = !this.showAddParticipantForm
  }

  saveParticipant(): void {
    if (!this.activeEventDetails) return

    if (!this.participantForm.studentRa.trim() || !this.participantForm.studentName.trim()) {
      this.errorMessage = 'Informe o RA e o Nome completo do aluno.'
      return
    }

    this.isSubmittingParticipant = true
    this.errorMessage = ''

    const payload: CreateCustomParticipant = {
      studentRa: this.participantForm.studentRa.trim(),
      studentName: this.participantForm.studentName.trim(),
      studentCpf: this.participantForm.studentCpf.trim() || undefined,
      studentEmail: this.participantForm.studentEmail.trim() || undefined,
      isPaid: this.participantForm.isPaid,
      hasAttendance: this.participantForm.hasAttendance,
    }

    this.certificatesService
      .addParticipant(this.activeEventDetails.id, payload)
      .pipe(finalize(() => (this.isSubmittingParticipant = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Aluno adicionado ao evento com sucesso!'
          this.participantForm = this.getEmptyParticipantForm()
          this.showAddParticipantForm = false
          this.openParticipantsDrawer(this.activeEventDetails!.id)
          setTimeout(() => (this.successMessage = ''), 3000)
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao adicionar aluno ao evento.'
        },
      })
  }

  togglePaymentStatus(participant: CustomParticipantItem): void {
    const newStatus = !participant.isPaid
    this.certificatesService
      .updateParticipantStatus(participant.id, { isPaid: newStatus })
      .subscribe({
        next: () => {
          participant.isPaid = newStatus
          participant.paymentDate = newStatus ? new Date().toISOString() : null
          participant.isEligible = participant.isPaid && participant.hasAttendance
          if (!participant.isEligible) {
            participant.blockedReason = !participant.isPaid
              ? 'Taxa de inscrição pendente de pagamento'
              : 'Presença não confirmada no evento'
          } else {
            participant.blockedReason = undefined
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao alterar status de pagamento.'
        },
      })
  }

  toggleAttendanceStatus(participant: CustomParticipantItem): void {
    const newStatus = !participant.hasAttendance
    this.certificatesService
      .updateParticipantStatus(participant.id, { hasAttendance: newStatus })
      .subscribe({
        next: () => {
          participant.hasAttendance = newStatus
          participant.isEligible = participant.isPaid && participant.hasAttendance
          if (!participant.isEligible) {
            participant.blockedReason = !participant.hasAttendance
              ? 'Presença não confirmada no evento'
              : 'Taxa de inscrição pendente de pagamento'
          } else {
            participant.blockedReason = undefined
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao alterar status de presença.'
        },
      })
  }

  removeParticipant(participant: CustomParticipantItem): void {
    if (!confirm(`Remover participante "${participant.studentName}" deste evento?`)) {
      return
    }

    this.certificatesService.removeParticipant(participant.id).subscribe({
      next: () => {
        if (this.activeEventDetails) {
          this.activeEventDetails.participants = this.activeEventDetails.participants.filter(
            (p) => p.id !== participant.id,
          )
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao remover aluno do evento.'
      },
    })
  }

  // Emissão de Certificado do Participante
  openCertificateForParticipant(participant: CustomParticipantItem): void {
    if (!participant.isEligible) {
      this.errorMessage = `Participante inapto: ${participant.blockedReason || 'requisitos pendentes'}.`
      return
    }

    this.errorMessage = ''
    this.certificatesService.getParticipantDocument(participant.id).subscribe({
      next: (doc) => {
        this.currentDoc = {
          ...doc,
          templateStyle: {
            ...getDefaultTemplateStyle(),
            ...(doc.templateStyle || {}),
          },
        }
        if (this.currentDoc?.templateStyle?.useUploadedBackground) {
          this.useOfficialLayoutOnly = true
        }
        this.isCertModalOpen = true
        participant.emittedCount = (participant.emittedCount || 0) + 1
        participant.lastEmittedAt = doc.issuedAt
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao gerar certificado oficial.'
      },
    })
  }

  closeCertModal(): void {
    this.handleAfterPrint()
    this.isCertModalOpen = false
    this.currentDoc = null
    this.isCustomizingTemplate = false
  }

  getFontFamily(font?: string): string {
    return getCertificateFontFamily(font)
  }

  isCursiveFont(font?: string): boolean {
    return isCursiveFont(font)
  }

  getEffectiveStudentFont(style?: CertificateTemplateStyle | null): string {
    if (!style) return 'serif'
    if (style.studentNameFontFamily && style.studentNameFontFamily !== 'same') {
      return style.studentNameFontFamily
    }
    return style.fontFamily || 'serif'
  }

  getStudentNameFontFamily(style?: CertificateTemplateStyle | null): string {
    return this.getFontFamily(this.getEffectiveStudentFont(style))
  }

  applyColorPreset(target: 'form' | 'doc', preset: string): void {
    const style = target === 'form' ? this.eventForm.templateStyle : this.currentDoc?.templateStyle
    if (!style) return

    switch (preset) {
      case 'gold':
        style.backgroundColor = '#fdfbf7'
        style.frameStyle = 'ornate-gold'
        style.frameBorderColor = '#854d0e'
        style.frameInnerBorderColor = '#eab308'
        style.frameBorderWidth = 4
        style.showInnerBorder = true
        style.fontFamily = 'cinzel'
        style.titleColor = '#854d0e'
        style.institutionColor = '#1e293b'
        style.subheadingColor = '#a16207'
        style.textColor = '#334155'
        style.eventHighlightColor = '#854d0e'
        style.studentNameColor = '#1e293b'
        break
      case 'blue':
        style.backgroundColor = '#f8fafc'
        style.frameStyle = 'modern-single'
        style.frameBorderColor = '#1e3a8a'
        style.frameInnerBorderColor = '#3b82f6'
        style.frameBorderWidth = 3
        style.showInnerBorder = true
        style.fontFamily = 'playfair'
        style.titleColor = '#1e3a8a'
        style.institutionColor = '#0f172a'
        style.subheadingColor = '#2563eb'
        style.textColor = '#1e293b'
        style.eventHighlightColor = '#1d4ed8'
        style.studentNameColor = '#0f172a'
        break
      case 'emerald':
        style.backgroundColor = '#f0fdf4'
        style.frameStyle = 'classic-double'
        style.frameBorderColor = '#064e3b'
        style.frameInnerBorderColor = '#d97706'
        style.frameBorderWidth = 4
        style.showInnerBorder = true
        style.fontFamily = 'cinzel'
        style.titleColor = '#065f46'
        style.institutionColor = '#064e3b'
        style.subheadingColor = '#b45309'
        style.textColor = '#1f2937'
        style.eventHighlightColor = '#047857'
        style.studentNameColor = '#064e3b'
        break
      case 'black-gold':
        style.backgroundColor = '#18181b'
        style.frameStyle = 'ornate-gold'
        style.frameBorderColor = '#eab308'
        style.frameInnerBorderColor = '#ca8a04'
        style.frameBorderWidth = 3
        style.showInnerBorder = true
        style.fontFamily = 'playfair'
        style.titleColor = '#facc15'
        style.institutionColor = '#fef08a'
        style.subheadingColor = '#fde047'
        style.textColor = '#e4e4e7'
        style.eventHighlightColor = '#facc15'
        style.studentNameColor = '#ffffff'
        break
      case 'minimal':
        style.backgroundColor = '#ffffff'
        style.frameStyle = 'none'
        style.frameBorderColor = '#cbd5e1'
        style.frameInnerBorderColor = 'transparent'
        style.frameBorderWidth = 1
        style.showInnerBorder = false
        style.fontFamily = 'montserrat'
        style.titleColor = '#0f172a'
        style.institutionColor = '#334155'
        style.subheadingColor = '#64748b'
        style.textColor = '#334155'
        style.eventHighlightColor = '#2563eb'
        style.studentNameColor = '#0f172a'
        break
      case 'classic':
      default:
        style.backgroundColor = '#ffffff'
        style.frameStyle = 'classic-double'
        style.frameBorderColor = '#0f172a'
        style.frameInnerBorderColor = '#d97706'
        style.frameBorderWidth = 4
        style.showInnerBorder = true
        style.fontFamily = 'serif'
        style.titleColor = '#0f172a'
        style.institutionColor = '#0f172a'
        style.subheadingColor = '#d97706'
        style.textColor = '#334155'
        style.eventHighlightColor = '#1e3a8a'
        style.studentNameColor = '#0f172a'
        break
    }
  }

  copyUploadedToOfficial(target: 'form' | 'doc'): void {
    const style = target === 'form' ? this.eventForm.templateStyle : this.currentDoc?.templateStyle
    if (!style) return

    style.useUploadedBackground = true
    style.frameStyle = 'none'
    style.showInnerBorder = false
    style.backgroundColor = 'transparent'
    style.fontFamily = 'playfair'
    style.titleColor = '#0c2340'
    style.institutionColor = '#0c2340'
    style.subheadingColor = '#0c2340'
    style.textColor = '#1e293b'
    style.eventHighlightColor = '#0c2340'
    style.studentNameColor = '#0c2340'
    style.certificateTitle = 'Certificado'
    style.signer1Role = 'Diretor(a) Responsável'
    style.signer2Role = ''
    style.showLogo = false
    style.showInstitutionHeader = false

    if (target === 'doc') {
      this.useOfficialLayoutOnly = true
      this.templateSuccessMessage = '✨ Layout do modelo que você subiu copiado e mesclado ao certificado com sucesso!'
      setTimeout(() => (this.templateSuccessMessage = ''), 3500)
      this.saveCertificateTemplateSettings()
    } else {
      this.successMessage = '✨ Layout configurado para o modelo subido!'
      setTimeout(() => (this.successMessage = ''), 3000)
    }
  }

  saveCertificateTemplateSettings(): void {
    if (!this.currentDoc?.eventId || !this.currentDoc?.templateStyle) return
    const eventId = this.currentDoc.eventId
    const templateStyle = this.currentDoc.templateStyle
    this.isSavingTemplateSettings = true
    this.certificatesService
      .updateCustomEvent(eventId, {
        templateStyle,
      })
      .pipe(finalize(() => (this.isSavingTemplateSettings = false)))
      .subscribe({
        next: () => {
          this.templateSuccessMessage = '✅ Configurações salvas como padrão do evento!'
          setTimeout(() => (this.templateSuccessMessage = ''), 4000)
          this.loadEvents()
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao salvar configuração do certificado no evento.'
        },
      })
  }

  resetTemplateSettings(target: 'form' | 'doc'): void {
    if (target === 'form') {
      this.eventForm.templateStyle = getDefaultTemplateStyle()
    } else if (this.currentDoc) {
      this.currentDoc.templateStyle = getDefaultTemplateStyle()
      this.templateSuccessMessage = 'Padrão restaurado!'
      setTimeout(() => (this.templateSuccessMessage = ''), 2500)
    }
  }

  printCertificate(): void {
    executeCertificatePrint('printable-certificate')
  }

  countPaidParticipants(): number {
    return this.activeEventDetails?.participants.filter((p) => p.isPaid).length || 0
  }

  countEligibleParticipants(): number {
    return this.activeEventDetails?.participants.filter((p) => p.isEligible).length || 0
  }

  getInitials(name: string): string {
    return getStudentInitials(name)
  }

  formatDate(dateStr: string | null): string {
    return formatDisplayDate(dateStr)
  }

  formatCurrentDate(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  formatCpf(cpf: string | null): string {
    return formatStudentCpf(cpf)
  }
}
