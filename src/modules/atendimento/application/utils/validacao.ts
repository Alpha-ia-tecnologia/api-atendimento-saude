import { CampoTexto } from '../flows/tipos';

export type ResultadoValidacao = { ok: true; valor: string } | { ok: false; erro: string };

const digitos = (v: string): string => v.replace(/\D/g, '');

/**
 * Valida (e normaliza) a resposta de texto de um nó PERGUNTA_TEXTO.
 * Espelha as validações que hoje vivem no front, mas aqui são a fonte da
 * verdade — o front só dá dica de UX.
 */
export function validarCampo(campo: CampoTexto, bruto: string): ResultadoValidacao {
  const valor = (bruto ?? '').trim();

  switch (campo) {
    case 'nome':
      if (valor.split(/\s+/).filter(Boolean).length < 2) {
        return { ok: false, erro: 'Pode me informar o nome **e** o sobrenome? 🙂' };
      }
      return { ok: true, valor };

    case 'cpf': {
      const d = digitos(valor);
      if (d.length !== 11) {
        return {
          ok: false,
          erro: 'Hmm, esse CPF não parece certo. Me manda os **11 números**, por favor.',
        };
      }
      return { ok: true, valor: d };
    }

    case 'endereco':
      if (valor.length < 10) {
        return {
          ok: false,
          erro: 'Preciso do endereço completo: **rua, número, bairro e cidade**.',
        };
      }
      return { ok: true, valor };

    case 'telefone': {
      const d = digitos(valor);
      if (d.length < 10 || d.length > 11) {
        return { ok: false, erro: 'O telefone precisa ter **DDD + número** (10 ou 11 dígitos).' };
      }
      return { ok: true, valor: d };
    }

    default:
      return { ok: true, valor };
  }
}
