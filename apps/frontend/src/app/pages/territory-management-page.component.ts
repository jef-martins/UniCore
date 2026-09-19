import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import {
  LeadItem,
  NeighborhoodItem,
  ResidenceNumberItem,
  StreetItem,
  SubterritoryItem,
  TerritoryHierarchy,
  TerritoryItem,
  TerritoryService,
} from '../services/territory.service'
import { LeadModalComponent, ResidenceContextInfo } from './lead-modal.component'
import { cleanCep, formatCep, generateResidenceNumbers } from './territory-utils'

@Component({
  selector: 'app-territory-management-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LeadModalComponent],
  template: `
    <section class="territory-page" aria-labelledby="page-title">
      <!-- Cabeçalho Principal -->
      <header class="page-header-container">
        <div class="header-info">
          <p class="hero-eyebrow">Administração / Cadastros</p>
          <h1 id="page-title" class="page-title">Gestão Territorial e Abordagens</h1>
          <p class="page-subtitle">
            Cadastre territórios, subterritórios, bairros, ruas e residências. O status de conclusão de cada nível é atualizado automaticamente conforme os leads são registrados.
          </p>
        </div>
        <div class="header-actions">
          <button class="button button-primary" type="button" (click)="openCreateTerritoryModal()">
            <span aria-hidden="true">＋</span> Novo Território
          </button>
          <a class="button button-secondary" routerLink="/administracao/cadastros/leads">
            <span aria-hidden="true">📋</span> Ver Todos os Leads
          </a>
          <a class="button button-secondary" routerLink="/administracao/dashboards/territorios">
            <span aria-hidden="true">📊</span> Dashboards
          </a>
        </div>
      </header>

      <!-- Alertas Globais -->
      @if (globalSuccess) {
        <div class="alert alert-success" role="status">
          <span>✓ {{ globalSuccess }}</span>
          <button class="btn-close" (click)="globalSuccess = ''" aria-label="Fechar">✕</button>
        </div>
      }
      @if (globalError) {
        <div class="alert alert-error" role="alert">
          <span>⚠ {{ globalError }}</span>
          <button class="btn-close" (click)="globalError = ''" aria-label="Fechar">✕</button>
        </div>
      }

      <!-- Indicadores Rápidos -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Territórios</span>
          <span class="stat-value">{{ territories.length }}</span>
          <span class="stat-hint">{{ completedTerritoriesCount }} concluídos</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Ruas Mapeadas</span>
          <span class="stat-value">{{ totalStreetsCount }}</span>
          <span class="stat-hint">{{ completedStreetsCount }} concluídas</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Residências</span>
          <span class="stat-value">{{ totalResidencesCount }}</span>
          <span class="stat-hint">{{ visitedResidencesCount }} com lead</span>
        </div>
        <div class="stat-card stat-highlight">
          <span class="stat-label">Cobertura de Visitas</span>
          <span class="stat-value">{{ globalCoveragePercentage }}%</span>
          <span class="stat-hint">Regra de conclusão ativa</span>
        </div>
      </div>

      <!-- Navegação em Drill-down / Breadcrumbs -->
      @if (activeTerritory) {
        <div class="breadcrumb-bar">
          <button class="breadcrumb-item" type="button" (click)="clearSelection()">
            🌐 Todos os Territórios
          </button>
          <span class="breadcrumb-sep">❯</span>
          <button
            class="breadcrumb-item"
            [class.active]="!activeSubterritory"
            type="button"
            (click)="selectTerritory(activeTerritory.id)"
          >
            {{ activeTerritory.name }}
          </button>

          @if (activeSubterritory) {
            <span class="breadcrumb-sep">❯</span>
            <button
              class="breadcrumb-item"
              [class.active]="!activeNeighborhood"
              type="button"
              (click)="selectSubterritory(activeSubterritory)"
            >
              {{ activeSubterritory.name }}
            </button>
          }

          @if (activeNeighborhood) {
            <span class="breadcrumb-sep">❯</span>
            <button
              class="breadcrumb-item"
              [class.active]="!activeStreet"
              type="button"
              (click)="selectNeighborhood(activeNeighborhood)"
            >
              {{ activeNeighborhood.name }}
            </button>
          }

          @if (activeStreet) {
            <span class="breadcrumb-sep">❯</span>
            <span class="breadcrumb-item active">
              {{ activeStreet.name }}
            </span>
          }
        </div>
      }

      <!-- VISÃO 1: LISTA GERAL DE TERRITÓRIOS -->
      @if (!activeTerritory) {
        <div class="section-title-row">
          <h2>Territórios Registrados</h2>
          <span class="item-count">{{ territories.length }} territórios</span>
        </div>

        @if (isLoading) {
          <div class="loading-state">Carregando territórios...</div>
        } @else if (territories.length === 0) {
          <div class="empty-state">
            <p>Nenhum território cadastrado ainda.</p>
            <button class="button button-primary" (click)="openCreateTerritoryModal()">
              Cadastrar Primeiro Território
            </button>
          </div>
        } @else {
          <div class="territories-grid">
            @for (t of territories; track t.id) {
              <div class="territory-card">
                <div class="card-header">
                  <div>
                    <div class="card-eyebrow" *ngIf="t.code">{{ t.code }}</div>
                    <h3 class="card-title">{{ t.name }}</h3>
                  </div>
                  <span
                    class="status-badge"
                    [class.completed]="t.stats.isCompleted"
                    [class.in-progress]="!t.stats.isCompleted && t.stats.progressPercentage > 0"
                  >
                    {{ t.stats.isCompleted ? '✓ Concluído' : (t.stats.progressPercentage > 0 ? t.stats.progressPercentage + '% Concluído' : 'Pendente') }}
                  </span>
                </div>

                <p class="card-desc">{{ t.description || 'Sem descrição informada.' }}</p>

                <!-- Barra de Progresso -->
                <div class="progress-container">
                  <div class="progress-bar-bg">
                    <div
                      class="progress-bar-fill"
                      [style.width.%]="t.stats.progressPercentage"
                      [class.completed]="t.stats.isCompleted"
                    ></div>
                  </div>
                  <div class="progress-labels">
                    <span>{{ t.stats.visitedResidences }} / {{ t.stats.totalResidences }} residências</span>
                    <span>{{ t.stats.progressPercentage }}%</span>
                  </div>
                </div>

                <!-- Métricas do Card -->
                <div class="card-metrics">
                  <div class="metric-pill">
                    <span class="m-val">{{ t.stats.totalSubterritories }}</span>
                    <span class="m-lbl">Subterritórios</span>
                  </div>
                  <div class="metric-pill">
                    <span class="m-val">{{ t.stats.totalNeighborhoods }}</span>
                    <span class="m-lbl">Bairros</span>
                  </div>
                  <div class="metric-pill">
                    <span class="m-val">{{ t.stats.completedStreets }}/{{ t.stats.totalStreets }}</span>
                    <span class="m-lbl">Ruas Concluídas</span>
                  </div>
                  <div class="metric-pill highlight">
                    <span class="m-val">{{ t.stats.totalLeads }}</span>
                    <span class="m-lbl">Leads Coletados</span>
                  </div>
                </div>

                <!-- Ações do Card -->
                <div class="card-actions">
                  <button
                    class="button button-primary btn-sm"
                    type="button"
                    (click)="selectTerritory(t.id)"
                  >
                    Explorar Árvore & Ruas ➔
                  </button>
                  <button
                    class="button button-secondary btn-sm"
                    type="button"
                    (click)="openEditTerritoryModal(t)"
                  >
                    Editar
                  </button>
                  <button
                    class="btn-icon-danger"
                    type="button"
                    (click)="confirmDeleteTerritory(t)"
                    title="Excluir Território"
                  >
                    🗑
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- VISÃO 2: SUBTERRITÓRIOS DE UM TERRITÓRIO -->
      @if (activeTerritory && !activeSubterritory) {
        <div class="section-container">
          <div class="section-header-box">
            <div>
              <span class="level-indicator">Nível 2 — Território: {{ activeTerritory.name }}</span>
              <h2>Subterritórios</h2>
              <p class="section-subtitle">
                {{ activeTerritory.subterritories.length }} subterritórios cadastrados neste território.
              </p>
            </div>
            <div class="actions">
              <button class="button button-primary" (click)="openCreateSubterritoryModal()">
                ＋ Novo Subterritório
              </button>
            </div>
          </div>

          @if (activeTerritory.subterritories.length === 0) {
            <div class="empty-state">
              <p>Nenhum subterritório cadastrado neste território.</p>
              <button class="button button-primary" (click)="openCreateSubterritoryModal()">
                Cadastrar Primeiro Subterritório
              </button>
            </div>
          } @else {
            <div class="items-table-container">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Nome do Subterritório</th>
                    <th>Código</th>
                    <th>Bairros</th>
                    <th>Ruas Concluídas</th>
                    <th>Residências</th>
                    <th>Progresso</th>
                    <th>Status</th>
                    <th class="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (sub of activeTerritory.subterritories; track sub.id) {
                    <tr>
                      <td>
                        <strong>{{ sub.name }}</strong>
                        <div class="sub-desc" *ngIf="sub.description">{{ sub.description }}</div>
                      </td>
                      <td>{{ sub.code || '-' }}</td>
                      <td>{{ sub.stats?.totalNeighborhoods }}</td>
                      <td>{{ sub.stats?.completedStreets }} / {{ sub.stats?.totalStreets }}</td>
                      <td>{{ sub.stats?.visitedResidences }} / {{ sub.stats?.totalResidences }}</td>
                      <td style="min-width: 140px;">
                        <div class="inline-progress">
                          <div class="progress-bar-bg small">
                            <div
                              class="progress-bar-fill small"
                              [style.width.%]="sub.stats?.progressPercentage || 0"
                              [class.completed]="sub.stats?.isCompleted"
                            ></div>
                          </div>
                          <span>{{ sub.stats?.progressPercentage || 0 }}%</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge" [class.badge-success]="sub.stats?.isCompleted" [class.badge-info]="!sub.stats?.isCompleted && (sub.stats?.progressPercentage || 0) > 0">
                          {{ sub.stats?.isCompleted ? 'Concluído' : ((sub.stats?.progressPercentage || 0) > 0 ? 'Em Andamento' : 'Pendente') }}
                        </span>
                      </td>
                      <td class="text-right">
                        <button class="button button-secondary btn-xs" (click)="selectSubterritory(sub)">
                          Bairros ➔
                        </button>
                        <button class="button button-secondary btn-xs" (click)="openEditSubterritoryModal(sub)">
                          Editar
                        </button>
                        <button class="btn-icon-danger" (click)="confirmDeleteSubterritory(sub)">
                          🗑
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

      <!-- VISÃO 3: BAIRROS DE UM SUBTERRITÓRIO -->
      @if (activeTerritory && activeSubterritory && !activeNeighborhood) {
        <div class="section-container">
          <div class="section-header-box">
            <div>
              <span class="level-indicator">Nível 3 — Subterritório: {{ activeSubterritory.name }}</span>
              <h2>Bairros</h2>
              <p class="section-subtitle">
                {{ activeSubterritory.neighborhoods.length }} bairros cadastrados.
              </p>
            </div>
            <div class="actions">
              <button class="button button-primary" (click)="openCreateNeighborhoodModal()">
                ＋ Novo Bairro
              </button>
            </div>
          </div>

          @if (activeSubterritory.neighborhoods.length === 0) {
            <div class="empty-state">
              <p>Nenhum bairro cadastrado neste subterritório.</p>
              <button class="button button-primary" (click)="openCreateNeighborhoodModal()">
                Cadastrar Primeiro Bairro
              </button>
            </div>
          } @else {
            <div class="items-table-container">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Nome do Bairro</th>
                    <th>Cidade / Região</th>
                    <th>Ruas Mapeadas</th>
                    <th>Ruas Concluídas</th>
                    <th>Residências Visitadas</th>
                    <th>Progresso</th>
                    <th>Status</th>
                    <th class="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (n of activeSubterritory.neighborhoods; track n.id) {
                    <tr>
                      <td><strong>{{ n.name }}</strong></td>
                      <td>{{ n.city || '-' }}</td>
                      <td>{{ n.stats?.totalStreets }}</td>
                      <td>{{ n.stats?.completedStreets }} / {{ n.stats?.totalStreets }}</td>
                      <td>{{ n.stats?.visitedResidences }} / {{ n.stats?.totalResidences }}</td>
                      <td style="min-width: 140px;">
                        <div class="inline-progress">
                          <div class="progress-bar-bg small">
                            <div
                              class="progress-bar-fill small"
                              [style.width.%]="n.stats?.progressPercentage || 0"
                              [class.completed]="n.stats?.isCompleted"
                            ></div>
                          </div>
                          <span>{{ n.stats?.progressPercentage || 0 }}%</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge" [class.badge-success]="n.stats?.isCompleted" [class.badge-info]="!n.stats?.isCompleted && (n.stats?.progressPercentage || 0) > 0">
                          {{ n.stats?.isCompleted ? 'Concluído' : ((n.stats?.progressPercentage || 0) > 0 ? 'Em Andamento' : 'Pendente') }}
                        </span>
                      </td>
                      <td class="text-right">
                        <button class="button button-secondary btn-xs" (click)="selectNeighborhood(n)">
                          Ruas ➔
                        </button>
                        <button class="button button-secondary btn-xs" (click)="openEditNeighborhoodModal(n)">
                          Editar
                        </button>
                        <button class="btn-icon-danger" (click)="confirmDeleteNeighborhood(n)">
                          🗑
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

      <!-- VISÃO 4: RUAS DE UM BAIRRO -->
      @if (activeTerritory && activeSubterritory && activeNeighborhood && !activeStreet) {
        <div class="section-container">
          <div class="section-header-box">
            <div>
              <span class="level-indicator">Nível 4 — Bairro: {{ activeNeighborhood.name }}</span>
              <h2>Ruas e Logradouros</h2>
              <p class="section-subtitle">
                Cadastre e acompanhe o preenchimento de leads de cada rua.
              </p>
            </div>
            <div class="actions">
              <button class="button button-primary" (click)="openCreateStreetModal()">
                ＋ Nova Rua
              </button>
            </div>
          </div>

          @if (activeNeighborhood.streets.length === 0) {
            <div class="empty-state">
              <p>Nenhuma rua cadastrada neste bairro.</p>
              <button class="button button-primary" (click)="openCreateStreetModal()">
                Cadastrar Primeira Rua
              </button>
            </div>
          } @else {
            <div class="items-table-container">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Nome da Rua / Logradouro</th>
                    <th>CEP</th>
                    <th>Total de Residências</th>
                    <th>Residências com Lead</th>
                    <th>Progresso da Rua</th>
                    <th>Status da Rua</th>
                    <th class="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of activeNeighborhood.streets; track s.id) {
                    <tr [class.street-row-completed]="s.stats?.isCompleted">
                      <td>
                        <strong>{{ s.name }}</strong>
                      </td>
                      <td>{{ s.zipCode || '-' }}</td>
                      <td>{{ s.stats?.totalResidences }}</td>
                      <td>{{ s.stats?.visitedResidences }}</td>
                      <td style="min-width: 140px;">
                        <div class="inline-progress">
                          <div class="progress-bar-bg small">
                            <div
                              class="progress-bar-fill small"
                              [style.width.%]="s.stats?.progressPercentage || 0"
                              [class.completed]="s.stats?.isCompleted"
                            ></div>
                          </div>
                          <span>{{ s.stats?.progressPercentage || 0 }}%</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge" [class.badge-success]="s.stats?.isCompleted" [class.badge-info]="!s.stats?.isCompleted && (s.stats?.progressPercentage || 0) > 0">
                          {{ s.stats?.isCompleted ? '✓ Rua Concluída' : ((s.stats?.progressPercentage || 0) > 0 ? 'Em Andamento' : 'Pendente') }}
                        </span>
                      </td>
                      <td class="text-right">
                        <button class="button button-primary btn-xs" (click)="selectStreet(s)">
                          Residências & Leads ➔
                        </button>
                        <button class="button button-secondary btn-xs" (click)="openEditStreetModal(s)">
                          Editar
                        </button>
                        <button class="btn-icon-danger" (click)="confirmDeleteStreet(s)">
                          🗑
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

      <!-- VISÃO 5: RESIDÊNCIAS E LEADS DE UMA RUA -->
      @if (activeTerritory && activeSubterritory && activeNeighborhood && activeStreet) {
        <div class="section-container">
          <!-- Banner de Conclusão da Rua -->
          @if (activeStreet.stats?.isCompleted) {
            <div class="street-banner banner-completed">
              <div class="banner-icon">🎉</div>
              <div>
                <h3>Rua Concluída com Sucesso!</h3>
                <p>Todas as {{ activeStreet.stats?.totalResidences }} residências cadastradas nesta rua possuem registro de Lead preenchido.</p>
              </div>
            </div>
          } @else {
            <div class="street-banner banner-in-progress">
              <div class="banner-icon">📍</div>
              <div>
                <h3>Rua em Andamento ({{ activeStreet.stats?.visitedResidences }} de {{ activeStreet.stats?.totalResidences }} residências preenchidas)</h3>
                <p>Preencha os leads das residências restantes para concluir esta rua e propagar o progresso para o bairro.</p>
              </div>
            </div>
          }

          <div class="section-header-box">
            <div>
              <span class="level-indicator">
                Nível 5 — Residências na {{ activeStreet.name }} ({{ activeNeighborhood.name }})
              </span>
              <h2>Números de Residências</h2>
            </div>
            <div class="actions">
              <button class="button button-primary" (click)="openCreateResidenceModal()">
                ＋ Novo Número Individual
              </button>
              <button class="button button-secondary" (click)="openBatchResidenceModal()">
                ⚡ Gerar Números em Lote
              </button>
            </div>
          </div>

          @if (!activeStreet.residences || activeStreet.residences.length === 0) {
            <div class="empty-state">
              <p>Nenhuma residência cadastrada nesta rua ainda.</p>
              <button class="button button-primary" (click)="openCreateResidenceModal()">
                Cadastrar Primeiro Número
              </button>
              <button class="button button-secondary" (click)="openBatchResidenceModal()">
                Gerar em Lote (ex: nº 1 a 50)
              </button>
            </div>
          } @else {
            <div class="residences-grid">
              @for (r of activeStreet.residences; track r.id) {
                <div class="residence-card" [class.has-lead]="r.leads.length > 0">
                  <div class="residence-header">
                    <div class="res-badge">Nº {{ r.number }}</div>
                    @if (r.complement) {
                      <span class="res-comp">{{ r.complement }}</span>
                    }
                    <button
                      class="btn-icon-danger btn-res-del"
                      (click)="confirmDeleteResidence(r)"
                      title="Excluir Residência"
                    >
                      ✕
                    </button>
                  </div>

                  @if (r.notes) {
                    <p class="res-notes">{{ r.notes }}</p>
                  }

                  <!-- Detalhes do Lead -->
                  <div class="residence-lead-box">
                    @if (r.leads.length > 0) {
                      @let latestLead = r.leads[0];
                      <div class="lead-summary">
                        <div class="lead-head">
                          <span class="lead-name" title="{{ latestLead.name }}">👤 {{ latestLead.name }}</span>
                          <span class="badge" [ngClass]="getLeadStatusBadgeClass(latestLead.status)">
                            {{ getLeadStatusLabel(latestLead.status) }}
                          </span>
                        </div>
                        <div class="lead-meta">
                          <span>📱 {{ latestLead.whatsapp }}</span>
                          <span>🎓 {{ latestLead.courseOrArea }}</span>
                        </div>
                        <div class="lead-actions">
                          <button
                            class="button button-secondary btn-xs"
                            (click)="openLeadModal(r, latestLead)"
                          >
                            Editar Lead
                          </button>
                          @if (latestLead.whatsapp) {
                            <a
                              [href]="getWhatsappLink(latestLead.whatsapp)"
                              target="_blank"
                              class="btn-wa-xs"
                              title="Abrir WhatsApp"
                            >
                              WhatsApp 💬
                            </a>
                          }
                        </div>
                      </div>
                    } @else {
                      <div class="no-lead-box">
                        <span class="no-lead-lbl">Sem lead registrado</span>
                        <button
                          class="button button-primary btn-sm btn-lead-add"
                          (click)="openLeadModal(r)"
                        >
                          ＋ Cadastrar Lead
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- MODAIS DE CRUD DE HIERARQUIA -->

      <!-- Modal Território -->
      @if (showTerritoryModal) {
        <div class="modal-backdrop" (click)="onBackdropClick($event, 'territory')">
          <div class="modal-dialog">
            <header class="modal-header">
              <h3>{{ editingTerritoryId ? 'Editar Território' : 'Novo Território' }}</h3>
              <button class="btn-close" (click)="showTerritoryModal = false">✕</button>
            </header>
            <form (ngSubmit)="saveTerritory()" class="modal-body">
              <div class="form-group">
                <label>Nome do Território *</label>
                <input type="text" class="form-control" [(ngModel)]="territoryForm.name" name="name" required placeholder="Ex: Zona Norte, Região Metropolitana" />
              </div>
              <div class="form-group">
                <label>Código / Sigla</label>
                <input type="text" class="form-control" [(ngModel)]="territoryForm.code" name="code" placeholder="Ex: ZN-01" />
              </div>
              <div class="form-group">
                <label>Descrição</label>
                <textarea rows="2" class="form-control" [(ngModel)]="territoryForm.description" name="description" placeholder="Informações de abrangência ou polo"></textarea>
              </div>
              <footer class="modal-footer">
                <button type="button" class="button button-secondary" (click)="showTerritoryModal = false">Cancelar</button>
                <button type="submit" class="button button-primary" [disabled]="!territoryForm.name.trim()">Salvar</button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Modal Subterritório -->
      @if (showSubterritoryModal) {
        <div class="modal-backdrop" (click)="onBackdropClick($event, 'subterritory')">
          <div class="modal-dialog">
            <header class="modal-header">
              <h3>{{ editingSubterritoryId ? 'Editar Subterritório' : 'Novo Subterritório' }}</h3>
              <button class="btn-close" (click)="showSubterritoryModal = false">✕</button>
            </header>
            <form (ngSubmit)="saveSubterritory()" class="modal-body">
              <div class="form-group">
                <label>Nome do Subterritório *</label>
                <input type="text" class="form-control" [(ngModel)]="subterritoryForm.name" name="name" required placeholder="Ex: Setor Alpha, Distrito Central" />
              </div>
              <div class="form-group">
                <label>Código / Sigla</label>
                <input type="text" class="form-control" [(ngModel)]="subterritoryForm.code" name="code" placeholder="Ex: SUB-01" />
              </div>
              <div class="form-group">
                <label>Descrição</label>
                <textarea rows="2" class="form-control" [(ngModel)]="subterritoryForm.description" name="description"></textarea>
              </div>
              <footer class="modal-footer">
                <button type="button" class="button button-secondary" (click)="showSubterritoryModal = false">Cancelar</button>
                <button type="submit" class="button button-primary" [disabled]="!subterritoryForm.name.trim()">Salvar</button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Modal Bairro -->
      @if (showNeighborhoodModal) {
        <div class="modal-backdrop" (click)="onBackdropClick($event, 'neighborhood')">
          <div class="modal-dialog">
            <header class="modal-header">
              <h3>{{ editingNeighborhoodId ? 'Editar Bairro' : 'Novo Bairro' }}</h3>
              <button class="btn-close" (click)="showNeighborhoodModal = false">✕</button>
            </header>
            <form (ngSubmit)="saveNeighborhood()" class="modal-body">
              <p class="form-hint">
                Informe o CEP para preenchimento automático de endereço via serviço público (ViaCEP).
              </p>

              <!-- Input CEP com Busca -->
              <div class="form-group">
                <label for="neighborhood-cep">CEP</label>
                <div class="cep-input-row">
                  <input
                    id="neighborhood-cep"
                    type="text"
                    class="form-control"
                    [(ngModel)]="neighborhoodForm.cep"
                    name="cep"
                    maxlength="9"
                    placeholder="Ex: 01001-000 ou 17500-010"
                    (input)="onNeighborhoodCepInput()"
                    (keydown.enter)="$event.preventDefault(); searchNeighborhoodCep()"
                  />
                  <button
                    type="button"
                    class="button button-secondary btn-cep-search"
                    (click)="searchNeighborhoodCep()"
                    [disabled]="isSearchingNeighborhoodCep"
                    title="Pesquisar CEP no ViaCEP"
                  >
                    @if (isSearchingNeighborhoodCep) {
                      <span>⏳ Buscando...</span>
                    } @else {
                      <span>🔍 Buscar</span>
                    }
                  </button>
                </div>
                @if (neighborhoodCepSuccess) {
                  <span class="cep-badge-success">✓ {{ neighborhoodCepSuccess }}</span>
                }
                @if (neighborhoodCepError) {
                  <span class="cep-badge-error">⚠ {{ neighborhoodCepError }}</span>
                }
              </div>

              <!-- Nome do Bairro (preenchido ou manual) -->
              <div class="form-group">
                <label for="neighborhood-name">Nome do Bairro *</label>
                <input
                  id="neighborhood-name"
                  type="text"
                  class="form-control"
                  [(ngModel)]="neighborhoodForm.name"
                  name="name"
                  required
                  placeholder="Ex: Jardim das Flores, Sé, Centro"
                />
              </div>

              <!-- Nome da Rua / Logradouro (preenchido ou opcional) -->
              @if (!editingNeighborhoodId) {
                <div class="form-group">
                  <label for="neighborhood-street">Nome da Rua / Logradouro <span class="label-optional">(opcional)</span></label>
                  <input
                    id="neighborhood-street"
                    type="text"
                    class="form-control"
                    [(ngModel)]="neighborhoodForm.streetName"
                    name="streetName"
                    placeholder="Ex: Praça da Sé, Rua das Acácias..."
                  />
                  <small class="form-hint-inline">
                    Se preenchido, esta rua será criada automaticamente vinculada a este novo bairro.
                  </small>
                </div>
              }

              <footer class="modal-footer">
                <button type="button" class="button button-secondary" (click)="showNeighborhoodModal = false">Cancelar</button>
                <button type="submit" class="button button-primary" [disabled]="!neighborhoodForm.name.trim()">Salvar</button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Modal Rua -->
      @if (showStreetModal) {
        <div class="modal-backdrop" (click)="onBackdropClick($event, 'street')">
          <div class="modal-dialog">
            <header class="modal-header">
              <h3>{{ editingStreetId ? 'Editar Rua' : 'Nova Rua' }}</h3>
              <button class="btn-close" (click)="showStreetModal = false">✕</button>
            </header>
            <form (ngSubmit)="saveStreet()" class="modal-body">
              <div class="form-group">
                <label for="street-cep">CEP</label>
                <div class="cep-input-row">
                  <input
                    id="street-cep"
                    type="text"
                    class="form-control"
                    [(ngModel)]="streetForm.zipCode"
                    name="zipCode"
                    maxlength="9"
                    placeholder="Ex: 17500-000"
                    (input)="onStreetCepInput()"
                    (keydown.enter)="$event.preventDefault(); searchStreetCep()"
                  />
                  <button
                    type="button"
                    class="button button-secondary btn-cep-search"
                    (click)="searchStreetCep()"
                    [disabled]="isSearchingStreetCep"
                    title="Pesquisar CEP no ViaCEP"
                  >
                    @if (isSearchingStreetCep) {
                      <span>⏳ Buscando...</span>
                    } @else {
                      <span>🔍 Buscar</span>
                    }
                  </button>
                </div>
                @if (streetCepSuccess) {
                  <span class="cep-badge-success">✓ {{ streetCepSuccess }}</span>
                }
                @if (streetCepError) {
                  <span class="cep-badge-error">⚠ {{ streetCepError }}</span>
                }
              </div>

              <div class="form-group">
                <label for="street-name">Nome da Rua / Logradouro *</label>
                <input
                  id="street-name"
                  type="text"
                  class="form-control"
                  [(ngModel)]="streetForm.name"
                  name="name"
                  required
                  placeholder="Ex: Rua das Acácias, Av. Brasil"
                />
              </div>
              <footer class="modal-footer">
                <button type="button" class="button button-secondary" (click)="showStreetModal = false">Cancelar</button>
                <button type="submit" class="button button-primary" [disabled]="!streetForm.name.trim()">Salvar</button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Modal Residência Individual -->
      @if (showResidenceModal) {
        <div class="modal-backdrop" (click)="onBackdropClick($event, 'residence')">
          <div class="modal-dialog">
            <header class="modal-header">
              <h3>Novo Número de Residência</h3>
              <button class="btn-close" (click)="showResidenceModal = false">✕</button>
            </header>
            <form (ngSubmit)="saveResidence()" class="modal-body">
              <div class="form-group">
                <label>Número da Casa / Residência *</label>
                <input type="text" class="form-control" [(ngModel)]="residenceForm.number" name="number" required placeholder="Ex: 120, 120-B, S/N" />
              </div>
              <div class="form-group">
                <label>Complemento</label>
                <input type="text" class="form-control" [(ngModel)]="residenceForm.complement" name="complement" placeholder="Ex: Casa 2, Apto 101, Fundos" />
              </div>
              <div class="form-group">
                <label>Observações</label>
                <input type="text" class="form-control" [(ngModel)]="residenceForm.notes" name="notes" placeholder="Ex: Portão branco, cachorro bravo..." />
              </div>
              <footer class="modal-footer">
                <button type="button" class="button button-secondary" (click)="showResidenceModal = false">Cancelar</button>
                <button type="submit" class="button button-primary" [disabled]="!residenceForm.number.trim()">Salvar</button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Modal Residências em Lote -->
      @if (showBatchResidenceModal) {
        <div class="modal-backdrop" (click)="onBackdropClick($event, 'batchResidence')">
          <div class="modal-dialog modal-dialog-wide">
            <header class="modal-header">
              <h3>⚡ Gerar Números em Lote</h3>
              <button class="btn-close" (click)="showBatchResidenceModal = false">✕</button>
            </header>
            <form (ngSubmit)="saveBatchResidences()" class="modal-body">
              <p class="form-hint">
                Gere múltiplos números para a rua <strong>{{ activeStreet?.name }}</strong> rapidamente por metragem do terreno e lado da rua (paridade).
              </p>

              <!-- Lado da Rua / Paridade -->
              <div class="form-group">
                <label>Lado da Rua (Paridade)</label>
                <div class="parity-pill-group">
                  <button
                    type="button"
                    class="parity-pill"
                    [class.active]="batchForm.side === 'PAR'"
                    (click)="setBatchSide('PAR')"
                  >
                    <span class="pill-indicator dot-even">●</span>
                    <div class="pill-text">
                      <strong>Lado Par</strong>
                      <small>Números pares</small>
                    </div>
                  </button>
                  <button
                    type="button"
                    class="parity-pill"
                    [class.active]="batchForm.side === 'IMPAR'"
                    (click)="setBatchSide('IMPAR')"
                  >
                    <span class="pill-indicator dot-odd">●</span>
                    <div class="pill-text">
                      <strong>Lado Ímpar</strong>
                      <small>Números ímpares</small>
                    </div>
                  </button>
                  <button
                    type="button"
                    class="parity-pill"
                    [class.active]="batchForm.side === 'AMBOS'"
                    (click)="setBatchSide('AMBOS')"
                  >
                    <span class="pill-indicator dot-all">●</span>
                    <div class="pill-text">
                      <strong>Ambos os Lados</strong>
                      <small>Sem filtro</small>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Tamanho do Terreno / Passo da Numeração -->
              <div class="form-group">
                <label>Tamanho do Terreno / Passo da Numeração</label>
                <div class="step-chips-grid">
                  <button
                    type="button"
                    class="step-chip"
                    [class.active]="batchForm.stepType === '10'"
                    (click)="setBatchStepType('10')"
                  >
                    <span class="chip-title">10m</span>
                    <span class="chip-desc">Pula 10 em 10 (Padrão)</span>
                  </button>
                  <button
                    type="button"
                    class="step-chip"
                    [class.active]="batchForm.stepType === '8'"
                    (click)="setBatchStepType('8')"
                  >
                    <span class="chip-title">8m</span>
                    <span class="chip-desc">Pula 8 em 8</span>
                  </button>
                  <button
                    type="button"
                    class="step-chip"
                    [class.active]="batchForm.stepType === '6'"
                    (click)="setBatchStepType('6')"
                  >
                    <span class="chip-title">6m</span>
                    <span class="chip-desc">Pula 6 em 6</span>
                  </button>
                  <button
                    type="button"
                    class="step-chip"
                    [class.active]="batchForm.stepType === '5'"
                    (click)="setBatchStepType('5')"
                  >
                    <span class="chip-title">5m</span>
                    <span class="chip-desc">Pula 5 em 5</span>
                  </button>
                  <button
                    type="button"
                    class="step-chip"
                    [class.active]="batchForm.stepType === '4'"
                    (click)="setBatchStepType('4')"
                  >
                    <span class="chip-title">4m</span>
                    <span class="chip-desc">Pula 4 em 4</span>
                  </button>
                  <button
                    type="button"
                    class="step-chip"
                    [class.active]="batchForm.stepType === '2'"
                    (click)="setBatchStepType('2')"
                  >
                    <span class="chip-title">2 em 2</span>
                    <span class="chip-desc">Sequencial</span>
                  </button>
                  <button
                    type="button"
                    class="step-chip"
                    [class.active]="batchForm.stepType === '1'"
                    (click)="setBatchStepType('1')"
                  >
                    <span class="chip-title">1 em 1</span>
                    <span class="chip-desc">Consecutivo</span>
                  </button>
                  <button
                    type="button"
                    class="step-chip"
                    [class.active]="batchForm.stepType === 'custom'"
                    (click)="setBatchStepType('custom')"
                  >
                    <span class="chip-title">Outro</span>
                    <span class="chip-desc">Personalizado</span>
                  </button>
                </div>

                @if (batchForm.stepType === 'custom') {
                  <div class="custom-step-input-box">
                    <label>Metragem personalizada do lote (metros):</label>
                    <input
                      type="number"
                      class="form-control"
                      [(ngModel)]="batchForm.customStep"
                      name="customStep"
                      min="1"
                      placeholder="Ex: 12"
                    />
                  </div>
                }
              </div>

              <!-- Intervalo: Do Número Até o Número -->
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Do Número (Início)</label>
                  <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="batchForm.fromNumber"
                    name="fromNumber"
                    min="1"
                    placeholder="Ex: 10"
                  />
                </div>
                <div class="form-group">
                  <label>Até o Número (Fim)</label>
                  <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="batchForm.toNumber"
                    name="toNumber"
                    min="1"
                    placeholder="Ex: 100"
                  />
                </div>
              </div>

              <!-- Pré-visualização Dinâmica dos Números -->
              <div class="batch-preview-box">
                <div class="preview-header">
                  <span class="preview-title">
                    📋 Prévia da numeração (<strong>{{ newBatchNumbersToInsert.length }}</strong> novas residências):
                  </span>
                  @if (previewBatchNumbers.length - newBatchNumbersToInsert.length > 0) {
                    <span class="preview-dup-badge">
                      {{ previewBatchNumbers.length - newBatchNumbersToInsert.length }} já existem na rua
                    </span>
                  }
                </div>
                <div class="preview-chips-container">
                  @if (newBatchNumbersToInsert.length === 0) {
                    <span class="preview-empty">Nenhum número novo a ser gerado para o intervalo atual.</span>
                  } @else {
                    @for (num of newBatchNumbersToInsert.slice(0, 32); track num) {
                      <span class="preview-num-chip">Nº {{ num }}</span>
                    }
                    @if (newBatchNumbersToInsert.length > 32) {
                      <span class="preview-more-chip">+{{ newBatchNumbersToInsert.length - 32 }} números...</span>
                    }
                  }
                </div>
              </div>

              <!-- Ou lista específica personalizada -->
              <div class="form-group">
                <label>Ou digite números específicos separados por vírgula:</label>
                <textarea
                  rows="2"
                  class="form-control"
                  [(ngModel)]="batchForm.customList"
                  name="customList"
                  placeholder="Ex: 10, 10-A, 12, 14, 20-B, 25"
                ></textarea>
                <small class="form-hint-inline">Se preenchido, esta lista terá prioridade sobre o gerador por metragem.</small>
              </div>

              <footer class="modal-footer">
                <button type="button" class="button button-secondary" (click)="showBatchResidenceModal = false">Cancelar</button>
                <button
                  type="submit"
                  class="button button-primary"
                  [disabled]="newBatchNumbersToInsert.length === 0"
                >
                  Gerar {{ newBatchNumbersToInsert.length }} Residências
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- MODAL DE LEAD REUTILIZÁVEL -->
      <app-lead-modal
        [isOpen]="showLeadModal"
        [residenceContext]="leadResidenceContext"
        [leadToEdit]="leadToEdit"
        (close)="showLeadModal = false"
        (saved)="onLeadSaved($event)"
      ></app-lead-modal>
    </section>
  `,
  styles: [`
    .territory-page {
      padding: 1.5rem 2rem 3rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    .page-header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    .hero-eyebrow {
      font-size: 0.85rem;
      color: var(--primary-color, #60a5fa);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }
    .page-title {
      font-size: 2.25rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 0.5rem;
    }
    .page-subtitle {
      color: var(--text-color-secondary, #a1a1aa);
      max-width: 800px;
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Alertas */
    .alert {
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.95rem;
    }
    .alert-success {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #86efac;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
    .btn-close {
      background: transparent;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 1rem;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
    }
    .stat-card.stat-highlight {
      border-color: rgba(59, 130, 246, 0.5);
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(24, 24, 27, 0.8));
    }
    .stat-label {
      font-size: 0.825rem;
      color: var(--text-color-secondary, #a1a1aa);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }
    .stat-value {
      font-size: 1.85rem;
      font-weight: 800;
      color: #fff;
    }
    .stat-hint {
      font-size: 0.8rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin-top: 0.25rem;
    }

    /* Breadcrumbs */
    .breadcrumb-bar {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.75rem 1.25rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 10px;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    .breadcrumb-item {
      background: transparent;
      border: none;
      color: var(--primary-color, #60a5fa);
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }
    .breadcrumb-item:hover { color: #93c5fd; }
    .breadcrumb-item.active {
      color: #fff;
      text-decoration: none;
      cursor: default;
    }
    .breadcrumb-sep {
      color: var(--text-color-secondary, #71717a);
      font-size: 0.8rem;
    }

    /* Section Styles */
    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .section-title-row h2 {
      font-size: 1.5rem;
      color: #fff;
      margin: 0;
    }
    .item-count {
      color: var(--text-color-secondary, #a1a1aa);
      font-size: 0.9rem;
    }

    /* Territórios Cards Grid */
    .territories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }
    .territory-card {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: all 0.2s;
    }
    .territory-card:hover {
      border-color: rgba(59, 130, 246, 0.4);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .card-eyebrow {
      font-size: 0.75rem;
      color: var(--primary-color, #60a5fa);
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .card-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      margin: 0.15rem 0 0;
    }
    .card-desc {
      font-size: 0.875rem;
      color: var(--text-color-secondary, #a1a1aa);
      line-height: 1.4;
      margin: 0;
      flex: 1;
    }

    /* Progress bar */
    .progress-container {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .progress-bar-bg {
      background: rgba(255, 255, 255, 0.1);
      height: 8px;
      border-radius: 99px;
      overflow: hidden;
    }
    .progress-bar-bg.small { height: 6px; }
    .progress-bar-fill {
      background: var(--primary-color, #3b82f6);
      height: 100%;
      border-radius: 99px;
      transition: width 0.3s;
    }
    .progress-bar-fill.completed {
      background: #22c55e;
    }
    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.775rem;
      color: var(--text-color-secondary, #a1a1aa);
    }
    .inline-progress {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.825rem;
    }
    .inline-progress .progress-bar-bg { flex: 1; }

    /* Card Metrics */
    .card-metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }
    .metric-pill {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      display: flex;
      flex-direction: column;
    }
    .metric-pill.highlight {
      background: rgba(59, 130, 246, 0.08);
      border-color: rgba(59, 130, 246, 0.25);
    }
    .m-val { font-size: 1rem; font-weight: 700; color: #fff; }
    .m-lbl { font-size: 0.725rem; color: var(--text-color-secondary, #a1a1aa); }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .card-actions .button-primary { flex: 1; }

    /* Status Badges */
    .status-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 99px;
      background: rgba(255, 255, 255, 0.1);
      color: #a1a1aa;
    }
    .status-badge.in-progress {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.35);
    }
    .status-badge.completed {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.35);
    }

    /* Section Box */
    .section-container {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      padding: 1.75rem;
      margin-bottom: 2rem;
    }
    .section-header-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .level-indicator {
      font-size: 0.8rem;
      color: var(--primary-color, #60a5fa);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .section-header-box h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
      margin: 0.25rem 0 0;
    }
    .section-subtitle {
      font-size: 0.875rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin: 0.25rem 0 0;
    }

    /* Custom Tables */
    .items-table-container {
      overflow-x: auto;
    }
    .custom-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .custom-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      color: var(--text-color-secondary, #a1a1aa);
      border-bottom: 1px solid var(--border-color, #3f3f46);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .custom-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #d4d4d8;
    }
    .custom-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .street-row-completed td {
      background: rgba(34, 197, 94, 0.04);
    }
    .text-right { text-align: right; }
    .sub-desc { font-size: 0.775rem; color: #71717a; margin-top: 2px; }

    /* Street Banners */
    .street-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
    }
    .banner-completed {
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #86efac;
    }
    .banner-in-progress {
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #93c5fd;
    }
    .banner-icon { font-size: 1.8rem; }
    .street-banner h3 { margin: 0 0 0.2rem; font-size: 1.1rem; color: #fff; }
    .street-banner p { margin: 0; font-size: 0.875rem; color: #d4d4d8; }

    /* Residences Grid */
    .residences-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }
    .residence-card {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 10px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      position: relative;
      transition: all 0.15s;
    }
    .residence-card.has-lead {
      border-color: rgba(34, 197, 94, 0.4);
      background: rgba(34, 197, 94, 0.03);
    }
    .residence-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .res-badge {
      font-size: 1.25rem;
      font-weight: 800;
      color: #fff;
    }
    .res-comp {
      font-size: 0.8rem;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 8px;
      border-radius: 4px;
      color: #d4d4d8;
    }
    .btn-res-del {
      margin-left: auto;
      background: transparent;
      border: none;
      color: #71717a;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .btn-res-del:hover { color: #ef4444; }
    .res-notes {
      font-size: 0.8rem;
      color: #a1a1aa;
      margin: 0;
    }
    .residence-lead-box {
      border-top: 1px dashed var(--border-color, #3f3f46);
      padding-top: 0.75rem;
    }
    .lead-summary {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .lead-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .lead-name {
      font-weight: 700;
      color: #fff;
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lead-meta {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      font-size: 0.8rem;
      color: #a1a1aa;
    }
    .lead-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.4rem;
    }
    .btn-wa-xs {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #4ade80;
      text-decoration: none;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.775rem;
      font-weight: 600;
    }
    .btn-wa-xs:hover { background: rgba(34, 197, 94, 0.3); }

    .no-lead-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 0;
    }
    .no-lead-lbl {
      font-size: 0.8rem;
      color: #71717a;
    }
    .btn-lead-add {
      width: 100%;
      text-align: center;
    }

    /* Badges */
    .badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-success { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .badge-info { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .badge-falhou { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .badge-lead { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .badge-inscricao { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .badge-matricula { background: rgba(34, 197, 94, 0.2); color: #86efac; }

    /* Empty and Loading States */
    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed var(--border-color, #3f3f46);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: var(--text-color-secondary, #a1a1aa);
    }
    .loading-state {
      padding: 3rem;
      text-align: center;
      color: var(--text-color-secondary, #a1a1aa);
    }

    /* Buttons */
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s;
    }
    .button-primary {
      background: var(--primary-color, #3b82f6);
      border: 1px solid var(--primary-color, #3b82f6);
      color: #fff;
    }
    .button-primary:hover { background: #2563eb; }
    .button-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color, #3f3f46);
      color: #d4d4d8;
    }
    .button-secondary:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
    .btn-sm { padding: 0.45rem 0.85rem; font-size: 0.825rem; }
    .btn-xs { padding: 0.3rem 0.65rem; font-size: 0.775rem; }
    .btn-icon-danger {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      color: #ef4444;
      padding: 0.3rem;
      border-radius: 4px;
    }
    .btn-icon-danger:hover { background: rgba(239, 68, 68, 0.15); }

    /* Modais */
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
      z-index: 1000;
      padding: 1rem;
    }
    .modal-dialog {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #3f3f46);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 { margin: 0; font-size: 1.2rem; color: #fff; }
    .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-size: 0.825rem; font-weight: 600; color: #d4d4d8; }
    .form-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      padding: 0.6rem 0.8rem;
      color: #fff;
      font-size: 0.9rem;
    }
    .form-control:focus { outline: none; border-color: var(--primary-color, #3b82f6); }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .form-hint { font-size: 0.825rem; color: #a1a1aa; margin: 0 0 0.5rem; }
    .form-hint-inline { font-size: 0.775rem; color: var(--text-color-secondary, #a1a1aa); margin-top: 0.25rem; display: block; }
    .label-optional { font-weight: normal; color: var(--text-color-secondary, #a1a1aa); font-size: 0.775rem; }
    .cep-input-row { display: flex; gap: 0.5rem; align-items: stretch; }
    .cep-input-row .form-control { flex: 1; }
    .btn-cep-search { padding: 0.5rem 0.95rem; white-space: nowrap; font-size: 0.85rem; }
    .cep-badge-success {
      font-size: 0.775rem;
      color: #86efac;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      width: fit-content;
      margin-top: 0.25rem;
    }
    .cep-badge-error {
      font-size: 0.775rem;
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      width: fit-content;
      margin-top: 0.25rem;
    }
    .modal-dialog-wide { max-width: 600px; }

    /* Parity pill buttons */
    .parity-pill-group {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }
    .parity-pill {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      padding: 0.6rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
      color: #d4d4d8;
    }
    .parity-pill:hover {
      border-color: rgba(59, 130, 246, 0.5);
      background: rgba(255, 255, 255, 0.06);
    }
    .parity-pill.active {
      border-color: var(--primary-color, #3b82f6);
      background: rgba(59, 130, 246, 0.15);
      color: #fff;
    }
    .pill-indicator { font-size: 1.1rem; line-height: 1; }
    .dot-even { color: #60a5fa; }
    .dot-odd { color: #c084fc; }
    .dot-all { color: #94a3b8; }
    .pill-text { display: flex; flex-direction: column; gap: 0.1rem; }
    .pill-text strong { font-size: 0.825rem; font-weight: 700; }
    .pill-text small { font-size: 0.7rem; color: var(--text-color-secondary, #a1a1aa); }

    /* Step chips */
    .step-chips-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
    }
    .step-chip {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      padding: 0.55rem 0.4rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.15rem;
      cursor: pointer;
      text-align: center;
      color: #d4d4d8;
      transition: all 0.15s ease;
    }
    .step-chip:hover {
      border-color: rgba(59, 130, 246, 0.5);
      background: rgba(255, 255, 255, 0.06);
    }
    .step-chip.active {
      border-color: var(--primary-color, #3b82f6);
      background: rgba(59, 130, 246, 0.15);
      color: #fff;
      font-weight: 700;
    }
    .chip-title { font-size: 0.95rem; font-weight: 700; }
    .chip-desc { font-size: 0.675rem; color: var(--text-color-secondary, #a1a1aa); }
    .custom-step-input-box {
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    /* Batch Preview Box */
    .batch-preview-box {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .preview-title { font-size: 0.825rem; color: #fff; }
    .preview-dup-badge {
      font-size: 0.725rem;
      color: #fbbf24;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .preview-chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      max-height: 110px;
      overflow-y: auto;
      padding-right: 0.25rem;
    }
    .preview-num-chip {
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 0.775rem;
      font-weight: 600;
    }
    .preview-more-chip {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a1a1aa);
      align-self: center;
      padding: 2px 5px;
    }
    .preview-empty {
      font-size: 0.8rem;
      color: #71717a;
      font-style: italic;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color, #3f3f46);
    }
  `],
})
export class TerritoryManagementPageComponent implements OnInit {
  territories: TerritoryItem[] = []
  isLoading = false
  globalSuccess = ''
  globalError = ''

  // Drill-down selection states
  activeTerritory: TerritoryHierarchy | null = null
  activeSubterritory: SubterritoryItem | null = null
  activeNeighborhood: NeighborhoodItem | null = null
  activeStreet: StreetItem | null = null

  // Modais de Criação/Edição
  showTerritoryModal = false
  editingTerritoryId: string | null = null
  territoryForm = { name: '', code: '', description: '' }

  showSubterritoryModal = false
  editingSubterritoryId: string | null = null
  subterritoryForm = { name: '', code: '', description: '' }

  showNeighborhoodModal = false
  editingNeighborhoodId: string | null = null
  neighborhoodForm = { cep: '', name: '', city: '', streetName: '' }
  isSearchingNeighborhoodCep = false
  neighborhoodCepError = ''
  neighborhoodCepSuccess = ''

  showStreetModal = false
  editingStreetId: string | null = null
  streetForm = { name: '', zipCode: '' }
  isSearchingStreetCep = false
  streetCepError = ''
  streetCepSuccess = ''

  showResidenceModal = false
  residenceForm = { number: '', complement: '', notes: '' }

  showBatchResidenceModal = false
  batchForm: {
    fromNumber: number
    toNumber: number
    side: 'PAR' | 'IMPAR' | 'AMBOS'
    stepType: '10' | '8' | '6' | '5' | '4' | '2' | '1' | 'custom'
    customStep: number
    customList: string
  } = {
    fromNumber: 10,
    toNumber: 100,
    side: 'PAR',
    stepType: '10',
    customStep: 10,
    customList: '',
  }

  // Modal de Lead
  showLeadModal = false
  leadResidenceContext?: ResidenceContextInfo
  leadToEdit?: LeadItem | null

  constructor(private readonly territoryService: TerritoryService) {}

  ngOnInit(): void {
    this.loadTerritories()
  }

  loadTerritories(): void {
    this.isLoading = true
    this.territoryService.getTerritories().subscribe({
      next: (data) => {
        this.territories = data
        this.isLoading = false
      },
      error: (err) => {
        this.globalError = 'Erro ao carregar lista de territórios.'
        this.isLoading = false
      },
    })
  }

  // Estatísticas computadas
  get completedTerritoriesCount(): number {
    return this.territories.filter((t) => t.stats.isCompleted).length
  }

  get totalStreetsCount(): number {
    return this.territories.reduce((acc, t) => acc + t.stats.totalStreets, 0)
  }

  get completedStreetsCount(): number {
    return this.territories.reduce(
      (acc, t) => acc + t.stats.completedStreets,
      0,
    )
  }

  get totalResidencesCount(): number {
    return this.territories.reduce(
      (acc, t) => acc + t.stats.totalResidences,
      0,
    )
  }

  get visitedResidencesCount(): number {
    return this.territories.reduce(
      (acc, t) => acc + t.stats.visitedResidences,
      0,
    )
  }

  get globalCoveragePercentage(): number {
    return this.totalResidencesCount > 0
      ? Math.round((this.visitedResidencesCount / this.totalResidencesCount) * 100)
      : 0
  }

  // Drill-down navigation
  selectTerritory(id: string): void {
    this.isLoading = true
    this.territoryService.getTerritoryHierarchy(id).subscribe({
      next: (hierarchy) => {
        this.activeTerritory = hierarchy
        this.activeSubterritory = null
        this.activeNeighborhood = null
        this.activeStreet = null
        this.isLoading = false
      },
      error: () => {
        this.globalError = 'Erro ao carregar detalhes do território.'
        this.isLoading = false
      },
    })
  }

  refreshActiveHierarchy(): void {
    if (this.activeTerritory) {
      const territoryId = this.activeTerritory.id
      const subId = this.activeSubterritory?.id
      const neighId = this.activeNeighborhood?.id
      const streetId = this.activeStreet?.id

      this.territoryService.getTerritoryHierarchy(territoryId).subscribe({
        next: (hierarchy) => {
          this.activeTerritory = hierarchy
          if (subId) {
            this.activeSubterritory =
              hierarchy.subterritories.find((s) => s.id === subId) || null
          }
          if (this.activeSubterritory && neighId) {
            this.activeNeighborhood =
              this.activeSubterritory.neighborhoods.find((n) => n.id === neighId) || null
          }
          if (this.activeNeighborhood && streetId) {
            this.activeStreet =
              this.activeNeighborhood.streets.find((s) => s.id === streetId) || null
          }
          this.loadTerritories()
        },
      })
    }
  }

  selectSubterritory(sub: SubterritoryItem): void {
    this.activeSubterritory = sub
    this.activeNeighborhood = null
    this.activeStreet = null
  }

  selectNeighborhood(neigh: NeighborhoodItem): void {
    this.activeNeighborhood = neigh
    this.activeStreet = null
  }

  selectStreet(street: StreetItem): void {
    this.activeStreet = street
  }

  clearSelection(): void {
    this.activeTerritory = null
    this.activeSubterritory = null
    this.activeNeighborhood = null
    this.activeStreet = null
  }

  // Território CRUD
  openCreateTerritoryModal(): void {
    this.editingTerritoryId = null
    this.territoryForm = { name: '', code: '', description: '' }
    this.showTerritoryModal = true
  }

  openEditTerritoryModal(t: TerritoryItem): void {
    this.editingTerritoryId = t.id
    this.territoryForm = {
      name: t.name,
      code: t.code || '',
      description: t.description || '',
    }
    this.showTerritoryModal = true
  }

  saveTerritory(): void {
    if (!this.territoryForm.name.trim()) return

    if (this.editingTerritoryId) {
      this.territoryService
        .updateTerritory(this.editingTerritoryId, {
          name: this.territoryForm.name,
          code: this.territoryForm.code || undefined,
          description: this.territoryForm.description || undefined,
        })
        .subscribe({
          next: () => {
            this.globalSuccess = 'Território atualizado com sucesso!'
            this.showTerritoryModal = false
            this.loadTerritories()
          },
          error: (err) => {
            this.globalError = err?.error?.message || 'Erro ao atualizar território.'
          },
        })
    } else {
      this.territoryService
        .createTerritory({
          name: this.territoryForm.name,
          code: this.territoryForm.code || undefined,
          description: this.territoryForm.description || undefined,
        })
        .subscribe({
          next: () => {
            this.globalSuccess = 'Território criado com sucesso!'
            this.showTerritoryModal = false
            this.loadTerritories()
          },
          error: (err) => {
            this.globalError = err?.error?.message || 'Erro ao criar território.'
          },
        })
    }
  }

  confirmDeleteTerritory(t: TerritoryItem): void {
    if (confirm(`Tem certeza que deseja excluir o território "${t.name}" e toda a sua árvore?`)) {
      this.territoryService.deleteTerritory(t.id).subscribe({
        next: () => {
          this.globalSuccess = 'Território excluído com sucesso!'
          this.loadTerritories()
        },
        error: () => {
          this.globalError = 'Erro ao excluir território.'
        },
      })
    }
  }

  // Subterritório CRUD
  openCreateSubterritoryModal(): void {
    this.editingSubterritoryId = null
    this.subterritoryForm = { name: '', code: '', description: '' }
    this.showSubterritoryModal = true
  }

  openEditSubterritoryModal(sub: SubterritoryItem): void {
    this.editingSubterritoryId = sub.id
    this.subterritoryForm = {
      name: sub.name,
      code: sub.code || '',
      description: sub.description || '',
    }
    this.showSubterritoryModal = true
  }

  saveSubterritory(): void {
    if (!this.activeTerritory || !this.subterritoryForm.name.trim()) return

    if (this.editingSubterritoryId) {
      this.territoryService
        .updateSubterritory(this.editingSubterritoryId, {
          name: this.subterritoryForm.name,
          code: this.subterritoryForm.code || undefined,
          description: this.subterritoryForm.description || undefined,
        })
        .subscribe({
          next: () => {
            this.globalSuccess = 'Subterritório atualizado!'
            this.showSubterritoryModal = false
            this.refreshActiveHierarchy()
          },
          error: (err) => {
            this.globalError = err?.error?.message || 'Erro ao atualizar.'
          },
        })
    } else {
      this.territoryService
        .createSubterritory({
          territoryId: this.activeTerritory.id,
          name: this.subterritoryForm.name,
          code: this.subterritoryForm.code || undefined,
          description: this.subterritoryForm.description || undefined,
        })
        .subscribe({
          next: () => {
            this.globalSuccess = 'Subterritório cadastrado!'
            this.showSubterritoryModal = false
            this.refreshActiveHierarchy()
          },
          error: (err) => {
            this.globalError = err?.error?.message || 'Erro ao criar.'
          },
        })
    }
  }

  confirmDeleteSubterritory(sub: SubterritoryItem): void {
    if (confirm(`Deseja excluir o subterritório "${sub.name}"?`)) {
      this.territoryService.deleteSubterritory(sub.id).subscribe({
        next: () => {
          this.globalSuccess = 'Subterritório excluído!'
          this.refreshActiveHierarchy()
        },
      })
    }
  }

  // Bairro CRUD
  openCreateNeighborhoodModal(): void {
    this.editingNeighborhoodId = null
    this.neighborhoodForm = { cep: '', name: '', city: '', streetName: '' }
    this.neighborhoodCepError = ''
    this.neighborhoodCepSuccess = ''
    this.showNeighborhoodModal = true
  }

  openEditNeighborhoodModal(n: NeighborhoodItem): void {
    this.editingNeighborhoodId = n.id
    this.neighborhoodForm = {
      cep: '',
      name: n.name,
      city: n.city || '',
      streetName: '',
    }
    this.neighborhoodCepError = ''
    this.neighborhoodCepSuccess = ''
    this.showNeighborhoodModal = true
  }

  onNeighborhoodCepInput(): void {
    this.neighborhoodForm.cep = formatCep(this.neighborhoodForm.cep)
    const clean = cleanCep(this.neighborhoodForm.cep)
    this.neighborhoodCepError = ''
    this.neighborhoodCepSuccess = ''

    if (clean.length === 8) {
      this.searchNeighborhoodCep()
    }
  }

  searchNeighborhoodCep(): void {
    const clean = cleanCep(this.neighborhoodForm.cep)
    if (clean.length !== 8) {
      this.neighborhoodCepError = 'Informe um CEP válido com 8 dígitos.'
      return
    }

    this.isSearchingNeighborhoodCep = true
    this.neighborhoodCepError = ''
    this.neighborhoodCepSuccess = ''

    this.territoryService.lookupCep(clean).subscribe({
      next: (data) => {
        this.isSearchingNeighborhoodCep = false
        if (data.erro === true || data.erro === 'true') {
          this.neighborhoodCepError = 'CEP não encontrado no ViaCEP.'
          return
        }

        if (data.bairro) {
          this.neighborhoodForm.name = data.bairro
        }
        if (data.logradouro) {
          this.neighborhoodForm.streetName = data.logradouro
        }
        if (data.localidade) {
          this.neighborhoodForm.city = data.uf
            ? `${data.localidade} - ${data.uf}`
            : data.localidade
        }
        const parts = [data.localidade, data.uf].filter(Boolean).join(' - ')
        this.neighborhoodCepSuccess = parts
          ? `Localidade identificada: ${parts}`
          : 'Endereço localizado via ViaCEP!'
      },
      error: () => {
        this.isSearchingNeighborhoodCep = false
        this.neighborhoodCepError =
          'Falha ao consultar CEP no ViaCEP. Verifique sua conexão ou preencha manualmente.'
      },
    })
  }

  saveNeighborhood(): void {
    if (!this.activeSubterritory || !this.neighborhoodForm.name.trim()) return

    const streetNameToCreate =
      !this.editingNeighborhoodId && this.neighborhoodForm.streetName?.trim()
        ? this.neighborhoodForm.streetName.trim()
        : null
    const streetZipCode = cleanCep(this.neighborhoodForm.cep)
      ? formatCep(this.neighborhoodForm.cep)
      : undefined

    if (this.editingNeighborhoodId) {
      this.territoryService
        .updateNeighborhood(this.editingNeighborhoodId, {
          name: this.neighborhoodForm.name,
          city: this.neighborhoodForm.city || undefined,
        })
        .subscribe({
          next: () => {
            this.globalSuccess = 'Bairro atualizado com sucesso!'
            this.showNeighborhoodModal = false
            this.refreshActiveHierarchy()
          },
          error: (err) => {
            this.globalError = err?.error?.message || 'Erro ao atualizar bairro.'
          },
        })
    } else {
      this.territoryService
        .createNeighborhood({
          subterritoryId: this.activeSubterritory.id,
          name: this.neighborhoodForm.name,
          city: this.neighborhoodForm.city || undefined,
        })
        .subscribe({
          next: (createdNeigh) => {
            if (streetNameToCreate) {
              this.territoryService
                .createStreet({
                  neighborhoodId: createdNeigh.id,
                  name: streetNameToCreate,
                  zipCode: streetZipCode,
                })
                .subscribe({
                  next: () => {
                    this.globalSuccess = `Bairro "${createdNeigh.name}" e rua "${streetNameToCreate}" cadastrados com sucesso!`
                    this.showNeighborhoodModal = false
                    this.refreshActiveHierarchy()
                  },
                  error: () => {
                    this.globalSuccess = `Bairro "${createdNeigh.name}" cadastrado! (Aviso: não foi possível cadastrar a rua automaticamente)`
                    this.showNeighborhoodModal = false
                    this.refreshActiveHierarchy()
                  },
                })
            } else {
              this.globalSuccess = `Bairro "${createdNeigh.name}" cadastrado com sucesso!`
              this.showNeighborhoodModal = false
              this.refreshActiveHierarchy()
            }
          },
          error: (err) => {
            this.globalError = err?.error?.message || 'Erro ao cadastrar bairro.'
          },
        })
    }
  }

  confirmDeleteNeighborhood(n: NeighborhoodItem): void {
    if (confirm(`Deseja excluir o bairro "${n.name}"?`)) {
      this.territoryService.deleteNeighborhood(n.id).subscribe({
        next: () => {
          this.globalSuccess = 'Bairro excluído!'
          this.refreshActiveHierarchy()
        },
      })
    }
  }

  // Rua CRUD
  openCreateStreetModal(): void {
    this.editingStreetId = null
    this.streetForm = { name: '', zipCode: '' }
    this.streetCepError = ''
    this.streetCepSuccess = ''
    this.showStreetModal = true
  }

  openEditStreetModal(s: StreetItem): void {
    this.editingStreetId = s.id
    this.streetForm = { name: s.name, zipCode: s.zipCode || '' }
    this.streetCepError = ''
    this.streetCepSuccess = ''
    this.showStreetModal = true
  }

  onStreetCepInput(): void {
    this.streetForm.zipCode = formatCep(this.streetForm.zipCode)
    const clean = cleanCep(this.streetForm.zipCode)
    this.streetCepError = ''
    this.streetCepSuccess = ''

    if (clean.length === 8) {
      this.searchStreetCep()
    }
  }

  searchStreetCep(): void {
    const clean = cleanCep(this.streetForm.zipCode)
    if (clean.length !== 8) {
      this.streetCepError = 'Informe um CEP válido com 8 dígitos.'
      return
    }

    this.isSearchingStreetCep = true
    this.streetCepError = ''
    this.streetCepSuccess = ''

    this.territoryService.lookupCep(clean).subscribe({
      next: (data) => {
        this.isSearchingStreetCep = false
        if (data.erro === true || data.erro === 'true') {
          this.streetCepError = 'CEP não encontrado no ViaCEP.'
          return
        }

        if (data.logradouro) {
          this.streetForm.name = data.logradouro
        }
        const parts = [data.bairro, data.localidade].filter(Boolean).join(', ')
        this.streetCepSuccess = parts
          ? `Localizado: ${parts}`
          : 'Endereço localizado com sucesso!'
      },
      error: () => {
        this.isSearchingStreetCep = false
        this.streetCepError = 'Falha ao consultar CEP no ViaCEP.'
      },
    })
  }

  saveStreet(): void {
    if (!this.activeNeighborhood || !this.streetForm.name.trim()) return

    const clean = cleanCep(this.streetForm.zipCode)
    const formattedZip = clean ? formatCep(this.streetForm.zipCode) : undefined

    if (this.editingStreetId) {
      this.territoryService
        .updateStreet(this.editingStreetId, {
          name: this.streetForm.name,
          zipCode: formattedZip,
        })
        .subscribe({
          next: () => {
            this.globalSuccess = 'Rua atualizada!'
            this.showStreetModal = false
            this.refreshActiveHierarchy()
          },
          error: (err) => {
            this.globalError = err?.error?.message || 'Erro ao atualizar rua.'
          },
        })
    } else {
      this.territoryService
        .createStreet({
          neighborhoodId: this.activeNeighborhood.id,
          name: this.streetForm.name,
          zipCode: formattedZip,
        })
        .subscribe({
          next: () => {
            this.globalSuccess = 'Rua cadastrada!'
            this.showStreetModal = false
            this.refreshActiveHierarchy()
          },
          error: (err) => {
            this.globalError = err?.error?.message || 'Erro ao cadastrar rua.'
          },
        })
    }
  }

  confirmDeleteStreet(s: StreetItem): void {
    if (confirm(`Deseja excluir a rua "${s.name}"?`)) {
      this.territoryService.deleteStreet(s.id).subscribe({
        next: () => {
          this.globalSuccess = 'Rua excluída!'
          this.refreshActiveHierarchy()
        },
      })
    }
  }

  // Residência CRUD & Batch
  openCreateResidenceModal(): void {
    this.residenceForm = { number: '', complement: '', notes: '' }
    this.showResidenceModal = true
  }

  saveResidence(): void {
    if (!this.activeStreet || !this.residenceForm.number.trim()) return

    this.territoryService
      .createResidenceNumber({
        streetId: this.activeStreet.id,
        number: this.residenceForm.number,
        complement: this.residenceForm.complement || undefined,
        notes: this.residenceForm.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.globalSuccess = 'Residência adicionada!'
          this.showResidenceModal = false
          this.refreshActiveHierarchy()
        },
        error: (err) => {
          this.globalError = err?.error?.message || 'Erro ao adicionar.'
        },
      })
  }

  get effectiveBatchStep(): number {
    return this.batchForm.stepType === 'custom'
      ? Math.max(1, this.batchForm.customStep || 1)
      : Number(this.batchForm.stepType)
  }

  get previewBatchNumbers(): string[] {
    if (this.batchForm.customList.trim()) {
      return this.batchForm.customList
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }

    const step = this.effectiveBatchStep
    const parity =
      this.batchForm.side === 'PAR'
        ? 'EVEN'
        : this.batchForm.side === 'IMPAR'
          ? 'ODD'
          : 'ALL'

    return generateResidenceNumbers({
      fromNumber: this.batchForm.fromNumber || 1,
      toNumber: this.batchForm.toNumber || 1,
      step,
      parity,
    })
  }

  get existingStreetNumbersSet(): Set<string> {
    if (!this.activeStreet?.residences) return new Set()
    return new Set(
      this.activeStreet.residences.map((r) => r.number.trim().toLowerCase()),
    )
  }

  get newBatchNumbersToInsert(): string[] {
    const existing = this.existingStreetNumbersSet
    return this.previewBatchNumbers.filter((n) => !existing.has(n.toLowerCase()))
  }

  setBatchSide(side: 'PAR' | 'IMPAR' | 'AMBOS'): void {
    this.batchForm.side = side
    if (side === 'PAR') {
      if (this.batchForm.fromNumber % 2 !== 0) {
        this.batchForm.fromNumber =
          this.batchForm.fromNumber === 1 ? 10 : this.batchForm.fromNumber + 1
      }
    } else if (side === 'IMPAR') {
      if (this.batchForm.fromNumber % 2 === 0) {
        this.batchForm.fromNumber =
          this.batchForm.fromNumber === 10 ? 11 : this.batchForm.fromNumber + 1
      }
    }
  }

  setBatchStepType(
    type: '10' | '8' | '6' | '5' | '4' | '2' | '1' | 'custom',
  ): void {
    this.batchForm.stepType = type
    if (type !== 'custom') {
      this.batchForm.customStep = Number(type)
    }
  }

  openBatchResidenceModal(): void {
    this.batchForm = {
      fromNumber: 10,
      toNumber: 100,
      side: 'PAR',
      stepType: '10',
      customStep: 10,
      customList: '',
    }
    this.showBatchResidenceModal = true
  }

  saveBatchResidences(): void {
    if (!this.activeStreet) return

    const numbersToInsert = this.newBatchNumbersToInsert
    if (numbersToInsert.length === 0) {
      this.globalError = 'Nenhum número novo a ser gerado para o intervalo configurado.'
      return
    }

    this.territoryService
      .batchCreateResidenceNumbers({
        streetId: this.activeStreet.id,
        customNumbers: numbersToInsert,
      })
      .subscribe({
        next: (res) => {
          this.globalSuccess = res.message
          this.showBatchResidenceModal = false
          this.refreshActiveHierarchy()
        },
        error: (err) => {
          this.globalError = err?.error?.message || 'Erro na geração em lote.'
        },
      })
  }

  confirmDeleteResidence(r: ResidenceNumberItem): void {
    if (confirm(`Deseja remover o nº ${r.number}?`)) {
      this.territoryService.deleteResidenceNumber(r.id).subscribe({
        next: () => {
          this.globalSuccess = 'Residência removida!'
          this.refreshActiveHierarchy()
        },
      })
    }
  }

  // Lead Modal Trigger
  openLeadModal(residence: ResidenceNumberItem, lead?: LeadItem): void {
    if (
      !this.activeTerritory ||
      !this.activeSubterritory ||
      !this.activeNeighborhood ||
      !this.activeStreet
    ) {
      return
    }

    this.leadResidenceContext = {
      residenceId: residence.id,
      residenceNumber: residence.number,
      streetName: this.activeStreet.name,
      neighborhoodName: this.activeNeighborhood.name,
      subterritoryName: this.activeSubterritory.name,
      territoryName: this.activeTerritory.name,
    }
    this.leadToEdit = lead || null
    this.showLeadModal = true
  }

  onLeadSaved(lead: LeadItem): void {
    this.globalSuccess = `Lead de ${lead.name} salvo com sucesso! Progresso e conclusões atualizados.`
    this.refreshActiveHierarchy()
  }

  // Helpers
  getLeadStatusLabel(status: string): string {
    switch (status) {
      case 'FALHOU':
        return 'Falhou'
      case 'LEAD':
        return 'Lead'
      case 'INSCRICAO':
        return 'Inscrição'
      case 'MATRICULA':
        return 'Matrícula'
      default:
        return status
    }
  }

  getLeadStatusBadgeClass(status: string): string {
    switch (status) {
      case 'FALHOU':
        return 'badge-falhou'
      case 'LEAD':
        return 'badge-lead'
      case 'INSCRICAO':
        return 'badge-inscricao'
      case 'MATRICULA':
        return 'badge-matricula'
      default:
        return 'badge-info'
    }
  }

  getWhatsappLink(phone: string): string {
    const raw = phone.replace(/\D/g, '')
    const full = raw.startsWith('55') ? raw : `55${raw}`
    return `https://wa.me/${full}`
  }

  onBackdropClick(e: MouseEvent, modalType: string): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      if (modalType === 'territory') this.showTerritoryModal = false
      if (modalType === 'subterritory') this.showSubterritoryModal = false
      if (modalType === 'neighborhood') this.showNeighborhoodModal = false
      if (modalType === 'street') this.showStreetModal = false
      if (modalType === 'residence') this.showResidenceModal = false
      if (modalType === 'batchResidence') this.showBatchResidenceModal = false
    }
  }
}
