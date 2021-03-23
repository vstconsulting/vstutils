import re

from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle


class ActionBasedThrottle(SimpleRateThrottle):
    __slots__ = ('scope', 'rate', 'actions')
    url_regex = re.compile(r'/(?P<scope>[a-zA-Z0-9?=&_]+)/([a-zA-Z0-9?=&_]+)?/?$')
    throttle_rates = settings.THROTTLE

    def __init__(self):  # pylint: disable=W0231 super-init-not-called
        """
        Override the usual SimpleRateThrottle, because we can't determine
        the rate until called by the view.
        """
        self.rate = self.throttle_rates['rate']
        self.actions = self.throttle_rates['actions']

    def parse_config(self, request):
        """
        Try getting per-class throttle params.If not found, getting global params.
        We take the last two parts of an URL, checking if they are present in throttle config and taking the first one,
        but in reverse order. We doing this to prevent getting id part of url, if it's presented as word.
        """
        regexed_path = self.url_regex.search(request.path)
        self.scope = next(
            (group
                for group in reversed(regexed_path.groups()) if group in self.throttle_rates['views']),
            None
        )
        if self.scope:
            self.rate = self.throttle_rates['views'][self.scope].get('rate', self.rate)
            self.actions = self.throttle_rates['views'][self.scope].get('actions', self.actions)
        else:
            self.scope = regexed_path.group(1)

    def allow_request(self, request, view):
        self.parse_config(request)

        if self.rate == '' or getattr(view, 'action', None) not in self.actions:
            return True

        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super(ActionBasedThrottle, self).allow_request(request, view)

    def get_cache_key(self, request, view):
        """
        Generate the unique cache key by concatenating the user id
        with the '.throttle_scope` property of the view.
        """
        return self.cache_format % {
            'scope': self.scope,
            'ident': request.user.pk if request.user.is_authenticated else self.get_ident(request)
        }
