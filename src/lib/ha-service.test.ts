import { describe, expect, it } from 'vitest';
import { isActiveState, toggleService } from './ha-service';

describe('toggleService', () => {
  // Une serrure déverrouillée comptait comme active : sa bascule la
  // déverrouillait encore, et rien ne pouvait la verrouiller.
  it('locks an unlocked lock, and unlocks a locked one', () => {
    expect(toggleService('lock', isActiveState('unlocked'))).toEqual(['lock', 'lock']);
    expect(toggleService('lock', isActiveState('locked'))).toEqual(['lock', 'unlock']);
  });
});
