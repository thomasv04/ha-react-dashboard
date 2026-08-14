"""Persistance du dashboard.

Remplace la base SQLite du serveur Express : un seul `Store` HA
(`.storage/ha_react_dashboard`) qui contient les quatre blobs JSON utilisés par
le frontend. Pas de schéma, pas de migration — le frontend versionne déjà sa
config lui-même (`version: 2`).
"""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION


class DashboardStore:
    """Accès concurrent-safe aux blobs du dashboard."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._data: dict[str, Any] = {}

    async def async_load(self) -> None:
        self._data = await self._store.async_load() or {}

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    async def async_set(self, key: str, value: Any) -> None:
        self._data[key] = value
        await self._store.async_save(self._data)

    # ── Sous-dictionnaires (profils, réglages par appareil) ──────────────────

    def collection(self, key: str) -> dict[str, Any]:
        value = self._data.get(key)
        return value if isinstance(value, dict) else {}

    async def async_set_item(self, key: str, item_id: str, value: Any) -> None:
        collection = dict(self.collection(key))
        collection[item_id] = value
        await self.async_set(key, collection)

    async def async_delete_item(self, key: str, item_id: str) -> bool:
        collection = dict(self.collection(key))
        if item_id not in collection:
            return False
        del collection[item_id]
        await self.async_set(key, collection)
        return True
