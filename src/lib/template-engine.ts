import nunjucks from 'nunjucks';

interface EntityState {
  state: string;
  attributes: Record<string, unknown>;
}

type EntitiesMap = Record<string, EntityState | undefined>;
type GetEntities = () => EntitiesMap;

/**
 * Environnement Nunjucks singleton avec les fonctions Home Assistant injectées.
 * Compatible avec la syntaxe Jinja2 de HA / Mushroom Templates.
 *
 * Fonctions disponibles dans les templates :
 *   states('entity.id')                → état sous forme de string
 *   state_attr('entity.id', 'attr')    → valeur d'un attribut
 *   is_state('entity.id', 'value')     → boolean
 *   has_value('entity.id')             → true si pas unknown/unavailable
 *   iif(condition, si_vrai, si_faux)   → ternaire lisible
 *
 * Filtres supplémentaires :
 *   | round(2)      → arrondi à N décimales
 *   | float(0)      → parse en float (défaut si NaN)
 *   | int(0)        → parse en int
 *   | multiply(1.5) → multiplication
 *   | divide(2)     → division
 */
class HATemplateEngine {
  private env: nunjucks.Environment;
  private getEntities: GetEntities = () => ({});
  private userName = '';

  constructor() {
    this.env = new nunjucks.Environment(null, { autoescape: false });
    this.registerHAGlobals();
    this.registerHAFilters();
  }

  /** Lie le moteur à la source d'entités HA (appelé par useTemplate) */
  bind(getter: GetEntities): void {
    this.getEntities = getter;
  }

  /** Définit le nom de l'utilisateur HA connecté (disponible via {{ user }}) */
  setUser(name: string): void {
    this.userName = name;
    this.env.addGlobal('user', name);
  }

  // ── Fonctions HA ────────────────────────────────────────────────────────────

  private registerHAGlobals(): void {
    const self = this;

    this.env.addGlobal('states', (entityId: string): string => {
      const entity = self.getEntities()[entityId];
      return entity?.state ?? 'unknown';
    });

    this.env.addGlobal('state_attr', (entityId: string, attr: string): unknown => {
      const entity = self.getEntities()[entityId];
      return entity?.attributes?.[attr] ?? null;
    });

    // Alias courant dans Mushroom
    this.env.addGlobal('states_attr', (entityId: string, attr: string): unknown => {
      const entity = self.getEntities()[entityId];
      return entity?.attributes?.[attr] ?? null;
    });

    this.env.addGlobal('is_state', (entityId: string, value: string): boolean => {
      const entity = self.getEntities()[entityId];
      return entity?.state === String(value);
    });

    this.env.addGlobal('has_value', (entityId: string): boolean => {
      const state = self.getEntities()[entityId]?.state ?? 'unavailable';
      return state !== 'unknown' && state !== 'unavailable';
    });

    // Ternaire dans un appel de fonction (plus lisible que ?: dans Nunjucks)
    this.env.addGlobal(
      'iif',
      (condition: unknown, ifTrue: unknown, ifFalse: unknown): unknown =>
        condition ? ifTrue : ifFalse,
    );
  }

  // ── Filtres supplémentaires ──────────────────────────────────────────────────

  private registerHAFilters(): void {
    this.env.addFilter('round', (num: unknown, precision = 0): number => {
      const n = parseFloat(String(num));
      if (isNaN(n)) return 0;
      const factor = Math.pow(10, precision);
      return Math.round(n * factor) / factor;
    });

    this.env.addFilter('float', (v: unknown, defaultVal = 0): number => {
      const n = parseFloat(String(v));
      return isNaN(n) ? defaultVal : n;
    });

    this.env.addFilter('int', (v: unknown, defaultVal = 0): number => {
      const n = parseInt(String(v), 10);
      return isNaN(n) ? defaultVal : n;
    });

    this.env.addFilter('multiply', (v: unknown, factor: number): number => {
      return parseFloat(String(v)) * factor;
    });

    this.env.addFilter('divide', (v: unknown, by: number): number => {
      const n = parseFloat(String(v));
      return by !== 0 ? n / by : 0;
    });
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────

  /**
   * Résout un template Nunjucks avec l'état HA courant.
   * @returns La string résolue, ou un message d'erreur préfixé par "[Erreur template]"
   */
  render(template: string): string {
    try {
      return this.env.renderString(template, {}).trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[TemplateEngine] Error:', msg, '\nTemplate:', template);
      return `[Erreur template: ${msg}]`;
    }
  }

  /**
   * Vérifie la syntaxe d'un template sans l'évaluer.
   * @returns null si valide, string d'erreur si invalide
   */
  validate(template: string): string | null {
    try {
      // compile + renderString to catch both syntax and runtime errors
      this.env.renderString(template, {});
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  }
}

/** Singleton — partagé par toute l'application */
export const templateEngine = new HATemplateEngine();
