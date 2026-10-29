import type { Preview, Decorator } from '@storybook/react';
import { PanelProvider } from '@/context/PanelContext';
import { PageProvider } from '@/context/PageContext';
import { WidgetConfigProvider } from '@/context/WidgetConfigContext';
import { DashboardLayoutProvider } from '@/context/DashboardLayoutContext';
import { I18nProvider } from '@/i18n';
import '../src/index.css';
import React, { useEffect } from 'react';

// Le fond `ground` du thème sombre de la v2.
const BG = 'var(--ds-ground)';

const withDarkTheme: Decorator = Story => {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.style.background = BG;
    document.body.style.minHeight = '100vh';
    document.body.style.margin = '0';
  }, []);

  return (
    <I18nProvider>
      <PageProvider>
        <WidgetConfigProvider>
          <DashboardLayoutProvider>
            <PanelProvider>
              <div className='p-6 min-w-[320px] max-w-[480px]'>
                <Story />
              </div>
            </PanelProvider>
          </DashboardLayoutProvider>
        </WidgetConfigProvider>
      </PageProvider>
    </I18nProvider>
  );
};

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /date$/i,
      },
    },
  },
  decorators: [withDarkTheme],
};

export default preview;
