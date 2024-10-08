import { NextRequest, NextResponse } from 'next/server';
import { PostgresClient } from 'utils/database';
import { encrypt } from 'utils/crypto';
import { Organization } from 'types';

export async function GET(
  req: NextRequest,
) {
  const confirmationCode = req.nextUrl.searchParams.get('code');
  try {

    // eslint-disable-next-line
    const requestForm: Record<string, any> = new URLSearchParams();

    requestForm.append('client_secret', process.env.SLACK_CLIENT_SECRET);
    requestForm.append('client_id', process.env.SLACK_CLIENT_ID);
    requestForm.append('code', confirmationCode);

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestForm.toString(),
    });

    const data = await response.json();
    console.log('Response data:', data);
    if (!response.ok) {
      console.error('Response not OK:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const { access_token, authed_user, scope, team, app_id } = data;

    // Encrypt the code
    const access_hash = encrypt(access_token);

    const organization: Organization = {
      organization_id: app_id + '-' + team?.id?.toString(),
      team_id: team?.id?.toString(),
      authed_user: authed_user?.id?.toString(),
      scope,
      team_name: team?.name?.toString(),
      app_id,
      access_hash,
    };

    // Save the code and the encryption
    await PostgresClient.putOrganization(organization);
    // Construct the full URL for redirection
    const redirectUrl = new URL('/dashboard', `https://${req.headers.get('host')}`);
    return NextResponse.redirect(redirectUrl.toString());

  } catch (error) {
    console.log(error);
    NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
