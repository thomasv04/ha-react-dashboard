import React, { type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional label shown in the fallback card */
  label?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Widget-level error boundary.
 * Catches render errors so a single broken widget doesn't crash
 * the entire dashboard.
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
        <div className='h-full flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 p-4 text-center'>
          <AlertTriangle size={24} className='text-red-400/60' />
          <p className='text-white/40 text-xs font-medium'>Widget indisponible</p>
          {this.props.label && <p className='text-white/20 text-[10px]'>{this.props.label}</p>}
        </div>
      );
    }
    return this.props.children;
  }
}
