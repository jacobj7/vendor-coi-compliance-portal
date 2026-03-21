import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import VendorDetailClient from "./VendorDetailClient";

interface Props {
  params: { id: string };
}

export default async function VendorDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <VendorDetailClient vendorId={params.id} />;
}
