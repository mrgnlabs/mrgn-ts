import { CreatePool } from "../../../../create-pool";

export default function Component() {
  return (
    <div className="pt-8">
      <div className="bg-background rounded-xl p-8 max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2 max-w-md mx-auto">
          <h2 className="text-3xl font-medium">Create a Pool</h2>
          <p className="text-muted-foreground">Id nisi dolor est aute exercitation in fugiat et fugiat aliqua.</p>
        </div>
        <CreatePool />
      </div>
    </div>
  );
}
