"""Fixtures des tests de l'intégration."""

from __future__ import annotations

import asyncio
import shutil
import sys
from pathlib import Path

import pytest
import pytest_socket
from homeassistant import runner
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ha_react_dashboard.const import DOMAIN

# Le harnais HA est écrit pour Linux. Ces deux contournements sont réservés à
# Windows : sur Linux (donc en CI) le harnais garde tous ses garde-fous.
if sys.platform == "win32":
    # La boucle asyncio se crée une paire de sockets locale ; le harnais bloque
    # toute création de socket (il ne tolère que les sockets Unix). Neutraliser
    # la fonction est le seul point sûr — plusieurs greffons l'appellent, et se
    # placer après chacun d'eux dépendrait de l'ordre d'enregistrement.
    pytest_socket.disable_socket = lambda *args, **kwargs: None
    pytest_socket.enable_socket()

    # `aiodns`, utilisé par le client HTTP de HA, refuse de tourner sur la boucle
    # Proactor (celle par défaut de Windows). Le harnais instancie la politique
    # lui-même, d'où la retouche de la classe plutôt qu'un remplacement de fixture.
    runner.HassEventLoopPolicy._loop_factory = asyncio.SelectorEventLoop


@pytest.fixture
def expected_lingering_threads() -> bool:
    """Le serveur de test aiohttp laisse un thread d'arrêt derrière lui sous
    Windows ; le harnais en fait une erreur de démontage."""
    return True


@pytest.fixture
def socket_enabled():
    """Réclamée par `hass_client` et `hass_ws_client`.

    Le harnais coupe les sockets avant chaque test et compte sur cette fixture
    pour les rouvrir aux tests HTTP. Elle est fournie par un greffon qui n'est
    pas toujours enregistré selon les versions — on la définit donc nous-mêmes.
    """
    pytest_socket.enable_socket()
    yield


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Sans ça, HA refuse de charger une intégration de `custom_components`."""
    yield


@pytest.fixture
async def entry(hass):
    """Intégration installée et démarrée."""
    from homeassistant.setup import async_setup_component

    # Le harnais réutilise un dossier de configuration fixe d'un test à l'autre :
    # sans ce ménage, un test hériterait du `dashboard.yaml` écrit par le
    # précédent.
    shutil.rmtree(Path(hass.config.path(DOMAIN)), ignore_errors=True)

    assert await async_setup_component(hass, "lovelace", {})

    config_entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=DOMAIN)
    config_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    return config_entry
