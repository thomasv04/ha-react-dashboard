import { useEffect } from 'react';
import { usePages } from '@/context/PageContext';

/**
 * Synchronise la page active avec le hash de l'URL.
 * - Au montage : lit le hash pour naviguer vers la bonne page
 * - Quand la page change : met à jour le hash
 * - Écoute les changements de hash (bouton back du navigateur)
 */
export function usePageRouting() {
  const { currentPageId, setCurrentPage, pages } = usePages();

  // Lire la page depuis le hash au montage
  useEffect(() => {
    const hash = window.location.hash.slice(1); // #lumieres → "lumieres"
    if (hash && pages.some(p => p.id === hash)) {
      setCurrentPage(hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mettre à jour le hash quand la page change
  useEffect(() => {
    if (currentPageId !== 'home') {
      window.location.hash = currentPageId;
    } else {
      // Supprimer le hash pour la page d'accueil
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [currentPageId]);

  // Écouter les changements de hash (bouton back du navigateur)
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && pages.some(p => p.id === hash)) {
        setCurrentPage(hash);
      } else {
        setCurrentPage('home');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [pages, setCurrentPage]);
}
