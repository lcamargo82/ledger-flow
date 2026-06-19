export function getPasswordResetTemplate(resetLink: string) {
  const subject = 'LedgerFlow — Recuperação de senha';
  const text = `
Olá,

Recebemos uma solicitação para redefinir sua senha no LedgerFlow.

Clique no link abaixo para criar uma nova senha:
${resetLink}

Este link expira em 30 minutos.

Se você não solicitou essa recuperação, ignore este e-mail.

Equipe LedgerFlow
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #0056b3;">LedgerFlow — Recuperação de senha</h2>
      <p>Olá,</p>
      <p>Recebemos uma solicitação para redefinir sua senha no LedgerFlow.</p>
      <p>Clique no link abaixo para criar uma nova senha:</p>
      <p style="margin: 20px 0;">
        <a href="${resetLink}" style="background-color: #0056b3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Redefinir Senha
        </a>
      </p>
      <p style="color: #666; font-size: 0.9em;">
        Ou copie e cole este link no seu navegador:<br>
        <a href="${resetLink}">${resetLink}</a>
      </p>
      <p>Este link expira em 30 minutos.</p>
      <p>Se você não solicitou essa recuperação, ignore este e-mail.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 0.8em;">Equipe LedgerFlow</p>
    </div>
  `;

  return { subject, text, html };
}
