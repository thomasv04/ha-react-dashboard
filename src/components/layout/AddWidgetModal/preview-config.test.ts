import { describe, it, expect } from 'vitest';
import { previewConfig } from './preview-config';
import { WIDGET_META, WIDGET_FIELD_DEFS } from '@/widgets';
import { MOCK_ENTITIES } from '@/mocks/hassEntities';

describe('previewConfig()', () => {
  // L'aperçu du catalogue rendait chaque card avec sa config par défaut, qui ne
  // désigne aucune entité : « Serrure introuvable », « Entité introuvable »,
  // « Aucune automatisation configurée » à la place d'un exemple.
  it("remplit l'entité d'une card qui n'en a pas", () => {
    expect(previewConfig('lock', 'lock').entityId).toBe('lock.front_door');
  });

  it("remplit les listes d'entités", () => {
    expect(previewConfig('automation_list').automations).toEqual([
      { entityId: 'automation.lumieres_soiree' },
      { entityId: 'automation.volets_matin' },
      { entityId: 'automation.alarme_nuit' },
    ]);
  });

  // Le filet de sécurité : un widget ajouté demain hérite du remplissage, à
  // condition qu'il existe une entité factice de son domaine.
  it('trouve un exemple pour chaque domaine du catalogue', () => {
    const domains = new Set<string>();
    for (const meta of WIDGET_META) {
      if (meta.entityDomain) domains.add(meta.entityDomain);
      for (const f of WIDGET_FIELD_DEFS[meta.type] ?? []) {
        if (f.fieldType === 'entity' && f.domain) domains.add(f.domain);
      }
    }
    const ids = Object.keys(MOCK_ENTITIES);
    const orphans = [...domains].filter(d => !ids.some(id => id.startsWith(`${d}.`)));
    expect(orphans).toEqual([]);
  });
});
