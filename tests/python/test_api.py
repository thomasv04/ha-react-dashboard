"""L'API qui remplace le serveur Express de l'add-on."""

from __future__ import annotations

import base64
from pathlib import Path

import aiohttp
import pytest

from custom_components.ha_react_dashboard.const import DOMAIN, UPLOAD_DIR

BASE = f"/api/{DOMAIN}"

# 1×1 pixel, le plus petit PNG valide.
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


@pytest.fixture
def verify_cleanup():
    """Neutralise la vérification de fin de test du harnais, pour ce module seul.

    Le serveur de test aiohttp laisse sous Windows un thread `_run_safe_shutdown_loop`
    que le harnais refuse ; les autres modules gardent la vérification complète.
    """
    yield


def _upload(field: str, payload: bytes, filename: str, content_type: str):
    form = aiohttp.FormData()
    form.add_field(field, payload, filename=filename, content_type=content_type)
    return form


# ── Authentification ──────────────────────────────────────────────────────────


async def test_api_requires_authentication(hass, entry, hass_client_no_auth):
    """Sans jeton HA, l'API doit se taire — c'est la config de la maison."""
    client = await hass_client_no_auth()
    assert (await client.get(f"{BASE}/config")).status == 401
    assert (await client.get(f"{BASE}/profiles")).status == 401
    assert (await client.get(f"{BASE}/settings/current")).status == 401


# ── Config ────────────────────────────────────────────────────────────────────


async def test_config_is_empty_at_first(hass, entry, hass_client):
    client = await hass_client()
    response = await client.get(f"{BASE}/config")
    assert response.status == 200
    assert await response.json() == {"message": "No config yet", "layout": []}


async def test_config_roundtrip(hass, entry, hass_client):
    client = await hass_client()
    config = {"version": 2, "pages": [{"id": "home"}], "layouts": {}}

    assert (await client.put(f"{BASE}/config", json=config)).status == 200
    assert await (await client.get(f"{BASE}/config")).json() == config


async def test_config_survives_a_restart(hass, entry, hass_client):
    """Le store doit relire ce qu'il a écrit, pas juste le garder en mémoire."""
    client = await hass_client()
    await client.put(f"{BASE}/config", json={"version": 2, "pages": []})

    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    assert await (await client.get(f"{BASE}/config")).json() == {
        "version": 2,
        "pages": [],
    }


async def test_config_rejects_a_non_object(hass, entry, hass_client):
    client = await hass_client()
    assert (await client.put(f"{BASE}/config", json=["nope"])).status == 400


# ── Profils ───────────────────────────────────────────────────────────────────


async def test_profiles_crud(hass, entry, hass_client):
    client = await hass_client()

    created = await (
        await client.post(f"{BASE}/profiles", json={"label": "Salon", "data": {"a": 1}})
    ).json()
    assert created["label"] == "Salon"
    profile_id = created["id"]

    listed = await (await client.get(f"{BASE}/profiles")).json()
    assert len(listed) == 1
    assert listed[0]["label"] == "Salon"
    assert listed[0]["created_at"]
    # La liste ne transporte pas les données : elle sert juste au sélecteur.
    assert "data" not in listed[0]

    full = await (await client.get(f"{BASE}/profiles/{profile_id}")).json()
    assert full["data"] == {"a": 1}

    assert (
        await client.put(f"{BASE}/profiles/{profile_id}", json={"label": "Cuisine"})
    ).status == 200
    updated = await (await client.get(f"{BASE}/profiles/{profile_id}")).json()
    assert updated["label"] == "Cuisine"
    # Une mise à jour partielle ne doit pas effacer les données.
    assert updated["data"] == {"a": 1}

    assert (await client.delete(f"{BASE}/profiles/{profile_id}")).status == 200
    assert await (await client.get(f"{BASE}/profiles")).json() == []


async def test_profiles_missing_fields_and_unknown_id(hass, entry, hass_client):
    client = await hass_client()
    assert (await client.post(f"{BASE}/profiles", json={"label": "x"})).status == 400
    assert (await client.get(f"{BASE}/profiles/nope")).status == 404
    assert (await client.put(f"{BASE}/profiles/nope", json={})).status == 404
    assert (await client.delete(f"{BASE}/profiles/nope")).status == 404


# ── Réglages par appareil ─────────────────────────────────────────────────────


async def test_settings_are_per_device(hass, entry, hass_client):
    client = await hass_client()

    assert await (await client.get(f"{BASE}/settings/current?device_id=tablette")).json() == {
        "message": "No settings",
        "revision": 0,
    }

    saved = await (
        await client.put(
            f"{BASE}/settings/current",
            json={"device_id": "tablette", "data": {"volume": 3}},
        )
    ).json()
    assert saved == {"success": True, "revision": 1}

    read = await (await client.get(f"{BASE}/settings/current?device_id=tablette")).json()
    assert read["data"] == {"volume": 3}
    assert read["revision"] == 1

    # Un autre appareil garde ses propres réglages.
    other = await (await client.get(f"{BASE}/settings/current?device_id=telephone")).json()
    assert other["revision"] == 0


async def test_settings_reject_a_stale_revision(hass, entry, hass_client):
    """Deux tablettes qui écrivent en même temps ne doivent pas s'écraser."""
    client = await hass_client()
    await client.put(
        f"{BASE}/settings/current", json={"device_id": "t", "data": {"v": 1}}
    )

    conflict = await client.put(
        f"{BASE}/settings/current",
        json={"device_id": "t", "data": {"v": 2}, "expected_revision": 0},
    )
    assert conflict.status == 409
    assert (await conflict.json())["current_revision"] == 1

    # Sans révision attendue, on écrase volontairement.
    forced = await client.put(
        f"{BASE}/settings/current", json={"device_id": "t", "data": {"v": 3}}
    )
    assert (await forced.json())["revision"] == 2


async def test_settings_sanitize_the_device_id(hass, entry, hass_client):
    """Un identifiant douteux retombe sur `default` au lieu de créer une clé."""
    client = await hass_client()
    await client.put(
        f"{BASE}/settings/current",
        json={"device_id": "../../etc/passwd", "data": {"v": 1}},
    )
    stored = hass.data[DOMAIN][entry.entry_id].collection("settings")
    assert list(stored) == ["default"]


async def test_settings_reject_invalid_data(hass, entry, hass_client):
    client = await hass_client()
    response = await client.put(f"{BASE}/settings/current", json={"data": "nope"})
    assert response.status == 400


# ── Traductions ───────────────────────────────────────────────────────────────


async def test_translation_overrides_roundtrip(hass, entry, hass_client):
    client = await hass_client()
    assert await (await client.get(f"{BASE}/translations/overrides")).json() == {
        "overrides": {}
    }

    assert (
        await client.put(
            f"{BASE}/translations/overrides",
            json={"overrides": {"widgets.light.label": "Lumière"}},
        )
    ).status == 200

    assert await (await client.get(f"{BASE}/translations/overrides")).json() == {
        "overrides": {"widgets.light.label": "Lumière"}
    }


async def test_translation_overrides_reject_non_strings(hass, entry, hass_client):
    client = await hass_client()
    response = await client.put(
        f"{BASE}/translations/overrides", json={"overrides": {"a": 12}}
    )
    assert response.status == 400


# ── Téléversements ────────────────────────────────────────────────────────────


async def test_background_upload_and_delete(hass, entry, hass_client):
    client = await hass_client()

    response = await client.post(
        f"{BASE}/uploads/background", data=_upload("image", PNG, "bg.png", "image/png")
    )
    assert response.status == 201
    url = (await response.json())["url"]
    # Forme conservée entre add-on et carte ; le frontend la résout à l'affichage.
    assert url.startswith("/uploads/")

    filename = url.rsplit("/", 1)[-1]
    on_disk = Path(hass.config.path(UPLOAD_DIR, "uploads", filename))
    assert on_disk.is_file()
    assert on_disk.read_bytes() == PNG

    # Servi en statique, sans authentification : un `url()` CSS ne peut pas
    # porter d'en-tête.
    served = await client.get(f"/{DOMAIN}_files/{filename}")
    assert served.status == 200
    assert await served.read() == PNG

    assert (await client.delete(f"{BASE}/uploads/background/{filename}")).status == 200
    assert not on_disk.exists()
    assert (await client.delete(f"{BASE}/uploads/background/{filename}")).status == 404


async def test_background_upload_rejects_other_types(hass, entry, hass_client):
    client = await hass_client()
    response = await client.post(
        f"{BASE}/uploads/background",
        data=_upload("image", b"<svg/>", "x.svg", "image/svg+xml"),
    )
    assert response.status == 400


async def test_background_upload_needs_a_file(hass, entry, hass_client):
    client = await hass_client()
    form = aiohttp.FormData()
    form.add_field("image", "pas un fichier")
    assert (await client.post(f"{BASE}/uploads/background", data=form)).status == 400


async def test_icons_upload_list_and_delete(hass, entry, hass_client):
    client = await hass_client()

    response = await client.post(
        f"{BASE}/uploads/icons", data=_upload("icon", PNG, "lampe.png", "image/png")
    )
    assert response.status == 201
    created = await response.json()
    assert created["originalName"] == "lampe.png"
    assert created["url"].startswith("/uploads/icons/")

    listed = await (await client.get(f"{BASE}/uploads/icons")).json()
    assert len(listed) == 1
    assert listed[0]["url"] == created["url"]

    filename = created["filename"]
    served = await client.get(f"/{DOMAIN}_files/icons/{filename}")
    assert served.status == 200

    assert (await client.delete(f"{BASE}/uploads/icons/{filename}")).status == 200
    assert await (await client.get(f"{BASE}/uploads/icons")).json() == []


async def test_icons_reject_svg(hass, entry, hass_client):
    """Un SVG non nettoyé servi en même origine, c'est une XSS."""
    client = await hass_client()
    response = await client.post(
        f"{BASE}/uploads/icons",
        data=_upload("icon", b"<svg onload=alert(1)/>", "x.svg", "image/svg+xml"),
    )
    assert response.status == 400


async def test_upload_delete_rejects_a_path(hass, entry, hass_client):
    """Aucun moyen de sortir du dossier des téléversements."""
    client = await hass_client()
    response = await client.delete(f"{BASE}/uploads/background/..%2F..%2Fsecrets.yaml")
    assert response.status in (400, 404)


# ── Bundle ────────────────────────────────────────────────────────────────────


async def test_bundle_is_served(hass, entry, hass_client):
    """L'entrée JS doit être servie — c'est elle qui enregistre la carte."""
    client = await hass_client()
    response = await client.get(f"/{DOMAIN}_static/ha-react-dashboard.js")
    assert response.status == 200
    body = await response.text()
    assert "ha-react-dashboard-panel" in body
