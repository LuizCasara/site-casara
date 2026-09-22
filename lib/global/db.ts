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

// Proxy que repassa a tagged template / chamadas e propriedades (ex: sql.transaction)
// para a conexão lazy, evitando que `neon()` seja invocado no carregamento do módulo (build time).
const sql = new Proxy(function () {} as unknown as NeonQueryFunction<false, false>, {
    apply(_target, _thisArg, args) {
        return (getSql() as unknown as (...a: unknown[]) => unknown)(...args);
    },
    get(_target, prop, receiver) {
        return Reflect.get(getSql(), prop, receiver);
    },
}) as NeonQueryFunction<false, false>;

export default sql;
