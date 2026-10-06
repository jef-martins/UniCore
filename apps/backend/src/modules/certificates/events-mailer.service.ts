import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EventsMailerService {
  private readonly logger = new Logger(EventsMailerService.name)
  private transporter: nodemailer.Transporter | null = null
  private readonly isConfigured: boolean = false

  constructor(private readonly config?: ConfigService) {
    const host = this.config?.get<string>('SMTP_HOST') || process.env['SMTP_HOST']
    const port = Number(this.config?.get<number>('SMTP_PORT') || process.env['SMTP_PORT'] || 587)
    const user = this.config?.get<string>('SMTP_USER') || process.env['SMTP_USER']
    const pass = this.config?.get<string>('SMTP_PASS') || process.env['SMTP_PASS']

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })
      this.isConfigured = true
      this.logger.log(`Serviço de e-mail de eventos configurado via SMTP (${host}:${port})`)
    } else {
      this.logger.log('SMTP não configurado. Notificações de eventos serão registradas em log.')
    }
  }

  async sendTicketCreated(params: {
    to: string
    userName: string
    eventTitle: string
    ticketCode: string
    amount: number
    dueDate?: string | null
    ticketType?: string
    pixKey?: string | null
    paymentLink?: string | null
  }): Promise<void> {
    const subject = `Inscrição Realizada: ${params.eventTitle} (Código: ${params.ticketCode})`
    const isFree = params.ticketType === 'gratuito' || params.amount === 0
    const formattedDueDate = params.dueDate
      ? new Date(params.dueDate).toLocaleDateString('pt-BR')
      : 'Até o início do evento'

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background: #1e3a8a; padding: 15px; border-radius: 6px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">FAIP • Inscrição em Evento Acadêmico</h2>
        </div>
        <div style="padding: 20px 0;">
          <p>Olá, <strong>${params.userName}</strong>,</p>
          <p>Sua inscrição no evento <strong>${params.eventTitle}</strong> foi registrada com sucesso!</p>
          
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 0 0 8px;"><strong>Código da Inscrição:</strong> <span style="font-family: monospace; font-size: 16px; color: #1e3a8a;">${params.ticketCode}</span></p>
            <p style="margin: 0 0 8px;"><strong>Valor:</strong> ${isFree ? 'Gratuito' : `R$ ${params.amount.toFixed(2)}`}</p>
            <p style="margin: 0;"><strong>Vencimento:</strong> ${formattedDueDate}</p>
          </div>

          ${
            !isFree
              ? `
            <div style="background: #eff6ff; border: 1px dashed #3b82f6; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
              <h4 style="margin: 0 0 10px; color: #1e3a8a;">Instruções para Quitação:</h4>
              ${
                params.pixKey
                  ? `<p style="margin: 0 0 8px;">• <strong>Chave Pix:</strong> <code>${params.pixKey}</code></p>`
                  : ''
              }
              ${
                params.paymentLink
                  ? `<p style="margin: 0 0 8px;">• <a href="${params.paymentLink}" style="color: #2563eb; font-weight: bold;">Clique aqui para pagar via Cartão</a></p>`
                  : ''
              }
              <p style="margin: 0; font-size: 13px; color: #64748b;">Você também pode comparecer à Tesouraria Acadêmica com o número da inscrição ou anexar o comprovante na área de "Meus Ingressos".</p>
            </div>
          `
              : ''
          }

          <p style="font-size: 13px; color: #64748b;">Consulte suas credenciais e oficinas na aba <em>Meus Ingressos</em> no Portal UniCore.</p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 12px; color: #94a3b8;">
          UniCore • Secretaria Geral de Extensão e Eventos FAIP
        </div>
      </div>
    `

    await this.dispatchEmail(params.to, subject, html)
  }

  async sendTicketApproved(params: {
    to: string
    userName: string
    eventTitle: string
    ticketCode: string
    workshops?: string[]
  }): Promise<void> {
    const subject = `✓ Inscrição Confirmada e Liberada: ${params.eventTitle}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${params.ticketCode}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background: #065f46; padding: 15px; border-radius: 6px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">✓ Inscrição Aprovada • Credencial Liberada</h2>
        </div>
        <div style="padding: 20px 0;">
          <p>Olá, <strong>${params.userName}</strong>,</p>
          <p>Confirmamos a quitação da sua inscrição no evento <strong>${params.eventTitle}</strong>!</p>
          
          <div style="text-align: center; padding: 20px; background: #f8fafc; border: 2px solid #065f46; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px; font-weight: bold; color: #065f46; letter-spacing: 0.05em;">SUA CREDENCIAL DE ACESSO PORTARIA</p>
            <img src="${qrUrl}" alt="QR Code do Ingresso" style="width: 180px; height: 180px; display: inline-block; border: 1px solid #cbd5e1; padding: 8px; background: #ffffff;" />
            <h1 style="font-family: monospace; font-size: 28px; letter-spacing: 0.15em; color: #0f172a; margin: 15px 0 5px;">${params.ticketCode}</h1>
            <p style="margin: 0; font-size: 13px; color: #64748b;">Apresente este QR Code no smartphone ou impresso na entrada das atividades.</p>
          </div>

          ${
            params.workshops && params.workshops.length > 0
              ? `
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
              <strong>Oficina / Workshop Vinculado:</strong>
              <p style="margin: 5px 0 0;">${params.workshops.join(', ')}</p>
            </div>
          `
              : ''
          }
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 12px; color: #94a3b8;">
          UniCore • Secretaria Geral de Extensão e Eventos FAIP
        </div>
      </div>
    `

    await this.dispatchEmail(params.to, subject, html)
  }

  async sendTicketExpired(params: {
    to: string
    userName: string
    eventTitle: string
    ticketCode: string
  }): Promise<void> {
    const subject = `Aviso: Inscrição Expirada - ${params.eventTitle}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background: #991b1b; padding: 15px; border-radius: 6px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">Inscrição Expirada</h2>
        </div>
        <div style="padding: 20px 0;">
          <p>Olá, <strong>${params.userName}</strong>,</p>
          <p>O prazo de quitação da sua inscrição <code>${params.ticketCode}</code> no evento <strong>${params.eventTitle}</strong> encerrou-se sem confirmação de pagamento.</p>
          <p>A vaga e os eventuais workshops vinculados foram liberados automaticamente para outros participantes.</p>
          <p>Caso ainda deseje participar, você pode realizar uma nova inscrição pelo catálogo de eventos se ainda houver vagas disponíveis.</p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 12px; color: #94a3b8;">
          UniCore • Secretaria Geral de Extensão e Eventos FAIP
        </div>
      </div>
    `

    await this.dispatchEmail(params.to, subject, html)
  }

  private async dispatchEmail(to: string, subject: string, html: string): Promise<void> {
    if (!to || !to.includes('@')) {
      this.logger.debug(`E-mail ignorado: destinatário inválido (${to})`)
      return
    }

    if (!this.isConfigured || !this.transporter) {
      this.logger.log(`[SIMULAÇÃO E-MAIL] Para: ${to} | Assunto: ${subject}`)
      return
    }

    try {
      const from = this.config?.get<string>('SMTP_FROM') || process.env['SMTP_FROM'] || 'eventos@faip.edu.br'
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      })
      this.logger.log(`E-mail enviado com sucesso para ${to}: ${subject}`)
    } catch (err) {
      this.logger.warn(`Erro ao disparar e-mail para ${to}: ${(err as Error).message}`)
    }
  }
}
