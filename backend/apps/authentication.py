from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class UserTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None
        token_value = header[7:]
        try:
            from apps.accounts.models import AuthToken
            auth_token = AuthToken.objects.select_related("user").get(token=token_value)
            return (auth_token.user, auth_token)
        except (AuthToken.DoesNotExist, ValueError):
            raise AuthenticationFailed("Invalid token")


class AnonymousSessionAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = request.headers.get("X-Session-Token")
        if not token:
            return None
        try:
            from apps.activities.models import Member
            member = Member.objects.select_related("activity").get(session_token=token)
            return (None, member)
        except (Member.DoesNotExist, ValueError):
            raise AuthenticationFailed("Invalid session token")
