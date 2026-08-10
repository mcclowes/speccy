export type Theme = 'light' | 'dark' | 'system';

function MoonIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8 8 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" /></svg>;
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></svg>;
}

export function ThemeToggle({ theme, onChange, themes = ['light', 'dark'], className = 'sp-theme-toggle', label = 'action' }: {
  theme: Theme;
  onChange: (theme: Theme) => void;
  themes?: Theme[];
  className?: string;
  label?: 'action' | 'current';
}) {
  const currentTheme = theme === 'system'
    ? typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme;
  const currentIndex = themes.indexOf(theme);
  const nextTheme = currentIndex < 0
    ? themes.find((candidate) => candidate !== currentTheme) ?? 'light'
    : themes[(currentIndex + 1) % themes.length] ?? 'light';
  const accessibleLabel = label === 'current' ? `Theme: ${theme}` : `Switch to ${nextTheme} theme`;
  return (
    <button className={`sp-theme-control ${className}`.trim()} type="button" onClick={() => onChange(nextTheme)} aria-label={accessibleLabel} title={accessibleLabel}>
      {currentTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
