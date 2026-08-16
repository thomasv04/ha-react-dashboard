import React, { type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useI18n } from '@/i18n';

interface Props {
  children: ReactNode;
  /** Optional label shown in the fallback card */
  label?: string;
  /**
   * Clé i18n du message affiché à la place du contenu. Permet de distinguer
   * « widget indisponible » (une case de la grille) de « panneau indisponible »
   * (toute une vue), sans dupliquer la frontière d'erreur.
   */
  messageKey?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Repli affiché quand le contenu a planté.
 *
 * Composant de fonction et non JSX inline dans `render()` : une classe React ne
 * peut pas appeler de hook, or le message doit être traduit.
 */
function ErrorFallback({ label, messageKey, onRetry }: { label?: string; messageKey: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className='h-full flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 p-4 text-center'>
      <AlertTriangle size={24} className='text-red-400/60' />
      <p className='text-white/40 text-xs font-medium'>{t(messageKey)}</p>
      {label && <p className='text-white/20 text-[10px]'>{label}</p>}
      <button
        onClick={onRetry}
        className='mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/8 border border-white/12 text-white/60 hover:bg-white/12 hover:text-white transition-colors text-[11px] font-semibold'
      >
        <RotateCcw size={11} /> {t('common.retry')}
      </button>
    </div>
  );
}

/**
 * Frontière d'erreur de rendu.
 *
 * Utilisée autour de chaque widget de la grille, mais aussi autour des
 * panneaux personnalisés, des modales « more info » et de la barre d'activité :
 * une exception dans l'un de ces trois-là démontait tout l'arbre React et
 * laissait un écran blanc, alors que le reste du dashboard aurait très bien pu
 * continuer à fonctionner.
 */
export class WidgetErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[WidgetErrorBoundary] ${this.props.label ?? 'Widget'} crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          label={this.props.label}
          messageKey={this.props.messageKey ?? 'common.widgetUnavailable'}
          // Une erreur passagère — entité absente le temps d'une reconnexion,
          // flux vidéo coupé — se règle en refaisant le rendu. Sans ce bouton,
          // il fallait recharger toute la page.
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}
