"""Le tableau de bord apparaît bien dans la liste que lit le frontend."""

from __future__ import annotations

import pytest

from custom_components.ha_react_dashboard.const import DASHBOARD_URL_PATH


@pytest.fixture
def verify_cleanup():
    """Neutralise la vérification de fin de test du harnais, pour ce module seul.

    Le serveur de test aiohttp laisse sous Windows un thread `_run_safe_shutdown_loop`
    que le harnais refuse ; les autres modules gardent la vérification complète.
    """
    yield


async def test_dashboard_is_listed_by_the_websocket_command(hass, hass_ws_client, entry):
    """`lovelace/dashboards/list` est exactement ce que lit le sélecteur de
    tableau de bord par défaut du frontend."""
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "lovelace/dashboards/list"})
    response = await client.receive_json()

    assert response["success"]
    assert any(d["url_path"] == DASHBOARD_URL_PATH for d in response["result"])


async def test_generated_dashboard_config_is_valid(hass, hass_ws_client, entry):
    """Le YAML écrit doit être un vrai tableau de bord contenant notre carte.

    C'est exactement la requête que fait le frontend en ouvrant le tableau de
    bord : elle échouerait si le YAML était invalide ou mal placé.
    """
    client = await hass_ws_client(hass)
    await client.send_json(
        {"id": 1, "type": "lovelace/config", "url_path": DASHBOARD_URL_PATH}
    )
    response = await client.receive_json()

    assert response["success"], response
    view = response["result"]["views"][0]
    assert view["type"] == "panel"
    assert view["cards"][0]["type"] == "custom:ha-react-dashboard-panel"
