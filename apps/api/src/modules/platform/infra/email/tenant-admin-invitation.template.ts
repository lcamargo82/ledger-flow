export const getTenantInvitationTemplate = (
  ownerName: string,
  tenantName: string,
  invitationLink: string,
) => {
  return {
    subject: `LedgerFlow — Convite para acessar sua organização`,
    text: `Olá, ${ownerName}.

Sua organização ${tenantName} foi criada no LedgerFlow.

Para ativar seu acesso e definir sua senha, utilize o link abaixo:

${invitationLink}

Este link expira em 72 horas.

Se você não esperava este convite, ignore esta mensagem.

Equipe LedgerFlow`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Bem-vindo(a) ao LedgerFlow</h2>
        <p>Olá, <strong>${ownerName}</strong>.</p>
        <p>Sua organização <strong>${tenantName}</strong> foi criada no LedgerFlow.</p>
        <p>Para ativar seu acesso e definir sua senha, clique no botão abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Ativar Minha Conta
          </a>
        </div>
        <p>Ou copie e cole o link no seu navegador:</p>
        <p style="word-break: break-all; color: #666; font-size: 14px;">
          <a href="${invitationLink}">${invitationLink}</a>
        </p>
        <p style="color: #666; font-size: 14px;"><em>Este link expira em 72 horas.</em></p>
        <hr style="border: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">Se você não esperava este convite, por favor ignore esta mensagem.</p>
      </div>
    `,
  };
};
