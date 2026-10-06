from passlib.context import CryptContext

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Used to burn the same CPU time when an email doesn't exist (prevents user enumeration by timing).
DUMMY_HASH = _pwd.hash("not-a-real-password")


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)
