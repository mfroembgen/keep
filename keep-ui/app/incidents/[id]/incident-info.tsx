import { Badge, Button, Icon, Title } from "@tremor/react";
import { IncidentDto } from "../models";
import CreateOrUpdateIncident from "../create-or-update-incident";
import Modal from "@/components/ui/Modal";
import React, { useState } from "react";
import { MdBlock, MdDone, MdModeEdit } from "react-icons/md";
import { useIncident } from "@/utils/hooks/useIncidents";
import {
  deleteIncident,
  handleConfirmPredictedIncident,
} from "../incident-candidate-actions";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { Disclosure } from "@headlessui/react";
import classNames from "classnames";
import { IoChevronDown } from "react-icons/io5";
import IncidentChangeStatusModal from "@/app/incidents/incident-change-status-modal";
import { STATUS_ICONS } from "@/app/incidents/statuses";

interface Props {
  incident: IncidentDto;
}

function Summary({
  title,
  summary,
  collapsable,
  className,
}: {
  title: string;
  summary: string;
  collapsable?: boolean;
  className?: string;
}) {
  if (collapsable) {
    return (
      <Disclosure as="div" className={classNames("space-y-1", className)}>
        <Disclosure.Button>
          {({ open }) => (
            <h4 className="text-gray-500 text-sm inline-flex justify-between items-center gap-1">
              <span>{title}</span>
              <IoChevronDown
                className={classNames({ "rotate-180": open }, "text-slate-400")}
              />
            </h4>
          )}
        </Disclosure.Button>

        <Disclosure.Panel as="div" className="space-y-2 relative">
          {summary}
        </Disclosure.Panel>
      </Disclosure>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-gray-500 text-sm">{title}</h3>
      {/*TODO: suggest generate summary if it's empty*/}
      {summary ? <p>{summary}</p> : <p>No summary yet</p>}
    </div>
  );
}

export default function IncidentInformation({ incident }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const { mutate } = useIncident(incident.id);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  const handleStartEdit = () => {
    setIsFormOpen(true);
  };

  const handleFinishEdit = () => {
    setIsFormOpen(false);
    mutate();
  };

  const [changeStatusIncident, setChangeStatusIncident] =
    useState<IncidentDto | null>();

  const handleChangeStatus = (e: React.MouseEvent, incident: IncidentDto) => {
    e.preventDefault();
    e.stopPropagation();
    setChangeStatusIncident(incident);
  };

  const formatString = "dd, MMM yyyy - HH:mm.ss 'UTC'";
  const summary = incident.user_summary || incident.generated_summary;

  const severity = incident.severity;
  let severityColor;
  if (severity === "critical") severityColor = "red";
  else if (severity === "info") severityColor = "blue";
  else if (severity === "warning") severityColor = "yellow";

  return (
    <div className="flex w-full h-full flex-col justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm gap-1">
          <Title className="flex-grow items-center">
            {incident.is_confirmed ? "⚔️ " : "Possible "}Incident
          </Title>
          {incident.is_confirmed && (
            <Button
              color="orange"
              size="xs"
              variant="secondary"
              icon={MdModeEdit}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                handleStartEdit();
              }}
            />
          )}
          {!incident.is_confirmed && (
            <div className="space-x-1 flex flex-row items-center justify-center">
              <Button
                color="orange"
                size="xs"
                tooltip="Confirm incident"
                variant="secondary"
                title="Confirm"
                icon={MdDone}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConfirmPredictedIncident({
                    incidentId: incident.id!,
                    mutate,
                    session,
                  });
                }}
              >
                Confirm
              </Button>
              <Button
                color="red"
                size="xs"
                variant="secondary"
                tooltip={"Discard"}
                icon={MdBlock}
                onClick={async (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const success = await deleteIncident({
                    incidentId: incident.id!,
                    mutate,
                    session,
                  });
                  if (success) {
                    router.push("/incidents");
                  }
                }}
              />
            </div>
          )}
          <Icon
            icon={ArrowUturnLeftIcon}
            tooltip="Go Back"
            variant="shadow"
            className="cursor-pointer"
            onClick={() => router.back()}
          />
        </div>
        <div className="prose-2xl flex gap-2 items-center">
          <Badge color={severityColor} className="capitalize">
            {incident.severity}
          </Badge>
          <span>
            {incident.user_generated_name || incident.ai_generated_name}
          </span>
        </div>
        <div>
          <h3 className="text-gray-500 text-sm">Status</h3>
          <div>
            <div
              onClick={(e) => handleChangeStatus(e, incident)}
              className="capitalize flex-grow-0 inline-flex items-center cursor-pointer"
            >
              {STATUS_ICONS[incident.status]} {incident.status}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 max-w-3xl">
          <Summary title="Summary" summary={summary} />
          {incident.user_summary && incident.generated_summary ? (
            <Summary
              title="AI version"
              summary={incident.generated_summary}
              collapsable={true}
            />
          ) : null}
        </div>
        <div className="flex gap-4">
          {!!incident.start_time && (
            <div>
              <h3 className="text-gray-500 text-sm">Started at</h3>
              <p className="">
                {format(new Date(incident.start_time), formatString)}
              </p>
            </div>
          )}
          {!!incident.last_seen_time && (
            <div>
              <h3 className="text-gray-500 text-sm">Last seen at</h3>
              <p>{format(new Date(incident.last_seen_time), formatString)}</p>
            </div>
          )}
        </div>
        <div>
          {!!incident.rule_fingerprint && (
            <>
              <h3 className="text-sm text-gray-500">Group by value</h3>
              <p>{incident.rule_fingerprint}</p>
            </>
          )}
        </div>
      </div>
      <Modal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        className="w-[600px]"
        title="Edit Incident"
      >
        <CreateOrUpdateIncident
          incidentToEdit={incident}
          exitCallback={handleFinishEdit}
        />
      </Modal>

      <IncidentChangeStatusModal
        incident={changeStatusIncident}
        mutate={mutate}
        handleClose={() => setChangeStatusIncident(null)}
      />
    </div>
  );
}
