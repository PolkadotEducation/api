/* eslint-disable max-len */
export default `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Recovery</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f0f0f0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <tr>
            <td style="padding: 20px; text-align: center;">
                <img src="https://app.polkadot.education/assets/images/logo.png" alt="Polkadot Education Logo" style="width: 166px; height: auto;">
                <p>We received a request to reset your password. Click the button below to reset it:</p>
                <a href="{{RECOVERY_LINK}}" target="_blank" style="display: inline-block; background-color: #ff1493; color: white; padding: 10px 20px; border-radius: 20px; text-decoration: none; font-weight: bold;">Recover</a>
                <p>If the button above doesn't work, please copy and paste the following URL into your browser:</p>
                <p><a href="{{RECOVERY_LINK}}">{{RECOVERY_LINK}}</a></p>
                <p>Thanks!</p>
                <p>The Polkadot Education Team</p>
                <p style="font-size: 12px; color: #888888; margin-top: 20px;">
                    If you did not request a password reset, please ignore this email. Your password will remain unchanged.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
`;
