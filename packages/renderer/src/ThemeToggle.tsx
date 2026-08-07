export type Theme = 'light' | 'dark' | 'system';

function MoonIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8 8 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" /></svg>;
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></svg>;
}

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  const currentTheme = theme === 'system'
    ? typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme;
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  return (
    <button className="sp-theme-toggle" type="button" onClick={() => onChange(nextTheme)} aria-label={`Switch to ${nextTheme} theme`} title={`Switch to ${nextTheme} theme`}>
      {currentTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
