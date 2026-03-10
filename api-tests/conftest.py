"""Global test fixtures."""
import os
import pytest
import httpx


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("EAM_BASE_URL", "http://localhost:4000")


@pytest.fixture(scope="session")
def client(base_url):
    with httpx.Client(base_url=base_url, timeout=30.0) as c:
        yield c
