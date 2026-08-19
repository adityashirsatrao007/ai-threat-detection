import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.models.models import User
from app.database.session import SessionLocal


def get_password_hash(password: str) -> str:
    try:
        from app.core.security import hash_password
        return hash_password(password)
    except ImportError:
        from app.core.security import get_password_hash
        return get_password_hash(password)


def reset_password():
    password = os.environ.get("SENTINELX_BOOTSTRAP_PASSWORD")
    if not password:
        print("SENTINELX_BOOTSTRAP_PASSWORD env var not set; aborting")
        sys.exit(1)
    email = os.environ.get("SENTINELX_ADMIN_EMAIL", "soc@sentinelx.com")

    db = SessionLocal()
    try:
        pwd_hash = get_password_hash(password)
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.hashed_password = pwd_hash
            db.commit()
            print(f"Password for {email} has been reset.")
        else:
            print(f"User {email} not found!")
    finally:
        db.close()


if __name__ == "__main__":
    reset_password()