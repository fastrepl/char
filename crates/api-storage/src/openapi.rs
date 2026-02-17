use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::routes::storage::list_files,
        crate::routes::storage::get_file,
        crate::routes::storage::download_file,
    ),
    components(
        schemas(
            crate::routes::storage::ListFilesRequest,
            crate::routes::storage::ListFilesResponse,
            crate::routes::storage::GetFileRequest,
            crate::routes::storage::GetFileResponse,
            crate::routes::storage::DownloadFileRequest,
            crate::routes::storage::DownloadFileResponse,
        )
    ),
    tags(
        (name = "storage", description = "Storage management (Google Drive)")
    )
)]
struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}
