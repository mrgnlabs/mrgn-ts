import db from "~/lib/pg";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return Response.json(
      { error: "Missing wallet address parameter" },
      {
        status: 400,
      }
    );
  }

  try {
    const queryText = "SELECT * FROM notification_settings WHERE wallet_address = $1";
    const { rows } = await db.query(queryText, [wallet]);

    if (rows.length === 0) {
      return Response.json(
        { error: "Notification settings not found" },
        {
          status: 404,
        }
      );
    }

    return Response.json(rows[0], {
      status: 200,
    });
  } catch (error) {
    console.error("Database error:", error);
    return Response.json(
      { error: "Internal server error" },
      {
        status: 500,
      }
    );
  }
}
