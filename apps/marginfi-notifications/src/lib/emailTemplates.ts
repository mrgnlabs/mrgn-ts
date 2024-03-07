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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Simple Transactional Email</title>
    <style media="all" type="text/css">
@media all {
  .btn-primary table td:hover {
    background-color: #E3E3E3 !important;
  }

  .btn-primary a:hover {
    background-color: #E3E3E3 !important;
    border-color: #E3E3E3 !important;
  }
}
@media only screen and (max-width: 640px) {
  .main p,
.main td,
.main span {
    font-size: 16px !important;
  }

  .wrapper {
    padding: 16px !important;
  }

  .content {
    padding: 0 !important;
  }

  .container {
    padding: 0 !important;
    padding-top: 8px !important;
    width: 100% !important;
  }

  .main {
    border-left-width: 0 !important;
    border-radius: 0 !important;
    border-right-width: 0 !important;
  }

  .btn table {
    max-width: 100% !important;
    width: 100% !important;
  }

  .btn a {
    font-size: 16px !important;
    max-width: 100% !important;
    width: 100% !important;
  }
}
@media all {
  .ExternalClass {
    width: 100%;
  }

  .ExternalClass,
.ExternalClass p,
.ExternalClass span,
.ExternalClass font,
.ExternalClass td,
.ExternalClass div {
    line-height: 100%;
  }

  .apple-link a {
    color: inherit !important;
    font-family: inherit !important;
    font-size: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important;
    text-decoration: none !important;
  }

  #MessageViewBody a {
    color: inherit;
    text-decoration: none;
    font-size: inherit;
    font-family: inherit;
    font-weight: inherit;
    line-height: inherit;
  }
}
</style>
  </head>
  <body style="font-family: Helvetica, sans-serif; -webkit-font-smoothing: antialiased; font-size: 16px; line-height: 1.3; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #111313; margin: 0; padding: 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #111313; width: 100%;" width="100%" bgcolor="#111313">
      <tr>
        <td style="font-family: Helvetica, sans-serif; font-size: 16px; vertical-align: top;" valign="top">&nbsp;</td>
        <td class="container" style="font-family: Helvetica, sans-serif; font-size: 16px; vertical-align: top; max-width: 600px; padding: 0; padding-top: 48px; padding-bottom: 48px; width: 600px; margin: 0 auto;" width="600" valign="top">
          <div class="content" style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 600px; padding: 0;">
            <!-- START CENTERED WHITE CONTAINER -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #191d20; border: 1px solid #141719; border-radius: 16px; color: #9f9fa7; text-align: center; width: 100%;" width="100%" align="center">
              <!-- START MAIN CONTENT AREA -->
              <tr>
                <td class="wrapper" style="font-family: Helvetica, sans-serif; font-size: 16px; vertical-align: top; box-sizing: border-box; padding: 36px 96px;" valign="top">
                  <img class="header-image" src="https://marginfi-v2-ui-git-feature-notifications-mrgn.vercel.app/mrgn-white.png" style="margin-bottom: 20px; width: 64px;" width="64">
                  <h1 class="title" style="color: #ffffff; font-family: Helvetica, sans-serif; font-size: 24px; font-weight: 600; line-height: 1.2; margin: 0; margin-bottom: 20px;"><span style="padding-right: 5px;">⚠</span>️ Account Health Alert</h1>
                  <p style="font-family: Helvetica, sans-serif; font-size: 16px; font-weight: normal; margin: 0; margin-bottom: 16px;">
                    Your account health is currently at <strong style="color: #eeeeee;">${health}%</strong>.<br> If it reaches 0, you are at risk of
                    liquidation.
                  </p>
                  <p style="font-family: Helvetica, sans-serif; font-size: 16px; font-weight: normal; margin: 0; margin-bottom: 16px;">
                    To avoid liquidation, consider adding collateral or closing positions to improve your account
                    health.
                  </p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; box-sizing: border-box; width: 100%; text-align: center; margin: 30px 0 10px; min-width: 100%;" width="100%" align="center">
                    <tbody>
                      <tr>
                        <td align="left" style="font-family: Helvetica, sans-serif; font-size: 16px; vertical-align: top; padding-bottom: 16px;" valign="top">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto; margin: 0 auto;">
                            <tbody>
                              <tr>
                                <td align="center" style="font-family: Helvetica, sans-serif; font-size: 16px; vertical-align: top; border-radius: 4px; background-color: #ffffff; text-align: center;" valign="top" bgcolor="#ffffff"><a href="href=" https:="" app.marginfi.com""="" target="_blank" style="border: solid 2px #0867ec; border-radius: 4px; box-sizing: border-box; cursor: pointer; display: inline-block; font-size: 16px; font-weight: bold; margin: 0; padding: 12px 24px; text-decoration: none; background-color: #ffffff; border-color: #ffffff; color: #141719;">login to marginfi</a></td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- END MAIN CONTENT AREA -->
            </table>

            <!-- END CENTERED WHITE CONTAINER -->
          </div>
        </td>
        <td style="font-family: Helvetica, sans-serif; font-size: 16px; vertical-align: top;" valign="top">&nbsp;</td>
      </tr>
    </table>
  </body>
</html>
  `;
}
