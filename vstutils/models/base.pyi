from typing import Any, Optional, Sequence, Text, Tuple
from ..api.base import GenericViewSet
from django.db.models.base import ModelBase


DEFAULT_VIEW_FIELD_NAMES: Tuple[Text,Text,Text,Text,Text]


def get_first_match_name(field_names: Sequence[Text], default: Optional[Text] = None) -> Text:
    ...


class ModelBaseClass(ModelBase):
    generated_view: GenericViewSet
    lazy_generated_view: GenericViewSet
    OriginalMeta: Any
