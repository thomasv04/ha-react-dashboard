"""File d'attente complète de Music Assistant — l'équivalent de `server/routes/music.js`.

HA n'expose de la file que le titre en cours et le suivant. L'add-on interroge
Music Assistant (MA) avec un jeton ; ici, inutile : l'intégration tourne dans
Home Assistant, où l'intégration Music Assistant tient déjà une connexion
authentifiée au serveur MA (`entry.runtime_data.mass`). On l'emprunte.

Même contrat que l'add-on, sous `/api/ha_react_dashboard/music/` :

    GET  /music/settings                       → { configured, url, source }
    GET  /music/queue/{queue_id}?offset&limit  → les titres de la file
    POST /music/queue/{queue_id}/move    { queue_item_id, pos_shift }
    POST /music/queue/{queue_id}/delete  { queue_item_id }
    POST /music/queue/{queue_id}/play    { index }
"""

from __future__ import annotations

import logging
import re
from typing import Any

from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

BASE = f"/api/{DOMAIN}/music"
#: Un identifiant de file MA (celui du lecteur) ou d'un titre de la file.
_ID = re.compile(r"^[\w.-]{1,100}$")
_URL = re.compile(r"^https?://")


def _mass(hass: HomeAssistant) -> Any | None:
    """Le client MA de l'intégration Music Assistant, s'il y en a une chargée."""
    for entry in hass.config_entries.async_entries("music_assistant"):
        if entry.state is not ConfigEntryState.LOADED:
            continue
        mass = getattr(getattr(entry, "runtime_data", None), "mass", None)
        if mass is not None:
            return mass
    return None


def _image_url(image: Any) -> str | None:
    """Une image MA publique (une URL `http`) ; les autres passent par le proxy de MA."""
    if not isinstance(image, dict) or not image.get("remotely_accessible"):
        return None
    path = str(image.get("path") or "")
    return path if _URL.match(path) else None


def to_queue_item(item: dict[str, Any]) -> dict[str, Any]:
    """Un titre de la file, réduit à ce que l'écran montre (comme `toQueueItem`)."""
    media = item.get("media_item") or {}
    images = (media.get("metadata") or {}).get("images") or []
    thumb = next((i for i in images if isinstance(i, dict) and i.get("type") == "thumb"), None)
    duration = item.get("duration")
    return {
        "queue_item_id": str(item.get("queue_item_id") or ""),
        "name": str(media.get("name") or item.get("name") or ""),
        "artists": [str(a.get("name")) for a in media.get("artists") or [] if isinstance(a, dict) and a.get("name")],
        "duration": duration if isinstance(duration, (int, float)) else None,
        "image": _image_url(item.get("image")) or _image_url(media.get("image")) or _image_url(thumb),
    }


class _MusicBase(HomeAssistantView):
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def _run(self, command: str, shape=lambda result: result if result is not None else {"ok": True}, **args: Any):
        mass = _mass(self.hass)
        if mass is None:
            return self.json({"error": "not_configured"}, status_code=503)
        try:
            result = await mass.send_command(command, **args)
        except Exception as err:  # noqa: BLE001 — toute panne de MA devient un 502 lisible
            _LOGGER.warning("Music Assistant %s: %s", command, err)
            return self.json({"error": "unreachable"}, status_code=502)
        return self.json(shape(result))


class MusicSettingsView(_MusicBase):
    """Rien à saisir ici : la connexion est celle de l'intégration Music Assistant."""

    url = f"{BASE}/settings"
    name = f"api:{DOMAIN}:music:settings"

    async def get(self, request: web.Request) -> web.Response:
        configured = _mass(self.hass) is not None
        return self.json({"configured": configured, "url": "", "source": "integration" if configured else None})


class MusicQueueView(_MusicBase):
    url = f"{BASE}/queue/{{queue_id}}"
    name = f"api:{DOMAIN}:music:queue"

    async def get(self, request: web.Request, queue_id: str) -> web.Response:
        if not _ID.match(queue_id):
            return self.json({"error": "invalid_queue"}, status_code=400)
        try:
            offset = max(0, int(request.query.get("offset", 0)))
            limit = min(500, max(1, int(request.query.get("limit", 200))))
        except ValueError:
            return self.json({"error": "invalid_range"}, status_code=400)
        return await self._run(
            "player_queues/items",
            lambda items: [to_queue_item(i) for i in items] if isinstance(items, list) else [],
            queue_id=queue_id,
            limit=limit,
            offset=offset,
        )


class MusicQueueActionView(_MusicBase):
    url = f"{BASE}/queue/{{queue_id}}/{{action}}"
    name = f"api:{DOMAIN}:music:queue:action"

    async def post(self, request: web.Request, queue_id: str, action: str) -> web.Response:
        if not _ID.match(queue_id):
            return self.json({"error": "invalid_queue"}, status_code=400)
        try:
            body = await request.json()
        except ValueError:
            body = {}
        if not isinstance(body, dict):
            body = {}
        item_id = body.get("queue_item_id")
        valid_item = isinstance(item_id, str) and bool(_ID.match(item_id))

        if action == "move":
            shift = body.get("pos_shift")
            if not valid_item or not isinstance(shift, int) or isinstance(shift, bool) or abs(shift) > 1000:
                return self.json({"error": "invalid_move"}, status_code=400)
            return await self._run("player_queues/move_item", queue_id=queue_id, queue_item_id=item_id, pos_shift=shift)
        if action == "delete":
            if not valid_item:
                return self.json({"error": "invalid_item"}, status_code=400)
            return await self._run("player_queues/delete_item", queue_id=queue_id, item_id_or_index=item_id)
        if action == "play":
            index = body.get("index")
            if not isinstance(index, int) or isinstance(index, bool) or index < 0:
                return self.json({"error": "invalid_index"}, status_code=400)
            return await self._run("player_queues/play_index", queue_id=queue_id, index=index)
        return self.json({"error": "unknown_action"}, status_code=404)


def async_register_music_views(hass: HomeAssistant) -> None:
    for view in (MusicSettingsView, MusicQueueView, MusicQueueActionView):
        hass.http.register_view(view(hass))
