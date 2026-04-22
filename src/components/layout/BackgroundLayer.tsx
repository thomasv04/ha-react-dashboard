import { useTheme } from '@/context/ThemeContext';

export function BackgroundLayer() {
  const { background, tokens } = useTheme();

  if (background.mode === 'solid') {
    return null; // Le body background-color suffit
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

  return null;
}
