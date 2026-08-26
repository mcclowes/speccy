declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.yaml?raw' {
  const source: string;
  export default source;
}
