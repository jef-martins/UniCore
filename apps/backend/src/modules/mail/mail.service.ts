import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer, { type Transporter } from 'nodemailer'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporter: Transporter | null = null

  constructor(private readonly config: ConfigService) {
    this.initTransporter()
  }

  private initTransporter(): void {
    const host = this.config.get<string>('SMTP_HOST')
    const user = this.config.get<string>('SMTP_USER')
    const pass = this.config.get<string>('SMTP_PASS')
    const port = Number(this.config.get<string>('SMTP_PORT', '587'))
    const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true'

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      })
      this.logger.log(`Serviço de e-mail SMTP configurado com sucesso (${host}:${port}).`)
    } else {
      this.logger.warn(
        'Servidor SMTP não configurado no .env. Os e-mails serão simulados com link no console.',
      )
    }
  }

  async sendVerificationEmail(
    toEmail: string,
    username: string,
    token: string,
  ): Promise<{ sent: boolean; validationUrl: string }> {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('CORS_ORIGIN') ||
      'http://localhost:4200'

    const validationUrl = `${frontendUrl.replace(/\/$/, '')}/verificar-email?token=${encodeURIComponent(token)}`
    const fromAddress =
      this.config.get<string>('MAIL_FROM') || 'UniCore <nao-responda@faip.edu.br>'

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; text-align: center;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); text-align: left;">
          
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: linear-gradient(135deg, #2563eb, #06b6d4); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: white;">
              U
            </div>
            <div>
              <h2 style="margin: 0; font-size: 20px; color: #f8fafc; letter-spacing: -0.5px;">UniCore <span style="font-size: 13px; color: #94a3b8; font-weight: normal;">| FAIP</span></h2>
            </div>
          </div>

          <h1 style="color: #f1f5f9; font-size: 22px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">
            Validação de E-mail Institucional
          </h1>

          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Olá, <strong style="color: #38bdf8;">${username}</strong>!
          </p>

          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 28px;">
            Um novo cadastro institucional foi criado para você no sistema acadêmico UniCore. Para validar sua conta e liberar o acesso com segurança, clique no botão abaixo:
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${validationUrl}" target="_blank" style="background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
              ✓ Validar Meu E-mail Institucional
            </a>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #334155; padding-top: 16px;">
            ⏱️ <strong>Atenção:</strong> Este link expira em <strong>24 horas</strong>.<br/>
            Se o botão não funcionar, copie e cole este link no seu navegador:<br/>
            <a href="${validationUrl}" style="color: #38bdf8; word-break: break-all;">${validationUrl}</a>
          </p>

          <p style="color: #475569; font-size: 11px; margin-top: 20px; margin-bottom: 0;">
            Se você não solicitou este cadastro, desconsidere esta mensagem.
          </p>
        </div>
      </div>
    `

    this.logger.log(`\n======================================================\n✉️ [E-MAIL DE VALIDAÇÃO INSTITUCIONAL]\nDestinatário: ${toEmail} (${username})\nLink de Ativação: ${validationUrl}\n======================================================\n`)

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: 'Validação de E-mail Institucional - UniCore FAIP',
          html: htmlContent,
          text: `Olá, ${username}! Acesse o link para validar seu e-mail institucional: ${validationUrl}`,
        })
        this.logger.log(`E-mail de validação enviado via SMTP para: ${toEmail}`)
        return { sent: true, validationUrl }
      } catch (err: any) {
        this.logger.error(`Erro ao disparar e-mail SMTP para ${toEmail}: ${err?.message || err}`)
        // Não quebra a transação, pois o link fica registrado no log
        return { sent: false, validationUrl }
      }
    }

    return { sent: true, validationUrl }
  }
}
