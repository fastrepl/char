import { FolderIcon } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@hypr/ui/components/ui/breadcrumb";
import { Button } from "@hypr/ui/components/ui/button";

import * as main from "../../../../../store/tinybase/store/main";
import { useSessionTitle } from "../../../../../store/zustand/live-title";
import { useTabs } from "../../../../../store/zustand/tabs";
import { FolderBreadcrumb } from "../../shared/folder-breadcrumb";
import { SearchableFolderDropdown } from "./shared/folder";

export function FolderChain({ sessionId }: { sessionId: string }) {
  const folderId = main.UI.useCell(
    "sessions",
    sessionId,
    "folder_id",
    main.STORE_ID,
  );
  const storeTitle = main.UI.useCell(
    "sessions",
    sessionId,
    "title",
    main.STORE_ID,
  ) as string | undefined;
  const title = useSessionTitle(sessionId, storeTitle);

  const handleChangeTitle = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (title: string) => ({ title }),
    [],
    main.STORE_ID,
  );

  return (
    <Breadcrumb className="ml-1.5 min-w-0">
      <BreadcrumbList className="text-neutral-700 text-xs flex-nowrap overflow-hidden gap-0.5">
        {folderId && <FolderIcon className="w-3 h-3 mr-1 shrink-0" />}
        {!folderId ? (
          <RenderIfRootNotExist
            title={title}
            handleChangeTitle={handleChangeTitle}
            sessionId={sessionId}
          />
        ) : (
          <RenderIfRootExist
            title={title}
            handleChangeTitle={handleChangeTitle}
            folderId={folderId}
          />
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function RenderIfRootExist({
  folderId,
  title,
  handleChangeTitle,
}: {
  folderId: string;
  title: string;
  handleChangeTitle: (title: string) => void;
}) {
  const openNew = useTabs((state) => state.openNew);

  return (
    <>
      <FolderBreadcrumb
        folderId={folderId}
        renderSeparator={({ index }) =>
          index > 0 ? <BreadcrumbSeparator className="shrink-0" /> : null
        }
        renderCrumb={({ id, name }) => (
          <BreadcrumbItem className="overflow-hidden">
            <BreadcrumbLink asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openNew({ type: "folders", id })}
                className="truncate px-0 text-neutral-600 hover:text-black"
              >
                {name}
              </Button>
            </BreadcrumbLink>
          </BreadcrumbItem>
        )}
      />
      <BreadcrumbSeparator className="shrink-0" />
      <BreadcrumbItem className="overflow-hidden">
        <BreadcrumbPage>
          <TitleInput title={title} handleChangeTitle={handleChangeTitle} />
        </BreadcrumbPage>
      </BreadcrumbItem>
    </>
  );
}

function RenderIfRootNotExist({
  title,
  handleChangeTitle,
  sessionId,
}: {
  title: string;
  handleChangeTitle: (title: string) => void;
  sessionId: string;
}) {
  return (
    <>
      <BreadcrumbItem className="shrink-0">
        <SearchableFolderDropdown
          sessionId={sessionId}
          trigger={
            <button className="text-neutral-500 hover:text-neutral-700 transition-colors outline-hidden">
              Select folder
            </button>
          }
        />
      </BreadcrumbItem>
      <BreadcrumbSeparator className="shrink-0" />
      <BreadcrumbItem className="overflow-hidden">
        <BreadcrumbPage>
          <TitleInput title={title} handleChangeTitle={handleChangeTitle} />
        </BreadcrumbPage>
      </BreadcrumbItem>
    </>
  );
}

function TitleInput({
  title,
  handleChangeTitle,
}: {
  title: string;
  handleChangeTitle: (title: string) => void;
}) {
  return (
    <input
      type="text"
      placeholder="Untitled"
      className="truncate min-w-0 w-full border-none bg-transparent text-neutral-700 focus:outline-hidden focus:underline"
      value={title ?? ""}
      onChange={(e) => handleChangeTitle(e.target.value)}
    />
  );
}
