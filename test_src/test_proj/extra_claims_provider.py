def extra_claims_provider(user):
    return {'sup': user.is_superuser}
