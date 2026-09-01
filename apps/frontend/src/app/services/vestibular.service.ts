import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import type { Observable } from 'rxjs'

export type VestibularFileKind = 'prova' | 'gabarito'

interface StoredFile {
  name: string
  type: string
  size: number
  lastModified: number
  dataUrl: string
}

@Injectable({ providedIn: 'root' })
export class VestibularService {
  private readonly endpoint = 'http://127.0.0.1:8000/corrigirAvaliacao'
  private readonly storagePrefix = 'unicore.vestibular.'

  constructor(private readonly http: HttpClient) {}

  submit(prova: File, gabarito: File): Observable<unknown> {
    const body = new FormData()
    body.append('questao', 'true')
    body.append('apenas_nota', 'true')
    body.append('gabarito', gabarito, gabarito.name)
    body.append('file', prova, prova.name)
    return this.http.post<unknown>(this.endpoint, body)
  }

  async saveFile(kind: VestibularFileKind, file: File): Promise<void> {
    const dataUrl = await this.readAsDataUrl(file)
    const value: StoredFile = {
      name: file.name,
      type: file.type || 'application/pdf',
      size: file.size,
      lastModified: file.lastModified,
      dataUrl,
    }
    try {
      localStorage.setItem(this.storageKey(kind), JSON.stringify(value))
    } catch {
      throw new Error('Não foi possível salvar este PDF no localStorage. O limite do navegador pode ter sido atingido.')
    }
  }

  loadFile(kind: VestibularFileKind): File | null {
    try {
      const raw = localStorage.getItem(this.storageKey(kind))
      if (!raw) return null
      const stored = JSON.parse(raw) as Partial<StoredFile>
      if (!stored.name || !stored.dataUrl) return null
      return this.fileFromDataUrl(stored.dataUrl, stored.name, stored.type, stored.lastModified)
    } catch {
      return null
    }
  }

  removeFile(kind: VestibularFileKind): void {
    localStorage.removeItem(this.storageKey(kind))
  }

  private storageKey(kind: VestibularFileKind): string {
    return `${this.storagePrefix}${kind}`
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Não foi possível ler o PDF selecionado.'))
      reader.readAsDataURL(file)
    })
  }

  private fileFromDataUrl(dataUrl: string, name: string, type = 'application/pdf', lastModified = Date.now()): File {
    const [header, encoded] = dataUrl.split(',', 2)
    if (!encoded || !header?.includes(';base64')) throw new Error('Arquivo persistido inválido.')
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return new File([bytes], name, { type, lastModified })
  }
}
