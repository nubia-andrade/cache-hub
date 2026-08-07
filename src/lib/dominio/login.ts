/**
 * As mensagens de erro da entrada no Hub, e as checagens que dá para fazer
 * antes de bater no servidor.
 *
 * A ordem importa e é a do protótipo: o domínio é conferido antes da senha.
 * O que o navegador consegue checar sozinho (campo vazio, domínio errado) fica
 * aqui; o resto — credencial, cadastro, estado do acesso — depende do Supabase
 * e acontece em `src/lib/autenticacao.ts`.
 */

export type CodigoErroLogin =
  | 'vazio'
  | 'dominio'
  | 'senha'
  | 'senha-curta'
  | 'credenciais'
  | 'nao-confirmado'
  | 'conta-existe'
  | 'inexistente'
  | 'pendente'
  | 'suspenso'
  | 'falha';

export type ErroLogin = {
  codigo: CodigoErroLogin;
  titulo: string;
  texto: string;
  /** Grave pinta de vermelho; aviso pinta de amarelo. */
  gravidade: 'grave' | 'aviso';
  /** Se true, mostramos o botão "Solicitar acesso com este e-mail". */
  ofereceSolicitar: boolean;
};

const DEFINICOES: Record<CodigoErroLogin, Omit<ErroLogin, 'codigo'>> = {
  vazio: {
    titulo: 'Informe seu e-mail',
    texto: 'Use o e-mail corporativo Globo cadastrado no Hub.',
    gravidade: 'aviso',
    ofereceSolicitar: false,
  },
  dominio: {
    titulo: 'E-mail fora do domínio Globo',
    texto: 'O Cachê Hub aceita apenas endereços @globo.com ou @g.globo.',
    gravidade: 'grave',
    ofereceSolicitar: false,
  },
  senha: {
    titulo: 'Informe sua senha',
    texto: 'A senha da rede Globo é obrigatória para concluir a entrada.',
    gravidade: 'aviso',
    ofereceSolicitar: false,
  },
  // O Supabase não diz se foi o e-mail ou a senha que não conferiu, e isso é
  // proposital: contar qual dos dois errou entrega quem tem conta no sistema.
  credenciais: {
    titulo: 'E-mail ou senha não conferem',
    texto:
      'Verifique os dois campos e tente de novo. Se você nunca definiu uma senha para o Hub, solicite acesso.',
    gravidade: 'grave',
    ofereceSolicitar: true,
  },
  // Este o Supabase diz na lata, e é uma causa comum de confusão: a conta
  // existe e a senha está certa, mas ninguém marcou "Auto Confirm User".
  'nao-confirmado': {
    titulo: 'E-mail ainda não confirmado',
    texto:
      'A conta existe, mas o e-mail não foi confirmado. No painel do Supabase, em Authentication > Users, abra este usuário e confirme o e-mail — ou recrie marcando "Auto Confirm User".',
    gravidade: 'aviso',
    ofereceSolicitar: false,
  },
  'conta-existe': {
    titulo: 'Este e-mail já tem conta',
    texto:
      'Não precisa criar de novo — é só entrar com a senha que você definiu. Se esqueceu, apague o usuário em Authentication > Users e crie outra vez.',
    gravidade: 'aviso',
    ofereceSolicitar: false,
  },
  'senha-curta': {
    titulo: 'Senha muito curta',
    texto: 'O Supabase exige pelo menos 6 caracteres.',
    gravidade: 'aviso',
    ofereceSolicitar: false,
  },
  inexistente: {
    titulo: 'E-mail sem acesso ao Hub',
    texto:
      'Não encontramos este e-mail entre os acessos liberados. Solicite acesso e o Proprietário definirá seus perfis.',
    gravidade: 'grave',
    ofereceSolicitar: true,
  },
  pendente: {
    titulo: 'Solicitação em análise',
    texto:
      'Seu pedido de acesso já foi enviado e aguarda aprovação do Proprietário. Você receberá um e-mail na liberação.',
    gravidade: 'aviso',
    ofereceSolicitar: false,
  },
  suspenso: {
    titulo: 'Acesso suspenso',
    texto:
      'Este acesso está suspenso. Procure o Proprietário do Cachê Hub para reativar.',
    gravidade: 'grave',
    ofereceSolicitar: false,
  },
  falha: {
    titulo: 'Não consegui falar com o servidor',
    texto:
      'Pode ser a conexão ou o Supabase fora do ar. Tente de novo em alguns instantes.',
    gravidade: 'grave',
    ofereceSolicitar: false,
  },
};

export function erroDeLogin(codigo: CodigoErroLogin): ErroLogin {
  return { codigo, ...DEFINICOES[codigo] };
}

const DOMINIOS_ACEITOS = ['@globo.com', '@g.globo'];

/**
 * As checagens que não precisam do servidor. Devolve null quando está tudo
 * certo para tentar a autenticação de verdade.
 */
export function validarCamposDeEntrada(
  emailBruto: string,
  senha: string,
): ErroLogin | null {
  const email = emailBruto.trim().toLowerCase();

  if (!email) return erroDeLogin('vazio');
  if (!DOMINIOS_ACEITOS.some((dominio) => email.endsWith(dominio))) {
    return erroDeLogin('dominio');
  }
  if (!senha) return erroDeLogin('senha');

  return null;
}
