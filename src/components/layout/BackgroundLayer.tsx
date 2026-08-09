import { useTheme } from '@/context/ThemeContext';
import { AuroraBackground } from '@/components/effects/AuroraBackground';
import { LavaLampBackground } from '@/components/effects/LavaLampBackground';

export function BackgroundLayer() {
  const { background, tokens } = useTheme();

  if (background.mode === 'solid') {
    // Un aplat uni ne donne rien à réfracter au verre : les cards et le fond
    // ont la même luminance, donc ni l'ombre portée ni le flou ne se voient.
    // Trois radiales très diluées dans les couleurs du thème suffisent à
    // détacher chaque card. Statique : aucune animation, aucun coût runtime.
    // Deux nappes dans la couleur d'accent (pas les couleurs de statut, qui
    // entreraient en concurrence avec les états des widgets) + un vignettage
    // bas qui recreuse le contraste sous le dock.
    const a = tokens.light ? '18' : '2e'; // ~9 % / ~18 %
    const b = tokens.light ? '10' : '1e'; // ~6 % / ~12 %
    return (
      <div
        // `dash-dither` : superpose un bruit imperceptible qui casse le bandage
        // 8 bits des dégradés (cf. index.css).
        className='dash-dither fixed inset-0 -z-10 pointer-events-none'
        style={{
          backgroundColor: background.color ?? tokens.bgPrimary,
          backgroundImage: [
            `radial-gradient(120% 70% at 18% -12%, ${tokens.accent}${a}, transparent 60%)`,
            `radial-gradient(90% 60% at 98% 6%, ${tokens.accentHover}${b}, transparent 56%)`,
            `radial-gradient(150% 85% at 50% 118%, rgba(0,0,0,${tokens.light ? 0.06 : 0.45}), transparent 62%)`,
          ].join(', '),
        }}
      />
    );
  }

  if (background.mode === 'gradient') {
    return (
      <div
        className='fixed inset-0 -z-10'
        style={{
          background: `linear-gradient(${background.gradientAngle ?? 135}deg, ${background.gradientFrom ?? tokens.bgPrimary}, ${background.gradientTo ?? '#1a1a2e'})`,
        }}
      />
    );
  }

  if (background.mode === 'image' && background.imageUrl) {
    return (
      <>
        <div className='fixed inset-0 -z-10 bg-cover bg-center' style={{ backgroundImage: `url(${background.imageUrl})` }} />
        <div className='fixed inset-0 -z-10' style={{ backgroundColor: `rgba(0,0,0,${background.overlayOpacity ?? 0.5})` }} />
      </>
    );
  }

  if (background.mode === 'aurora') {
    return <AuroraBackground config={background.aurora} />;
  }

  if (background.mode === 'lavaLamp') {
    return <LavaLampBackground config={background.lava} />;
  }

  return null;
}
