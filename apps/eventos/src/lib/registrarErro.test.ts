import { beforeEach, describe, expect, it, vi } from 'vitest';

const inserts: Record<string, unknown>[] = [];
let falharInsert = false;

vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      insert: (linha: Record<string, unknown>) => {
        inserts.push(linha);
        return { then: (ok: () => void, erro: () => void) => (falharInsert ? erro() : ok()) };
      },
    }),
  },
}));

import { _resetarRegistroDeErros, registrarErro } from './registrarErro';

beforeEach(() => {
  inserts.length = 0;
  falharInsert = false;
  _resetarRegistroDeErros();
});

describe('registrarErro', () => {
  it('grava origem, mensagem e stack', () => {
    registrarErro({ origem: 'react', mensagem: 'quebrou', stack: 'at x' });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ origem: 'react', mensagem: 'quebrou', stack: 'at x' });
  });

  it('ignora ruído que não é bug do app', () => {
    for (const mensagem of ['ResizeObserver loop completed with undelivered notifications.', 'Script error.', 'Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', '   ', '']) {
      registrarErro({ origem: 'janela', mensagem });
    }
    expect(inserts).toHaveLength(0);
  });

  it('NÃO ignora falha de import dinâmico (chunk sumido depois de deploy)', () => {
    registrarErro({ origem: 'react', mensagem: 'Failed to fetch dynamically imported module: /assets/Crm-abc.js' });
    expect(inserts).toHaveLength(1);
  });

  it('mesmo erro repetido na sessão conta uma vez só; origem diferente conta à parte', () => {
    registrarErro({ origem: 'janela', mensagem: 'x' });
    registrarErro({ origem: 'janela', mensagem: 'x' });
    registrarErro({ origem: 'toast', mensagem: 'x' });
    expect(inserts).toHaveLength(2);
  });

  it('teto de 20 erros por sessão', () => {
    for (let i = 0; i < 50; i++) registrarErro({ origem: 'janela', mensagem: `erro ${i}` });
    expect(inserts).toHaveLength(20);
  });

  it('trunca mensagem (1000) e stack (4000) pra caber nos limites do banco', () => {
    registrarErro({ origem: 'janela', mensagem: 'a'.repeat(5000), stack: 'b'.repeat(9000) });
    expect((inserts[0].mensagem as string).length).toBe(1000);
    expect((inserts[0].stack as string).length).toBe(4000);
  });

  it('nunca lança, mesmo se o insert falhar', () => {
    falharInsert = true;
    expect(() => registrarErro({ origem: 'janela', mensagem: 'y' })).not.toThrow();
  });
});
