import { Icon } from "@iconify-icon/react";
import { Facehash } from "facehash";
import { Building2, Mail } from "lucide-react";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";

import * as main from "../../../../store/tinybase/store/main";

export function OrganizationDetailsColumn({
  selectedOrganizationId,
  handleDeleteOrganization,
  onPersonClick,
}: {
  selectedOrganizationId?: string | null;
  handleDeleteOrganization: (id: string) => void;
  onPersonClick?: (personId: string) => void;
}) {
  const selectedOrgData = main.UI.useRow(
    "organizations",
    selectedOrganizationId ?? "",
    main.STORE_ID,
  );

  const peopleInOrg = main.UI.useSliceRowIds(
    main.INDEXES.humansByOrg,
    selectedOrganizationId ?? "",
    main.STORE_ID,
  );

  const allHumans = main.UI.useTable("humans", main.STORE_ID);

  return (
    <div className="flex-1 flex flex-col">
      {selectedOrgData && selectedOrganizationId ? (
        <>
          <div className="flex items-center justify-center py-6 border-b border-neutral-200">
            <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-neutral-600" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-neutral-200">
              <div className="flex items-center px-4 py-3 border-b border-neutral-200">
                <div className="w-28 text-sm text-neutral-500">Name</div>
                <div className="flex-1">
                  <EditableOrganizationNameField
                    organizationId={selectedOrganizationId}
                  />
                </div>
              </div>
              <div className="flex items-center px-4 py-3">
                <div className="w-28 text-sm text-neutral-500">People</div>
                <div className="flex-1 text-base">
                  {peopleInOrg?.length ?? 0}{" "}
                  {(peopleInOrg?.length ?? 0) === 1 ? "person" : "people"}
                </div>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-sm font-medium text-neutral-600 mb-4">
                People
              </h3>
              <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
                {(peopleInOrg?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {peopleInOrg.map((humanId: string) => {
                      const human = allHumans[humanId];
                      if (!human) {
                        return null;
                      }

                      return (
                        <div
                          key={humanId}
                          className="p-4 rounded-lg border border-neutral-200 hover:shadow-xs transition-all bg-white cursor-pointer"
                          onClick={() => onPersonClick?.(humanId)}
                        >
                          <div className="flex flex-col items-center text-center gap-3">
                            <div className="rounded-full bg-amber-50">
                              <Facehash
                                name={String(
                                  human.name || human.email || humanId,
                                )}
                                size={48}
                                interactive={false}
                                showInitial={false}
                              />
                            </div>
                            <div className="w-full">
                              <div className="font-semibold text-sm truncate">
                                {human.name || human.email || "Unnamed"}
                              </div>
                              {human.job_title && (
                                <div className="text-xs text-neutral-500 truncate mt-1">
                                  {human.job_title as string}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 mt-1">
                              {human.email && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void openerCommands.openUrl(
                                      `mailto:${human.email}`,
                                      null,
                                    );
                                  }}
                                  title="Send email"
                                >
                                  <Mail />
                                </Button>
                              )}
                              {human.linkedin_username && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const v = String(
                                      human.linkedin_username ?? "",
                                    );
                                    const href = /^https?:\/\//i.test(v)
                                      ? v
                                      : `https://www.linkedin.com/in/${v.replace(/^@/, "")}`;
                                    void openerCommands.openUrl(href, null);
                                  }}
                                  title="View LinkedIn profile"
                                >
                                  <Icon icon="logos:linkedin-icon" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">
                    No people in this organization
                  </p>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                  <h3 className="text-sm font-semibold text-red-900">
                    Danger Zone
                  </h3>
                </div>
                <div className="bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        Delete this organization
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        This action cannot be undone
                      </p>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteOrganization(selectedOrganizationId);
                      }}
                      variant="destructive"
                      size="sm"
                    >
                      Delete Organization
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pb-96" />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-neutral-500">
            Select an organization to view details
          </p>
        </div>
      )}
    </div>
  );
}

function EditableOrganizationNameField({
  organizationId,
}: {
  organizationId: string;
}) {
  const value = main.UI.useCell(
    "organizations",
    organizationId,
    "name",
    main.STORE_ID,
  );

  const handleChange = main.UI.useSetCellCallback(
    "organizations",
    organizationId,
    "name",
    (e: React.ChangeEvent<HTMLInputElement>) => e.target.value,
    [],
    main.STORE_ID,
  );

  return (
    <Input
      value={(value as string) || ""}
      onChange={handleChange}
      placeholder="Organization name"
      className="border-none shadow-none p-0 h-8 text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
    />
  );
}
