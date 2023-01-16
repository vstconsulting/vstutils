from typing import Any, Text, Dict, List, ClassVar, Tuple, Union
from rest_framework import routers, views, request
from rest_framework.schemas import views as drf_views


UrlType = Text
ApiVersionType = Text
PrefixType = Text
ApiViewOptionKeyType = Text
ApiViewOptionValueType = Any
ApiViewOptionsType = Dict[ApiViewOptionKeyType, ApiViewOptionValueType]
ApiVersionStructureType = Dict[PrefixType, ApiViewOptionsType]
ApiStructureType = Dict[ApiVersionType, ApiVersionStructureType]
UrlListType = List[Tuple[PrefixType, Union[views.APIView, routers.DefaultRouter], Text]]


class _AbstractRouter(routers.DefaultRouter):
    custom_urls: UrlListType
    permission_classes: List
    create_schema: bool

    def register_view(self, prefix: PrefixType, view: Union[views.APIView, views.AsView], name: Text = None) -> None:
        ...

    def unregister_view(self, prefix: PrefixType) -> None:
        ...

    def unregister(self, prefix: PrefixType) -> None:
        ...

    def generate(self, views_list: Dict) -> None:
        ...

    def _unreg(self, prefix: PrefixType, objects_list: UrlListType) -> UrlListType:
        ...

    def _get_custom_lists(self) -> List:
        ...

    def _get_views_custom_list(self, view_request: request.Request, registers: Any) -> Dict[PrefixType, UrlType]:
        ...

    def _get_api_root_dict(self) -> Dict:
        ...


class APIRouter(_AbstractRouter):
    root_view_name: Text
    router_version_name: Text

    def generate(self, views_list: ApiVersionStructureType) -> None:
        ...

    def _get_schema_view(self) -> drf_views.SchemaView:
        ...


class MainRouter(_AbstractRouter):
    routers: ClassVar[UrlListType]

    def __register_openapi(self) -> None:
        ...

    def register_router(self, prefix: PrefixType, router: APIRouter, name: Text = None) -> None:
        ...

    def unregister_router(self, prefix: PrefixType) -> None:
        ...

    def generate_routers(self, api: ApiStructureType) -> None:
        ...
