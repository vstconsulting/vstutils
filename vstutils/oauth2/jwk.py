from authlib.jose import JsonWebKey
from django.conf import settings


jwk_set = JsonWebKey.import_key_set({
    "keys": [
        {
            "kid": "default",
            "kty": "oct",
            "k": settings.OAUTH_SERVER_JWT_KEY,
            "alg": settings.OAUTH_SERVER_JWT_ALG,
        }
    ]
})
