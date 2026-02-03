// Mock database for demo purposes
// Replace with better-sqlite3 for production deployment on Vercel

interface User {
  id: string;
  email: string;
  name: string;
  role: 'global_admin' | 'admin' | 'bdm';
  assigned_retailers: string;
  is_active: number;
  created_at: string;
  last_login: string | null;
}

interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

interface MagicToken {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  used: number;
  created_at: string;
}

interface AuditLog {
  id: number;
  user_id: string | null;
  user_email: string | null;
  action: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

// In-memory store
const store = {
  users: new Map<string, User>(),
  sessions: new Map<string, Session>(),
  magic_tokens: new Map<string, MagicToken>(),
  audit_log: [] as AuditLog[],
  application_decisions: [] as any[],
  report_presets: [] as any[],
  sync_log: [] as any[],
  scheduled_reports: [] as any[],
};

// Initialize with demo admin user
const globalAdminEmail = process.env.GLOBAL_ADMIN_EMAIL || 'barney.goodman@sherminfinance.co.uk';
store.users.set('admin-1', {
  id: 'admin-1',
  email: globalAdminEmail,
  name: 'Barney Goodman',
  role: 'global_admin',
  assigned_retailers: '[]',
  is_active: 1,
  created_at: new Date().toISOString(),
  last_login: null,
});

// Mock database interface matching better-sqlite3 API
const db = {
  prepare(sql: string) {
    return {
      run(...params: any[]) {
        // Handle INSERT, UPDATE, DELETE
        if (sql.toLowerCase().includes('insert into users')) {
          const user: User = {
            id: params[0],
            email: params[1],
            name: params[2],
            role: params[3] || 'bdm',
            assigned_retailers: '[]',
            is_active: 1,
            created_at: new Date().toISOString(),
            last_login: null,
          };
          store.users.set(user.id, user);
        } else if (sql.toLowerCase().includes('insert into sessions')) {
          const session: Session = {
            id: params[0],
            user_id: params[1],
            expires_at: params[2],
            created_at: new Date().toISOString(),
          };
          store.sessions.set(session.id, session);
        } else if (sql.toLowerCase().includes('insert into magic_tokens')) {
          const token: MagicToken = {
            id: params[0],
            email: params[1],
            token: params[2],
            expires_at: params[3],
            used: 0,
            created_at: new Date().toISOString(),
          };
          store.magic_tokens.set(token.token, token);
        } else if (sql.toLowerCase().includes('insert into audit_log')) {
          store.audit_log.push({
            id: store.audit_log.length + 1,
            user_id: params[0],
            user_email: params[1],
            action: params[2],
            details: params[3],
            ip_address: null,
            created_at: new Date().toISOString(),
          });
        } else if (sql.toLowerCase().includes('update magic_tokens')) {
          // Mark token as used
          for (const [key, token] of store.magic_tokens) {
            if (token.id === params[0]) {
              token.used = 1;
            }
          }
        } else if (sql.toLowerCase().includes('update users')) {
          // Update last login
          for (const [key, user] of store.users) {
            if (user.id === params[1]) {
              user.last_login = params[0];
            }
          }
        } else if (sql.toLowerCase().includes('delete from sessions')) {
          store.sessions.delete(params[0]);
        }
      },
      get(...params: any[]): any {
        // Handle SELECT queries
        if (sql.toLowerCase().includes('from users where email')) {
          for (const user of store.users.values()) {
            if (user.email === params[0] && user.is_active === 1) {
              return user;
            }
          }
          return undefined;
        } else if (sql.toLowerCase().includes('from magic_tokens')) {
          for (const token of store.magic_tokens.values()) {
            if (token.token === params[0] && token.used === 0) {
              const now = new Date();
              const expires = new Date(token.expires_at);
              if (expires > now) {
                return token;
              }
            }
          }
          return undefined;
        } else if (sql.toLowerCase().includes('from sessions')) {
          for (const session of store.sessions.values()) {
            if (session.id === params[0]) {
              const now = new Date();
              const expires = new Date(session.expires_at);
              if (expires > now) {
                const user = store.users.get(session.user_id);
                if (user && user.is_active === 1) {
                  return { ...session, ...user, user_id: session.user_id };
                }
              }
            }
          }
          return undefined;
        } else if (sql.toLowerCase().includes('last_insert_rowid')) {
          return { id: store.audit_log.length };
        }
        return undefined;
      },
      all(...params: any[]): any[] {
        // Handle SELECT queries returning multiple rows
        if (sql.toLowerCase().includes('from application_decisions')) {
          return store.application_decisions;
        } else if (sql.toLowerCase().includes('from audit_log')) {
          return store.audit_log;
        }
        return [];
      },
    };
  },
  exec(sql: string) {
    // Handle CREATE TABLE and other DDL - no-op for in-memory
  },
  pragma(setting: string) {
    // No-op for in-memory
  },
  transaction(fn: Function) {
    return fn;
  },
};

export default db;
