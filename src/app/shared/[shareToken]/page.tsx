import { SharedTripPage } from "@/components/shared-trip-page";

type SharedPageProps = {
  params: Promise<{
    shareToken: string;
  }>;
};

export default async function SharedPage({ params }: SharedPageProps) {
  const { shareToken } = await params;

  return <SharedTripPage shareToken={shareToken} />;
}
