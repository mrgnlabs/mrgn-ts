import db from "~/lib/pg";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet_address");

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

export async function POST(request: Request) {
  const data = await request.json();

  if (!data.wallet_address || !data.email) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const queryText = `
      INSERT INTO notification_settings (wallet_address, email, account_health, ybx_updates, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (wallet_address)
      DO UPDATE SET email = EXCLUDED.email, account_health = EXCLUDED.account_health, ybx_updates = EXCLUDED.ybx_updates, updated_at = NOW();
    `;

    await db.query(queryText, [data.wallet_address, data.email, data.account_health, data.ybx_updates]);
    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Database error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
