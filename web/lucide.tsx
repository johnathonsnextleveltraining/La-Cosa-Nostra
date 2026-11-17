// Minimal stand-ins for the lucide-react icons the v54 page uses (same 24x24 stroke style).
const P: Record<string, string[]> = {
  LayoutDashboard: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
  LockKeyhole: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4', 'M12 15v2'],
  Banknote: ['M2 6h20v12H2z', 'M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6', 'M6 12h.01M18 12h.01'],
  Users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  BookOpen: ['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'],
  Upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  ShieldCheck: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  RefreshCw: ['M3 12a9 9 0 0 1 15-6.7L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15 6.7L3 16', 'M8 16H3v5'],
  ChevronRight: ['M9 18l6-6-6-6'],
  ArrowUpRight: ['M7 7h10v10', 'M7 17L17 7'],
  Menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  X: ['M18 6L6 18', 'M6 6l12 12'],
  Search: ['M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14', 'M21 21l-4.3-4.3'],
  Download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  Trophy: ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2z'],
  Settings2: ['M20 7h-9', 'M14 17H5', 'M17 14a3 3 0 1 0 0 6 3 3 0 1 0 0-6', 'M7 4a3 3 0 1 0 0 6 3 3 0 1 0 0-6'],
  Check: ['M20 6L9 17l-5-5'],
  Plus: ['M12 5v14', 'M5 12h14'],
  Activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  MessageSquare: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
};
function make(name: string) {
  const C = ({ size = 24, className, ...rest }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={'lucide ' + (className || '')} aria-hidden="true" {...rest}>
      {P[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
  C.displayName = name;
  return C;
}
export const LayoutDashboard = make('LayoutDashboard'), LockKeyhole = make('LockKeyhole'), Banknote = make('Banknote'), Users = make('Users'),
  BookOpen = make('BookOpen'), Upload = make('Upload'), ShieldCheck = make('ShieldCheck'), RefreshCw = make('RefreshCw'), ChevronRight = make('ChevronRight'),
  ArrowUpRight = make('ArrowUpRight'), Menu = make('Menu'), X = make('X'), Search = make('Search'), Download = make('Download'), Trophy = make('Trophy'),
  Settings2 = make('Settings2'), Check = make('Check'), Plus = make('Plus'), Activity = make('Activity'), MessageSquare = make('MessageSquare');
