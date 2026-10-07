import { CommonModule } from '@angular/common'
import { Component, ElementRef, OnInit, ViewChild, effect, untracked } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { AuthService, type AuthUser } from '../services/auth.service'
import { SectorContextService } from '../services/sector-context.service'
import {
  TicketsService,
  type TicketDetail,
  type TicketListItem,
  type TicketPriority,
  type TicketStatus,
  type TicketUser,
} from '../services/tickets.service'

interface SelectedUploadFile {
  file: File
  name: string
  sizeFormatted: string
}

@Component({
  selector: 'app-tickets-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="tickets-container">
      <!-- Cabeçalho -->
      <header class="page-header">
        <div class="header-left">
          <div class="header-badge">{{ isDeveloperRoute ? 'Equipe de Desenvolvimento' : 'Suporte & Desenvolvimento' }}</div>
          <h1 class="page-title">{{ isDeveloperRoute ? 'Gestão de Chamados' : 'Central de Chamados' }}</h1>
          <p class="page-subtitle">
            {{ isDeveloperRoute
              ? 'Painel exclusivo da equipe de desenvolvimento para visualização global de todos os chamados abertos por todos os usuários da instituição, triagem e atendimento.'
              : 'Cadastre solicitações, problemas ou melhorias para a equipe de desenvolvimento (Master) e acompanhe o atendimento.' }}
          </p>
        </div>
        <div class="header-right">
          <button class="btn btn-primary" (click)="openCreateModal()">
            <span class="btn-icon">＋</span>
            <span>Abrir Novo Chamado</span>
          </button>
        </div>
      </header>

      <!-- Banner de Escopo do Usuário -->
      <div class="user-scope-banner" [class.master-scope]="isMasterUser">
        <span class="scope-icon">{{ isMasterUser ? '👑' : '👤' }}</span>
        <div class="scope-text">
          <ng-container *ngIf="isMasterUser">
            <strong>Visão Global do Desenvolvedor Master:</strong> Você tem permissão total para visualizar e gerenciar todos os chamados abertos por todos os usuários da instituição.
          </ng-container>
          <ng-container *ngIf="!isMasterUser">
            <strong>Meus Chamados:</strong> Você está visualizando apenas os chamados abertos pelo seu usuário ({{ currentUser?.username }}).
          </ng-container>
        </div>
      </div>

      <!-- Cards de Resumo / Botões de Filtro Rápido -->
      <section class="summary-cards" *ngIf="allTickets" role="toolbar" aria-label="Filtrar chamados por status">
        <button
          type="button"
          class="summary-card-btn status-total"
          (click)="toggleStatusFilter('')"
          [class.active]="filterStatus === ''"
          title="Clique para visualizar todos os chamados"
        >
          <div class="card-header-row">
            <span class="summary-title">TOTAL DE CHAMADOS</span>
            <span class="card-status-badge" *ngIf="filterStatus === ''">ATIVO</span>
          </div>
          <div class="summary-value">{{ countTotal }}</div>
          <div class="card-hint">
            <span class="hint-bullet">●</span>
            <span>{{ filterStatus === '' ? 'Exibindo todos' : 'Ver todos' }}</span>
          </div>
        </button>

        <button
          type="button"
          class="summary-card-btn status-aberto"
          (click)="toggleStatusFilter('ABERTO')"
          [class.active]="filterStatus === 'ABERTO'"
          title="Clique para visualizar apenas chamados Abertos"
        >
          <div class="card-header-row">
            <span class="summary-title">ABERTOS</span>
            <span class="card-status-badge" *ngIf="filterStatus === 'ABERTO'">ATIVO</span>
          </div>
          <div class="summary-value">{{ countAbertos }}</div>
          <div class="card-hint">
            <span class="hint-bullet">●</span>
            <span>{{ filterStatus === 'ABERTO' ? 'Filtrado' : 'Clique para ver' }}</span>
          </div>
        </button>

        <button
          type="button"
          class="summary-card-btn status-andamento"
          (click)="toggleStatusFilter('EM_ANDAMENTO')"
          [class.active]="filterStatus === 'EM_ANDAMENTO'"
          title="Clique para visualizar apenas chamados Em Atendimento"
        >
          <div class="card-header-row">
            <span class="summary-title">EM ATENDIMENTO</span>
            <span class="card-status-badge" *ngIf="filterStatus === 'EM_ANDAMENTO'">ATIVO</span>
          </div>
          <div class="summary-value">{{ countEmAndamento }}</div>
          <div class="card-hint">
            <span class="hint-bullet">●</span>
            <span>{{ filterStatus === 'EM_ANDAMENTO' ? 'Filtrado' : 'Clique para ver' }}</span>
          </div>
        </button>

        <button
          type="button"
          class="summary-card-btn status-concluido"
          (click)="toggleStatusFilter('CONCLUIDO')"
          [class.active]="filterStatus === 'CONCLUIDO'"
          title="Clique para visualizar apenas chamados Concluídos"
        >
          <div class="card-header-row">
            <span class="summary-title">CONCLUÍDOS</span>
            <span class="card-status-badge" *ngIf="filterStatus === 'CONCLUIDO'">ATIVO</span>
          </div>
          <div class="summary-value">{{ countConcluidos }}</div>
          <div class="card-hint">
            <span class="hint-bullet">●</span>
            <span>{{ filterStatus === 'CONCLUIDO' ? 'Filtrado' : 'Clique para ver' }}</span>
          </div>
        </button>

        <button
          type="button"
          class="summary-card-btn status-finalizado"
          (click)="toggleStatusFilter('FINALIZADO')"
          [class.active]="filterStatus === 'FINALIZADO'"
          title="Clique para visualizar apenas chamados Finalizados"
        >
          <div class="card-header-row">
            <span class="summary-title">FINALIZADOS</span>
            <span class="card-status-badge" *ngIf="filterStatus === 'FINALIZADO'">ATIVO</span>
          </div>
          <div class="summary-value">{{ countFinalizados }}</div>
          <div class="card-hint">
            <span class="hint-bullet">●</span>
            <span>{{ filterStatus === 'FINALIZADO' ? 'Filtrado' : 'Clique para ver' }}</span>
          </div>
        </button>
      </section>

      <!-- Banner de Filtro Ativo -->
      <div class="filter-status-banner" *ngIf="filterStatus">
        <div class="banner-left">
          <span class="banner-icon">🎯</span>
          <span>
            Exibindo apenas: <strong>{{ getStatusLabel(filterStatus) }}</strong>
            <span class="banner-count">({{ filteredTickets.length }} de {{ allTickets.length }} chamado(s))</span>
          </span>
        </div>
        <button type="button" class="btn-clear-status" (click)="toggleStatusFilter('')">
          ✕ Limpar filtro de status (Mostrar Todos)
        </button>
      </div>

      <!-- Barra de Filtros: Filtro de número de chamado e busca para todos os usuários -->
      <section class="filters-bar">
        <!-- Filtrozinho de número de chamado -->
        <div class="code-filter-box" title="Filtrar por número do chamado (ex: 10 ou #10)">
          <span class="code-filter-prefix">#</span>
          <input
            type="text"
            placeholder="Nº Chamado"
            [(ngModel)]="filterCode"
            (input)="onCodeChange()"
            class="code-filter-input"
          />
          <button *ngIf="filterCode" class="clear-search-btn" (click)="clearCodeFilter()">✕</button>
        </div>

        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            placeholder="{{ isMasterUser ? 'Buscar por assunto, descrição ou solicitante...' : 'Buscar por assunto ou descrição...' }}"
            [(ngModel)]="searchTerm"
            (input)="onSearchChange()"
          />
          <button *ngIf="searchTerm" class="clear-search-btn" (click)="clearSearch()">✕</button>
        </div>

        <div class="filter-controls" *ngIf="isMasterUser">
          <select [(ngModel)]="filterSector" (change)="onSectorDropdownChange()" class="filter-select">
            <option value="">Todos os Setores</option>
            <option *ngFor="let s of sectorOptions" [value]="s.value">{{ s.label }}</option>
          </select>

          <select [(ngModel)]="filterPriority" (change)="onPriorityDropdownChange()" class="filter-select">
            <option value="">Todas as Prioridades</option>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="URGENTE">Urgente</option>
          </select>
        </div>

        <button class="btn btn-outline" (click)="resetFilters()" title="Limpar Filtros" *ngIf="filterCode || searchTerm || filterSector || filterPriority || filterStatus !== 'ABERTO'">
          🔄 Limpar
        </button>
      </section>

      <!-- Estado de Carregamento / Vazio -->
      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Carregando chamados...</p>
      </div>

      <div *ngIf="!isLoading && filteredTickets.length === 0" class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>Nenhum chamado encontrado</h3>
        <p>Nenhum chamado corresponde aos filtros selecionados ou ainda não há chamados cadastrados.</p>
        <button class="btn btn-primary" (click)="openCreateModal()">Abrir o Primeiro Chamado</button>
      </div>

      <!-- Tabela / Lista de Chamados -->
      <section class="tickets-table-container" *ngIf="!isLoading && filteredTickets.length > 0">
        <table class="tickets-table">
          <thead>
            <tr>
              <th style="width: 80px;">Código</th>
              <th>Assunto & Descrição</th>
              <th style="width: 140px;">Setor</th>
              <th style="width: 150px;">Solicitante</th>
              <th style="width: 130px;">Prioridade</th>
              <th style="width: 140px;">Status</th>
              <th style="width: 110px;">Abertura</th>
              <th style="width: 100px; text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let t of filteredTickets"
              class="ticket-row"
              (click)="openDetailModal(t.id)"
              [class.row-highlight]="selectedTicket?.id === t.id"
            >
              <td>
                <span class="code-badge">#{{ t.code }}</span>
              </td>
              <td>
                <div class="ticket-title-cell">
                  <div class="ticket-title-text">{{ t.title }}</div>
                  <div class="ticket-desc-snippet">{{ t.description }}</div>
                  <div class="ticket-meta-pills" *ngIf="(t.attachments && t.attachments.length > 0) || (t._count && t._count.messages > 0)">
                    <span class="meta-pill" *ngIf="t.attachments && t.attachments.length > 0" title="Possui anexos">
                      📎 {{ t.attachments.length }} anexo(s)
                    </span>
                    <span class="meta-pill" *ngIf="t._count && t._count.messages > 0" title="Mensagens/respostas">
                      💬 {{ t._count.messages }} interação(ões)
                    </span>
                  </div>
                </div>
              </td>
              <td>
                <span class="sector-pill">{{ t.sectorLabel }}</span>
              </td>
              <td>
                <div class="user-cell">
                  <span class="user-avatar">{{ t.user.username.slice(0, 2).toUpperCase() }}</span>
                  <div class="user-info">
                    <span class="username">{{ t.user.username }}</span>
                    <span class="user-role">{{ formatRole(t.user.role) }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="priority-badge" [ngClass]="getPriorityClass(t.priority)">
                  {{ getPriorityLabel(t.priority) }}
                </span>
              </td>
              <td>
                <span class="status-badge" [ngClass]="getStatusClass(t.status)">
                  <span class="status-dot"></span>
                  {{ getStatusLabel(t.status) }}
                </span>
              </td>
              <td>
                <span class="date-text" [title]="t.createdAt | date:'dd/MM/yyyy HH:mm'">
                  {{ formatDateRelative(t.createdAt) }}
                </span>
              </td>
              <td style="text-align: right;" (click)="$event.stopPropagation()">
                <button class="btn btn-sm btn-action" (click)="openDetailModal(t.id)">
                  Ver Detalhes
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ================= MODAL NOVO CHAMADO ================= -->
      <div class="modal-overlay" *ngIf="isCreateModalOpen" (click)="closeCreateModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div>
              <div class="modal-eyebrow">Novo Chamado</div>
              <h2 class="modal-title">Cadastrar Chamado para o Desenvolvedor</h2>
            </div>
            <button class="modal-close-btn" (click)="closeCreateModal()">✕</button>
          </header>

          <form (submit)="submitCreateTicket($event)" class="modal-body">
            <div *ngIf="createError" class="alert alert-danger">{{ createError }}</div>

            <!-- Título / Assunto -->
            <div class="form-group">
              <label for="ticket-title" class="form-label required">Assunto do Chamado</label>
              <input
                id="ticket-title"
                type="text"
                class="form-input"
                placeholder="Ex: Erro ao gerar certificado para turma 2026/1"
                [(ngModel)]="newTicket.title"
                name="title"
                required
              />
            </div>

            <div class="form-row">
              <!-- Para qual setor -->
              <div class="form-group flex-1">
                <label for="ticket-sector" class="form-label required">Para qual Setor</label>
                <select
                  id="ticket-sector"
                  class="form-select"
                  [(ngModel)]="newTicket.sector"
                  name="sector"
                  required
                >
                  <option value="" disabled selected>Selecione o setor...</option>
                  <option *ngFor="let s of sectorOptions" [value]="s.value">{{ s.label }}</option>
                </select>
                <small class="form-hint">Indique qual setor do sistema é afetado ou solicitante.</small>
              </div>

              <!-- Prioridade -->
              <div class="form-group flex-1">
                <label class="form-label">Prioridade</label>
                <div class="priority-selector">
                  <button
                    type="button"
                    *ngFor="let p of priorityOptions"
                    class="priority-btn"
                    [class.selected]="newTicket.priority === p.value"
                    [ngClass]="'p-' + p.value.toLowerCase()"
                    (click)="newTicket.priority = p.value"
                  >
                    {{ p.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Solicitante (Usuário) -->
            <div class="form-group" *ngIf="isMasterUser && availableUsers.length > 0">
              <label for="ticket-user" class="form-label">Solicitante (Usuário que abriu)</label>
              <select
                id="ticket-user"
                class="form-select"
                [(ngModel)]="newTicket.userId"
                name="userId"
              >
                <option [value]="currentUser?.id">Eu mesmo ({{ currentUser?.username }})</option>
                <option *ngFor="let u of availableUsers" [value]="u.id">
                  {{ u.username }} ({{ formatRole(u.role) }})
                </option>
              </select>
            </div>
            <div class="form-group" *ngIf="!isMasterUser">
              <label class="form-label">Solicitante</label>
              <div class="user-chip-readonly">
                <span class="chip-avatar">{{ currentUser?.username?.slice(0, 2)?.toUpperCase() }}</span>
                <span>{{ currentUser?.username }}</span>
                <span class="chip-role">{{ formatRole(currentUser?.role || '') }}</span>
              </div>
            </div>

            <!-- Descrição -->
            <div class="form-group">
              <label for="ticket-desc" class="form-label required">Descrição Detalhada do Chamado</label>
              <textarea
                id="ticket-desc"
                class="form-textarea"
                rows="5"
                placeholder="Descreva detalhadamente o problema, passos para reproduzir, comportamento esperado ou a solicitação de melhoria..."
                [(ngModel)]="newTicket.description"
                name="description"
                required
              ></textarea>
              <div class="char-count">{{ newTicket.description ? newTicket.description.length : 0 }} caracteres</div>
            </div>

            <!-- Upload de Anexos -->
            <div class="form-group">
              <label class="form-label">Anexos (Prints, PDFs, Logs, Documentos)</label>
              <div class="upload-dropzone" (click)="fileInput.click()">
                <input
                  #fileInput
                  type="file"
                  multiple
                  (change)="onFilesSelected($event)"
                  style="display: none;"
                />
                <span class="upload-icon">📁</span>
                <span class="upload-title">Clique para selecionar arquivos ou arraste até aqui</span>
                <span class="upload-hint">Formatos suportados: PNG, JPG, PDF, TXT, DOCX, XLSX (até 25MB)</span>
              </div>

              <!-- Lista de arquivos selecionados -->
              <div class="selected-files-list" *ngIf="selectedFiles.length > 0">
                <div class="file-item" *ngFor="let f of selectedFiles; let i = index">
                  <span class="file-icon">📄</span>
                  <div class="file-info">
                    <span class="file-name">{{ f.name }}</span>
                    <span class="file-size">{{ f.sizeFormatted }}</span>
                  </div>
                  <button type="button" class="btn-remove-file" (click)="removeSelectedFile(i)" title="Remover">✕</button>
                </div>
              </div>
            </div>

            <footer class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="closeCreateModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="isSubmitting">
                <span *ngIf="isSubmitting" class="spinner-small"></span>
                <span>{{ isSubmitting ? 'Cadastrando...' : 'Cadastrar Chamado' }}</span>
              </button>
            </footer>
          </form>
        </div>
      </div>

      <!-- ================= MODAL DETALHES E INTERAÇÃO ================= -->
      <div class="modal-overlay" *ngIf="isDetailModalOpen" (click)="closeDetailModal()">
        <div class="modal-box modal-detail" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div class="detail-header-info">
              <div class="code-and-status">
                <span class="code-badge-large">#{{ selectedTicket?.code }}</span>
                <span class="status-badge" [ngClass]="getStatusClass(selectedTicket?.status || '')">
                  <span class="status-dot"></span>
                  {{ getStatusLabel(selectedTicket?.status || '') }}
                </span>
                <span class="priority-badge" [ngClass]="getPriorityClass(selectedTicket?.priority || '')">
                  {{ getPriorityLabel(selectedTicket?.priority || '') }}
                </span>
              </div>
              <h2 class="modal-title">{{ selectedTicket?.title }}</h2>
            </div>
            <button class="modal-close-btn" (click)="closeDetailModal()">✕</button>
          </header>

          <div class="modal-body detail-body" *ngIf="selectedTicket">
            <!-- Barra de Informações do Chamado -->
            <div class="detail-meta-grid">
              <div class="meta-item">
                <span class="meta-label">Setor</span>
                <span class="meta-value">{{ selectedTicket.sectorLabel }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Solicitante</span>
                <span class="meta-value font-medium">{{ selectedTicket.user.username }}</span>
                <span class="meta-sub">({{ formatRole(selectedTicket.user.role) }})</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Desenvolvedor Responsável</span>
                <span class="meta-value font-medium" *ngIf="selectedTicket.status !== 'ABERTO' && selectedTicket.assignedTo">
                  ⭐ {{ selectedTicket.assignedTo.username }}
                </span>
                <span class="meta-value text-muted" *ngIf="selectedTicket.status === 'ABERTO' || !selectedTicket.assignedTo">
                  Aguardando início do atendimento
                </span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Aberto em</span>
                <span class="meta-value">{{ selectedTicket.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>

            <!-- Avisos de Status, Atendimento e Inatividade -->
            <div class="ticket-status-info-box awaiting-box" *ngIf="selectedTicket.status === 'ABERTO'">
              <span class="info-icon">⏳</span>
              <div class="info-content">
                <strong>Aguardando início do atendimento:</strong>
                <span>Este chamado está na fila de triagem. O desenvolvedor responsável será exibido assim que um desenvolvedor master iniciar o atendimento.</span>
              </div>
            </div>
            <div class="ticket-status-info-box" *ngIf="selectedTicket.status === 'EM_ANDAMENTO'">
              <span class="info-icon">⏱️</span>
              <div class="info-content">
                <strong>Atendimento em andamento:</strong>
                <span>Chamado em atendimento pelo desenvolvedor. Chamados aguardando interação do usuário final por 5 dias serão fechados automaticamente.</span>
              </div>
            </div>

            <!-- Descrição Original -->
            <div class="detail-section">
              <h3 class="section-title">Descrição do Problema / Solicitação</h3>
              <div class="detail-description-box">
                {{ selectedTicket.description }}
              </div>
            </div>

            <!-- Anexos da Abertura -->
            <div class="detail-section" *ngIf="selectedTicket.attachments && selectedTicket.attachments.length > 0">
              <h3 class="section-title">Anexos do Chamado ({{ selectedTicket.attachments.length }})</h3>
              <div class="attachments-grid">
                <div class="attachment-card" *ngFor="let att of selectedTicket.attachments">
                  <span class="att-icon">📎</span>
                  <div class="att-info">
                    <span class="att-name" [title]="att.fileName">{{ att.fileName }}</span>
                    <span class="att-size">{{ formatBytes(att.fileSize) }}</span>
                  </div>
                  <button
                    class="btn btn-sm btn-outline"
                    (click)="downloadAttachment(att.id, att.fileName)"
                    title="Baixar anexo"
                  >
                    Baixar
                  </button>
                </div>
              </div>
            </div>

            <!-- Observações de Resolução (se houver) -->
            <div class="detail-section resolution-section" *ngIf="selectedTicket.resolutionNotes">
              <h3 class="section-title">Notas de Resolução / Fechamento</h3>
              <div class="resolution-box">
                {{ selectedTicket.resolutionNotes }}
              </div>
            </div>

            <!-- Gestão de Status: Desenvolvedor (Master) -->
            <div class="detail-section status-flow-section" *ngIf="isMasterUser">
              <h3 class="section-title master-title">
                <span>⚡ Gestão de Status (Desenvolvedor Master)</span>
                <span class="master-badge">Controle Total</span>
              </h3>
              <p class="master-desc">
                Status atual: <strong>{{ getStatusLabel(selectedTicket.status) }}</strong>. Alterne o fluxo do chamado conforme o andamento:
              </p>
              <div class="status-action-grid">
                <button
                  type="button"
                  class="btn-status-pill status-pill-aberto"
                  [class.is-current]="selectedTicket.status === 'ABERTO'"
                  [disabled]="isUpdatingStatus || (isTicketClosed(selectedTicket) && !canReopenTicket(selectedTicket))"
                  (click)="updateStatus('ABERTO')"
                  [title]="isTicketClosed(selectedTicket) && !canReopenTicket(selectedTicket) ? 'Prazo de reabertura expirado (limite de 5 dias após encerramento)' : 'Definir como Pendente / Aberto'"
                >
                  <span class="status-btn-icon">⏳</span>
                  <div class="status-btn-text">
                    <span class="status-btn-name">Pendente / Aberto</span>
                    <span class="status-btn-sub">
                      {{ isTicketClosed(selectedTicket) && !canReopenTicket(selectedTicket) ? 'Reabertura expirada (>5d)' : 'Em fila de triagem' }}
                    </span>
                  </div>
                  <span class="current-check" *ngIf="selectedTicket.status === 'ABERTO'">✓ Atual</span>
                </button>

                <button
                  type="button"
                  class="btn-status-pill status-pill-andamento"
                  [class.is-current]="selectedTicket.status === 'EM_ANDAMENTO'"
                  [disabled]="isUpdatingStatus"
                  (click)="updateStatus('EM_ANDAMENTO')"
                  title="Definir como Em Atendimento"
                >
                  <span class="status-btn-icon">⚙️</span>
                  <div class="status-btn-text">
                    <span class="status-btn-name">Em Atendimento</span>
                    <span class="status-btn-sub">Sendo desenvolvido</span>
                  </div>
                  <span class="current-check" *ngIf="selectedTicket.status === 'EM_ANDAMENTO'">✓ Atual</span>
                </button>

                <button
                  type="button"
                  class="btn-status-pill status-pill-concluido"
                  [class.is-current]="selectedTicket.status === 'CONCLUIDO'"
                  [disabled]="isUpdatingStatus"
                  (click)="promptConcludeTicket('CONCLUIDO')"
                  title="Definir como Concluído"
                >
                  <span class="status-btn-icon">✅</span>
                  <div class="status-btn-text">
                    <span class="status-btn-name">Concluído</span>
                    <span class="status-btn-sub">Pronto para validação</span>
                  </div>
                  <span class="current-check" *ngIf="selectedTicket.status === 'CONCLUIDO'">✓ Atual</span>
                </button>

                <button
                  type="button"
                  class="btn-status-pill status-pill-finalizado"
                  [class.is-current]="selectedTicket.status === 'FINALIZADO'"
                  [disabled]="isUpdatingStatus"
                  (click)="promptConcludeTicket('FINALIZADO')"
                  title="Finalizar Definitivamente"
                >
                  <span class="status-btn-icon">🏁</span>
                  <div class="status-btn-text">
                    <span class="status-btn-name">Finalizado</span>
                    <span class="status-btn-sub">Encerrado</span>
                  </div>
                  <span class="current-check" *ngIf="selectedTicket.status === 'FINALIZADO'">✓ Atual</span>
                </button>

                <button
                  type="button"
                  class="btn-status-pill status-pill-cancelado"
                  [class.is-current]="selectedTicket.status === 'CANCELADO'"
                  [disabled]="isUpdatingStatus"
                  (click)="updateStatus('CANCELADO')"
                  title="Cancelar Chamado"
                >
                  <span class="status-btn-icon">❌</span>
                  <div class="status-btn-text">
                    <span class="status-btn-name">Cancelado</span>
                    <span class="status-btn-sub">Interrompido</span>
                  </div>
                  <span class="current-check" *ngIf="selectedTicket.status === 'CANCELADO'">✓ Atual</span>
                </button>
              </div>
            </div>

            <!-- Gestão de Status: Solicitante (Usuário que abriu o chamado) -->
            <div class="detail-section owner-actions-section" *ngIf="!isMasterUser && isTicketOwner">
              <h3 class="section-title">
                <span>⚙️ Ações do Solicitante</span>
              </h3>
              <p class="master-desc">
                Status atual: <strong>{{ getStatusLabel(selectedTicket.status) }}</strong>. Como autor deste chamado, você pode:
              </p>
              <div class="owner-btn-group">
                <button
                  type="button"
                  class="btn btn-sm btn-indigo"
                  *ngIf="selectedTicket.status === 'CONCLUIDO'"
                  [disabled]="isUpdatingStatus"
                  (click)="promptConcludeTicket('FINALIZADO')"
                >
                  🏁 Confirmar Resolução & Finalizar
                </button>
                <!-- Reabertura de chamado: permitida somente até 5 dias após encerramento -->
                <ng-container *ngIf="selectedTicket.status === 'CONCLUIDO' || selectedTicket.status === 'FINALIZADO' || selectedTicket.status === 'CANCELADO'">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline"
                    *ngIf="canReopenTicket(selectedTicket)"
                    [disabled]="isUpdatingStatus"
                    (click)="updateStatus('ABERTO')"
                    title="Reabrir este chamado"
                  >
                    🔄 Reabrir Chamado (Restam {{ getRemainingReopenDays(selectedTicket) }} dia(s))
                  </button>
                  <div class="reopen-expired-banner" *ngIf="!canReopenTicket(selectedTicket)">
                    ⚠️ <strong>Prazo de reabertura expirado:</strong> Este chamado foi encerrado há mais de 5 dias e não pode mais ser reaberto. Caso necessite de novo suporte, por favor abra um novo chamado.
                  </div>
                </ng-container>

                <button
                  type="button"
                  class="btn btn-sm btn-success"
                  *ngIf="selectedTicket.status === 'ABERTO' || selectedTicket.status === 'EM_ANDAMENTO'"
                  [disabled]="isUpdatingStatus"
                  (click)="promptConcludeTicket('CONCLUIDO')"
                >
                  ✅ Marcar como Resolvido
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-danger"
                  *ngIf="selectedTicket.status !== 'CANCELADO' && selectedTicket.status !== 'FINALIZADO'"
                  [disabled]="isUpdatingStatus"
                  (click)="updateStatus('CANCELADO')"
                >
                  ❌ Cancelar Chamado
                </button>
              </div>
            </div>

            <!-- Histórico de Interações / Mensagens -->
            <div class="detail-section">
              <h3 class="section-title">
                Histórico de Interações & Mensagens ({{ selectedTicket.messages ? selectedTicket.messages.length : 0 }})
              </h3>

              <div class="messages-timeline">
                <div *ngIf="!selectedTicket.messages || selectedTicket.messages.length === 0" class="no-messages">
                  Ainda não há interações neste chamado. Envie uma mensagem abaixo para iniciar a conversa com o desenvolvedor.
                </div>

                <div
                  *ngFor="let msg of selectedTicket.messages"
                  class="message-bubble-wrapper"
                  [class.msg-from-master]="msg.user && msg.user.role === 'master'"
                  [class.msg-from-me]="msg.userId === currentUser?.id"
                >
                  <div class="msg-header">
                    <span class="msg-author">{{ msg.user ? msg.user.username : 'Usuário' }}</span>
                    <span class="msg-badge-master" *ngIf="msg.user && msg.user.role === 'master'">⚡ Desenvolvedor Master</span>
                    <span class="msg-badge-role" *ngIf="msg.user && msg.user.role !== 'master'">{{ formatRole(msg.user.role) }}</span>
                    <span class="msg-time">{{ msg.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>

                  <div class="msg-content">
                    {{ msg.message }}
                  </div>

                  <!-- Anexo da Mensagem -->
                  <div class="msg-attachment" *ngIf="msg.attachmentName">
                    <span class="msg-att-icon">📎</span>
                    <span class="msg-att-name">{{ msg.attachmentName }}</span>
                    <span class="msg-att-size" *ngIf="msg.attachmentSize">({{ formatBytes(msg.attachmentSize) }})</span>
                    <button class="msg-att-dl" (click)="downloadMessageAttachment(msg.id, msg.attachmentName)">
                      Baixar
                    </button>
                  </div>

                  <div class="msg-status-change" *ngIf="msg.statusChange">
                    Mudança de status para: <strong>{{ getStatusLabel(msg.statusChange) }}</strong>
                  </div>
                </div>
              </div>

              <!-- Caixa de Envio de Nova Mensagem -->
              <form (submit)="submitMessage($event)" class="message-input-form" *ngIf="selectedTicket.status !== 'CANCELADO'">
                <div class="msg-input-wrap">
                  <textarea
                    class="msg-textarea"
                    rows="3"
                    placeholder="Escreva sua mensagem ou réplica para o chamado..."
                    [(ngModel)]="newMessageText"
                    name="messageText"
                    required
                  ></textarea>

                  <div class="msg-form-bottom">
                    <div class="msg-attachment-btn-wrap">
                      <label class="btn-attach">
                        <span>📎 Anexar Arquivo</span>
                        <input
                          type="file"
                          (change)="onMessageFileSelected($event)"
                          style="display: none;"
                          #msgFileInput
                        />
                      </label>
                      <span class="selected-msg-file" *ngIf="selectedMessageFile">
                        {{ selectedMessageFile.name }} ({{ formatBytes(selectedMessageFile.size) }})
                        <button type="button" class="btn-remove-msg-file" (click)="selectedMessageFile = null">✕</button>
                      </span>
                    </div>

                    <div class="msg-bottom-right">
                      <div class="msg-status-change-opt" *ngIf="isMasterUser || isTicketOwner">
                        <label for="msg-st-opt" class="st-opt-label">Mudar status ao responder:</label>
                        <select id="msg-st-opt" [(ngModel)]="messageStatusChange" name="messageStatusChange" class="st-opt-select">
                          <option value="">Manter atual ({{ getStatusLabel(selectedTicket.status) }})</option>
                          <option value="ABERTO" *ngIf="!isTicketClosed(selectedTicket) || canReopenTicket(selectedTicket)">Pendente / Aberto</option>
                          <option value="EM_ANDAMENTO">Em Atendimento</option>
                          <option value="CONCLUIDO">Concluído</option>
                          <option value="FINALIZADO">Finalizado</option>
                          <option value="CANCELADO">Cancelado</option>
                        </select>
                      </div>

                      <button type="submit" class="btn btn-primary" [disabled]="isSendingMessage || !newMessageText.trim()">
                        <span *ngIf="isSendingMessage" class="spinner-small"></span>
                        <span>{{ isSendingMessage ? 'Enviando...' : 'Enviar Resposta' }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <footer class="modal-footer">
            <button class="btn btn-outline" (click)="closeDetailModal()">Fechar</button>
          </footer>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tickets-container {
      padding: 1.5rem 2rem 3rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Cabeçalho */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .header-badge {
      display: inline-block;
      padding: 0.2rem 0.65rem;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.35);
      color: #93C5FD;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .page-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-primary, #F5F7F4);
      margin: 0 0 0.4rem 0;
    }
    .page-subtitle {
      color: var(--color-text-secondary, #A1A1AA);
      font-size: 0.95rem;
      max-width: 700px;
      margin: 0;
      line-height: 1.45;
    }

    /* Escopo do Usuário Banner */
    .user-scope-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.15rem;
      border-radius: 10px;
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #27272A);
      color: #A1A1AA;
    }
    .user-scope-banner.master-scope {
      background: rgba(234, 179, 8, 0.08);
      border-color: rgba(234, 179, 8, 0.25);
      color: #FEF08A;
    }
    .scope-icon { font-size: 1.2rem; }
    .scope-text { line-height: 1.4; }
    .scope-text strong { color: #fff; }
    .user-scope-banner.master-scope .scope-text strong { color: #FACC15; }

    /* Cards de Resumo / Botões de Filtro Rápido */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .summary-card-btn {
      background: var(--color-surface, #18181B);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 12px;
      padding: 1.1rem 1.25rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      text-align: left;
      width: 100%;
      position: relative;
      outline: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit;
    }
    .summary-card-btn:hover {
      border-color: #3F3F46;
      background: rgba(255, 255, 255, 0.04);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    }
    .summary-card-btn:active {
      transform: translateY(0);
    }
    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 0.4rem;
    }
    .summary-title {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--color-text-secondary, #A1A1AA);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .card-status-badge {
      font-size: 0.6rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
    .summary-value {
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.1;
      margin-bottom: 0.4rem;
    }
    .card-hint {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: #71717A;
    }
    .hint-bullet {
      font-size: 0.6rem;
      opacity: 0.7;
    }

    /* Cores e Realces Ativos de Cada Card */
    .status-total.active {
      border-color: #3B82F6;
      background: rgba(59, 130, 246, 0.12);
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.25);
    }
    .status-total.active .card-status-badge {
      background: #3B82F6;
      color: #fff;
    }

    .status-aberto .summary-value { color: #60A5FA; }
    .status-aberto .hint-bullet { color: #60A5FA; }
    .status-aberto:hover { border-color: rgba(96, 165, 250, 0.5); }
    .status-aberto.active {
      border-color: #3B82F6;
      background: rgba(59, 130, 246, 0.12);
      box-shadow: 0 0 18px rgba(59, 130, 246, 0.25);
    }
    .status-aberto.active .card-status-badge {
      background: #3B82F6;
      color: #fff;
    }

    .status-andamento .summary-value { color: #FBBF24; }
    .status-andamento .hint-bullet { color: #FBBF24; }
    .status-andamento:hover { border-color: rgba(251, 191, 36, 0.5); }
    .status-andamento.active {
      border-color: #F59E0B;
      background: rgba(245, 158, 11, 0.12);
      box-shadow: 0 0 18px rgba(245, 158, 11, 0.25);
    }
    .status-andamento.active .card-status-badge {
      background: #F59E0B;
      color: #000;
    }

    .status-concluido .summary-value { color: #34D399; }
    .status-concluido .hint-bullet { color: #34D399; }
    .status-concluido:hover { border-color: rgba(52, 211, 153, 0.5); }
    .status-concluido.active {
      border-color: #10B981;
      background: rgba(16, 185, 129, 0.12);
      box-shadow: 0 0 18px rgba(16, 185, 129, 0.25);
    }
    .status-concluido.active .card-status-badge {
      background: #10B981;
      color: #fff;
    }

    .status-finalizado .summary-value { color: #C084FC; }
    .status-finalizado .hint-bullet { color: #C084FC; }
    .status-finalizado:hover { border-color: rgba(192, 132, 252, 0.5); }
    .status-finalizado.active {
      border-color: #A855F7;
      background: rgba(168, 85, 247, 0.12);
      box-shadow: 0 0 18px rgba(168, 85, 247, 0.25);
    }
    .status-finalizado.active .card-status-badge {
      background: #A855F7;
      color: #fff;
    }

    /* Banner de filtro ativo */
    .filter-status-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 8px;
      padding: 0.65rem 1rem;
      margin-bottom: 1.25rem;
      color: #E2E8F0;
      font-size: 0.85rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .banner-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .banner-icon { font-size: 1rem; }
    .banner-count {
      color: #94A3B8;
      margin-left: 0.25rem;
    }
    .btn-clear-status {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #F8FAFC;
      border-radius: 6px;
      padding: 0.3rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-clear-status:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.4);
      color: #FCA5A5;
    }

    /* Barra de Filtros */
    .filters-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      background: var(--color-surface, #18181B);
      padding: 0.85rem 1.25rem;
      border: 1px solid var(--border-color, #27272A);
      border-radius: 10px;
    }
    .code-filter-box {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 8px;
      padding: 0.45rem 0.75rem;
      width: 140px;
    }
    .code-filter-prefix {
      color: #93C5FD;
      font-weight: 700;
      font-size: 0.95rem;
    }
    .code-filter-input {
      background: transparent;
      border: none;
      color: #fff;
      outline: none;
      width: 100%;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .ticket-status-info-box {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.85rem 1.1rem;
      border-radius: 8px;
      background: rgba(234, 179, 8, 0.08);
      border: 1px solid rgba(234, 179, 8, 0.25);
      color: #FEF08A;
      font-size: 0.85rem;
      line-height: 1.45;
      margin-bottom: 1.25rem;
    }
    .ticket-status-info-box.awaiting-box {
      background: rgba(59, 130, 246, 0.08);
      border-color: rgba(59, 130, 246, 0.25);
      color: #BFDBFE;
    }
    .info-icon { font-size: 1.15rem; flex-shrink: 0; }
    .info-content { display: flex; flex-direction: column; gap: 0.15rem; }
    .info-content strong { color: #fff; }
    .reopen-expired-banner {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #FCA5A5;
      border-radius: 6px;
      padding: 0.6rem 0.85rem;
      font-size: 0.82rem;
      line-height: 1.4;
      margin-top: 0.5rem;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      flex: 1;
      min-width: 280px;
    }
    .search-icon { font-size: 0.95rem; opacity: 0.7; }
    .search-box input {
      background: transparent;
      border: none;
      color: #fff;
      outline: none;
      width: 100%;
      font-size: 0.9rem;
    }
    .clear-search-btn {
      background: none;
      border: none;
      color: #A1A1AA;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .filter-controls {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .filter-select {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color, #3F3F46);
      color: #E4E4E7;
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      font-size: 0.85rem;
      outline: none;
      cursor: pointer;
    }
    .filter-select option { background: #18181B; color: #fff; }

    /* Tabela */
    .tickets-table-container {
      background: var(--color-surface, #18181B);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 10px;
      overflow-x: auto;
    }
    .tickets-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
    }
    .tickets-table th {
      background: rgba(255, 255, 255, 0.03);
      color: var(--color-text-secondary, #A1A1AA);
      padding: 0.85rem 1rem;
      font-weight: 600;
      border-bottom: 1px solid var(--border-color, #27272A);
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    .ticket-row {
      border-bottom: 1px solid var(--border-color, #27272A);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .ticket-row:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .ticket-row td {
      padding: 1rem;
      vertical-align: middle;
    }
    .code-badge {
      display: inline-block;
      font-weight: 700;
      font-size: 0.85rem;
      color: #93C5FD;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
    }
    .ticket-title-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .ticket-title-text {
      font-weight: 600;
      color: #fff;
      font-size: 0.95rem;
    }
    .ticket-desc-snippet {
      color: #A1A1AA;
      font-size: 0.8rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 420px;
    }
    .ticket-meta-pills {
      display: flex;
      gap: 0.4rem;
      margin-top: 0.25rem;
    }
    .meta-pill {
      font-size: 0.75rem;
      padding: 0.1rem 0.45rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #D4D4D8;
    }
    .sector-pill {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.3);
      color: #D8B4FE;
      font-size: 0.8rem;
      border-radius: 6px;
      font-weight: 500;
    }
    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .user-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #27272A;
      color: #E4E4E7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .user-info {
      display: flex;
      flex-direction: column;
    }
    .username { font-weight: 500; color: #fff; font-size: 0.85rem; }
    .user-role { font-size: 0.75rem; color: #A1A1AA; }

    /* Badges */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .badge-aberto { background: rgba(59, 130, 246, 0.15); color: #93C5FD; border: 1px solid rgba(59, 130, 246, 0.4); }
    .badge-aberto .status-dot { background: #3B82F6; box-shadow: 0 0 6px #3B82F6; }

    .badge-andamento { background: rgba(245, 158, 11, 0.15); color: #FCD34D; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge-andamento .status-dot { background: #F59E0B; }

    .badge-concluido { background: rgba(16, 185, 129, 0.15); color: #6EE7B7; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-concluido .status-dot { background: #10B981; }

    .badge-finalizado { background: rgba(168, 85, 247, 0.15); color: #D8B4FE; border: 1px solid rgba(168, 85, 247, 0.4); }
    .badge-finalizado .status-dot { background: #A855F7; }

    .badge-cancelado { background: rgba(239, 68, 68, 0.15); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.4); }
    .badge-cancelado .status-dot { background: #EF4444; }

    .priority-badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .p-baixa { background: rgba(113, 113, 122, 0.2); color: #A1A1AA; border: 1px solid #3F3F46; }
    .p-media { background: rgba(56, 189, 248, 0.15); color: #7DD3FC; border: 1px solid rgba(56, 189, 248, 0.35); }
    .p-alta { background: rgba(249, 115, 22, 0.15); color: #FDBA74; border: 1px solid rgba(249, 115, 22, 0.4); }
    .p-urgente { background: rgba(239, 68, 68, 0.2); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.5); }

    .date-text { color: #A1A1AA; font-size: 0.8rem; }

    /* Botões */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1.15rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-primary { background: #3B82F6; color: #fff; }
    .btn-primary:hover { background: #2563EB; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--border-color, #3F3F46);
      color: #E4E4E7;
    }
    .btn-outline:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }

    .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
    .btn-action {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93C5FD;
    }
    .btn-action:hover {
      background: rgba(59, 130, 246, 0.25);
      color: #fff;
    }

    .btn-warning { background: #F59E0B; color: #18181B; font-weight: 700; }
    .btn-warning:hover { background: #D97706; }
    .btn-success { background: #10B981; color: #fff; }
    .btn-success:hover { background: #059669; }
    .btn-indigo { background: #8B5CF6; color: #fff; }
    .btn-indigo:hover { background: #7C3AED; }

    /* Modais */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .modal-box {
      background: #18181B;
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 12px;
      width: 100%;
      max-width: 680px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      animation: modalFadeIn 0.2s ease-out;
    }
    .modal-detail {
      max-width: 820px;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #27272A);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .modal-eyebrow {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #93C5FD;
      font-weight: 600;
      margin-bottom: 0.2rem;
    }
    .modal-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }
    .modal-close-btn {
      background: none;
      border: none;
      color: #A1A1AA;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.2rem;
    }
    .modal-close-btn:hover { color: #fff; }
    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color, #27272A);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    /* Formulários */
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .flex-1 { flex: 1; }
    .form-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #E4E4E7;
      margin-bottom: 0.4rem;
    }
    .form-label.required::after {
      content: ' *';
      color: #EF4444;
    }
    .form-hint {
      display: block;
      font-size: 0.75rem;
      color: #A1A1AA;
      margin-top: 0.25rem;
    }
    .form-input, .form-select, .form-textarea {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 8px;
      padding: 0.6rem 0.85rem;
      color: #fff;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.15s ease;
      box-sizing: border-box;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: #3B82F6;
    }
    .form-select option { background: #18181B; color: #fff; }
    .char-count {
      font-size: 0.75rem;
      color: #71717A;
      text-align: right;
      margin-top: 0.25rem;
    }

    /* Priority selector */
    .priority-selector {
      display: flex;
      gap: 0.4rem;
    }
    .priority-btn {
      flex: 1;
      padding: 0.5rem 0.25rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color, #3F3F46);
      color: #A1A1AA;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .priority-btn.selected.p-baixa { background: rgba(113, 113, 122, 0.3); border-color: #71717A; color: #fff; }
    .priority-btn.selected.p-media { background: rgba(56, 189, 248, 0.25); border-color: #38BDF8; color: #7DD3FC; }
    .priority-btn.selected.p-alta { background: rgba(249, 115, 22, 0.25); border-color: #F97316; color: #FDBA74; }
    .priority-btn.selected.p-urgente { background: rgba(239, 68, 68, 0.3); border-color: #EF4444; color: #FCA5A5; }

    /* Chip de usuário */
    .user-chip-readonly {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.85rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 8px;
      color: #fff;
      font-size: 0.85rem;
    }
    .chip-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #3B82F6;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 700;
    }
    .chip-role {
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.1);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      color: #D4D4D8;
    }

    /* Dropzone de Anexos */
    .upload-dropzone {
      border: 2px dashed var(--border-color, #3F3F46);
      border-radius: 8px;
      padding: 1.25rem;
      text-align: center;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.01);
    }
    .upload-dropzone:hover {
      border-color: #3B82F6;
      background: rgba(59, 130, 246, 0.04);
    }
    .upload-icon { font-size: 1.75rem; }
    .upload-title { font-size: 0.9rem; font-weight: 600; color: #E4E4E7; }
    .upload-hint { font-size: 0.75rem; color: #71717A; }

    /* Selected files list */
    .selected-files-list {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .file-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.4rem 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 6px;
    }
    .file-icon { font-size: 1.1rem; }
    .file-info { flex: 1; display: flex; gap: 0.5rem; align-items: baseline; }
    .file-name { font-size: 0.85rem; color: #fff; font-weight: 500; }
    .file-size { font-size: 0.75rem; color: #A1A1AA; }
    .btn-remove-file {
      background: none;
      border: none;
      color: #EF4444;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0.2rem;
    }

    /* Modal Detalhes Específico */
    .detail-header-info {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .code-and-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .code-badge-large {
      font-size: 1rem;
      font-weight: 800;
      color: #93C5FD;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.4);
      padding: 0.2rem 0.65rem;
      border-radius: 6px;
    }
    .detail-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.85rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color, #27272A);
      padding: 0.85rem 1.15rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }
    .meta-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .meta-label { font-size: 0.75rem; color: #A1A1AA; text-transform: uppercase; font-weight: 600; letter-spacing: 0.03em; }
    .meta-value { font-size: 0.9rem; color: #fff; }
    .meta-sub { font-size: 0.75rem; color: #71717A; }
    .font-medium { font-weight: 600; }
    .text-muted { color: #A1A1AA; font-style: italic; }

    .detail-section {
      margin-bottom: 1.5rem;
    }
    .section-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #E4E4E7;
      margin: 0 0 0.6rem 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .detail-description-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      color: #F4F4F5;
      font-size: 0.9rem;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    /* Anexos no Detalhe */
    .attachments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.75rem;
    }
    .attachment-card {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 0.85rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 6px;
    }
    .att-icon { font-size: 1.25rem; }
    .att-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    .att-name { font-size: 0.85rem; color: #fff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .att-size { font-size: 0.75rem; color: #A1A1AA; }

    /* Painel do Master */
    /* Gestão de Status: Master e Solicitante */
    .status-flow-section {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(168, 85, 247, 0.08));
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 12px;
      padding: 1.25rem 1.35rem;
    }
    .master-title { color: #93C5FD; display: flex; align-items: center; justify-content: space-between; }
    .master-badge {
      font-size: 0.7rem;
      background: #3B82F6;
      color: #fff;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .master-desc { font-size: 0.85rem; color: #A1A1AA; margin: 0 0 1rem 0; line-height: 1.4; }
    .master-desc strong { color: #fff; }

    .status-action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.65rem;
    }
    .btn-status-pill {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 10px;
      padding: 0.65rem 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
      cursor: pointer;
      position: relative;
      transition: all 0.15s ease;
      font-family: inherit;
      text-align: left;
    }
    .btn-status-pill:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .btn-status-pill:disabled { opacity: 0.6; cursor: not-allowed; }

    .status-btn-icon { font-size: 1.1rem; }
    .status-btn-text { display: flex; flex-direction: column; }
    .status-btn-name { font-size: 0.8rem; font-weight: 700; color: #fff; }
    .status-btn-sub { font-size: 0.68rem; color: #A1A1AA; }
    .current-check {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      margin-top: 0.25rem;
      align-self: flex-start;
    }

    .status-pill-aberto:hover { border-color: rgba(59, 130, 246, 0.5); background: rgba(59, 130, 246, 0.08); }
    .status-pill-aberto.is-current { border-color: #3B82F6; background: rgba(59, 130, 246, 0.15); box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); }
    .status-pill-aberto .current-check { background: #3B82F6; color: #fff; }

    .status-pill-andamento:hover { border-color: rgba(245, 158, 11, 0.5); background: rgba(245, 158, 11, 0.08); }
    .status-pill-andamento.is-current { border-color: #F59E0B; background: rgba(245, 158, 11, 0.15); box-shadow: 0 0 10px rgba(245, 158, 11, 0.2); }
    .status-pill-andamento .current-check { background: #F59E0B; color: #18181B; }

    .status-pill-concluido:hover { border-color: rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.08); }
    .status-pill-concluido.is-current { border-color: #10B981; background: rgba(16, 185, 129, 0.15); box-shadow: 0 0 10px rgba(16, 185, 129, 0.2); }
    .status-pill-concluido .current-check { background: #10B981; color: #fff; }

    .status-pill-finalizado:hover { border-color: rgba(168, 85, 247, 0.5); background: rgba(168, 85, 247, 0.08); }
    .status-pill-finalizado.is-current { border-color: #A855F7; background: rgba(168, 85, 247, 0.15); box-shadow: 0 0 10px rgba(168, 85, 247, 0.2); }
    .status-pill-finalizado .current-check { background: #A855F7; color: #fff; }

    .status-pill-cancelado:hover { border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.08); }
    .status-pill-cancelado.is-current { border-color: #EF4444; background: rgba(239, 68, 68, 0.15); box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); }
    .status-pill-cancelado .current-check { background: #EF4444; color: #fff; }

    /* Painel do Solicitante */
    .owner-actions-section {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 12px;
      padding: 1.15rem 1.35rem;
    }
    .owner-btn-group { display: flex; gap: 0.65rem; flex-wrap: wrap; }

    /* Timeline de Mensagens */
    .messages-timeline {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.25rem;
      max-height: 400px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }
    .no-messages {
      padding: 1.5rem;
      text-align: center;
      color: #71717A;
      font-size: 0.85rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
    }
    .message-bubble-wrapper {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 8px;
      padding: 0.85rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .msg-from-master {
      border-color: rgba(59, 130, 246, 0.35);
      background: rgba(59, 130, 246, 0.04);
    }
    .msg-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
    }
    .msg-author { font-weight: 700; color: #fff; }
    .msg-badge-master {
      font-size: 0.7rem;
      background: rgba(59, 130, 246, 0.2);
      color: #93C5FD;
      border: 1px solid rgba(59, 130, 246, 0.4);
      padding: 0.05rem 0.4rem;
      border-radius: 4px;
      font-weight: 600;
    }
    .msg-badge-role {
      font-size: 0.7rem;
      color: #A1A1AA;
      background: rgba(255, 255, 255, 0.06);
      padding: 0.05rem 0.35rem;
      border-radius: 4px;
    }
    .msg-time { margin-left: auto; color: #71717A; font-size: 0.75rem; }
    .msg-content {
      color: #F4F4F5;
      font-size: 0.88rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .msg-attachment {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(255, 255, 255, 0.05);
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      font-size: 0.8rem;
      color: #93C5FD;
      margin-top: 0.25rem;
    }
    .msg-att-dl {
      background: none;
      border: none;
      color: #60A5FA;
      text-decoration: underline;
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0 0.2rem;
    }
    .msg-status-change {
      font-size: 0.75rem;
      color: #FBBF24;
      background: rgba(245, 158, 11, 0.1);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      width: fit-content;
      margin-top: 0.2rem;
    }

    /* Caixa de envio */
    .message-input-form { margin-top: 0.5rem; }
    .msg-input-wrap {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 8px;
      overflow: hidden;
    }
    .msg-textarea {
      width: 100%;
      background: transparent;
      border: none;
      color: #fff;
      padding: 0.85rem 1rem;
      font-size: 0.9rem;
      outline: none;
      box-sizing: border-box;
      resize: vertical;
    }
    .msg-form-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.02);
      border-top: 1px solid var(--border-color, #27272A);
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .btn-attach {
      font-size: 0.8rem;
      color: #93C5FD;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .btn-attach:hover { text-decoration: underline; }
    .selected-msg-file {
      font-size: 0.75rem;
      color: #A1A1AA;
      margin-left: 0.5rem;
    }
    .btn-remove-msg-file {
      background: none;
      border: none;
      color: #EF4444;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .msg-bottom-right {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }
    .msg-status-change-opt {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .st-opt-label {
      font-size: 0.75rem;
      color: #A1A1AA;
    }
    .st-opt-select {
      background: #18181B;
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 6px;
      color: #fff;
      padding: 0.3rem 0.6rem;
      font-size: 0.78rem;
      outline: none;
    }
    .btn-danger { background: #EF4444; color: #fff; }
    .btn-danger:hover { background: #DC2626; }

    /* Estados de tela */
    .loading-state, .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      background: var(--color-surface, #18181B);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 10px;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.7; }
    .empty-state h3 { font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0 0 0.5rem; }
    .empty-state p { color: #A1A1AA; margin: 0 0 1.5rem; font-size: 0.95rem; }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #3B82F6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    .spinner-small {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .alert-danger {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #FCA5A5;
    }

    @media (max-width: 768px) {
      .tickets-container {
        padding: 1rem 0.75rem 2rem;
      }
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .page-title {
        font-size: 1.5rem;
      }
      .summary-cards {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }
      .summary-value {
        font-size: 1.5rem;
      }
      .search-box {
        min-width: 100%;
        width: 100%;
        box-sizing: border-box;
      }
      .filter-controls {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }
      .filter-select {
        width: 100%;
        min-height: 42px;
      }
      .modal-overlay {
        padding: 0;
        align-items: flex-end;
      }
      .modal-box,
      .modal-detail {
        max-width: 100%;
        width: 100%;
        border-radius: 16px 16px 0 0;
        border-left: none;
        border-right: none;
        border-bottom: none;
        max-height: 90vh;
        max-height: 90dvh;
      }
      .modal-header {
        padding: 1rem 1.25rem 0.75rem;
      }
      .modal-body {
        padding: 1rem 1.25rem;
      }
      .form-row {
        flex-direction: column;
        gap: 0.75rem;
      }
      .priority-selector {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
      }
      .modal-footer {
        padding: 0.75rem 1.25rem max(0.85rem, env(safe-area-inset-bottom, 0.85rem));
        flex-direction: column-reverse;
        gap: 0.5rem;
      }
      .modal-footer .btn {
        width: 100%;
        min-height: 48px;
        justify-content: center;
      }
      .owner-btn-group {
        flex-direction: column;
      }
      .owner-btn-group .btn {
        width: 100%;
        min-height: 44px;
        justify-content: center;
      }
      .msg-form-bottom {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
      }
      .msg-bottom-right {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
      }
      .msg-bottom-right .btn {
        width: 100%;
        min-height: 44px;
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .summary-cards {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TicketsPageComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>
  @ViewChild('msgFileInput') msgFileInputRef!: ElementRef<HTMLInputElement>

  allTickets: TicketListItem[] = []
  tickets: TicketListItem[] = []
  filteredTickets: TicketListItem[] = []
  availableUsers: TicketUser[] = []

  isLoading = true
  isSubmitting = false
  isSendingMessage = false
  isUpdatingStatus = false

  // Filtros
  searchTerm = ''
  filterCode = ''
  filterSector = ''
  filterStatus = 'ABERTO'
  filterPriority = ''

  // Modal Novo Chamado
  isCreateModalOpen = false
  createError = ''
  newTicket = {
    title: '',
    sector: '',
    priority: 'MEDIA' as TicketPriority,
    description: '',
    userId: '',
  }
  selectedFiles: SelectedUploadFile[] = []

  // Modal Detalhes & Interação
  isDetailModalOpen = false
  selectedTicket: TicketDetail | null = null
  newMessageText = ''
  selectedMessageFile: File | null = null
  messageStatusChange: TicketStatus | '' = ''

  readonly sectorOptions = [
    { value: 'VESTIBULAR', label: 'Vestibular' },
    { value: 'TESOURARIA', label: 'Tesouraria' },
    { value: 'SECRETARIA', label: 'Secretaria' },
    { value: 'COORDENACAO', label: 'Coordenação' },
    { value: 'REGISTRO_ACADEMICO', label: 'Registro Acadêmico' },
    { value: 'PROFESSOR', label: 'Professor' },
    { value: 'ALUNO', label: 'Aluno' },
    { value: 'ADMIN', label: 'Administração' },
    { value: 'MASTER', label: 'Desenvolvedor' },
  ]

  readonly priorityOptions: { value: TicketPriority; label: string }[] = [
    { value: 'BAIXA', label: 'Baixa' },
    { value: 'MEDIA', label: 'Média' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'URGENTE', label: 'Urgente' },
  ]

  constructor(
    private readonly ticketsService: TicketsService,
    private readonly authService: AuthService,
    private readonly sectorContextService: SectorContextService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    // Reage automaticamente quando o contexto ativo de setor/usuário mudar
    effect(() => {
      const activeUser = this.sectorContextService.activeContextUser()
      untracked(() => {
        if (!this.isLoading) {
          this.loadTickets()
        }
      })
    })
  }

  ngOnInit(): void {
    // Set initial sector from effective user role or query params if any
    const userRole = this.effectiveUser?.role
    if (userRole && userRole !== 'admin' && userRole !== 'master') {
      const mapped = userRole.toUpperCase()
      this.newTicket.sector = mapped
    }

    this.route.queryParams.subscribe((params) => {
      if (params['novo'] === 'true') {
        this.openCreateModal()
      }
      if (params['id']) {
        this.openDetailModal(params['id'])
      }
      if (params['setor']) {
        this.filterSector = params['setor'].toUpperCase()
      }
      if (params['status'] !== undefined) {
        this.filterStatus = params['status'] ? params['status'].toUpperCase() : ''
      }
      if (params['codigo']) {
        this.filterCode = params['codigo']
      }
    })

    this.loadTickets()
    if (this.isMasterUser) {
      this.loadUsers()
    }
  }

  get isDeveloperRoute(): boolean {
    const url = this.router.url || ''
    return url.includes('/desenvolvedor')
  }

  get effectiveUser(): AuthUser | null {
    // Na rota do desenvolvedor (/desenvolvedor/chamados), se o usuário autenticado for master, sempre usa o perfil master
    if (this.isDeveloperRoute && this.authService.currentUser?.role === 'master') {
      return this.authService.currentUser
    }
    return this.sectorContextService.getEffectiveUser(this.router.url, this.authService.currentUser)
  }

  get currentUser(): AuthUser | null {
    return this.effectiveUser
  }

  get isMasterUser(): boolean {
    if (this.isDeveloperRoute && this.authService.currentUser?.role === 'master') {
      return true
    }
    return this.effectiveUser?.role === 'master'
  }

  get isTicketOwner(): boolean {
    return this.selectedTicket?.userId === this.effectiveUser?.id
  }

  get isMasterOrAdmin(): boolean {
    return this.effectiveUser?.role === 'master' || this.effectiveUser?.role === 'admin'
  }

  // Contadores fixos a partir do acervo completo de chamados visíveis
  get countTotal(): number {
    return this.allTickets.length
  }

  get countAbertos(): number {
    return this.allTickets.filter((t) => t.status === 'ABERTO').length
  }

  get countEmAndamento(): number {
    return this.allTickets.filter((t) => t.status === 'EM_ANDAMENTO').length
  }

  get countConcluidos(): number {
    return this.allTickets.filter((t) => t.status === 'CONCLUIDO').length
  }

  get countFinalizados(): number {
    return this.allTickets.filter((t) => t.status === 'FINALIZADO').length
  }

  loadTickets(): void {
    this.isLoading = true
    const targetUserId = !this.isMasterUser ? this.effectiveUser?.id : undefined
    this.ticketsService.getTickets({ userId: targetUserId }).subscribe({
      next: (data) => {
        // Reforço: se o contexto for de um usuário não-master, garante filtro estrito pelo seu ID
        if (!this.isMasterUser && this.effectiveUser?.id) {
          this.allTickets = data.filter((t) => t.userId === this.effectiveUser?.id)
        } else {
          this.allTickets = data
        }
        this.tickets = this.allTickets
        this.applyFilters()
        this.isLoading = false
      },
      error: (err) => {
        console.error('Erro ao carregar chamados:', err)
        this.isLoading = false
      },
    })
  }

  loadUsers(): void {
    this.ticketsService.getUsers().subscribe({
      next: (users) => {
        this.availableUsers = users
      },
      error: (err) => console.error('Erro ao listar usuários:', err),
    })
  }

  toggleStatusFilter(status: string): void {
    if (this.filterStatus === status) {
      this.filterStatus = ''
    } else {
      this.filterStatus = status
    }
    this.applyFilters()
  }

  onStatusDropdownChange(): void {
    this.applyFilters()
  }

  onSectorDropdownChange(): void {
    this.applyFilters()
  }

  onPriorityDropdownChange(): void {
    this.applyFilters()
  }

  onSearchChange(): void {
    this.applyFilters()
  }

  onCodeChange(): void {
    this.applyFilters()
  }

  clearCodeFilter(): void {
    this.filterCode = ''
    this.applyFilters()
  }

  clearSearch(): void {
    this.searchTerm = ''
    this.applyFilters()
  }

  resetFilters(): void {
    this.searchTerm = ''
    this.filterCode = ''
    this.filterSector = ''
    this.filterStatus = 'ABERTO'
    this.filterPriority = ''
    this.applyFilters()
  }

  applyFilters(): void {
    let list = [...this.allTickets]

    if (this.filterStatus) {
      list = list.filter((t) => t.status === this.filterStatus)
    }

    if (this.filterCode.trim()) {
      const clean = this.filterCode.replace('#', '').trim()
      list = list.filter((t) => String(t.code) === clean || String(t.code).startsWith(clean) || `#${t.code}` === this.filterCode.trim())
    }

    if (this.filterSector) {
      list = list.filter((t) => t.sector === this.filterSector)
    }

    if (this.filterPriority) {
      list = list.filter((t) => t.priority === this.filterPriority)
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim()
      list = list.filter((t) => {
        const matchCode = `#${t.code}`.includes(term) || String(t.code) === term
        const matchTitle = t.title.toLowerCase().includes(term)
        const matchDesc = t.description.toLowerCase().includes(term)
        const matchUser = t.user.username.toLowerCase().includes(term)
        const matchSector = t.sectorLabel.toLowerCase().includes(term)
        return matchCode || matchTitle || matchDesc || matchUser || matchSector
      })
    }

    this.filteredTickets = list
    this.tickets = list
  }

  isTicketClosed(ticket: TicketListItem | TicketDetail | null): boolean {
    if (!ticket) return false
    return ticket.status === 'CONCLUIDO' || ticket.status === 'FINALIZADO' || ticket.status === 'CANCELADO'
  }

  canReopenTicket(ticket: TicketListItem | TicketDetail | null): boolean {
    if (!ticket || !this.isTicketClosed(ticket)) return false
    const closedRef = ticket.closedAt || ticket.updatedAt
    if (!closedRef) return true
    const elapsed = Date.now() - new Date(closedRef).getTime()
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000
    return elapsed <= fiveDaysMs
  }

  getRemainingReopenDays(ticket: TicketListItem | TicketDetail | null): number {
    if (!ticket) return 0
    const closedRef = ticket.closedAt || ticket.updatedAt
    if (!closedRef) return 5
    const elapsed = Date.now() - new Date(closedRef).getTime()
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000
    const remainingMs = fiveDaysMs - elapsed
    if (remainingMs <= 0) return 0
    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
  }

  countByStatus(status: TicketStatus): number {
    return this.allTickets.filter((t) => t.status === status).length
  }

  // ================= CRIAÇÃO DE CHAMADO =================
  openCreateModal(): void {
    this.createError = ''
    this.selectedFiles = []
    const defaultSector = this.currentUser?.role && this.currentUser.role !== 'admin' && this.currentUser.role !== 'master'
      ? this.currentUser.role.toUpperCase()
      : 'ADMIN'

    this.newTicket = {
      title: '',
      sector: defaultSector,
      priority: 'MEDIA',
      description: '',
      userId: this.currentUser?.id || '',
    }
    this.isCreateModalOpen = true
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false
    this.selectedFiles = []
    this.createError = ''
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        const f = input.files[i]
        this.selectedFiles.push({
          file: f,
          name: f.name,
          sizeFormatted: this.formatBytes(f.size),
        })
      }
    }
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1)
  }

  submitCreateTicket(event: Event): void {
    event.preventDefault()
    if (!this.newTicket.title.trim()) {
      this.createError = 'Informe o assunto do chamado.'
      return
    }
    if (!this.newTicket.sector) {
      this.createError = 'Selecione para qual setor é o chamado.'
      return
    }
    if (!this.newTicket.description.trim()) {
      this.createError = 'Preencha a descrição detalhada.'
      return
    }

    this.isSubmitting = true
    this.createError = ''

    const formData = new FormData()
    formData.append('title', this.newTicket.title.trim())
    formData.append('sector', this.newTicket.sector)
    formData.append('priority', this.newTicket.priority)
    formData.append('description', this.newTicket.description.trim())

    const targetCreatorId = this.isMasterUser && this.newTicket.userId ? this.newTicket.userId : this.effectiveUser?.id
    if (targetCreatorId) {
      formData.append('userId', targetCreatorId)
    }

    for (const item of this.selectedFiles) {
      formData.append('attachments', item.file)
    }

    this.ticketsService.createTicket(formData).subscribe({
      next: (ticket) => {
        this.isSubmitting = false
        this.closeCreateModal()
        this.loadTickets()
        this.openDetailModal(ticket.id)
      },
      error: (err) => {
        console.error('Erro ao cadastrar chamado:', err)
        this.createError = err.error?.message || 'Falha ao cadastrar o chamado. Verifique os dados e tente novamente.'
        this.isSubmitting = false
      },
    })
  }

  // ================= DETALHES & INTERAÇÃO =================
  openDetailModal(ticketId: string): void {
    this.newMessageText = ''
    this.selectedMessageFile = null
    this.messageStatusChange = ''
    this.ticketsService.getTicket(ticketId).subscribe({
      next: (detail) => {
        this.selectedTicket = detail
        this.isDetailModalOpen = true
      },
      error: (err) => {
        console.error('Erro ao abrir chamado:', err)
        alert('Não foi possível carregar os detalhes do chamado.')
      },
    })
  }

  closeDetailModal(): void {
    this.isDetailModalOpen = false
    this.selectedTicket = null
    this.newMessageText = ''
    this.selectedMessageFile = null
    this.messageStatusChange = ''
  }

  onMessageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.selectedMessageFile = input.files[0]
    }
  }

  submitMessage(event: Event): void {
    event.preventDefault()
    if (!this.selectedTicket || !this.newMessageText.trim()) return

    this.isSendingMessage = true
    const formData = new FormData()
    formData.append('message', this.newMessageText.trim())
    if (this.selectedMessageFile) {
      formData.append('attachment', this.selectedMessageFile)
    }
    if (this.messageStatusChange) {
      formData.append('statusChange', this.messageStatusChange)
    }

    this.ticketsService.addMessage(this.selectedTicket.id, formData).subscribe({
      next: (res) => {
        this.isSendingMessage = false
        this.newMessageText = ''
        this.selectedMessageFile = null
        this.messageStatusChange = ''
        if (this.selectedTicket) {
          if (!this.selectedTicket.messages) this.selectedTicket.messages = []
          this.selectedTicket.messages.push(res.message)
          this.selectedTicket.status = res.ticket.status
        }
        this.loadTickets()
      },
      error: (err) => {
        console.error('Erro ao enviar mensagem:', err)
        alert('Erro ao enviar mensagem. Tente novamente.')
        this.isSendingMessage = false
      },
    })
  }

  updateStatus(newStatus: TicketStatus, notes?: string): void {
    if (!this.selectedTicket) return

    // Regra: Todo chamado só pode ser reaberto até 5 dias após encerramento
    if (newStatus === 'ABERTO' && this.isTicketClosed(this.selectedTicket)) {
      if (!this.canReopenTicket(this.selectedTicket)) {
        alert('Este chamado foi encerrado há mais de 5 dias e não pode mais ser reaberto. Caso necessite de novo suporte, por favor abra um novo chamado.')
        return
      }
    }

    this.isUpdatingStatus = true

    this.ticketsService
      .updateStatus(this.selectedTicket.id, {
        status: newStatus,
        resolutionNotes: notes,
      })
      .subscribe({
        next: (updated) => {
          this.isUpdatingStatus = false
          if (this.selectedTicket) {
            this.selectedTicket.status = updated.status
            this.selectedTicket.closedAt = updated.closedAt
            this.selectedTicket.resolutionNotes = updated.resolutionNotes
            this.selectedTicket.assignedTo = updated.assignedTo
          }
          this.loadTickets()
        },
        error: (err) => {
          console.error('Erro ao atualizar status:', err)
          alert(err.error?.message || 'Erro ao atualizar o status do chamado.')
          this.isUpdatingStatus = false
        },
      })
  }

  promptConcludeTicket(status: 'CONCLUIDO' | 'FINALIZADO'): void {
    const label = status === 'CONCLUIDO' ? 'Concluir Chamado' : 'Finalizar Chamado'
    const notes = prompt(`Insira notas de resolução para ${label.toLowerCase()} (opcional):`, '')
    if (notes !== null) {
      this.updateStatus(status, notes.trim() || undefined)
    }
  }

  downloadAttachment(attachmentId: string, fileName: string): void {
    if (!this.selectedTicket) return
    this.ticketsService.downloadAttachment(this.selectedTicket.id, attachmentId, fileName)
  }

  downloadMessageAttachment(messageId: string, fileName: string): void {
    this.ticketsService.downloadMessageAttachment(messageId, fileName)
  }

  // ================= HELPERS VISUAIS =================
  getStatusLabel(status: string): string {
    switch (status) {
      case 'ABERTO': return 'Aberto'
      case 'EM_ANDAMENTO': return 'Em Atendimento'
      case 'CONCLUIDO': return 'Concluído'
      case 'FINALIZADO': return 'Finalizado'
      case 'CANCELADO': return 'Cancelado'
      default: return status
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ABERTO': return 'badge-aberto'
      case 'EM_ANDAMENTO': return 'badge-andamento'
      case 'CONCLUIDO': return 'badge-concluido'
      case 'FINALIZADO': return 'badge-finalizado'
      case 'CANCELADO': return 'badge-cancelado'
      default: return 'badge-aberto'
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'BAIXA': return 'Baixa'
      case 'MEDIA': return 'Média'
      case 'ALTA': return 'Alta'
      case 'URGENTE': return 'Urgente'
      default: return priority
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'BAIXA': return 'p-baixa'
      case 'MEDIA': return 'p-media'
      case 'ALTA': return 'p-alta'
      case 'URGENTE': return 'p-urgente'
      default: return 'p-media'
    }
  }

  formatRole(role: string): string {
    if (!role) return ''
    const r = role.toLowerCase()
    switch (r) {
      case 'master': return 'Desenvolvedor Master'
      case 'admin': return 'Administrador'
      case 'vestibular': return 'Vestibular'
      case 'tesouraria': return 'Tesouraria'
      case 'secretaria': return 'Secretaria'
      case 'coordenacao': return 'Coordenação'
      case 'registro_academico': return 'Registro Acadêmico'
      case 'professor': return 'Professor'
      case 'aluno': return 'Aluno'
      default: return role
    }
  }

  formatBytes(bytes: number | null | undefined): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  formatDateRelative(dateStr: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMin < 2) return 'Agora mesmo'
    if (diffMin < 60) return `Há ${diffMin} min`
    if (diffHours < 24) return `Há ${diffHours} h`
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `Há ${diffDays} dias`
    return d.toLocaleDateString('pt-BR')
  }
}
