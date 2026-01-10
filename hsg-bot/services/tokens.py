import base64
import json
import time
from typing import Optional
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


def generate_access_token(private_key_b64: str, username: Optional[str] = None, expires_days: int = 7) -> str:
    """
    Generate a signed access token.

    Args:
        private_key_b64: Base64-encoded Ed25519 private key
        username: Username to embed in token
        expires_days: Token validity in days

    Returns:
        Base64url-encoded signed token
    """
    private_key_bytes = base64.b64decode(private_key_b64)
    private_key = Ed25519PrivateKey.from_private_bytes(private_key_bytes)

    now = int(time.time())
    payload = json.dumps({
        "exp": now + (expires_days * 24 * 60 * 60),
        "iat": now,
        "u": username or "unknown"
    }).encode('utf-8')

    signature = private_key.sign(payload)
    token = base64.urlsafe_b64encode(signature + payload).decode('utf-8')

    return token


def generate_keypair() -> tuple[str, str]:
    """
    Generate a new Ed25519 keypair.

    Returns:
        Tuple of (private_key_b64, public_key_b64)
    """
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    private_key_b64 = base64.b64encode(
        private_key.private_bytes_raw()
    ).decode('utf-8')

    public_key_b64 = base64.b64encode(
        public_key.public_bytes_raw()
    ).decode('utf-8')

    return private_key_b64, public_key_b64


if __name__ == '__main__':
    # Generate new keypair when run directly
    private_key, public_key = generate_keypair()
    print("Ed25519 Keypair Generated")
    print("=" * 50)
    print(f"Private key (for hsg-bot/.env):")
    print(f"ACCESS_TOKEN_PRIVATE_KEY={private_key}")
    print()
    print(f"Public key (for backend/.env):")
    print(f"ACCESS_TOKEN_PUBLIC_KEY={public_key}")
