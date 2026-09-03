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
  errorMessage = '';
  successMessage = '';

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

  registerUser(): void {
    if (!this.newUser.username || !this.newUser.email || !this.newUser.password) {
      this.errorMessage = 'Preencha todos os campos obrigatórios.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.post<AuthUser>('/api/auth/users', this.newUser).subscribe({
      next: (user) => {
        this.users = [...this.users, user];
        this.successMessage = 'Usuário cadastrado com sucesso!';
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
