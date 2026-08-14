"""Vues HTTP — l'équivalent HA des routes Express de l'add-on.

Le bundle React tourne ici sur l'origine de Home Assistant : le serveur Express
de l'add-on n'est plus joignable. Ces vues rejouent le même contrat REST sous
`/api/ha_react_dashboard/`, avec l'authentification HA native.
"""

from __future__ import annotations

import re
import uuid
from pathlib import Path
from typing import Any

from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    ICON_TYPES,
    IMAGE_TYPES,
    MAX_ICON_SIZE,
    MAX_IMAGE_SIZE,
    UPLOAD_DIR,
)
from .store import DashboardStore

BASE = f"/api/{DOMAIN}"
DEVICE_ID_RE = re.compile(r"^[\w-]{1,128}$")


def _uploads_path(hass: HomeAssistant) -> Path:
    return Path(hass.config.path(UPLOAD_DIR, "uploads"))


def _safe_name(filename: str) -> str | None:
    """Refuse tout ce qui n'est pas un simple nom de fichier."""
    if not filename or "/" in filename or "\\" in filename or filename.startswith("."):
        return None
    return filename


class _Base(HomeAssistantView):
    """Vue partageant l'accès au store."""

    def __init__(self, hass: HomeAssistant, store: DashboardStore) -> None:
        self.hass = hass
        self.store = store


# ── Config ────────────────────────────────────────────────────────────────────


class ConfigView(_Base):
    url = f"{BASE}/config"
    name = f"api:{DOMAIN}:config"

    async def get(self, request: web.Request) -> web.Response:
        config = self.store.get("config")
        if config is None:
            return self.json({"message": "No config yet", "layout": []})
        return self.json(config)

    async def put(self, request: web.Request) -> web.Response:
        body = await request.json()
        if not isinstance(body, dict):
            return self.json({"error": "Invalid config"}, status_code=400)
        await self.store.async_set("config", body)
        return self.json({"success": True})


# ── Profils ───────────────────────────────────────────────────────────────────


class ProfilesView(_Base):
    url = f"{BASE}/profiles"
    name = f"api:{DOMAIN}:profiles"

    async def get(self, request: web.Request) -> web.Response:
        profiles = self.store.collection("profiles")
        return self.json(
            [
                {k: v for k, v in profile.items() if k != "data"}
                for profile in profiles.values()
            ]
        )

    async def post(self, request: web.Request) -> web.Response:
        body = await request.json()
        label, data = body.get("label"), body.get("data")
        if not label or data is None:
            return self.json({"error": "Missing label or data"}, status_code=400)

        profile_id = str(uuid.uuid4())
        now = dt_util.utcnow().isoformat()
        await self.store.async_set_item(
            "profiles",
            profile_id,
            {
                "id": profile_id,
                "label": label,
                "data": data,
                "created_at": now,
                "updated_at": now,
            },
        )
        return self.json({"id": profile_id, "label": label}, status_code=201)


class ProfileView(_Base):
    url = f"{BASE}/profiles/{{profile_id}}"
    name = f"api:{DOMAIN}:profile"

    async def get(self, request: web.Request, profile_id: str) -> web.Response:
        profile = self.store.collection("profiles").get(profile_id)
        if profile is None:
            return self.json({"error": "Profile not found"}, status_code=404)
        return self.json(profile)

    async def put(self, request: web.Request, profile_id: str) -> web.Response:
        profile = self.store.collection("profiles").get(profile_id)
        if profile is None:
            return self.json({"error": "Profile not found"}, status_code=404)

        body = await request.json()
        updated = {**profile}
        if body.get("label") is not None:
            updated["label"] = body["label"]
        if body.get("data") is not None:
            updated["data"] = body["data"]
        updated["updated_at"] = dt_util.utcnow().isoformat()
        await self.store.async_set_item("profiles", profile_id, updated)
        return self.json({"success": True})

    async def delete(self, request: web.Request, profile_id: str) -> web.Response:
        if not await self.store.async_delete_item("profiles", profile_id):
            return self.json({"error": "Profile not found"}, status_code=404)
        return self.json({"success": True})


# ── Réglages par appareil ─────────────────────────────────────────────────────


class SettingsView(_Base):
    url = f"{BASE}/settings/current"
    name = f"api:{DOMAIN}:settings"

    @staticmethod
    def _device_id(raw: Any) -> str:
        return raw if isinstance(raw, str) and DEVICE_ID_RE.match(raw) else "default"

    async def get(self, request: web.Request) -> web.Response:
        device_id = self._device_id(request.query.get("device_id"))
        settings = self.store.collection("settings").get(device_id)
        if settings is None:
            return self.json({"message": "No settings", "revision": 0})
        return self.json(settings)

    async def put(self, request: web.Request) -> web.Response:
        body = await request.json()
        data = body.get("data")
        if not isinstance(data, dict):
            return self.json({"error": "Invalid settings data"}, status_code=400)

        device_id = self._device_id(body.get("device_id"))
        current = self.store.collection("settings").get(device_id)
        expected = body.get("expected_revision")

        # Même garde-fou que l'add-on : deux tablettes qui écrivent en même
        # temps ne doivent pas s'écraser en silence.
        if current and expected is not None and current.get("revision") != expected:
            return self.json(
                {
                    "error": "Conflict",
                    "current_revision": current.get("revision"),
                    "message": "Settings were modified by another device",
                },
                status_code=409,
            )

        revision = (current or {}).get("revision", 0) + 1
        await self.store.async_set_item(
            "settings",
            device_id,
            {"device_id": device_id, "data": data, "revision": revision},
        )
        return self.json({"success": True, "revision": revision})


# ── Traductions ───────────────────────────────────────────────────────────────


class TranslationsView(_Base):
    url = f"{BASE}/translations/overrides"
    name = f"api:{DOMAIN}:translations"

    async def get(self, request: web.Request) -> web.Response:
        return self.json({"overrides": self.store.get("translations", {})})

    async def put(self, request: web.Request) -> web.Response:
        body = await request.json()
        overrides = body.get("overrides") if isinstance(body, dict) else None
        if not isinstance(overrides, dict):
            return self.json({"error": "Invalid overrides data"}, status_code=400)
        if any(
            not isinstance(k, str)
            or not isinstance(v, str)
            or len(k) > 256
            or len(v) > 2048
            for k, v in overrides.items()
        ):
            return self.json(
                {"error": "All keys and values must be strings"}, status_code=400
            )
        await self.store.async_set("translations", overrides)
        return self.json({"success": True})


# ── Téléversements ────────────────────────────────────────────────────────────


class _UploadBase(_Base):
    """Écriture et suppression de fichiers, hors boucle d'événements."""

    async def _save(
        self,
        request: web.Request,
        field: str,
        allowed: dict[str, str],
        max_size: int,
        subdir: str = "",
    ) -> tuple[dict[str, Any] | None, web.Response | None]:
        data = await request.post()
        file = data.get(field)
        if not isinstance(file, web.FileField):
            return None, self.json({"error": "No file received."}, status_code=400)

        extension = allowed.get(file.content_type)
        if extension is None:
            return None, self.json(
                {"error": f"Unsupported file type: {file.content_type}"},
                status_code=400,
            )

        payload = file.file.read(max_size + 1)
        if len(payload) > max_size:
            return None, self.json({"error": "File too large."}, status_code=413)

        filename = f"{uuid.uuid4()}{extension}"
        directory = _uploads_path(self.hass) / subdir

        def _write() -> None:
            directory.mkdir(parents=True, exist_ok=True)
            (directory / filename).write_bytes(payload)

        await self.hass.async_add_executor_job(_write)
        return (
            {
                "filename": filename,
                "originalName": file.filename,
                "mimeType": file.content_type,
                "size": len(payload),
            },
            None,
        )

    async def _delete_file(self, subdir: str, filename: str) -> None:
        path = _uploads_path(self.hass) / subdir / filename

        def _unlink() -> None:
            path.unlink(missing_ok=True)

        await self.hass.async_add_executor_job(_unlink)


class BackgroundUploadView(_UploadBase):
    url = f"{BASE}/uploads/background"
    name = f"api:{DOMAIN}:uploads:background"

    async def post(self, request: web.Request) -> web.Response:
        meta, error = await self._save(request, "image", IMAGE_TYPES, MAX_IMAGE_SIZE)
        if error is not None:
            return error
        assert meta is not None
        images = [*self.store.get("images", []), meta]
        await self.store.async_set("images", images)
        # Forme conservée entre add-on et carte : le frontend résout `/uploads/…`
        # vers la bonne base au moment de l'affichage.
        return self.json({"url": f"/uploads/{meta['filename']}"}, status_code=201)


class BackgroundFileView(_UploadBase):
    url = f"{BASE}/uploads/background/{{filename}}"
    name = f"api:{DOMAIN}:uploads:background:file"

    async def delete(self, request: web.Request, filename: str) -> web.Response:
        safe = _safe_name(filename)
        if safe is None:
            return self.json({"error": "Invalid filename."}, status_code=400)
        images = [i for i in self.store.get("images", []) if i["filename"] != safe]
        if len(images) == len(self.store.get("images", [])):
            return self.json({"error": "Image not found."}, status_code=404)
        await self._delete_file("", safe)
        await self.store.async_set("images", images)
        return self.json({"ok": True})


class IconsView(_UploadBase):
    url = f"{BASE}/uploads/icons"
    name = f"api:{DOMAIN}:uploads:icons"

    async def get(self, request: web.Request) -> web.Response:
        return self.json(
            [
                {**icon, "url": f"/uploads/icons/{icon['filename']}"}
                for icon in self.store.get("icons", [])
            ]
        )

    async def post(self, request: web.Request) -> web.Response:
        meta, error = await self._save(
            request, "icon", ICON_TYPES, MAX_ICON_SIZE, subdir="icons"
        )
        if error is not None:
            return error
        assert meta is not None
        await self.store.async_set("icons", [meta, *self.store.get("icons", [])])
        return self.json(
            {
                "url": f"/uploads/icons/{meta['filename']}",
                "filename": meta["filename"],
                "originalName": meta["originalName"],
            },
            status_code=201,
        )


class IconFileView(_UploadBase):
    url = f"{BASE}/uploads/icons/{{filename}}"
    name = f"api:{DOMAIN}:uploads:icons:file"

    async def delete(self, request: web.Request, filename: str) -> web.Response:
        safe = _safe_name(filename)
        if safe is None:
            return self.json({"error": "Invalid filename."}, status_code=400)
        icons = [i for i in self.store.get("icons", []) if i["filename"] != safe]
        if len(icons) == len(self.store.get("icons", [])):
            return self.json({"error": "Icon not found."}, status_code=404)
        await self._delete_file("icons", safe)
        await self.store.async_set("icons", icons)
        return self.json({"ok": True})


def async_register_views(hass: HomeAssistant, store: DashboardStore) -> None:
    """Enregistre toutes les vues.

    Les fichiers eux-mêmes ne passent pas par ici : ils sont servis en statique
    (voir `FILES_URL`). Une vue HA est authentifiée pour toutes ses méthodes —
    la rendre publique pour qu'un `<img>` puisse lire une icône ouvrirait aussi
    sa suppression.
    """
    for view in (
        ConfigView,
        ProfilesView,
        ProfileView,
        SettingsView,
        TranslationsView,
        BackgroundUploadView,
        BackgroundFileView,
        IconsView,
        IconFileView,
    ):
        hass.http.register_view(view(hass, store))
