import { PostgresClient, TableName } from "utils/database";
import { SlackCommandRequest, SlackUser } from "types";
import { NextRequest, NextResponse } from "next/server";
import { getSlackMessage, SlackResponseType } from "../../_utils/slack";




/** Returns the input from the user, without spaces so the table doesn't break */
function sanitizeSlackText(text: string) {
  return text.trim().toLowerCase().replaceAll(" ", "_")
}

export async function POST(
  req: NextRequest & SlackCommandRequest,
) {

  const body = await req.json()

  console.log(body)

  const organizationName = sanitizeSlackText(body.team_domain);
  const rotationName = sanitizeSlackText(body.text)

  // TODO: use the data that we gathered, to retrieve all the users on that slack channel this command was executed at.

  if (!rotationName || typeof rotationName !== 'string') return NextResponse.json({ error: 'rotationName is required' }, { status: 400 })

  // TODO: fetch the users in the channel this was created on.

  const DbClient = new PostgresClient(organizationName, rotationName)// TODO: softcode organization

  //TODO: implement PUT Items instead, that should accept an array.
  const users = await DbClient.putItem<SlackUser>(
    {
      slackId: body.user_id,
      fullName: body.user_name,
      count: 0, // TODO: get an average if the rotation already exists
      holiday: false,
      onDuty: false,
      backup: false
    }, TableName.Users
  );

  return NextResponse.json(
    getSlackMessage(
      SlackResponseType.InChannel,
      `Successfully created the ${rotationName} rotation.`
    )
  )
}

export async function GET(res: NextApiResponse, rotationName: string) {
  try {
    const DbClient = new PostgresClient('marandino', rotationName);
    //Todo change any for rotation in the future
    //const lastLog = await DbClient.queryLatestLog<any>(TableName.Logs);
    const lastLog = await DbClient.queryLatestLog<any>(TableName.Logs);
    `Slack user on duty: <@${lastLog.current_deployer}> | Backup Slack user: <@${lastLog.backup_deployer}>.`;
    if (!lastLog) {
      const errorMessage = getSlackMessage(SlackResponseType.Ephemeral, 'No logs found');
      return res.status(404).json(errorMessage);
    }

    const slackMessage = getSlackMessage(
      SlackResponseType.Ephemeral,
      `Slack user on duty: <@${lastLog}> | Backup Slack user: <@${lastLog}>.`
    );

    return res.status(200).json(slackMessage);
  } catch (error) {
    console.error(JSON.stringify(error));
    const slackMessage = getSlackMessage(
      SlackResponseType.Ephemeral, 'Something went wrong, please try again.'
    );
    return res.status(500).json(slackMessage);
  }
}