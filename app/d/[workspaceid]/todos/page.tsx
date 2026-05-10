import { getUser } from "@/lib/user";
import TodosList from "../doctor/todos/todos-list";

type Props = {
  params: Promise<{ workspaceid: string }>;
};

export default async function TodosPage({ params }: Props) {
  const { workspaceid } = await params;
  const user = await getUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }
  return (
    <div className="container mx-auto py-6">
      <TodosList workspaceid={workspaceid} />
    </div>
  );
}
