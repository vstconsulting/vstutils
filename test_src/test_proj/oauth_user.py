from vstutils.oauth2.user import UserWrapper

class OAuthUser(UserWrapper):
    def get_profile_claims(self) -> dict:
        claims = super().get_profile_claims()
        claims['test_value'] = 'test_value'
        return claims
