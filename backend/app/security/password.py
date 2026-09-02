import bcrypt


def hash_password(password: str) -> str:
    """Hashes a password using bcrypt.

    Args:
        password: Raw password string.

    Returns:
        Hashed password string.
    """
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed bcrypt password.

    Args:
        plain_password: Plain password string.
        hashed_password: Hashed bcrypt password string.

    Returns:
        True if the passwords match, False otherwise.
    """
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
