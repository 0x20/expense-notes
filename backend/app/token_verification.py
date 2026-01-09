from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.exceptions import InvalidSignature
import base64
import json
import time
from typing import Optional


def verify_access_token(token: str, public_key_b64: str) -> Optional[dict]:
    """
    Verify Ed25519 signed access token.

    Args:
        token: Base64url-encoded token (signature + payload)
        public_key_b64: Base64-encoded Ed25519 public key

    Returns:
        Payload dict if valid, None otherwise
    """
    try:
        # Decode the token from base64url
        token_bytes = base64.urlsafe_b64decode(token)

        # Ed25519 signatures are 64 bytes
        if len(token_bytes) < 64:
            return None

        signature = token_bytes[:64]
        payload_bytes = token_bytes[64:]

        # Load the public key
        public_key_bytes = base64.b64decode(public_key_b64)
        public_key = Ed25519PublicKey.from_public_bytes(public_key_bytes)

        # Verify the signature
        public_key.verify(signature, payload_bytes)

        # Parse the payload
        payload = json.loads(payload_bytes.decode('utf-8'))

        # Check expiration
        if 'exp' in payload:
            now = int(time.time())
            if now > payload['exp']:
                return None  # Token expired

        return payload

    except (InvalidSignature, ValueError, KeyError, json.JSONDecodeError):
        return None
