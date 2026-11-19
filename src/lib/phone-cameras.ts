/** Ce qu'il faut d'une entité pour choisir les caméras du téléphone. */
type CameraEntity = { state: string; attributes?: Record<string, unknown> };

/** Les caméras de Home Assistant, dans l'ordre de leur identifiant ; une caméra indisponible n'en est pas. */
export function availableCameras(entities: Record<string, CameraEntity>): string[] {
  return Object.keys(entities)
    .filter(id => id.startsWith('camera.') && entities[id].state !== 'unavailable')
    .sort();
}

/**
 * La caméra côté Frigate : son nom et son instance, que l'intégration pose en
 * attributs (`camera_name`, `client_id`). Birdseye, la vue composée, n'a pas de
 * nom de caméra : elle n'en est pas une.
 */
export function frigateOf(entity: CameraEntity | undefined): { camera: string; instance: string } | undefined {
  const camera = entity?.attributes?.camera_name;
  if (typeof camera !== 'string' || !camera) return undefined;
  const instance = entity?.attributes?.client_id;
  return { camera, instance: typeof instance === 'string' && instance ? instance : 'frigate' };
}

/**
 * Les caméras de l'onglet Caméras, dans l'ordre : celles choisies dans les
 * Paramètres s'il y en a ; sinon les caméras Frigate, qui ont leurs événements
 * (les autres intégrations exposent souvent chaque flux en double) ; sinon
 * toutes.
 */
export function shownCameras(entities: Record<string, CameraEntity>, chosen: readonly string[]): string[] {
  const all = availableCameras(entities);
  if (chosen.length > 0) return chosen.filter(id => all.includes(id));
  const frigate = all.filter(id => frigateOf(entities[id]));
  return frigate.length > 0 ? frigate : all;
}
