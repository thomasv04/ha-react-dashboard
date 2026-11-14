"""La file complète de Music Assistant, par la connexion de son intégration HA."""

from __future__ import annotations

import pytest

from custom_components.ha_react_dashboard import music
from custom_components.ha_react_dashboard.const import DOMAIN

BASE = f"/api/{DOMAIN}/music"


@pytest.fixture
def verify_cleanup():
    """Même neutralisation que `test_api.py` (thread du serveur de test sous Windows)."""
    yield


class FakeMass:
    """Le client de l'intégration Music Assistant : `send_command` et ses réponses."""

    def __init__(self, answers=None, fail=False):
        self.answers = answers or {}
        self.fail = fail
        self.calls = []

    async def send_command(self, command, **args):
        self.calls.append((command, args))
        if self.fail:
            raise ConnectionError("MA arrêté")
        return self.answers.get(command)


@pytest.fixture
def mass(monkeypatch):
    fake = FakeMass(
        {
            "player_queues/items": [
                {
                    "queue_item_id": "x1",
                    "name": "Elton John - Tiny Dancer",
                    "duration": 377,
                    "image": {"path": "https://i.scdn.co/image/abc", "provider": "spotify", "remotely_accessible": True},
                    "media_item": {"name": "Tiny Dancer", "artists": [{"name": "Elton John"}]},
                },
                {"queue_item_id": "x2", "name": "Local", "image": {"path": "/media/a.jpg", "remotely_accessible": False}},
            ]
        }
    )
    monkeypatch.setattr(music, "_mass", lambda hass: fake)
    return fake


async def test_settings_say_the_integration_connects(hass, entry, hass_client, mass):
    client = await hass_client()
    response = await client.get(f"{BASE}/settings")
    assert await response.json() == {"configured": True, "url": "", "source": "integration"}


async def test_queue_is_read_through_music_assistant(hass, entry, hass_client, mass):
    client = await hass_client()
    response = await client.get(f"{BASE}/queue/88b228cb-4411?limit=50")
    assert response.status == 200
    assert await response.json() == [
        {"queue_item_id": "x1", "name": "Tiny Dancer", "artists": ["Elton John"], "duration": 377, "image": "https://i.scdn.co/image/abc"},
        # Une image locale passe par le proxy de MA, injoignable depuis la tablette.
        {"queue_item_id": "x2", "name": "Local", "artists": [], "duration": None, "image": None},
    ]
    assert mass.calls == [("player_queues/items", {"queue_id": "88b228cb-4411", "limit": 50, "offset": 0})]


async def test_queue_actions(hass, entry, hass_client, mass):
    client = await hass_client()
    assert (await client.post(f"{BASE}/queue/q1/move", json={"queue_item_id": "x1", "pos_shift": -1})).status == 200
    assert (await client.post(f"{BASE}/queue/q1/delete", json={"queue_item_id": "x1"})).status == 200
    assert (await client.post(f"{BASE}/queue/q1/play", json={"index": 3})).status == 200
    assert mass.calls == [
        ("player_queues/move_item", {"queue_id": "q1", "queue_item_id": "x1", "pos_shift": -1}),
        ("player_queues/delete_item", {"queue_id": "q1", "item_id_or_index": "x1"}),
        ("player_queues/play_index", {"queue_id": "q1", "index": 3}),
    ]


async def test_queue_refuses_malformed_requests(hass, entry, hass_client, mass):
    client = await hass_client()
    assert (await client.post(f"{BASE}/queue/q1/move", json={"queue_item_id": "x1", "pos_shift": "haut"})).status == 400
    assert (await client.post(f"{BASE}/queue/q1/play", json={"index": -1})).status == 400
    assert (await client.post(f"{BASE}/queue/q1/play", json={"index": True})).status == 400
    assert (await client.post(f"{BASE}/queue/q1/explode", json={})).status == 404
    assert mass.calls == []


async def test_without_music_assistant(hass, entry, hass_client, monkeypatch):
    monkeypatch.setattr(music, "_mass", lambda hass: None)
    client = await hass_client()
    assert await (await client.get(f"{BASE}/settings")).json() == {"configured": False, "url": "", "source": None}
    response = await client.get(f"{BASE}/queue/q1")
    assert response.status == 503
    assert (await response.json())["error"] == "not_configured"


async def test_music_assistant_down(hass, entry, hass_client, monkeypatch):
    monkeypatch.setattr(music, "_mass", lambda hass: FakeMass(fail=True))
    client = await hass_client()
    response = await client.get(f"{BASE}/queue/q1")
    assert response.status == 502


async def test_music_requires_authentication(hass, entry, hass_client_no_auth, mass):
    client = await hass_client_no_auth()
    assert (await client.get(f"{BASE}/queue/q1")).status == 401
