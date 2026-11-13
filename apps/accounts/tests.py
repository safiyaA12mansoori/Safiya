"""Import the project suite so `manage.py test` discovers it."""

from tests.test_auth import *  # noqa: F401,F403
from tests.test_crud import *  # noqa: F401,F403
from tests.test_identifiers import *  # noqa: F401,F403
from tests.test_permissions import *  # noqa: F401,F403
