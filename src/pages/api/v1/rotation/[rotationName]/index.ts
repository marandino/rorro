import { PostgresClient, TableName } from "@/pages/api/_utils/database";
import type { NextApiRequest, NextApiResponse } from "next";
import { logRequest, returnInvalidRequest } from "utils/server-helper";

type SlackUser = {
  slackId: string;
  fullName: string;
  count: number;
  holiday: boolean;
  current: boolean;
  backup: boolean
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<unknown>,
) {

  logRequest(req)
  const { rotationName } = req.query
  if (!rotationName || typeof rotationName !== 'string') return res.status(400).json({ error: 'rotationName is required' });

  switch (req.method) {
    case "POST":
      // TODO: get the organization name from the slack request instead.
      // TODO: fetch the users in the channel this was created on.
      const DbClient = new PostgresClient('marandino', rotationName)// TODO: softcode organization
      //TODO: softcode the user
      const users = await DbClient.putItem<SlackUser>(
        {
          slackId: 'U01J3T6QZ9J',
          fullName: 'Marcelo',
          count: 0,
          holiday: false,
          current: false,
          backup: false
        }, TableName.Users);
      console.log(users)
      return res.status(200).json(users)

    case "GET":
      returnInvalidRequest(res)
      break;

    default:
      returnInvalidRequest(res)
      break;
  }
}

