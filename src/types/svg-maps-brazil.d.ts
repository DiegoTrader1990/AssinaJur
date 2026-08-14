declare module '@svg-maps/brazil' {
  const map: {
    label: string;
    viewBox: string;
    locations: Array<{ id: string; name: string; path: string }>;
  };
  export default map;
}
