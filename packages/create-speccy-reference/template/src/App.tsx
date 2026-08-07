import { Speccy } from 'speccy-renderer';
import { config, spec } from 'virtual:speccy-reference';

export function App() {
  const logo = config.logo
    ? <img className="reference-logo" src={config.logo} alt="" />
    : undefined;

  return (
    <Speccy
      spec={spec}
      basePath={config.basePath}
      accentColor={config.accentColor}
      theme={config.theme}
      logo={logo}
      showSidebar
    />
  );
}
