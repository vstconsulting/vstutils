from typing import Any, Text, Dict, List, ClassVar, NoReturn, Tuple, Union, Type
from rest_framework import routers, views, request


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

    def register_view(self, prefix: PrefixType, view: views.APIView, name: Text = None) -> None:
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


class APIRouter(_AbstractRouter):
    root_view_name: Text

    def generate(self, views_list: ApiVersionStructureType) -> None:
        ...


class MainRouter(_AbstractRouter):
    routers: ClassVar[UrlListType]

    def __register_openapi(self) -> None:
        ...

    def register_router(self, prefix: PrefixType, router: APIRouter, name: Text = None) -> None:
        ...

    def unregister_router(self, prefix: PrefixType) -> None:
        ...

    def generate_routers(self, api: ApiStructureType, create_schema: bool = None, create_swagger: bool = None) -> None:
        ...
