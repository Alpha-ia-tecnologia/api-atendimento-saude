import { buildPagination, paginate } from './pagination.util';

describe('pagination.util', () => {
  describe('buildPagination', () => {
    it('aplica valores padrão quando query vazia', () => {
      const result = buildPagination({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(0);
      expect(result.sortOrder).toBe('desc');
    });

    it('limita o limit em 100', () => {
      const result = buildPagination({ limit: 9999 });
      expect(result.limit).toBe(100);
    });

    it('calcula skip a partir de page e limit', () => {
      const result = buildPagination({ page: 3, limit: 20 });
      expect(result.skip).toBe(40);
    });

    it('normaliza page e limit inválidos', () => {
      const result = buildPagination({ page: 0, limit: 0 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('paginate', () => {
    it('monta o meta corretamente', () => {
      const params = buildPagination({ page: 2, limit: 5 });
      const out = paginate(['a', 'b'], 12, params);
      expect(out.meta).toEqual({ page: 2, limit: 5, total: 12, totalPages: 3 });
      expect(out.items).toEqual(['a', 'b']);
    });

    it('garante totalPages >= 1 mesmo sem itens', () => {
      const params = buildPagination({});
      const out = paginate([], 0, params);
      expect(out.meta.totalPages).toBe(1);
    });
  });
});
