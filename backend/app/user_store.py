from dataclasses import dataclass
from threading import Lock


@dataclass
class UserRecord:
    email: str
    full_name: str
    password_hash: str


_users: dict[str, UserRecord] = {}
_lock = Lock()


def create_user(email: str, full_name: str, password_hash: str) -> UserRecord:
    normalized_email = email.strip().lower()
    with _lock:
        if normalized_email in _users:
            raise ValueError("Email already exists")
        user = UserRecord(email=normalized_email, full_name=full_name, password_hash=password_hash)
        _users[normalized_email] = user
        return user


def get_user_by_email(email: str) -> UserRecord | None:
    return _users.get(email.strip().lower())
