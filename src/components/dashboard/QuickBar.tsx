import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useHass } from '@hakit/core';
import { Search, LayoutGrid, Zap } from 'lucide-react';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { useI18n } from '@/i18n';
import { usePages } from '@/context/PageContext';
import { usePanel } from '@/context/PanelContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { useMoreInfo } from '@/context/MoreInfoContext';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { modalTypeFor } from '@/components/modals/more-info-registry';

/** Nombre de résultats affichés — au-delà, la liste devient un scroll interminable. */
const MAX_RESULTS = 40;

type Mode = 'entity' | 'command';

interface Item {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

function QuickBarPanel({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  const entities = useHass(s => s.entities);
  const { pages, setCurrentPage } = usePages();
  const { openPanel } = usePanel();
  const { panels } = useCustomPanels();
  const { openMoreInfo } = useMoreInfo();

  useEffect(() => inputRef.current?.focus(), []);

  const items = useMemo<Item[]>(() => {
    if (mode === 'command') {
      return [
        ...pages.map(p => ({
          id: `page:${p.id}`,
          label: p.label,
          hint: t('dashboard.quickBar.page'),
          run: () => setCurrentPage(p.id),
        })),
        ...panels.map(p => ({
          id: `panel:${p.id}`,
          label: p.name,
          hint: t('dashboard.quickBar.panel'),
          run: () => openPanel(`custom:${p.id}`),
        })),
      ];
    }

    return Object.entries(entities ?? {}).map(([id, entity]) => ({
      id,
      // Le nom convivial est ce que l'utilisateur connaît ; l'identifiant reste
      // affiché parce que c'est lui qui est unique.
      label: (entity?.attributes?.friendly_name as string) ?? id,
      hint: entity?.state,
      run: () => openMoreInfo(id, modalTypeFor(id), id, null),
    }));
  }, [mode, entities, pages, panels, t, setCurrentPage, openPanel, openMoreInfo]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = q ? items.filter(i => i.label.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)) : items;
    return matching.slice(0, MAX_RESULTS);
  }, [items, query]);

  const active = Math.min(cursor, Math.max(0, results.length - 1));

  // Les flèches peuvent emmener le curseur au-delà de la zone visible : sans
  // ça, la sélection continue de descendre mais l'écran ne suit pas.
  useEffect(() => activeRef.current?.scrollIntoView({ block: 'nearest' }), [active]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    item.run();
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DURATION_FAST }}
        onClick={onClose}
        className='fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm'
      />
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: DURATION_FAST }}
        className='fixed top-[12vh] left-1/2 -translate-x-1/2 z-[101] w-[min(92vw,560px)] rounded-2xl bg-[#12121f] border border-white/12 shadow-2xl overflow-hidden'
      >
        <div className='flex items-center gap-2.5 px-4 py-3 border-b border-white/8'>
          {mode === 'entity' ? <Zap size={15} className='text-white/35' /> : <LayoutGrid size={15} className='text-white/35' />}
          <input
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              // Remis ici et non dans un effet : une frappe est déjà un
              // événement, y réagir par un rendu supplémentaire ferait
              // clignoter la sélection.
              setCursor(0);
            }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor(c => Math.min(c + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor(c => Math.max(c - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                choose(results[active]);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder={t(mode === 'entity' ? 'dashboard.quickBar.searchEntity' : 'dashboard.quickBar.searchCommand')}
            className='flex-1 bg-transparent text-white/85 text-sm focus:outline-none placeholder:text-white/25'
          />
          <Search size={14} className='text-white/20' />
        </div>

        <ul className='max-h-[50vh] overflow-y-auto py-1'>
          {results.map((item, i) => (
            <li key={item.id} ref={i === active ? activeRef : undefined}>
              <button
                onClick={() => choose(item)}
                onMouseEnter={() => setCursor(i)}
                // `block w-full` : la ligne entière doit être cliquable, pas
                // seulement le texte.
                className={`block w-full text-left px-4 py-2 transition-colors cursor-pointer ${
                  i === active ? 'bg-blue-500/20' : 'hover:bg-white/5'
                }`}
              >
                <span className='block text-white/80 text-sm truncate'>{item.label}</span>
                <span className='block text-white/30 text-[11px] truncate'>
                  {item.id}
                  {item.hint ? ` · ${item.hint}` : ''}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className='px-4 py-6 text-center text-white/30 text-xs'>{t('common.noResults')}</li>}
        </ul>
      </motion.div>
    </>
  );
}

/**
 * Barre de commande rapide, façon quick bar de Home Assistant.
 *
 * `e` cherche une entité et ouvre sa fiche, `c` va à une page ou ouvre un
 * panneau. Toutes les données existaient déjà : c'est une modale de recherche,
 * rien de plus.
 *
 * Le panneau n'est monté qu'à l'ouverture — il s'abonne à *toutes* les entités,
 * ce qui le ferait rendre à chaque message du WebSocket s'il restait en place.
 */
export function QuickBar() {
  const [mode, setMode] = useState<Mode | null>(null);
  const { isEditMode } = useEditMode();

  useEffect(() => {
    // En mode édition, `e` et `c` n'ont pas à ouvrir quoi que ce soit : on y
    // renomme des pages et on y saisit du texte.
    if (isEditMode) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? '')) return;

      const key = e.key.toLowerCase();
      if (key !== 'e' && key !== 'c') return;
      e.preventDefault();
      setMode(key === 'e' ? 'entity' : 'command');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditMode]);

  if (!mode) return null;
  return <QuickBarPanel mode={mode} onClose={() => setMode(null)} />;
}
