import { TestClient } from "@/components/test/TestClient";

export default async function TestPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  return <TestClient testId={testId} />;
}
