declare module 'virtual:speccy-reference' {
  export const spec: string;
  export const config: {
    title: string;
    accentColor?: string;
    theme?: 'light' | 'dark' | 'system' | 'inherit';
    basePath: string;
    logo?: string;
    tryIt?: boolean;
    openApiUrl: string;
    postmanCollectionUrl?: string;
  };
}
