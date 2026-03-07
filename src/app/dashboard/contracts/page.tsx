import Navbar from "@/components/Navbar";
import ContractList from "@/components/ContractList";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ContractsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { count } = await supabase
    .from("contracts")
    .select("*", { count: "exact", head: true });

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar contractCount={count ?? 0} />
      <ContractList />
    </div>
  );
}
