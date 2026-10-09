import { it, expect } from 'vitest';
import { renderAdminPage } from '../adminPage';
it('script parses', () => { const m = /<script>([\s\S]*)<\/script>/.exec(renderAdminPage())!; expect(() => new Function(m[1]!)).not.toThrow(); });
