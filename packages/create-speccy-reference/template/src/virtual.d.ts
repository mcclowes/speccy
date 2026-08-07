declare module 'virtual:speccy-reference' {
  export const spec: string;
  export const config: {
    title: string;
    accentColor?: string;
    theme?: 'light' | 'dark' | 'system';
    basePath: string;
    logo?: string;
  };
}
