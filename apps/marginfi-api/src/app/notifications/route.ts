import db from "~/lib/pg";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet_address");
  const apiKey = request.headers.get("X-API-KEY");

  if (!apiKey || apiKey !== process.env.API_KEY) {
    console.error("Invalid or missing API key");
    return Response.json(
      { error: "Invalid or missing API key" },
      {
        status: 401,
      }
    );
  }

  if (!wallet) {
    console.error("Missing wallet address parameter");
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
      console.error("Notification settings not found");
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
  const apiKey = request.headers.get("X-API-KEY");

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return Response.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  if (!data.wallet_address) {
    return Response.json({ error: "Missing wallet address parameter" }, { status: 400 });
  }

  // Start constructing the query dynamically
  let fields: string[] = ["wallet_address"];
  let values: string[] = [data.wallet_address];
  let params: string[] = ["$1"];
  let updateSets: string[] = [];
  let counter: number = 2;

  // Dynamically add fields that are present
  ["email", "account_health", "ybx_updates", "last_notification"].forEach((field) => {
    if (data.hasOwnProperty(field)) {
      fields.push(field);
      values.push(data[field]);
      params.push(`$${counter}`);
      updateSets.push(`${field} = EXCLUDED.${field}`);
      counter++;
    }
  });

  const queryText = `
    INSERT INTO notification_settings (${fields.join(", ")})
    VALUES (${params.join(", ")})
    ON CONFLICT (wallet_address)
    DO UPDATE SET ${updateSets.join(", ")};
  `;

  try {
    await db.query(queryText, values);
    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Database error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
