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
              <div class="form-group">
                <label>Nome do Bairro *</label>
                <input type="text" class="form-control" [(ngModel)]="neighborhoodForm.name" name="name" required placeholder="Ex: Jardim das Flores, Centro" />
              </div>
              <div class="form-group">
                <label>Cidade / Polo</label>
                <input type="text" class="form-control" [(ngModel)]="neighborhoodForm.city" name="city" placeholder="Ex: Marília, Bauru..." />
              </div>
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
                <label>Nome da Rua / Logradouro *</label>
                <input type="text" class="form-control" [(ngModel)]="streetForm.name" name="name" required placeholder="Ex: Rua das Acácias, Av. Brasil" />
              </div>
              <div class="form-group">
                <label>CEP</label>
                <input type="text" class="form-control" [(ngModel)]="streetForm.zipCode" name="zipCode" placeholder="Ex: 17500-000" />
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
          <div class="modal-dialog">
            <header class="modal-header">
              <h3>⚡ Gerar Números em Lote</h3>
              <button class="btn-close" (click)="showBatchResidenceModal = false">✕</button>
            </header>
            <form (ngSubmit)="saveBatchResidences()" class="modal-body">
              <p class="form-hint">
                Gere múltiplos números para a rua <strong>{{ activeStreet?.name }}</strong> rapidamente por intervalo ou lista personalizada.
              </p>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Do Número</label>
                  <input type="number" class="form-control" [(ngModel)]="batchForm.fromNumber" name="fromNumber" placeholder="Ex: 10" />
                </div>
                <div class="form-group">
                  <label>Até o Número</label>
                  <input type="number" class="form-control" [(ngModel)]="batchForm.toNumber" name="toNumber" placeholder="Ex: 100" />
                </div>
              </div>

              <div class="form-group">
                <label>Passo / Paridade</label>
                <select class="form-control" [(ngModel)]="batchForm.step" name="step">
                  <option [ngValue]="1">Todos os números (1, 2, 3...)</option>
                  <option [ngValue]="2">Pular de 2 em 2 (somente pares ou ímpares)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Ou digite números separados por vírgula:</label>
                <textarea
                  rows="2"
                  class="form-control"
                  [(ngModel)]="batchForm.customList"
                  name="customList"
                  placeholder="Ex: 10, 12, 14, 20-A, 25, 30"
                ></textarea>
              </div>

              <footer class="modal-footer">
                <button type="button" class="button button-secondary" (click)="showBatchResidenceModal = false">Cancelar</button>
                <button type="submit" class="button button-primary">Gerar Números</button>
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
  neighborhoodForm = { name: '', city: '' }

  showStreetModal = false
  editingStreetId: string | null = null
  streetForm = { name: '', zipCode: '' }

  showResidenceModal = false
  residenceForm = { number: '', complement: '', notes: '' }

  showBatchResidenceModal = false
  batchForm = { fromNumber: 1, toNumber: 50, step: 1, customList: '' }

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
    this.neighborhoodForm = { name: '', city: '' }
    this.showNeighborhoodModal = true
  }

  openEditNeighborhoodModal(n: NeighborhoodItem): void {
    this.editingNeighborhoodId = n.id
    this.neighborhoodForm = { name: n.name, city: n.city || '' }
    this.showNeighborhoodModal = true
  }

  saveNeighborhood(): void {
    if (!this.activeSubterritory || !this.neighborhoodForm.name.trim()) return

    if (this.editingNeighborhoodId) {
      this.territoryService
        .updateNeighborhood(this.editingNeighborhoodId, {
          name: this.neighborhoodForm.name,
          city: this.neighborhoodForm.city || undefined,
        })
        .subscribe({
          next: () => {
            this.globalSuccess = 'Bairro atualizado!'
            this.showNeighborhoodModal = false
            this.refreshActiveHierarchy()
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
          next: () => {
            this.globalSuccess = 'Bairro cadastrado!'
            this.showNeighborhoodModal = false
            this.refreshActiveHierarchy()
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
    this.showStreetModal = true
  }

  openEditStreetModal(s: StreetItem): void {
    this.editingStreetId = s.id
    this.streetForm = { name: s.name, zipCode: s.zipCode || '' }
    this.showStreetModal = true
  }

  saveStreet(): void {
    if (!this.activeNeighborhood || !this.streetForm.name.trim()) return

    if (this.editingStreetId) {
      this.territoryService
        .updateStreet(this.editingStreetId, {
          name: this.streetForm.name,
          zipCode: this.streetForm.zipCode || undefined,
        })
        .subscribe({
          next: () => {
            this.globalSuccess = 'Rua atualizada!'
            this.showStreetModal = false
            this.refreshActiveHierarchy()
          },
        })
    } else {
      this.territoryService
        .createStreet({
          neighborhoodId: this.activeNeighborhood.id,
          name: this.streetForm.name,
          zipCode: this.streetForm.zipCode || undefined,
        })
        .subscribe({
          next: () => {
            this.globalSuccess = 'Rua cadastrada!'
            this.showStreetModal = false
            this.refreshActiveHierarchy()
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

  openBatchResidenceModal(): void {
    this.batchForm = { fromNumber: 1, toNumber: 50, step: 1, customList: '' }
    this.showBatchResidenceModal = true
  }

  saveBatchResidences(): void {
    if (!this.activeStreet) return

    let customNumbers: string[] | undefined
    if (this.batchForm.customList.trim()) {
      customNumbers = this.batchForm.customList
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }

    this.territoryService
      .batchCreateResidenceNumbers({
        streetId: this.activeStreet.id,
        fromNumber: this.batchForm.fromNumber,
        toNumber: this.batchForm.toNumber,
        step: this.batchForm.step,
        customNumbers,
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
