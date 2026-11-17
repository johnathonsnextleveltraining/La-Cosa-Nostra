// Red dot on "The Sit-Down" when someone posted since Boss last opened it.
import { useEffect, useState } from 'react';
import { api } from './adapter.ts';
const KEY = 'lcn-seen-msg';
const seen = () => { try { return Number(localStorage.getItem(KEY) || 0) } catch { return 0 } };
export function markSeen(rows: any[]) { const top = Math.max(0, ...rows.filter(r => r.sender !== 'Johnny Biz').map(r => Number(r.id))); try { if (top > seen()) localStorage.setItem(KEY, String(top)) } catch { } window.dispatchEvent(new Event('lcn-seen')) }
export function useUnread(onPage: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let dead = false;
    const check = async () => { if (document.visibilityState !== 'visible') return; try { const rows: any[] = await api('messages'); if (dead) return; if (onPage) { markSeen(rows); setN(0); return } setN(rows.filter(r => r.sender !== 'Johnny Biz' && Number(r.id) > seen()).length) } catch { } };
    check(); const t = setInterval(check, 30000); const clear = () => { if (onPage) setN(0) };
    window.addEventListener('lcn-seen', clear); document.addEventListener('visibilitychange', check);
    return () => { dead = true; clearInterval(t); window.removeEventListener('lcn-seen', clear); document.removeEventListener('visibilitychange', check) };
  }, [onPage]);
  return n;
}
