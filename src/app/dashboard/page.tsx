"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import TriageResult from "@/components/TriageResult";
import type { Contract } from "@/lib/types";

type View = "intake" | "result";

// IntakeForm is wired in here once created — placeholder for now
function IntakePlaceholder({
  onSuccess,
}: {
  onSuccess: (contract: Contract) => void;
}) {
  void onSuccess; // will be used by IntakeForm
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-center">
      <p className="text-sm text-neutral-400">
        Intake form — to be built in the next step.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [view, setView] = useState<View>("intake");
  const [contract, setContract] = useState<Contract | null>(null);

  function handleIntakeSuccess(submitted: Contract) {
    setContract(submitted);
    setView("result");
  }

  function handleNewIntake() {
    setContract(null);
    setView("intake");
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />

      {view === "intake" && (
        <IntakePlaceholder onSuccess={handleIntakeSuccess} />
      )}

      {view === "result" && contract && (
        <TriageResult contract={contract} onNewIntake={handleNewIntake} />
      )}
    </div>
  );
}
