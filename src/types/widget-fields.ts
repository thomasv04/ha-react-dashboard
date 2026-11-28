export interface WidgetFieldDef {
  key: string;
  label: string;
  fieldType:
    | 'entity'
    | 'text'
    | 'number'
    | 'boolean'
    | 'entity-list'
    | 'list'
    | 'icon'
    | 'gradient'
    | 'template'
    | 'select'
    | 'multiselect'
    | 'weather-icons'
    | 'panel-select'
    /** Zone HA + commandes qu'elle apporte ; écrit `area` et `areaControls`. */
    | 'area-controls'
    /** Une zone HA seule (son `area_id`), dans un élément de liste. */
    | 'area';
  /** For entity fields: filter by domain (e.g. 'sensor', 'climate') */
  domain?: string;
  /** For list fields: sub-fields of each item */
  itemFields?: WidgetFieldDef[];
  /** For select / multiselect fields: available options */
  options?: { value: string; label: string; icon?: string }[];
  /** Affiche le champ seulement si la config en cours d'édition le permet. */
  showIf?: (config: Record<string, unknown>) => boolean;
}
