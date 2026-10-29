/**
 * Fond de l'écran : l'aplat `ground` du thème. Monté sous le dashboard pour
 * peindre aussi la carte et le panneau Home Assistant, dont le `<body>` n'est
 * pas le nôtre.
 */
export function BackgroundLayer() {
  return <div className='fixed inset-0 -z-10 pointer-events-none bg-[var(--dash-bg-primary)]' />;
}
