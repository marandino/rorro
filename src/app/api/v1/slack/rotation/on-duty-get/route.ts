import { PostgresClient } from 'utils/database';
import { NextRequest, NextResponse } from 'next/server';
import {
  SlackResponseType,
  getSlackMessage,
  parsePayloadFromRequest,
  sanitizeSlackText,
} from 'utils/slack';

export async function POST(req: NextRequest) {
  try {
    const parsedPayload = await parsePayloadFromRequest(req);

    const { text, team_domain } = parsedPayload;
    console.log(parsedPayload);

    const command: string = text.replace(/<[^>]+>/g, ''); // Cleanup the command
    const organizationName = sanitizeSlackText(team_domain);
    const rotationName = sanitizeSlackText(command);

    if (!rotationName || typeof rotationName !== 'string') {
      return NextResponse.json(
        getSlackMessage(
          SlackResponseType.Ephemeral,
          'No active users found.'
        ),
      );
    }

    const DbClient = new PostgresClient(organizationName, rotationName);

    const activeUsers = await DbClient.queryCurrentActiveUsers();

    if (!activeUsers || !activeUsers.userOnDuty) {
      const errorMessage = getSlackMessage(
        SlackResponseType.Ephemeral,
        'No active users found or incomplete data.'
      );
      return NextResponse.json(errorMessage);
    }

    const slackMessage = getSlackMessage(
      SlackResponseType.Ephemeral,
      `Slack user on duty: <@${activeUsers.userOnDuty.slack_id}> | Backup Slack user: <@${activeUsers.userOnBackup?.slack_id}>.`
    );

    return NextResponse.json(slackMessage);
  } catch (error) {
    console.error(JSON.stringify(error));
    const slackMessage = getSlackMessage(
      SlackResponseType.Ephemeral,
      'Something went wrong, please try again.'
    );
    return NextResponse.json(slackMessage);
  }
}
