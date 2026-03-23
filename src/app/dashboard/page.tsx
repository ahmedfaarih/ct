"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import IntakeForm from "@/components/IntakeForm";
import TriageResult from "@/components/TriageResult";
import type { Contract } from "@/lib/types";

type View = "intake" | "result";

export default function DashboardPage() {
  const [view, setView] = useState<View>("intake");
  const [contract, setContract] = useState<Contract | null>(null);
  const [assignedOfficerName, setAssignedOfficerName] = useState<string | null>(null);

  function handleIntakeSuccess(submitted: Contract, officerName: string | null) {
    setContract(submitted);
    setAssignedOfficerName(officerName);
    setView("result");
  }

  function handleNewIntake() {
    setContract(null);
    setAssignedOfficerName(null);
    setView("intake");
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />

      {view === "intake" && (
        <IntakeForm onSuccess={handleIntakeSuccess} />
      )}

      {view === "result" && contract && (
        <TriageResult
          contract={contract}
          assignedOfficerName={assignedOfficerName}
          onNewIntake={handleNewIntake}
        />
      )}
    </div>
  );
}
