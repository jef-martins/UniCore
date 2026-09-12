import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, AuthUser, UserRole } from '../services/auth.service';

@Component({
  selector: 'app-user-registration-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-registration-page.component.html',
})
export class UserRegistrationPageComponent implements OnInit {
  users: AuthUser[] = [];
  isLoading = false;
  isSaving = false;
  resendingEmail = '';
  errorMessage = '';
  successMessage = '';
  createdValidationUrl = '';
  copiedUrl = false;

  newUser = {
    username: '',
    email: '',
    password: '',
    role: 'vestibular' as UserRole
  };

  readonly roles: UserRole[] = [
    'vestibular', 'tesouraria', 'secretaria', 'coordenacao',
    'registro_academico', 'aluno', 'professor', 'admin', 'master'
  ];

  constructor(
    private readonly http: HttpClient,
    public readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  isInstitutional(email: string): boolean {
    const clean = (email || '').trim().toLowerCase();
    if (!clean.includes('@')) return false;
    return clean.endsWith('@faip.edu.br') ||
      /@([a-zA-Z0-9-]+\.)?faip\.edu\.br$/.test(clean) ||
      clean.endsWith('@unicore.local');
  }

  loadUsers(): void {
    this.isLoading = true;
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Não foi possível carregar os usuários.';
        this.isLoading = false;
      }
    });
  }

  copyLink(url: string): void {
    if (!url) return;
    void navigator.clipboard.writeText(url);
    this.copiedUrl = true;
    setTimeout(() => { this.copiedUrl = false; }, 2500);
  }

  resend(email: string): void {
    if (!email || this.resendingEmail) return;
    this.resendingEmail = email;
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.resendVerification(email).subscribe({
      next: (res) => {
        this.resendingEmail = '';
        this.successMessage = res.message || `Novo link enviado com sucesso para ${email}!`;
        this.loadUsers();
      },
      error: (err) => {
        this.resendingEmail = '';
        this.errorMessage = err.error?.message || 'Erro ao reenviar link de validação.';
      }
    });
  }

  registerUser(): void {
    if (!this.newUser.username || !this.newUser.email || !this.newUser.password) {
      this.errorMessage = 'Preencha todos os campos obrigatórios.';
      return;
    }

    if (!this.isInstitutional(this.newUser.email)) {
      this.errorMessage = 'O e-mail deve ser obrigatoriamente institucional (ex: @faip.edu.br, @professor.faip.edu.br, @aluno.faip.edu.br).';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.createdValidationUrl = '';

    this.http.post<AuthUser>('/api/auth/users', this.newUser).subscribe({
      next: (user) => {
        this.users = [...this.users, user];
        this.createdValidationUrl = user.validationUrl || '';
        this.successMessage = `Usuário cadastrado com sucesso! Um link de validação foi gerado para ${user.email}.`;
        this.newUser = {
          username: '',
          email: '',
          password: '',
          role: 'vestibular'
        };
        this.isSaving = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao cadastrar usuário.';
        this.isSaving = false;
      }
    });
  }
}
