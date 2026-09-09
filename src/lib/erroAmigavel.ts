/**
 * Traduz erros crus do Postgres/PostgREST/Supabase Auth pra frases
 * acionáveis em português — achado da auditoria de UX de 2026-09-06: o
 * gestor está sozinho, muitas vezes de madrugada ou em campo, e uma
 * violação de FK ou timeout de rede em inglês técnico não diz o que
 * fazer, vira beco sem saída.
 *
 * Casa por trecho da mensagem — a camada `lib/api/*.ts` já descarta o
 * `code` estruturado do Postgres ao fazer `throw new Error(error.message)`,
 * então a única coisa que sobra pra reconhecer o tipo de erro é o texto
 * padrão que o Postgres/PostgREST/GoTrue sempre produzem. Mensagem sem
 * padrão reconhecido volta como veio — nunca inventa uma tradução errada
 * pra um erro desconhecido.
 */
export function mensagemDeErro(e: unknown): string {
  const bruta = e instanceof Error ? e.message : String(e);
  const m = bruta.toLowerCase();

  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed') || m.includes('network request failed')) {
    return 'Sem conexão com o servidor — verifique sua internet e tente de novo.';
  }
  if (m.includes('violates foreign key constraint')) {
    return 'Não é possível concluir: existe outro registro vinculado a este (ex.: movimentação ou escala já usando este item).';
  }
  if (m.includes('duplicate key value violates unique constraint')) {
    return 'Já existe um registro com esse valor — verifique se não é duplicado.';
  }
  if (m.includes('violates check constraint') || m.includes('violates not-null constraint')) {
    return 'Um dos valores informados não é válido — confira os campos e tente de novo.';
  }
  if (m.includes('violates row-level security policy') || m.includes('permission denied')) {
    return 'Você não tem permissão para fazer isso.';
  }
  if (m.includes('jwt expired') || m.includes('invalid jwt') || m.includes('jwt issued at future')) {
    return 'Sua sessão expirou — atualize a página e faça login de novo.';
  }
  if (m.includes('json object requested, multiple (or no) rows returned') || m.includes('cannot coerce the result to a single json object')) {
    return 'Registro não encontrado — pode já ter sido removido.';
  }
  if (m.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }

  return bruta;
}
