import {neon, NeonQueryFunction} from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
    if (!_sql) {
        const url = process.env.DATABASE_URL;
        if (!url) {
            throw new Error('DATABASE_URL environment variable is not set');
        }
        _sql = neon(url);
    }
    return _sql;
}

// Proxy que repassa a tagged template / chamadas para a conexão lazy,
// evitando que `neon()` seja invocado no carregamento do módulo (build time).
const sql = ((...args: Parameters<NeonQueryFunction<false, false>>) =>
    getSql()(...args)) as NeonQueryFunction<false, false>;

export default sql;
