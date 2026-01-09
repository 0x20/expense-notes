from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.exceptions import InvalidSignature
import base64
import json
import time
from typing import Optional


def generate_access_token(private_key_b64: str, username: Optional[str] = None) -> str:
    """
    Generate Ed25519 signed access token valid for 7 days.

    Args:
        private_key_b64: Base64-encoded Ed25519 private key
        username: Optional Mattermost username for audit logging

    Returns:
        Base64url-encoded token (signature + payload)
    """
    private_key_bytes = base64.b64decode(private_key_b64)
    private_key = Ed25519PrivateKey.from_private_bytes(private_key_bytes)

    now = int(time.time())
    payload = json.dumps({
        "exp": now + (7 * 24 * 60 * 60),  # 7 days from now
        "iat": now,
        "u": username or "unknown"
    }).encode('utf-8')

    signature = private_key.sign(payload)
    token = base64.urlsafe_b64encode(signature + payload).decode('utf-8')
    return token


def generate_keypair() -> tuple[str, str]:
    """
    Generate a new Ed25519 keypair for testing.

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


if __name__ == "__main__":
    # Generate a keypair for deployment
    print("Generating Ed25519 keypair...\n")
    private_key, public_key = generate_keypair()

    print("=== PRIVATE KEY (for bot .env) ===")
    print(f"ACCESS_TOKEN_PRIVATE_KEY={private_key}\n")

    print("=== PUBLIC KEY (for backend .env) ===")
    print(f"ACCESS_TOKEN_PUBLIC_KEY={public_key}\n")

    print("IMPORTANT: Keep the private key secure! Only add to bot environment.")
    print("Add the public key to backend/.env")
