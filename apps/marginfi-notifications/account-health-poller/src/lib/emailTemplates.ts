// lib/emailTemplates.ts

/**
 * Generates HTML for the account health notification email.
 * @param health The health percentage of the account.
 * @returns The HTML string for the email.
 */
export function accountHealthEmail(health: number): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Health Notification</title>
        <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; }
            a { color: #007bff; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Account Health Alert</h2>
            <p>Your account health is currently at <strong>${health}%</strong>. If it reaches 0, you are at risk of liquidation.</p>
            <p>To avoid liquidation, consider adding collateral or closing positions to improve your account health.</p>
            <p><a href="https://app.marginfi.com">Login to Marginfi</a> to manage your account.</p>
        </div>
    </body>
    </html>
  `;
}
