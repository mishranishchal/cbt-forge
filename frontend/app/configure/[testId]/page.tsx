import { ConfigurationClient } from "@/components/configure/ConfigurationClient";

export default async function ConfigurePage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  return <ConfigurationClient testId={testId} />;
}
