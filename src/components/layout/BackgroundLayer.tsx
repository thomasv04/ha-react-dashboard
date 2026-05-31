import { useTheme } from '@/context/ThemeContext';
import { AuroraBackground } from '@/components/effects/AuroraBackground';
import { LavaLampBackground } from '@/components/effects/LavaLampBackground';

export function BackgroundLayer() {
  const { background, tokens } = useTheme();

  if (background.mode === 'solid') {
    return null;
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
