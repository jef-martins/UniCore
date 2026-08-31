import { DecimalPipe } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { VestibularService, type VestibularFileKind } from '../services/vestibular.service'

@Component({
  selector: 'app-vestibular-page',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './vestibular-page.component.html',
})
export class VestibularPageComponent implements OnInit {
  prova: File | null = null
  gabarito: File | null = null
  status: 'idle' | 'submitting' | 'success' | 'error' = 'idle'
  errorMessage = ''
  storageMessage = ''
  responseMessage = ''

  constructor(private readonly vestibularService: VestibularService) {}

  ngOnInit(): void {
    this.prova = this.vestibularService.loadFile('prova')
    this.gabarito = this.vestibularService.loadFile('gabarito')
  }

  onFileSelected(event: Event, kind: VestibularFileKind): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (!this.isPdf(file)) {
      this.errorMessage = 'Selecione um arquivo PDF válido.'
      input.value = ''
      return
    }

    if (kind === 'prova') this.prova = file
    else this.gabarito = file
    this.errorMessage = ''
    this.storageMessage = ''

    void this.vestibularService.saveFile(kind, file).catch((error: unknown) => {
      this.storageMessage = error instanceof Error ? error.message : 'Não foi possível persistir o arquivo selecionado.'
    })
  }

  removeFile(kind: VestibularFileKind): void {
    this.vestibularService.removeFile(kind)
    if (kind === 'prova') this.prova = null
    else this.gabarito = null
    this.storageMessage = ''
  }

  submit(): void {
    if (!this.prova || !this.gabarito) {
      this.status = 'error'
      this.errorMessage = 'Selecione a prova e o gabarito antes de corrigir.'
      return
    }

    this.status = 'submitting'
    this.errorMessage = ''
    this.responseMessage = ''
    this.vestibularService.submit(this.prova, this.gabarito).subscribe({
      next: (response) => {
        this.status = 'success'
        this.responseMessage = this.formatResponse(response)
      },
      error: (error: { status?: number; error?: unknown }) => {
        this.status = 'error'
        this.errorMessage = error.status === 0
          ? 'Não foi possível conectar ao serviço de correção em 127.0.0.1:8000.'
          : 'Não foi possível corrigir a avaliação. Confira os arquivos e tente novamente.'
      },
    })
  }

  private isPdf(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  }

  private formatResponse(response: unknown): string {
    if (typeof response === 'string') return response
    try {
      return JSON.stringify(response, null, 2) ?? 'Correção concluída.'
    } catch {
      return 'Correção concluída.'
    }
  }
}
